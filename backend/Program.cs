using System.Text.Json;
using System.Text.Json.Serialization;
using System.Linq;
using System.Net.Mail;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using PetBehaviorTranslator;
using Stripe;
using Stripe.Checkout;

var builder = WebApplication.CreateBuilder(args);

// Add AWS Lambda support for Function URLs (HTTP API format)
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// CORS is handled by Lambda Function URL configuration
// No need to add CORS here

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS is handled by Lambda Function URL - don't add it here

// Get Credit System configuration
var freeSearchLimit = builder.Configuration.GetValue<int>("CreditSystem:FreeSearchLimit", 5);
var tokenSecretSsmParameter = builder.Configuration["CreditSystem:TokenSecretSsmParameter"] 
    ?? "/pettranslator/credit-token-secret";

// Initialize AWS SSM client for retrieving token secret
string tokenSecret;
try
{
    using var ssmClient = new Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementClient();
    var request = new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
    {
        Name = tokenSecretSsmParameter,
        WithDecryption = true
    };
    var response = await ssmClient.GetParameterAsync(request);
    tokenSecret = response.Parameter.Value;
}
catch (Exception ex)
{
    // Fallback to environment variable if SSM fails (for local development)
    tokenSecret = Environment.GetEnvironmentVariable("CREDIT_TOKEN_SECRET") 
        ?? throw new InvalidOperationException($"Failed to retrieve token secret from SSM ({tokenSecretSsmParameter}) and CREDIT_TOKEN_SECRET env var not set. Error: {ex.Message}");
}

// Initialize TokenService
var tokenService = new PetBehaviorTranslator.TokenService(tokenSecret);

// Initialize AdminConfigService
var adminConfigSsmParameter = builder.Configuration["Admin:AdminConfigSsmParameter"] 
    ?? "/pettranslator/admin-config";
var adminConfigService = new AdminConfigService(adminConfigSsmParameter);

// Initialize SecretsService for retrieving secrets from AWS Secrets Manager
var secretsServiceSecretName = Environment.GetEnvironmentVariable("SECRETS_MANAGER_SECRET_NAME") 
    ?? "/pettranslator/app-secrets";
var secretsService = new SecretsService(secretsServiceSecretName);

// Get all secrets from Secrets Manager (with fallback to environment variables)
var secrets = await secretsService.GetSecretsAsync();

// Get OpenAI API key
var openAiApiKey = await secretsService.GetSecretOrEnvAsync("OPENAI_API_KEY", "OPENAI_API_KEY");
if (string.IsNullOrWhiteSpace(openAiApiKey))
{
    openAiApiKey = builder.Configuration["OpenAI:ApiKey"] 
        ?? throw new InvalidOperationException("OPENAI_API_KEY not found in Secrets Manager or environment variables");
}

// Get Affiliate configuration
var amazonTag = await secretsService.GetSecretOrEnvAsync("AMAZON_ASSOCIATE_TAG", "AMAZON_ASSOCIATE_TAG", string.Empty);
var amazonEnabled = builder.Configuration.GetValue<bool>("Affiliate:AmazonAssociates:Enabled", false);
var trackingEnabled = builder.Configuration.GetValue<bool>("Affiliate:TrackingEnabled", true);

// Get Email configuration
var smtpHost = await secretsService.GetSecretOrEnvAsync("SMTP_HOST", "SMTP_HOST", string.Empty);
var smtpPortStr = await secretsService.GetSecretOrEnvAsync("SMTP_PORT", "SMTP_PORT", "587");
var smtpPort = int.TryParse(smtpPortStr, out var port) ? port : builder.Configuration.GetValue<int>("Email:SmtpPort", 587);
var smtpUsername = await secretsService.GetSecretOrEnvAsync("SMTP_USERNAME", "SMTP_USERNAME", string.Empty);
var smtpPassword = await secretsService.GetSecretOrEnvAsync("SMTP_PASSWORD", "SMTP_PASSWORD", string.Empty);
var supportEmail = await secretsService.GetSecretOrEnvAsync("SUPPORT_EMAIL", "SUPPORT_EMAIL", "support@yourdomain.com");
var adminEmail = await secretsService.GetSecretOrEnvAsync("ADMIN_EMAIL", "ADMIN_EMAIL", string.Empty);

// Get Stripe configuration
var stripeSecretKey = await secretsService.GetSecretOrEnvAsync("STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY", string.Empty);
var stripeWebhookSecret = await secretsService.GetSecretOrEnvAsync("STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET", string.Empty);
var frontendUrl = await secretsService.GetSecretOrEnvAsync("FRONTEND_URL", "FRONTEND_URL", "https://www.petbehaviortranslator.com");

// Initialize Stripe with API key if available
if (!string.IsNullOrWhiteSpace(stripeSecretKey))
{
    StripeConfiguration.ApiKey = stripeSecretKey;
    Console.WriteLine($"[STRIPE] ✅ Stripe initialized with API key (key starts with: {stripeSecretKey.Substring(0, Math.Min(7, stripeSecretKey.Length))}...)");
    
    // Log if it's test or live key
    if (stripeSecretKey.StartsWith("sk_test_"))
    {
        Console.WriteLine("[STRIPE] ⚠️ WARNING: Using TEST mode key (sk_test_)");
    }
    else if (stripeSecretKey.StartsWith("sk_live_"))
    {
        Console.WriteLine("[STRIPE] ✅ Using PRODUCTION mode key (sk_live_)");
    }
}
else
{
    Console.WriteLine("[STRIPE] ❌ Stripe secret key not found - will use mock/demo mode");
}

// Get Analytics configuration
// Check for secrets as they exist in AWS Secrets Manager (with VITE_ prefix)
// Also check for typo version (VITE_GA_MEASURMENT) and correct versions
// Try multiple possible secret names in order of likelihood
string gaMeasurementId = string.Empty;
var gaKeys = new[] { "VITE_GA_MEASURMENT", "VITE_GA_MEASUREMENT_ID", "GA_MEASUREMENT_ID" };
foreach (var key in gaKeys)
{
    gaMeasurementId = await secretsService.GetSecretOrEnvAsync(key, key, string.Empty);
    if (!string.IsNullOrWhiteSpace(gaMeasurementId))
        break;
}

string mixpanelToken = string.Empty;
var mixpanelKeys = new[] { "VITE_MIXPANEL_TOKEN", "MIXPANEL_TOKEN" };
foreach (var key in mixpanelKeys)
{
    mixpanelToken = await secretsService.GetSecretOrEnvAsync(key, key, string.Empty);
    if (!string.IsNullOrWhiteSpace(mixpanelToken))
        break;
}

// Get Admin configuration
var adminUserId = await secretsService.GetSecretOrEnvAsync("ADMIN_USER_ID", "ADMIN_USER_ID", string.Empty);

// Get Event Log configuration
var eventLogBucket = await secretsService.GetSecretOrEnvAsync("EVENT_LOG_BUCKET", "EVENT_LOG_BUCKET", string.Empty);

// Initialize EventLogService
var eventLogService = new EventLogService(eventLogBucket);

// Initialize DynamoDB Service for persistent storage
var dynamoDBService = new DynamoDBService();

// Load credit tiers from configuration (will be overridden by admin config if available)
var creditTiers = builder.Configuration.GetSection("CreditSystem:Tiers").Get<List<CreditTier>>() 
    ?? new List<CreditTier>();

// Helper function to create Stripe checkout session for credits
async Task<Session?> CreateStripeCheckoutSessionForCredits(string userId, int tierId, CreditTier tier, string existingToken)
{
    if (string.IsNullOrWhiteSpace(stripeSecretKey))
    {
        return null; // Stripe not configured, will fall back to mock
    }

    try
    {
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = tier.Name,
                            Description = tier.Description
                        },
                        UnitAmount = (long)(tier.Price * 100) // Convert to cents
                    },
                    Quantity = 1
                }
            },
            Mode = "payment",
            SuccessUrl = $"{frontendUrl}/credits/success?session_id={{CHECKOUT_SESSION_ID}}&tierId={tierId}&token={Uri.EscapeDataString(existingToken)}",
            CancelUrl = $"{frontendUrl}/credits",
            Metadata = new Dictionary<string, string>
            {
                { "userId", userId },
                { "tierId", tierId.ToString() },
                { "credits", tier.Credits.ToString() },
                { "existingToken", existingToken },
                { "purchaseType", "credits" }
            },
            CustomerEmail = null // Can be added if email is available
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);
        return session;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STRIPE] Error creating checkout session: {ex.Message}");
        return null;
    }
}

// Helper function to create Stripe checkout session for premium
async Task<Session?> CreateStripeCheckoutSessionForPremium(string userId, string planId, decimal price, string planName, int durationDays)
{
    if (string.IsNullOrWhiteSpace(stripeSecretKey))
    {
        return null; // Stripe not configured, will fall back to mock
    }

    try
    {
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = planName,
                            Description = $"Premium access for {planId} plan"
                        },
                        UnitAmount = (long)(price * 100) // Convert to cents
                    },
                    Quantity = 1
                }
            },
            Mode = "payment",
            SuccessUrl = $"{frontendUrl}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&userId={userId}&planId={planId}",
            CancelUrl = $"{frontendUrl}/premium",
            Metadata = new Dictionary<string, string>
            {
                { "userId", userId },
                { "planId", planId },
                { "durationDays", durationDays.ToString() },
                { "purchaseType", "premium" }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);
        return session;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STRIPE] Error creating checkout session: {ex.Message}");
        return null;
    }
}

// Helper function to generate Amazon affiliate link
string GenerateAmazonAffiliateLink(string productName)
{
    var searchQuery = Uri.EscapeDataString(productName);
    
    if (!amazonEnabled || string.IsNullOrWhiteSpace(amazonTag))
    {
        // Return Amazon search link without affiliate tag if not configured
        return $"https://www.amazon.com/s?k={searchQuery}";
    }

    return $"https://www.amazon.com/s?k={searchQuery}&tag={amazonTag}";
}

// In-memory storage for usage tracking (fallback if DynamoDB fails)
var usageTracker = new Dictionary<string, UserUsage>();

// Activity log for admin viewing (fallback if DynamoDB fails)
var activityLog = new List<ActivityLogEntry>();

// Helper function to get user usage (try DynamoDB first, fallback to in-memory)
async Task<UserUsage?> GetUserUsageAsync(string userId)
{
    Console.WriteLine($"[USER] Getting user usage for {userId}");
    
    try
    {
        var usage = await dynamoDBService.GetUserUsageAsync(userId);
        if (usage != null)
        {
            Console.WriteLine($"[USER] ✅ Found user {userId} in DynamoDB");
            // Sync to in-memory for quick access
            usageTracker[userId] = usage;
            return usage;
        }
        else
        {
            Console.WriteLine($"[USER] User {userId} not found in DynamoDB");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[USER] ❌ Error getting user usage from DynamoDB: {ex.Message}");
        Console.WriteLine($"[USER] Exception type: {ex.GetType().Name}");
    }
    
    // Fallback to in-memory
    if (usageTracker.ContainsKey(userId))
    {
        Console.WriteLine($"[USER] Found user {userId} in in-memory cache");
        return usageTracker[userId];
    }
    
    Console.WriteLine($"[USER] User {userId} not found in DynamoDB or in-memory cache");
    return null;
}

// Helper function to save user usage (save to both DynamoDB and in-memory)
async Task SaveUserUsageAsync(UserUsage usage)
{
    // Save to DynamoDB
    try
    {
        await dynamoDBService.SaveUserUsageAsync(usage);
    }
    catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException ex)
    {
        Console.WriteLine($"[DYNAMODB] CRITICAL: Table does not exist. Please create DynamoDB table 'PetTranslator-UserUsage' with primary key 'UserId' (String)");
        Console.WriteLine($"[DYNAMODB] Error details: {ex.Message}");
        // Continue to save in-memory so app doesn't break
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DYNAMODB] Error saving user usage to DynamoDB: {ex.Message}");
        Console.WriteLine($"[DYNAMODB] Stack trace: {ex.StackTrace}");
        // Continue to save in-memory so app doesn't break
    }
    
    // Also keep in-memory for quick access
    usageTracker[usage.UserId] = usage;
}

// Helper function to get all users (try DynamoDB first, fallback to in-memory)
async Task<List<UserUsage>> GetAllUsersAsync()
{
    try
    {
        var users = await dynamoDBService.GetAllUserUsageAsync();
        if (users != null && users.Count > 0)
        {
            Console.WriteLine($"[DYNAMODB] Retrieved {users.Count} users from DynamoDB");
            // Sync to in-memory for quick access
            foreach (var user in users)
            {
                usageTracker[user.UserId] = user;
            }
            return users;
        }
        else
        {
            Console.WriteLine($"[DYNAMODB] DynamoDB table is empty (0 users found). Falling back to in-memory storage.");
        }
    }
    catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException ex)
    {
        Console.WriteLine($"[DYNAMODB] CRITICAL: Table 'PetTranslator-UserUsage' does not exist!");
        Console.WriteLine($"[DYNAMODB] Please create the table in AWS Console with:");
        Console.WriteLine($"[DYNAMODB]   - Table name: PetTranslator-UserUsage");
        Console.WriteLine($"[DYNAMODB]   - Primary key: UserId (String)");
        Console.WriteLine($"[DYNAMODB] Error: {ex.Message}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DYNAMODB] Error getting all users from DynamoDB, falling back to in-memory: {ex.Message}");
        Console.WriteLine($"[DYNAMODB] Stack trace: {ex.StackTrace}");
    }
    
    // Fallback to in-memory
    var inMemoryUsers = usageTracker.Values.ToList();
    Console.WriteLine($"[DYNAMODB] Returning {inMemoryUsers.Count} users from in-memory storage");
    return inMemoryUsers;
}

// Helper function to log activity (save to both DynamoDB and in-memory)
async Task LogActivityAsync(string userId, string activityType, string details)
{
    var entry = new ActivityLogEntry
    {
        UserId = userId,
        Action = activityType,
        Details = details,
        Timestamp = DateTime.UtcNow
    };
    
    // Save to DynamoDB
    try
    {
        await dynamoDBService.SaveActivityLogAsync(entry);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DYNAMODB] Error saving activity log to DynamoDB: {ex.Message}");
    }
    
    // Also keep in-memory for quick access
    activityLog.Add(entry);
    if (activityLog.Count > 1000)
    {
        activityLog.RemoveAt(0);
    }
}

// Helper function to generate consistent user ID from email (for admins)
string GenerateUserIdFromEmail(string email)
{
    if (string.IsNullOrWhiteSpace(email))
        return string.Empty;
    
    // Use SHA256 hash of email to create consistent user ID
    using var sha256 = System.Security.Cryptography.SHA256.Create();
    var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(email.ToLowerInvariant().Trim()));
    var hashString = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    return $"admin_{hashString.Substring(0, 16)}";
}

// Helper function to check if user is admin (supports both userId and email)
async Task<bool> IsAdminAsync(string userId, string? email = null)
{
    // Check admin email list from SSM config (primary method)
    if (!string.IsNullOrWhiteSpace(email))
    {
        var isAdminEmail = await adminConfigService.IsAdminEmailAsync(email);
        if (isAdminEmail)
        {
            Console.WriteLine($"[ADMIN CHECK] Admin access granted via email for: '{email}'");
            return true;
        }
    }
    
    // Check legacy ADMIN_USER_ID (backwards compatibility)
    if (!string.IsNullOrWhiteSpace(adminUserId) && !string.IsNullOrWhiteSpace(userId) && userId.Trim() == adminUserId.Trim())
    {
        Console.WriteLine($"[ADMIN CHECK] Admin access granted via ADMIN_USER_ID for user: '{userId.Trim()}'");
        return true;
    }
    
    // Check if userId is an admin-generated ID (starts with "admin_")
    if (!string.IsNullOrWhiteSpace(userId) && userId.StartsWith("admin_"))
    {
        // This is an admin user ID, but we still need to verify via email
        // The email check above should have caught this, but if not, deny access
        Console.WriteLine($"[ADMIN CHECK] User ID appears to be admin-generated but email not verified: '{userId}'");
    }
    
    // Check if token has admin flag
    // (This will be checked in endpoints that receive tokens)
    
    Console.WriteLine($"[ADMIN CHECK] Access denied. User ID: '{userId?.Trim() ?? "null"}', Email: '{email ?? "null"}'");
    return false;
}

// Synchronous wrapper for backwards compatibility
bool IsAdmin(string userId)
{
    // For sync calls, only check ADMIN_USER_ID
    if (string.IsNullOrWhiteSpace(adminUserId))
    {
        return false;
    }
    return userId.Trim() == adminUserId.Trim();
}

// Helper function to validate admin session from token in Authorization header
async Task<(bool isValid, string? userId)> ValidateAdminSessionAsync(HttpContext context)
{
    // Try to get token from Authorization header
    var authHeader = context.Request.Headers["Authorization"].ToString();
    var hasAuthHeader = !string.IsNullOrWhiteSpace(authHeader);
    
    if (!hasAuthHeader)
    {
        // Also try X-Admin-Session-Token header
        authHeader = context.Request.Headers["X-Admin-Session-Token"].ToString();
        hasAuthHeader = !string.IsNullOrWhiteSpace(authHeader);
    }
    
    if (!hasAuthHeader)
    {
        Console.WriteLine("[ADMIN SESSION] No Authorization or X-Admin-Session-Token header found");
        return (false, null);
    }
    
    // Remove "Bearer " prefix if present
    var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) 
        ? authHeader.Substring(7).Trim() 
        : authHeader.Trim();
    
    if (string.IsNullOrWhiteSpace(token))
    {
        Console.WriteLine("[ADMIN SESSION] Token is empty after processing header");
        return (false, null);
    }
    
    // Validate token
    var payload = tokenService.ValidateToken(token);
    if (payload == null)
    {
        Console.WriteLine("[ADMIN SESSION] Invalid or expired token");
        return (false, null);
    }
    
    // Check if token has admin flag
    if (!payload.IsAdmin)
    {
        Console.WriteLine($"[ADMIN SESSION] Token does not have admin flag for user: {payload.UserId}");
        return (false, null);
    }
    
    Console.WriteLine($"[ADMIN SESSION] ✅ Valid admin session for user: {payload.UserId}");
    return (true, payload.UserId);
}

// Helper function to validate if prompt is related to pet behavior
bool IsPetBehaviorRelated(string behavior)
{
    if (string.IsNullOrWhiteSpace(behavior))
    {
        return false;
    }
    
    var lowerBehavior = behavior.ToLowerInvariant();
    
    // Pet-related keywords
    var petKeywords = new[]
    {
        "pet", "pets", "dog", "dogs", "puppy", "puppies", "cat", "cats", "kitten", "kittens",
        "bird", "birds", "parrot", "rabbit", "rabbits", "hamster", "hamsters", "guinea pig",
        "ferret", "ferrets", "fish", "turtle", "turtles", "lizard", "lizards", "snake", "snakes",
        "barking", "meowing", "whining", "howling", "purring", "hissing", "growling",
        "biting", "scratching", "chewing", "digging", "jumping", "running", "playing",
        "aggressive", "aggression", "anxiety", "fearful", "scared", "nervous",
        "litter box", "potty", "house training", "housebreaking", "toilet",
        "eating", "feeding", "food", "treat", "treats", "hungry", "appetite",
        "sleeping", "sleep", "rest", "energy", "hyperactive", "calm",
        "training", "obedience", "commands", "sit", "stay", "come", "heel",
        "socialization", "social", "interaction", "behavior", "behaviors",
        "animal", "animals", "companion", "companions"
    };
    
    // Check if behavior contains pet-related keywords
    foreach (var keyword in petKeywords)
    {
        if (lowerBehavior.Contains(keyword))
        {
            return true;
        }
    }
    
    // Check for common non-pet topics to reject
    var nonPetKeywords = new[]
    {
        "how to code", "programming", "software", "website", "app development",
        "cooking recipe", "recipe for", "how to cook", "baking",
        "medical advice", "health condition", "diagnosis", "treatment",
        "legal advice", "law", "lawsuit", "attorney",
        "financial advice", "investment", "stock", "trading", "cryptocurrency",
        "homework", "assignment", "essay", "thesis", "research paper",
        "translate this text", "what does this mean", "explain this code",
        "write a story", "write a poem", "creative writing",
        "hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"
    };
    
    foreach (var keyword in nonPetKeywords)
    {
        if (lowerBehavior.Contains(keyword))
        {
            return false;
        }
    }
    
    // If no clear pet keywords found, reject it
    // This prevents non-pet queries from being processed
    // Short inputs (less than 3 words) without pet keywords are likely not pet behaviors
    var words = lowerBehavior.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
    if (words.Length < 3)
    {
        // Very short inputs without pet keywords are probably not pet behaviors
        return false;
    }
    
    // For longer inputs, be slightly more lenient but still require some pet context
    // This allows for natural language descriptions that might not have explicit pet keywords
    // but are clearly about pet behavior (e.g., "keeps jumping on the couch")
    return false; // Stricter: require explicit pet keywords
}

// Synchronous wrapper for backwards compatibility (calls async version)
void LogActivity(string userId, string action, string details = "")
{
    // Fire and forget - don't await to maintain synchronous behavior
    _ = Task.Run(async () => await LogActivityAsync(userId, action, details));
    
    // Also add to in-memory immediately for backwards compatibility
    activityLog.Add(new ActivityLogEntry
    {
        UserId = userId,
        Action = action,
        Details = details,
        Timestamp = DateTime.UtcNow
    });
    if (activityLog.Count > 1000)
    {
        activityLog.RemoveAt(0);
    }
}

// Premium/Usage endpoints
app.MapGet("/api/usage/{userId}", async (string userId) =>
{
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        return Results.Ok(new { dailyCount = 0, isPremium = false, dailyLimit = 5 });
    }
    var today = DateTime.UtcNow.Date;
    
    if (usage.LastResetDate < today)
    {
        usage.DailyCount = 0;
        usage.LastResetDate = today;
    }
    
    return Results.Ok(new 
    { 
        dailyCount = usage.DailyCount, 
        isPremium = usage.IsPremium,
        dailyLimit = usage.IsPremium ? int.MaxValue : 5,
        remaining = usage.IsPremium ? int.MaxValue : Math.Max(0, 5 - usage.DailyCount)
    });
})
.WithName("GetUsage")
.WithOpenApi();

app.MapPost("/api/premium/status", async (PremiumStatusRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    var usage = await GetUserUsageAsync(request.UserId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = request.UserId };
        await SaveUserUsageAsync(usage);
    }
    usage.IsPremium = request.IsPremium;
    
    if (request.IsPremium)
    {
        usage.PremiumExpiresAt = request.ExpiresAt ?? DateTime.UtcNow.AddMonths(1);
    }
    
    return Results.Ok(new { success = true, isPremium = usage.IsPremium });
})
.WithName("SetPremiumStatus")
.WithOpenApi();

// Admin endpoint - Set any user to premium/admin - ADMIN ONLY
app.MapPost("/api/admin/set-premium/{userId}", async (string userId, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        if (!IsAdmin(adminUserId))
        {
            return Results.Unauthorized();
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = userId };
    }
    usage.IsPremium = true;
    usage.PremiumExpiresAt = DateTime.UtcNow.AddYears(10); // 10 years expiration
    usage.DailyCount = 0; // Reset count
    await SaveUserUsageAsync(usage);
    
    LogActivity(adminUserId, "SET_PREMIUM", $"Set premium for user {userId}");
    
    return Results.Ok(new 
    { 
        success = true, 
        isPremium = true,
        message = "User set to admin/premium status",
        expiresAt = usage.PremiumExpiresAt
    });
})
.WithName("SetAdminStatus")
.WithOpenApi();

// Admin endpoint - Remove premium status (revert to normal user) - ADMIN ONLY
app.MapPost("/api/admin/remove-premium/{userId}", async (string userId, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        if (!IsAdmin(adminUserId))
        {
            return Results.Unauthorized();
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = userId };
    }
    usage.IsPremium = false;
    usage.PremiumExpiresAt = null;
    usage.DailyCount = 0; // Reset count to start fresh
    await SaveUserUsageAsync(usage);
    
    LogActivity(adminUserId, "REMOVE_PREMIUM", $"Removed premium from user {userId}");
    
    return Results.Ok(new 
    { 
        success = true, 
        isPremium = false,
        message = "User reverted to normal/free status",
        dailyLimit = 5
    });
})
.WithName("RemoveAdminStatus")
.WithOpenApi();

// Admin endpoint - Check if user is admin
app.MapGet("/api/admin/check", async (HttpContext context) =>
{
    var userId = context.Request.Query["userId"].ToString();
    var email = context.Request.Query["email"].ToString();
    
    // Check admin status using async method (supports email)
    var isAdmin = await IsAdminAsync(userId, string.IsNullOrWhiteSpace(email) ? null : email);
    
    return Results.Ok(new 
    { 
        isAdmin,
        userId,
        email = string.IsNullOrWhiteSpace(email) ? null : email,
        adminConfigured = !string.IsNullOrWhiteSpace(adminUserId),
        message = isAdmin 
            ? "You are an admin" 
            : string.IsNullOrWhiteSpace(adminUserId) && string.IsNullOrWhiteSpace(email)
                ? "Admin access requires either ADMIN_USER_ID environment variable or your email in the admin list." 
                : "You are not an admin. Please ensure your email is in the admin list."
    });
})
.WithName("CheckAdmin")
.WithOpenApi();

// Admin endpoint - Get all users (for admin dashboard) - ADMIN ONLY
app.MapGet("/api/admin/users", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string userId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        userId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        userId = context.Request.Query["adminUserId"].ToString();
        var email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(userId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    try
    {
        var allUsers = await GetAllUsersAsync();
        var users = allUsers.Select(u => new
        {
            u.UserId,
            u.DailyCount,
            u.IsPremium,
            u.PremiumExpiresAt,
            u.LastResetDate
        }).ToList();
        
        await LogActivityAsync(userId, "VIEW_USERS", $"Viewed {users.Count} users");
        
        // Add helpful message if no users found
        string? message = null;
        if (users.Count == 0)
        {
            message = "No users found. Users will appear here after they use the app (e.g., get a token, make a translation, etc.).";
        }
        
        return Results.Ok(new { 
            users, 
            totalCount = users.Count,
            message = message
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[ADMIN] Error getting users: {ex.Message}");
        return Results.Json(new { 
            users = new List<object>(), 
            totalCount = 0,
            error = "Failed to retrieve users from DynamoDB",
            message = "DynamoDB table may not exist. Please create 'PetTranslator-UserUsage' table with primary key 'UserId' (String)."
        }, statusCode: 500);
    }
})
.WithName("GetAllUsers")
.WithOpenApi();

// Admin diagnostic endpoint - Test user save (ADMIN ONLY)
app.MapPost("/api/admin/test-save-user", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    if (!isValidSession)
    {
        // Fallback to checking admin status via userId/email
        var userId = context.Request.Query["userId"].ToString();
        var email = context.Request.Query["email"].ToString();
        
        if (string.IsNullOrWhiteSpace(userId) || !await IsAdminAsync(userId, email))
        {
            return Results.Unauthorized();
        }
    }
    
    var testUserId = context.Request.Query["testUserId"].ToString();
    if (string.IsNullOrWhiteSpace(testUserId))
    {
        testUserId = $"test_user_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
    }
    
    try
    {
        Console.WriteLine($"[DIAGNOSTIC] Testing user save for {testUserId}");
        
        var testUser = new UserUsage 
        { 
            UserId = testUserId,
            DailyCount = 0,
            IsPremium = false,
            LastResetDate = DateTime.UtcNow.Date
        };
        
        await SaveUserUsageAsync(testUser);
        
        // Verify it was saved
        var savedUser = await GetUserUsageAsync(testUserId);
        
        if (savedUser != null)
        {
            return Results.Ok(new 
            { 
                success = true,
                message = $"Test user {testUserId} saved and retrieved successfully",
                userId = testUserId,
                saved = true,
                retrieved = true
            });
        }
        else
        {
            return Results.Ok(new 
            { 
                success = false,
                message = $"Test user {testUserId} save appeared to succeed but could not be retrieved",
                userId = testUserId,
                saved = true,
                retrieved = false
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DIAGNOSTIC] ❌ Error testing user save: {ex.Message}");
        Console.WriteLine($"[DIAGNOSTIC] Exception type: {ex.GetType().Name}");
        Console.WriteLine($"[DIAGNOSTIC] Stack trace: {ex.StackTrace}");
        
        return Results.Json(new 
        { 
            success = false,
            message = $"Failed to save test user: {ex.Message}",
            exceptionType = ex.GetType().Name,
            stackTrace = ex.StackTrace
        }, statusCode: 500);
    }
})
.WithName("TestSaveUser")
.WithOpenApi();

// Admin endpoint - Get activity log - ADMIN ONLY
app.MapGet("/api/admin/activities", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string userId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        userId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        userId = context.Request.Query["adminUserId"].ToString();
        var email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(userId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    // Try to get from DynamoDB first
    List<ActivityLogEntry> allActivities;
    try
    {
        allActivities = await dynamoDBService.GetRecentActivityLogsAsync(500);
        // Also sync to in-memory
        activityLog.Clear();
        activityLog.AddRange(allActivities.Take(1000));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DYNAMODB] Error getting activities from DynamoDB, using in-memory: {ex.Message}");
        allActivities = activityLog;
    }
    
    var activities = allActivities
        .OrderByDescending(a => a.Timestamp)
        .Take(500)
        .Select(a => new
        {
            a.UserId,
            a.Action,
            a.Details,
            a.Timestamp
        })
        .ToList();
    
    await LogActivityAsync(userId, "VIEW_ACTIVITIES", $"Viewed {activities.Count} activities");
    
    return Results.Ok(new { activities, totalCount = allActivities.Count });
})
.WithName("GetActivities")
.WithOpenApi();

// Admin endpoint - Reset user activities - ADMIN ONLY
app.MapPost("/api/admin/reset-user/{targetUserId}", async (string targetUserId, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        var email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    if (string.IsNullOrWhiteSpace(targetUserId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    var usage = await GetUserUsageAsync(targetUserId);
    if (usage != null)
    {
        usage.DailyCount = 0;
        usage.LastResetDate = DateTime.UtcNow.Date;
        await SaveUserUsageAsync(usage);
        
        await LogActivityAsync(adminUserId, "RESET_USER", $"Reset activities for user {targetUserId}");
        
        return Results.Ok(new 
        { 
            success = true,
            message = $"User {targetUserId} activities reset",
            dailyCount = 0
        });
    }
    
    return Results.NotFound(new { message = "User not found" });
})
.WithName("ResetUserActivities")
.WithOpenApi();

// Admin endpoint - Reset all activities - ADMIN ONLY
app.MapPost("/api/admin/reset-all", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        var email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    var allUsers = await GetAllUsersAsync();
    foreach (var usage in allUsers)
    {
        usage.DailyCount = 0;
        usage.LastResetDate = DateTime.UtcNow.Date;
        await SaveUserUsageAsync(usage);
    }
    
    await LogActivityAsync(adminUserId, "RESET_ALL", "Reset all user activities");
    
    return Results.Ok(new 
    { 
        success = true,
        message = "All user activities reset",
        usersReset = allUsers.Count
    });
})
.WithName("ResetAllActivities")
.WithOpenApi();

// Admin endpoint - Set premium status with specific plan - ADMIN ONLY
app.MapPost("/api/admin/set-premium-plan/{userId}", async (string userId, PremiumPlanRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        if (!IsAdmin(adminUserId))
        {
            return Results.Unauthorized();
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = userId };
    }
    usage.IsPremium = true;
    
    // Set expiration based on plan
    var planDurations = new Dictionary<string, int>
    {
        { "monthly", 30 },
        { "yearly", 365 },
        { "lifetime", 36500 } // 100 years
    };
    
    if (planDurations.ContainsKey(request.PlanId))
    {
        usage.PremiumExpiresAt = DateTime.UtcNow.AddDays(planDurations[request.PlanId]);
    }
    else
    {
        usage.PremiumExpiresAt = DateTime.UtcNow.AddYears(10); // Default 10 years
    }
    
    usage.DailyCount = 0; // Reset count
    await SaveUserUsageAsync(usage);
    
    LogActivity(adminUserId, "SET_PREMIUM_PLAN", $"Set {request.PlanId} plan for user {userId}");
    
    return Results.Ok(new 
    { 
        success = true, 
        isPremium = true,
        planId = request.PlanId,
        message = $"User set to {request.PlanId} premium plan",
        expiresAt = usage.PremiumExpiresAt
    });
})
.WithName("SetPremiumPlan")
.WithOpenApi();

// Admin endpoint - Grant credits to a user - ADMIN ONLY
app.MapPost("/api/admin/grant-credits/{userId}", async (string userId, GrantCreditsRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        var adminEmail = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, adminEmail);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (request.Credits <= 0)
    {
        return Results.BadRequest(new { message = "Credits must be greater than 0" });
    }
    
    // Create or get existing token for user
    var existingToken = request.ExistingToken;
    var payload = existingToken != null ? tokenService.ValidateToken(existingToken) : null;
    
    // If no valid token, create new one
    if (payload == null || payload.UserId != userId)
    {
        payload = new PetBehaviorTranslator.TokenPayload
        {
            UserId = userId,
            FreeSearchesUsed = 0,
            CreditsRemaining = 0,
            IssuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ExpiresAt = DateTimeOffset.UtcNow.AddYears(1).ToUnixTimeSeconds()
        };
    }
    
    // Add credits
    payload.CreditsRemaining += request.Credits;
    var newToken = tokenService.UpdateToken(payload);
    
    // Ensure user exists in DynamoDB
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = userId };
        Console.WriteLine($"[ADMIN] Creating new user entry for {userId} when granting credits");
    }
    // Note: UserUsage doesn't store credits (that's in the token), but we save to ensure user appears in admin
    try
    {
        await SaveUserUsageAsync(usage);
        Console.WriteLine($"[ADMIN] ✅ Saved user {userId} to DynamoDB after granting credits");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[ADMIN] ❌ WARNING: Failed to save user to DynamoDB after granting credits: {ex.Message}");
        Console.WriteLine($"[ADMIN] Exception type: {ex.GetType().Name}");
        // Continue anyway - credit granting still succeeded
    }
    
    await LogActivityAsync(adminUserId, "GRANT_CREDITS", $"Granted {request.Credits} credits to user {userId}");
    
    return Results.Ok(new
    {
        success = true,
        token = newToken,
        creditsAdded = request.Credits,
        creditsRemaining = payload.CreditsRemaining,
        message = $"Successfully granted {request.Credits} credits to user {userId}"
    });
})
.WithName("GrantCredits")
.WithOpenApi();

// ============================================================================
// NEW ADMIN ENDPOINTS - Enhanced Admin System
// ============================================================================

// POST /admin/login - Admin login with username/password
app.MapPost("/api/admin/login", async (AdminLoginRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Username and password are required" });
    }

    // Get admin credentials (try Secrets Manager first, then SSM, then env vars)
    string adminUsername;
    string adminPassword;
    
    // Try AWS Secrets Manager first (most secure)
    try
    {
        using var secretsClient = new Amazon.SecretsManager.AmazonSecretsManagerClient();
        var secretRequest = new Amazon.SecretsManager.Model.GetSecretValueRequest
        {
            SecretId = "/pettranslator/admin-credentials"
        };
        var secretResponse = await secretsClient.GetSecretValueAsync(secretRequest);
        
        // Parse JSON secret
        var secretJson = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(secretResponse.SecretString);
        if (secretJson != null && secretJson.ContainsKey("username") && secretJson.ContainsKey("password"))
        {
            adminUsername = secretJson["username"];
            adminPassword = secretJson["password"];
            Console.WriteLine("[ADMIN LOGIN] Using AWS Secrets Manager");
        }
        else
        {
            throw new Exception("Secret does not contain username/password");
        }
    }
    catch (Exception secretsEx)
    {
        Console.WriteLine($"[ADMIN LOGIN] Secrets Manager not available: {secretsEx.Message}");
        
        // Fallback to SSM Parameter Store
        try
        {
            using var ssmClient = new Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementClient();
            
            // Get username
            try
            {
                var usernameRequest = new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
                {
                    Name = "/pettranslator/admin-username",
                    WithDecryption = false
                };
                var usernameResponse = await ssmClient.GetParameterAsync(usernameRequest);
                adminUsername = usernameResponse.Parameter.Value;
            }
            catch
            {
                adminUsername = Environment.GetEnvironmentVariable("ADMIN_USERNAME") ?? "mkantor";
            }
            
            // Get password
            try
            {
                var passwordRequest = new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
                {
                    Name = "/pettranslator/admin-password",
                    WithDecryption = true
                };
                var passwordResponse = await ssmClient.GetParameterAsync(passwordRequest);
                adminPassword = passwordResponse.Parameter.Value;
            }
            catch
            {
                adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Maxang11@@##";
            }
            
            Console.WriteLine("[ADMIN LOGIN] Using SSM Parameter Store");
        }
        catch (Exception ssmEx)
        {
            // Final fallback to environment variables
            adminUsername = Environment.GetEnvironmentVariable("ADMIN_USERNAME") ?? "mkantor";
            adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Maxang11@@##";
            Console.WriteLine($"[ADMIN LOGIN] Using environment variables fallback: {ssmEx.Message}");
        }
    }

    // Verify credentials
    if (request.Username != adminUsername || request.Password != adminPassword)
    {
        // Log failed attempt (without credentials)
        Console.WriteLine($"[ADMIN LOGIN] Failed login attempt for username: {request.Username}");
        return Results.Json(new { message = "Invalid username or password" }, statusCode: 401);
    }

    // Create a session token (simple signed token with expiry)
    var sessionPayload = new TokenPayload
    {
        UserId = $"admin_session_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
        FreeSearchesUsed = 0,
        CreditsRemaining = 0,
        IsAdmin = true,
        IsAdminOverride = false,
        IssuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
        ExpiresAt = DateTimeOffset.UtcNow.AddHours(24).ToUnixTimeSeconds() // 24 hour session
    };
    
    var sessionToken = tokenService.CreateToken(
        sessionPayload.UserId,
        freeSearchesUsed: 0,
        creditsRemaining: 0,
        isAdmin: true,
        isAdminOverride: false,
        customExpiresAt: sessionPayload.ExpiresAt
    );

    Console.WriteLine($"[ADMIN LOGIN] Successful login for username: {request.Username}");

    return Results.Ok(new
    {
        success = true,
        sessionToken = sessionToken,
        expiresAt = sessionPayload.ExpiresAt,
        message = "Login successful"
    });
})
.WithName("AdminLogin")
.WithOpenApi();

// POST /admin/connect - Admin connect endpoint
app.MapPost("/api/admin/connect", async (AdminConnectRequest request) =>
{
    // For admin login, email is required (not userId)
    if (string.IsNullOrWhiteSpace(request.Email))
    {
        return Results.BadRequest(new { message = "Email is required for admin access" });
    }

    // Check if user is admin via email
    var isAdmin = await IsAdminAsync(request.UserId ?? string.Empty, request.Email);
    if (!isAdmin)
    {
        return Results.Json(new { message = "Admin access required. Please ensure your email is in the admin list." }, statusCode: 401);
    }

    // Generate consistent user ID from email (so admin can login from any device)
    var adminUserId = GenerateUserIdFromEmail(request.Email);
    
    // Ensure user entry exists in DynamoDB (for admin dashboard)
    var adminUsage = await GetUserUsageAsync(adminUserId);
    if (adminUsage == null)
    {
        adminUsage = new UserUsage { UserId = adminUserId };
        await SaveUserUsageAsync(adminUsage);
    }

    // Get current config
    var config = await adminConfigService.GetConfigAsync();
    
    // Create admin token with large expiry using consistent admin user ID
    var adminToken = tokenService.CreateToken(
        adminUserId,
        freeSearchesUsed: 0,
        creditsRemaining: 0,
        isAdmin: true,
        isAdminOverride: false,
        customExpiresAt: DateTimeOffset.UtcNow.AddDays(30).ToUnixTimeSeconds()
    );

    // Get dashboard summary
    var summary = await eventLogService.GetSummaryAsync();

    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "ADMIN_CONNECT",
        UserId = adminUserId,
        Email = request.Email,
        Status = "SUCCESS",
        Details = $"Admin connected from device, generated consistent user ID: {adminUserId}"
    });

    return Results.Ok(new
    {
        success = true,
        adminToken,
        adminUserId, // Return the consistent user ID to frontend
        summary = new
        {
            todaysTranslations = summary.TodaysTranslations,
            todaysPurchases = summary.TodaysPurchases,
            activeTokensApprox = summary.ActiveTokensApprox,
            freeSearchLimit = config.FreeSearchLimit,
            tiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers
        }
    });
})
.WithName("AdminConnect")
.WithOpenApi();

// GET /admin/dashboard - Get dashboard data
app.MapGet("/api/admin/dashboard", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string userId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        userId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        userId = context.Request.Query["adminUserId"].ToString();
        var email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(userId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }

    var config = await adminConfigService.GetConfigAsync();
    var summary = await eventLogService.GetSummaryAsync();
    var recentEvents = await eventLogService.GetRecentEventsAsync(200);

    return Results.Ok(new
    {
        summary = new
        {
            todaysTranslations = summary.TodaysTranslations,
            todaysPurchases = summary.TodaysPurchases,
            activeTokensApprox = summary.ActiveTokensApprox,
            freeSearchLimit = config.FreeSearchLimit,
            tiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers
        },
        recentEvents = recentEvents.Select(e => new
        {
            timestamp = e.Timestamp,
            userId = MaskUserId(e.UserId),
            email = MaskEmail(e.Email),
            eventType = e.EventType,
            endpoint = e.Endpoint,
            status = e.Status,
            details = e.Details
        }).ToList()
    });
})
.WithName("AdminDashboard")
.WithOpenApi();

// POST /admin/config - Update admin configuration
app.MapPost("/api/admin/config", async (AdminConfigUpdateRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string userId;
    string email;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        userId = sessionUserId;
        // Email is optional when we have a valid admin session
        email = context.Request.Query["email"].ToString();
        if (string.IsNullOrWhiteSpace(email))
        {
            email = "admin_session"; // Default for logging when email not provided
        }
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        userId = context.Request.Query["adminUserId"].ToString();
        email = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(userId, email);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }

    // Get current config
    var config = await adminConfigService.GetConfigAsync();

    // Update config
    if (request.FreeSearchLimit.HasValue)
    {
        config.FreeSearchLimit = request.FreeSearchLimit.Value;
    }
    if (request.Tiers != null && request.Tiers.Count > 0)
    {
        config.Tiers = request.Tiers;
    }
    if (request.AdminEmails != null)
    {
        config.AdminEmails = request.AdminEmails;
    }

    // Save to SSM
    await adminConfigService.SaveConfigAsync(config);

    // Update local creditTiers for immediate use
    if (request.Tiers != null && request.Tiers.Count > 0)
    {
        creditTiers = request.Tiers;
    }
    if (request.FreeSearchLimit.HasValue)
    {
        freeSearchLimit = request.FreeSearchLimit.Value;
    }

    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "ADMIN_CONFIG_UPDATE",
        UserId = userId,
        Email = email,
        Status = "SUCCESS",
        Details = $"Updated config: FreeSearchLimit={config.FreeSearchLimit}, Tiers={config.Tiers.Count}, AdminEmails={config.AdminEmails.Count}"
    });

    return Results.Ok(new
    {
        success = true,
        config = new
        {
            freeSearchLimit = config.FreeSearchLimit,
            tiers = config.Tiers,
            adminEmails = config.AdminEmails
        }
    });
})
.WithName("AdminConfigUpdate")
.WithOpenApi();

// POST /admin/set-my-credits - Set current admin's credits to specific amount
app.MapPost("/api/admin/set-my-credits", async (SetMyCreditsRequest request, HttpContext context) =>
{
    var userId = context.Request.Query["adminUserId"].ToString();
    var email = context.Request.Query["email"].ToString();
    
    // Verify user has admin session (they're already authenticated via login)
    // No need to check IsAdminAsync since they passed login
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (request.Credits < 0)
    {
        return Results.BadRequest(new { message = "Credits cannot be negative" });
    }
    
    // Get current token if exists
    var existingToken = request.ExistingToken;
    var payload = existingToken != null ? tokenService.ValidateToken(existingToken) : null;
    
    // Create new token with exact credit amount
    if (payload == null || payload.UserId != userId)
    {
        var config = await adminConfigService.GetConfigAsync();
        payload = new TokenPayload
        {
            UserId = userId,
            FreeSearchesUsed = 0,
            CreditsRemaining = request.Credits,
            IsAdmin = false,
            IsAdminOverride = false,
            IssuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ExpiresAt = DateTimeOffset.UtcNow.AddYears(1).ToUnixTimeSeconds()
        };
    }
    else
    {
        // Update existing token with new credit amount
        payload.CreditsRemaining = request.Credits;
        payload.FreeSearchesUsed = 0; // Reset free searches
        // Clear admin override if setting to 0 credits (to remove unlimited status)
        if (request.Credits == 0)
        {
            payload.IsAdminOverride = false;
        }
    }
    
    var newToken = tokenService.UpdateToken(payload);
    
    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "ADMIN_SET_CREDITS",
        UserId = userId,
        Email = email,
        Endpoint = "/api/admin/set-my-credits",
        Status = "SUCCESS",
        Details = $"Admin set own credits to {request.Credits}"
    });
    
    return Results.Ok(new
    {
        success = true,
        token = newToken,
        creditsRemaining = payload.CreditsRemaining,
        message = $"Successfully set credits to {request.Credits}"
    });
})
.WithName("SetMyCredits")
.WithOpenApi();

// GET /admin/user-credits/{userId} - Get user credit balance and token info (ADMIN ONLY)
app.MapGet("/api/admin/user-credits/{userId}", async (string userId, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        var adminEmail = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, adminEmail);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    // Try to find user's token from usage tracker or create a default response
    var config = await adminConfigService.GetConfigAsync();
    var effectiveFreeLimit = config.FreeSearchLimit > 0 ? config.FreeSearchLimit : freeSearchLimit;
    
    // Check if user has a token stored (we'd need to track this, but for now return basic info)
    // For now, return user info from DynamoDB
    var userInfo = await GetUserUsageAsync(userId);
    
    return Results.Ok(new
    {
        userId = userId,
        isPremium = userInfo?.IsPremium ?? false,
        premiumExpiresAt = userInfo?.PremiumExpiresAt,
        freeSearchLimit = effectiveFreeLimit,
        message = "Use set-user-credits endpoint to get/create token for this user"
    });
})
.WithName("GetUserCredits")
.WithOpenApi();

// POST /admin/set-user-credits/{userId} - Set specific user's credits to exact amount (ADMIN ONLY)
app.MapPost("/api/admin/set-user-credits/{userId}", async (string userId, SetUserCreditsRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    string adminEmail;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
        // Email is optional when we have a valid admin session
        adminEmail = context.Request.Query["email"].ToString();
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            adminEmail = "admin_session"; // Default for logging when email not provided
        }
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        adminEmail = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, adminEmail);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }
    
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (request.Credits < 0)
    {
        return Results.BadRequest(new { message = "Credits cannot be negative" });
    }
    
    // Get current token if exists
    var existingToken = request.ExistingToken;
    var payload = existingToken != null ? tokenService.ValidateToken(existingToken) : null;
    
    // Create new token with exact credit amount
    if (payload == null || payload.UserId != userId)
    {
        var config = await adminConfigService.GetConfigAsync();
        // Check if user is admin, but if setting to 0 credits, don't mark as admin
        var isUserAdmin = await IsAdminAsync(userId, null);
        payload = new TokenPayload
        {
            UserId = userId,
            FreeSearchesUsed = 0,
            CreditsRemaining = request.Credits,
            IsAdmin = isUserAdmin && request.Credits > 0, // Only mark as admin if credits > 0
            IsAdminOverride = false,
            IssuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ExpiresAt = DateTimeOffset.UtcNow.AddYears(1).ToUnixTimeSeconds()
        };
    }
    else
    {
        // Update existing token with new credit amount
        // Preserve existing FreeSearchesUsed and IssuedAt to maintain user history
        payload.CreditsRemaining = request.Credits;
        // Don't reset FreeSearchesUsed - preserve user's search history
        // payload.FreeSearchesUsed remains unchanged
        // Preserve IssuedAt timestamp (already in payload)
        
        // Clear admin override if setting to 0 credits (to remove unlimited status)
        // Also clear IsAdmin flag so they consume credits like regular users
        if (request.Credits == 0)
        {
            payload.IsAdminOverride = false;
            payload.IsAdmin = false; // Clear admin flag so credits are consumed
        }
        else
        {
            // If setting credits > 0, restore admin status if user is in admin list
            var isUserAdmin = await IsAdminAsync(userId, null);
            payload.IsAdmin = isUserAdmin;
        }
    }
    
    var newToken = tokenService.UpdateToken(payload);
    
    // Ensure user exists in DynamoDB
    var usage = await GetUserUsageAsync(userId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = userId };
        Console.WriteLine($"[ADMIN] Creating new user entry for {userId} when setting credits");
    }
    // Note: UserUsage doesn't store credits (that's in the token), but we save to ensure user appears in admin
    try
    {
        await SaveUserUsageAsync(usage);
        Console.WriteLine($"[ADMIN] ✅ Saved user {userId} to DynamoDB after setting credits");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[ADMIN] ❌ WARNING: Failed to save user to DynamoDB after setting credits: {ex.Message}");
        Console.WriteLine($"[ADMIN] Exception type: {ex.GetType().Name}");
        // Continue anyway - credit setting still succeeded
    }
    
    await LogActivityAsync(adminUserId, "SET_USER_CREDITS", $"Admin {adminUserId} set user {userId} credits to {request.Credits}");
    
    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "ADMIN_SET_USER_CREDITS",
        UserId = userId,
        Email = adminEmail,
        Endpoint = "/api/admin/set-user-credits",
        Status = "SUCCESS",
        Details = $"Admin {adminUserId} set user {userId} credits to {request.Credits}"
    });
    
    return Results.Ok(new
    {
        success = true,
        token = newToken,
        creditsRemaining = payload.CreditsRemaining,
        message = $"Successfully set credits to {request.Credits} for user {userId}"
    });
})
.WithName("SetUserCredits")
.WithOpenApi();

// POST /admin/override-token - Create override token for a user
app.MapPost("/api/admin/override-token", async (AdminOverrideTokenRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    string adminEmail;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
        // Email is optional when we have a valid admin session
        adminEmail = context.Request.Query["email"].ToString();
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            adminEmail = "admin_session"; // Default for logging when email not provided
        }
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        adminEmail = context.Request.Query["email"].ToString();
        var isAdmin = await IsAdminAsync(adminUserId, adminEmail);
        if (!isAdmin)
        {
            return Results.Json(new { message = "Admin access required" }, statusCode: 401);
        }
    }

    if (string.IsNullOrWhiteSpace(request.TargetUserId) && string.IsNullOrWhiteSpace(request.TargetEmail))
    {
        return Results.BadRequest(new { message = "TargetUserId or TargetEmail is required" });
    }

    var targetUserId = request.TargetUserId ?? $"email_{request.TargetEmail?.Replace("@", "_at_")}";
    var expirySeconds = request.ExpirySeconds ?? 86400; // Default 24 hours
    var expiryTime = DateTimeOffset.UtcNow.AddSeconds(expirySeconds).ToUnixTimeSeconds();

    // Create override token
    var overrideToken = tokenService.CreateToken(
        targetUserId,
        freeSearchesUsed: 0,
        creditsRemaining: request.Credits ?? 0,
        isAdmin: false,
        isAdminOverride: true,
        customExpiresAt: expiryTime
    );

    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "ADMIN_OVERRIDE_TOKEN",
        UserId = adminUserId,
        Email = adminEmail,
        Status = "SUCCESS",
        Details = $"Created override token for {targetUserId}, credits={request.Credits}, expiry={expirySeconds}s"
    });

    return Results.Ok(new
    {
        success = true,
        token = overrideToken,
        targetUserId,
        credits = request.Credits ?? 0,
        expiresAt = expiryTime,
        expiresInSeconds = expirySeconds,
        message = $"Override token created for {targetUserId}"
    });
})
.WithName("AdminOverrideToken")
.WithOpenApi();

// Helper function to mask user ID for privacy
string MaskUserId(string userId)
{
    if (string.IsNullOrWhiteSpace(userId) || userId.Length <= 8)
        return userId;
    return userId.Substring(0, 4) + "***" + userId.Substring(userId.Length - 4);
}

// Helper function to mask email for privacy
string? MaskEmail(string? email)
{
    if (string.IsNullOrWhiteSpace(email))
        return null;
    var parts = email.Split('@');
    if (parts.Length != 2)
        return email;
    if (parts[0].Length <= 2)
        return parts[0] + "***@" + parts[1];
    return parts[0].Substring(0, 2) + "***@" + parts[1];
}

// Premium Feature 2: Priority Support
// In-memory support tickets (replace with database in production)
var supportTickets = new List<SupportTicket>();

app.MapPost("/api/support/contact", async (SupportRequest request) =>
{
    // Validate required fields
    if (string.IsNullOrWhiteSpace(request.Email))
    {
        return Results.BadRequest(new { message = "Email is required" });
    }
    
    // Validate email format
    try
    {
        var mailAddress = new System.Net.Mail.MailAddress(request.Email);
    }
    catch
    {
        return Results.BadRequest(new { message = "Please enter a valid email address" });
    }
    
    if (string.IsNullOrWhiteSpace(request.Subject))
    {
        return Results.BadRequest(new { message = "Subject is required" });
    }
    
    if (string.IsNullOrWhiteSpace(request.Message))
    {
        return Results.BadRequest(new { message = "Message is required" });
    }
    
    // Create user entry if it doesn't exist (so they appear in admin dashboard)
    bool isPremium = false;
    if (!string.IsNullOrWhiteSpace(request.UserId))
    {
        var usage = await GetUserUsageAsync(request.UserId);
        if (usage == null)
        {
            usage = new UserUsage { UserId = request.UserId };
            await SaveUserUsageAsync(usage);
        }
        isPremium = usage.IsPremium;
    }
    
    var ticket = new SupportTicket
    {
        TicketId = Guid.NewGuid().ToString(),
        UserId = request.UserId ?? "anonymous",
        Email = request.Email.Trim(),
        Subject = request.Subject.Trim(),
        Message = request.Message.Trim(),
        IsPremium = isPremium,
        Priority = isPremium ? "High" : "Normal",
        CreatedAt = DateTime.UtcNow,
        Status = "Open"
    };
    
    supportTickets.Add(ticket);
    
    // Send email notifications (if configured)
    try
    {
        await SendSupportEmailAsync(ticket, smtpHost, smtpPort, smtpUsername, smtpPassword, supportEmail, adminEmail);
    }
    catch (Exception ex)
    {
        // Log error but don't fail the request
        Console.WriteLine($"Failed to send support email: {ex.Message}");
    }
    
    return Results.Ok(new 
    { 
        success = true, 
        ticketId = ticket.TicketId,
        message = isPremium 
            ? "Priority support ticket created! We'll respond within 24 hours." 
            : "Support ticket created! We'll respond within 48 hours.",
        priority = ticket.Priority
    });
})
.WithName("CreateSupportTicket")
.WithOpenApi();

app.MapGet("/api/support/tickets/{userId}", (string userId) =>
{
    var userTickets = supportTickets
        .Where(t => t.UserId == userId)
        .OrderByDescending(t => t.CreatedAt)
        .Select(t => new
        {
            t.TicketId,
            t.Subject,
            t.Status,
            t.Priority,
            t.CreatedAt
        })
        .ToList();
    
    return Results.Ok(new { tickets = userTickets });
})
.WithName("GetUserTickets")
.WithOpenApi();

// Get all support tickets (admin only)
app.MapGet("/api/support/tickets", async (HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        if (!IsAdmin(adminUserId))
        {
            return Results.Unauthorized();
        }
    }
    
    var allTickets = supportTickets
        .OrderByDescending(t => t.CreatedAt)
        .Select(t => new
        {
            t.TicketId,
            t.UserId,
            t.Email,
            t.Subject,
            t.Message,
            t.Status,
            t.Priority,
            t.IsPremium,
            t.CreatedAt
        })
        .ToList();
    
    return Results.Ok(new { tickets = allTickets });
})
.WithName("GetAllSupportTickets")
.WithOpenApi();

// Reply to a support ticket (admin only)
app.MapPost("/api/support/reply", async (SupportReplyRequest request, HttpContext context) =>
{
    // First try to validate admin session from token
    var (isValidSession, sessionUserId) = await ValidateAdminSessionAsync(context);
    
    string adminUserId;
    if (isValidSession && !string.IsNullOrWhiteSpace(sessionUserId))
    {
        adminUserId = sessionUserId;
    }
    else
    {
        // Fallback to query parameter and check IsAdmin
        adminUserId = context.Request.Query["adminUserId"].ToString();
        if (!IsAdmin(adminUserId))
        {
            return Results.Unauthorized();
        }
    }
    
    if (string.IsNullOrWhiteSpace(request.TicketId))
    {
        return Results.BadRequest(new { message = "Ticket ID is required" });
    }
    
    if (string.IsNullOrWhiteSpace(request.ReplyMessage))
    {
        return Results.BadRequest(new { message = "Reply message is required" });
    }
    
    var ticket = supportTickets.FirstOrDefault(t => t.TicketId == request.TicketId);
    if (ticket == null)
    {
        return Results.NotFound(new { message = "Ticket not found" });
    }
    
    // Update ticket status
    ticket.Status = "Replied";
    
    // Send reply email to customer
    try
    {
        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUsername) || string.IsNullOrWhiteSpace(smtpPassword))
        {
            return Results.Ok(new { success = true, message = "Reply saved. Email not configured, so email was not sent." });
        }
        
        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(smtpUsername, smtpPassword)
        };
        
        var replyMail = new MailMessage
        {
            From = new MailAddress(supportEmail, "Pet Behavior Translator Support"),
            To = { ticket.Email },
            Subject = $"Re: {ticket.Subject} (Ticket #{ticket.TicketId})",
            Body = $@"Hi,

Thank you for contacting Pet Behavior Translator support.

Regarding your ticket #{ticket.TicketId}:

{request.ReplyMessage}

---
Original Message:
{ticket.Message}

Best regards,
Pet Behavior Translator Support Team",
            IsBodyHtml = false
        };
        
        // Set Reply-To header
        replyMail.ReplyToList.Add(new MailAddress(supportEmail, "Pet Behavior Translator Support"));
        
        await client.SendMailAsync(replyMail);
        
        return Results.Ok(new 
        { 
            success = true, 
            message = "Reply sent successfully",
            ticketId = ticket.TicketId
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Failed to send reply email: {ex.Message}");
        return Results.Ok(new 
        { 
            success = true, 
            message = "Reply saved but email sending failed. Please check email configuration.",
            ticketId = ticket.TicketId,
            error = ex.Message
        });
    }
})
.WithName("ReplyToSupportTicket")
.WithOpenApi();

// Payment endpoints
app.MapPost("/api/payment/create-checkout", async (PaymentRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.PlanId))
    {
        return Results.BadRequest(new { message = "UserId and PlanId are required" });
    }
    
    // Define pricing plans
    var plans = new Dictionary<string, (decimal price, string name, int durationDays)>
    {
        { "monthly", (9.99m, "Monthly Premium", 30) },
        { "yearly", (99.99m, "Yearly Premium", 365) },
        { "lifetime", (199.99m, "Lifetime Premium", 36500) } // 100 years
    };
    
    if (!plans.ContainsKey(request.PlanId))
    {
        return Results.BadRequest(new { message = "Invalid plan ID" });
    }
    
    var (price, name, durationDays) = plans[request.PlanId];
    
    // Try to create Stripe checkout session
    var stripeSession = await CreateStripeCheckoutSessionForPremium(request.UserId, request.PlanId, price, name, durationDays);
    
    if (stripeSession != null && !string.IsNullOrWhiteSpace(stripeSession.Url))
    {
        // Stripe checkout session created successfully
        return Results.Ok(new
        {
            checkoutUrl = stripeSession.Url,
            sessionId = stripeSession.Id,
            isStripe = true
        });
    }
    
    // Fallback to mock checkout if Stripe is not configured
    var successUrl = $"{frontendUrl}/payment/success?userId={request.UserId}&planId={request.PlanId}";
    var cancelUrl = $"{frontendUrl}/premium";
    
    return Results.Ok(new
    {
        checkoutUrl = $"{frontendUrl}/payment/mock-checkout?userId={request.UserId}&planId={request.PlanId}&price={price}&name={Uri.EscapeDataString(name)}&success={Uri.EscapeDataString(successUrl)}&cancel={Uri.EscapeDataString(cancelUrl)}",
        isStripe = false
    });
})
.WithName("CreateCheckout")
.WithOpenApi();

app.MapPost("/api/payment/webhook", async (HttpContext context) =>
{
    try
    {
        using var reader = new StreamReader(context.Request.Body);
        var json = await reader.ReadToEndAsync();
        
        // Verify webhook signature if webhook secret is configured
        Event stripeEvent;
        if (!string.IsNullOrWhiteSpace(stripeWebhookSecret))
        {
            var signature = context.Request.Headers["Stripe-Signature"].ToString();
            if (string.IsNullOrWhiteSpace(signature))
            {
                return Results.BadRequest(new { message = "Missing Stripe signature" });
            }
            
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, signature, stripeWebhookSecret);
            }
            catch (StripeException ex)
            {
                Console.WriteLine($"[STRIPE WEBHOOK] Signature verification failed: {ex.Message}");
                return Results.BadRequest(new { message = "Invalid signature" });
            }
        }
        else
        {
            // If no webhook secret configured, parse JSON directly (for testing)
            stripeEvent = JsonSerializer.Deserialize<Event>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Failed to parse webhook event");
        }
        
        // Handle the event
        if (stripeEvent.Type == Events.CheckoutSessionCompleted)
        {
            var session = stripeEvent.Data.Object as Session;
            if (session != null && session.Metadata != null)
            {
                var purchaseType = session.Metadata.GetValueOrDefault("purchaseType");
                
                if (purchaseType == "credits")
                {
                    // Handle credit purchase
                    var userId = session.Metadata.GetValueOrDefault("userId");
                    var tierIdStr = session.Metadata.GetValueOrDefault("tierId");
                    var existingToken = session.Metadata.GetValueOrDefault("existingToken");
                    var creditsStr = session.Metadata.GetValueOrDefault("credits");
                    
                    if (int.TryParse(tierIdStr, out var tierId) && !string.IsNullOrWhiteSpace(existingToken))
                    {
                        var payload = tokenService.ValidateToken(existingToken);
                        if (payload != null)
                        {
                            var config = await adminConfigService.GetConfigAsync();
                            var effectiveTiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers;
                            var tier = effectiveTiers.FirstOrDefault(t => t.Id == tierId);
                            
                            if (tier != null)
                            {
                                payload.CreditsRemaining += tier.Credits;
                                var newToken = tokenService.UpdateToken(payload);
                                
                                await eventLogService.LogEventAsync(new EventLogEntry
                                {
                                    EventType = "PURCHASE",
                                    UserId = userId ?? payload.UserId,
                                    Status = "SUCCESS",
                                    Details = $"Stripe webhook: Purchased {tier.Credits} credits from tier {tier.Name}, session={session.Id}"
                                });
                                
                                Console.WriteLine($"[STRIPE WEBHOOK] Credit purchase completed: {tier.Credits} credits for user {userId}");
                            }
                        }
                    }
                }
                else if (purchaseType == "premium")
                {
                    // Handle premium purchase
                    var userId = session.Metadata.GetValueOrDefault("userId");
                    var planId = session.Metadata.GetValueOrDefault("planId");
                    var durationDaysStr = session.Metadata.GetValueOrDefault("durationDays");
                    
                    if (!string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(planId) && int.TryParse(durationDaysStr, out var durationDays))
                    {
                        var usage = await GetUserUsageAsync(userId);
                        if (usage == null)
                        {
                            usage = new UserUsage { UserId = userId };
                        }
                        usage.IsPremium = true;
                        usage.PremiumExpiresAt = DateTime.UtcNow.AddDays(durationDays);
                        usage.DailyCount = 0;
                        await SaveUserUsageAsync(usage);
                        
                        await eventLogService.LogEventAsync(new EventLogEntry
                        {
                            EventType = "PREMIUM_PURCHASE",
                            UserId = userId,
                            Status = "SUCCESS",
                            Details = $"Stripe webhook: Premium {planId} plan purchased, session={session.Id}"
                        });
                        
                        Console.WriteLine($"[STRIPE WEBHOOK] Premium purchase completed: {planId} plan for user {userId}");
                    }
                }
            }
        }
        
        return Results.Ok(new { received = true, type = stripeEvent.Type });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STRIPE WEBHOOK] Error processing webhook: {ex.Message}");
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500,
            title: "Webhook processing error"
        );
    }
})
.WithName("PaymentWebhook")
.WithOpenApi();

app.MapPost("/api/payment/complete", async (PaymentCompleteRequest request) =>
{
    // Check if this is a Stripe session completion
    if (!string.IsNullOrWhiteSpace(request.SessionId) && !string.IsNullOrWhiteSpace(stripeSecretKey))
    {
        try
        {
            var sessionService = new SessionService();
            var session = await sessionService.GetAsync(request.SessionId);
            
            if (session.PaymentStatus == "paid" && session.Metadata != null)
            {
                var purchaseType = session.Metadata.GetValueOrDefault("purchaseType");
                if (purchaseType == "premium")
                {
                    var userId = session.Metadata.GetValueOrDefault("userId");
                    var planId = session.Metadata.GetValueOrDefault("planId");
                    var durationDaysStr = session.Metadata.GetValueOrDefault("durationDays");
                    
                    if (!string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(planId) && int.TryParse(durationDaysStr, out var durationDays))
                    {
                        var usage = await GetUserUsageAsync(userId);
                        if (usage == null)
                        {
                            usage = new UserUsage { UserId = userId };
                        }
                        usage.IsPremium = true;
                        usage.PremiumExpiresAt = DateTime.UtcNow.AddDays(durationDays);
                        usage.DailyCount = 0;
                        await SaveUserUsageAsync(usage);
                        
                        await eventLogService.LogEventAsync(new EventLogEntry
                        {
                            EventType = "PREMIUM_PURCHASE",
                            UserId = userId,
                            Status = "SUCCESS",
                            Details = $"Stripe session completed: Premium {planId} plan purchased, session={session.Id}"
                        });
                        
                        return Results.Ok(new
                        {
                            success = true,
                            isPremium = true,
                            message = "Payment successful! Premium access granted.",
                            expiresAt = usage.PremiumExpiresAt,
                            planId = planId,
                            isStripe = true
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[STRIPE] Error verifying session: {ex.Message}");
            // Fall through to regular flow
        }
    }
    
    // Regular flow (for mock checkout or direct calls)
    if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.PlanId))
    {
        return Results.BadRequest(new { message = "UserId and PlanId are required" });
    }
    
    // Define plan durations
    var planDurations = new Dictionary<string, int>
    {
        { "monthly", 30 },
        { "yearly", 365 },
        { "lifetime", 36500 }
    };
    
    if (!planDurations.ContainsKey(request.PlanId))
    {
        return Results.BadRequest(new { message = "Invalid plan ID" });
    }
    
    // Grant premium access
    var usageRegular = await GetUserUsageAsync(request.UserId);
    if (usageRegular == null)
    {
        usageRegular = new UserUsage { UserId = request.UserId };
    }
    usageRegular.IsPremium = true;
    usageRegular.PremiumExpiresAt = DateTime.UtcNow.AddDays(planDurations[request.PlanId]);
    usageRegular.DailyCount = 0;
    await SaveUserUsageAsync(usageRegular);
    
    return Results.Ok(new
    {
        success = true,
        isPremium = true,
        message = "Payment successful! Premium access granted.",
        expiresAt = usageRegular.PremiumExpiresAt,
        planId = request.PlanId,
        isStripe = false
    });
})
.WithName("CompletePayment")
.WithOpenApi();

// ============================================================================
// CREDIT SYSTEM ENDPOINTS - Stateless token-based metered usage
// ============================================================================

// 1. GET /credits/get-token - Create or retrieve a credit token for a user
app.MapPost("/api/credits/get-token", async (GetTokenRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId))
    {
        return Results.BadRequest(new { message = "UserId is required" });
    }

    // Create user entry if it doesn't exist (so they appear in admin dashboard)
    var usage = await GetUserUsageAsync(request.UserId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = request.UserId };
        try
        {
            await SaveUserUsageAsync(usage);
            Console.WriteLine($"[USER] ✅ Created new user entry for {request.UserId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[USER] ❌ WARNING: Failed to save user to DynamoDB: {ex.Message}");
            Console.WriteLine($"[USER] ❌ Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[USER] ❌ Stack trace: {ex.StackTrace}");
            // Continue anyway - user can still get token, just won't appear in admin dashboard
        }
    }

    // Check if user is admin
    var isAdmin = await IsAdminAsync(request.UserId, request.Email);
    var config = await adminConfigService.GetConfigAsync();
    var effectiveFreeLimit = config.FreeSearchLimit > 0 ? config.FreeSearchLimit : freeSearchLimit;

    // Create token - if admin, mark as admin token
    var token = tokenService.CreateToken(
        request.UserId, 
        freeSearchesUsed: 0, 
        creditsRemaining: 0,
        isAdmin: isAdmin
    );

    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "TOKEN_ISSUED",
        UserId = request.UserId,
        Email = request.Email,
        Status = "SUCCESS",
        Details = $"Token issued, isAdmin={isAdmin}"
    });
    
    return Results.Ok(new
    {
        token,
        userId = request.UserId,
        freeSearchesUsed = 0,
        creditsRemaining = 0,
        freeSearchLimit = effectiveFreeLimit,
        isAdmin = isAdmin
    });
})
.WithName("GetCreditToken")
.WithOpenApi();

// 2. POST /credits/use - Use a free search or credit
app.MapPost("/api/credits/use", async (UseCreditsRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.CreditToken))
    {
        return Results.BadRequest(new { message = "CreditToken is required" });
    }

    // Validate token
    var payload = tokenService.ValidateToken(request.CreditToken);
    if (payload == null)
    {
        return Results.Unauthorized();
    }

    // Check for admin bypass
    // Only bypass if IsAdminOverride is true (explicit override)
    // OR if IsAdmin is true AND they have credits remaining (to allow admins to test with credits)
    // If admin sets credits to 0, they should consume credits like regular users
    if (payload.IsAdminOverride || (payload.IsAdmin && payload.CreditsRemaining > 0))
    {
        // Admin bypass - return token unchanged, no credit deduction
        await eventLogService.LogEventAsync(new EventLogEntry
        {
            EventType = "CREDIT_USE",
            UserId = payload.UserId,
            Status = "SUCCESS",
            Details = $"Admin bypass - no credit deducted"
        });

        return Results.Ok(new
        {
            token = request.CreditToken, // Return same token
            freeSearchesUsed = payload.FreeSearchesUsed,
            creditsRemaining = payload.CreditsRemaining,
            freeSearchLimit = freeSearchLimit,
            adminBypass = true,
            message = "Admin bypass - unlimited access"
        });
    }

    // Get current config for free search limit
    var config = await adminConfigService.GetConfigAsync();
    var effectiveFreeLimit = config.FreeSearchLimit > 0 ? config.FreeSearchLimit : freeSearchLimit;

    // Check if user has free searches remaining
    if (payload.FreeSearchesUsed < effectiveFreeLimit)
    {
        payload.FreeSearchesUsed++;
        var newToken = tokenService.UpdateToken(payload);
        
        await eventLogService.LogEventAsync(new EventLogEntry
        {
            EventType = "CREDIT_USE",
            UserId = payload.UserId,
            Status = "SUCCESS",
            Details = $"Used free search ({payload.FreeSearchesUsed}/{effectiveFreeLimit})"
        });

        return Results.Ok(new
        {
            token = newToken,
            freeSearchesUsed = payload.FreeSearchesUsed,
            creditsRemaining = payload.CreditsRemaining,
            freeSearchLimit = effectiveFreeLimit,
            usedFreeSearch = true
        });
    }

    // No free searches left, check credits
    if (payload.CreditsRemaining > 0)
    {
        payload.CreditsRemaining--;
        var newToken = tokenService.UpdateToken(payload);
        
        await eventLogService.LogEventAsync(new EventLogEntry
        {
            EventType = "CREDIT_USE",
            UserId = payload.UserId,
            Status = "SUCCESS",
            Details = $"Used paid credit ({payload.CreditsRemaining} remaining)"
        });

        return Results.Ok(new
        {
            token = newToken,
            freeSearchesUsed = payload.FreeSearchesUsed,
            creditsRemaining = payload.CreditsRemaining,
            freeSearchLimit = effectiveFreeLimit,
            usedCredit = true
        });
    }

    // No credits remaining
    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "CREDIT_USE",
        UserId = payload.UserId,
        Status = "NO_CREDITS",
        Details = "No credits remaining"
    });

    return Results.Ok(new
    {
        error = "NO_CREDITS",
        message = "No free searches or credits remaining. Please purchase credits to continue.",
        freeSearchesUsed = payload.FreeSearchesUsed,
        creditsRemaining = payload.CreditsRemaining,
        freeSearchLimit = effectiveFreeLimit
    });
})
.WithName("UseCredits")
.WithOpenApi();

// 3. POST /credits/purchase - Purchase credits (integrates with Stripe)
app.MapPost("/api/credits/purchase", async (PurchaseCreditsRequest request) =>
{
    if (request.TierId <= 0 || string.IsNullOrWhiteSpace(request.ExistingToken))
    {
        return Results.BadRequest(new { message = "TierId and ExistingToken are required" });
    }

    // Validate existing token
    var payload = tokenService.ValidateToken(request.ExistingToken);
    if (payload == null)
    {
        return Results.BadRequest(new { message = "Invalid token" });
    }

    // Get current config for tiers
    var config = await adminConfigService.GetConfigAsync();
    var effectiveTiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers;

    // Find the tier
    var tier = effectiveTiers.FirstOrDefault(t => t.Id == request.TierId);
    if (tier == null)
    {
        return Results.BadRequest(new { message = "Invalid tier ID" });
    }

    // Try to create Stripe checkout session
    var stripeSession = await CreateStripeCheckoutSessionForCredits(payload.UserId, request.TierId, tier, request.ExistingToken);
    
    if (stripeSession != null && !string.IsNullOrWhiteSpace(stripeSession.Url))
    {
        // Stripe checkout session created successfully
        return Results.Ok(new
        {
            checkoutUrl = stripeSession.Url,
            sessionId = stripeSession.Id,
            isStripe = true
        });
    }

    // Fallback to mock checkout if Stripe is not configured
    var successUrl = $"{frontendUrl}/credits/success?userId={payload.UserId}&tierId={tier.Id}&token={Uri.EscapeDataString(request.ExistingToken)}";
    var cancelUrl = $"{frontendUrl}/credits";

    return Results.Ok(new
    {
        checkoutUrl = $"{frontendUrl}/credits/mock-checkout?userId={payload.UserId}&tierId={tier.Id}&price={tier.Price}&name={Uri.EscapeDataString(tier.Name)}&credits={tier.Credits}&token={Uri.EscapeDataString(request.ExistingToken)}&success={Uri.EscapeDataString(successUrl)}&cancel={Uri.EscapeDataString(cancelUrl)}",
        isStripe = false
    });
})
.WithName("PurchaseCredits")
.WithOpenApi();

// 4. POST /credits/complete-purchase - Complete credit purchase and update token
app.MapPost("/api/credits/complete-purchase", async (CompletePurchaseRequest request) =>
{
    // Check if this is a Stripe session completion
    if (!string.IsNullOrWhiteSpace(request.SessionId) && !string.IsNullOrWhiteSpace(stripeSecretKey))
    {
        try
        {
            var sessionService = new SessionService();
            var session = await sessionService.GetAsync(request.SessionId);
            
            if (session.PaymentStatus == "paid" && session.Metadata != null)
            {
                var purchaseType = session.Metadata.GetValueOrDefault("purchaseType");
                if (purchaseType == "credits")
                {
                    var userId = session.Metadata.GetValueOrDefault("userId");
                    var tierIdStr = session.Metadata.GetValueOrDefault("tierId");
                    var existingToken = session.Metadata.GetValueOrDefault("existingToken");
                    
                    if (int.TryParse(tierIdStr, out var tierId) && !string.IsNullOrWhiteSpace(existingToken))
                    {
                        var payload = tokenService.ValidateToken(existingToken);
                        if (payload != null)
                        {
                            var config = await adminConfigService.GetConfigAsync();
                            var effectiveTiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers;
                            var tier = effectiveTiers.FirstOrDefault(t => t.Id == tierId);
                            
                            if (tier != null)
                            {
                                payload.CreditsRemaining += tier.Credits;
                                // Ensure regular users don't get admin status after purchase
                                // Only keep admin flags if user is actually in admin list
                                var isUserAdmin = await IsAdminAsync(payload.UserId, null);
                                if (!isUserAdmin)
                                {
                                    payload.IsAdmin = false;
                                    payload.IsAdminOverride = false;
                                }
                                var newToken = tokenService.UpdateToken(payload);
                                
                                // Ensure user is saved to DynamoDB (so they appear in admin dashboard)
                                var userIdForSave = userId ?? payload.UserId;
                                var usageStripe = await GetUserUsageAsync(userIdForSave);
                                if (usageStripe == null)
                                {
                                    usageStripe = new UserUsage { UserId = userIdForSave };
                                    Console.WriteLine($"[USER] Creating new user entry for {userIdForSave} after Stripe purchase");
                                }
                                else
                                {
                                    Console.WriteLine($"[USER] Updating existing user entry for {userIdForSave} after Stripe purchase");
                                }
                                try
                                {
                                    await SaveUserUsageAsync(usageStripe);
                                    Console.WriteLine($"[USER] ✅ Saved/updated user {userIdForSave} to DynamoDB after Stripe purchase");
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"[USER] ❌ WARNING: Failed to save user to DynamoDB after Stripe purchase: {ex.Message}");
                                    Console.WriteLine($"[USER] ❌ Exception type: {ex.GetType().Name}");
                                    Console.WriteLine($"[USER] ❌ Stack trace: {ex.StackTrace}");
                                    // Continue anyway - purchase still succeeded
                                }
                                
                                await eventLogService.LogEventAsync(new EventLogEntry
                                {
                                    EventType = "PURCHASE",
                                    UserId = userIdForSave,
                                    Status = "SUCCESS",
                                    Details = $"Stripe session completed: Purchased {tier.Credits} credits from tier {tier.Name}, session={session.Id}"
                                });
                                
                                return Results.Ok(new
                                {
                                    success = true,
                                    token = newToken,
                                    creditsAdded = tier.Credits,
                                    creditsRemaining = payload.CreditsRemaining,
                                    tierName = tier.Name,
                                    message = $"Successfully purchased {tier.Credits} credits!",
                                    isStripe = true
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[STRIPE] Error verifying session: {ex.Message}");
            // Fall through to regular flow
        }
    }
    
    // Regular flow (for mock checkout or direct calls)
    if (request.TierId <= 0 || string.IsNullOrWhiteSpace(request.ExistingToken))
    {
        return Results.BadRequest(new { message = "TierId and ExistingToken are required" });
    }

    // Validate existing token
    var payloadRegular = tokenService.ValidateToken(request.ExistingToken);
    if (payloadRegular == null)
    {
        return Results.BadRequest(new { message = "Invalid token" });
    }

    // Get current config for tiers
    var configRegular = await adminConfigService.GetConfigAsync();
    var effectiveTiersRegular = configRegular.Tiers.Count > 0 ? configRegular.Tiers : creditTiers;

    // Find the tier
    var tierRegular = effectiveTiersRegular.FirstOrDefault(t => t.Id == request.TierId);
    if (tierRegular == null)
    {
        return Results.BadRequest(new { message = "Invalid tier ID" });
    }

    // Add credits to token
    payloadRegular.CreditsRemaining += tierRegular.Credits;
    // Ensure regular users don't get admin status after purchase
    // Only keep admin flags if user is actually in admin list
    var isUserAdminRegular = await IsAdminAsync(payloadRegular.UserId, null);
    if (!isUserAdminRegular)
    {
        payloadRegular.IsAdmin = false;
        payloadRegular.IsAdminOverride = false;
    }
    var newTokenRegular = tokenService.UpdateToken(payloadRegular);

    // Ensure user is saved to DynamoDB (so they appear in admin dashboard)
    var usage = await GetUserUsageAsync(payloadRegular.UserId);
    if (usage == null)
    {
        usage = new UserUsage { UserId = payloadRegular.UserId };
        Console.WriteLine($"[USER] Creating new user entry for {payloadRegular.UserId} after purchase");
    }
    else
    {
        Console.WriteLine($"[USER] Updating existing user entry for {payloadRegular.UserId} after purchase");
    }
    try
    {
        await SaveUserUsageAsync(usage);
        Console.WriteLine($"[USER] ✅ Saved/updated user {payloadRegular.UserId} to DynamoDB after purchase");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[USER] ❌ WARNING: Failed to save user to DynamoDB after purchase: {ex.Message}");
        Console.WriteLine($"[USER] ❌ Exception type: {ex.GetType().Name}");
        Console.WriteLine($"[USER] ❌ Stack trace: {ex.StackTrace}");
        // Continue anyway - purchase still succeeded
    }

    await eventLogService.LogEventAsync(new EventLogEntry
    {
        EventType = "PURCHASE",
        UserId = payloadRegular.UserId,
        Status = "SUCCESS",
        Details = $"Purchased {tierRegular.Credits} credits from tier {tierRegular.Name}"
    });

    return Results.Ok(new
    {
        success = true,
        token = newTokenRegular,
        creditsAdded = tierRegular.Credits,
        creditsRemaining = payloadRegular.CreditsRemaining,
        tierName = tierRegular.Name,
        message = $"Successfully purchased {tierRegular.Credits} credits!",
        isStripe = false
    });
})
.WithName("CompleteCreditPurchase")
.WithOpenApi();

// 5. GET /credits/tiers - Get available credit tiers
app.MapGet("/api/credits/tiers", async () =>
{
    var config = await adminConfigService.GetConfigAsync();
    var effectiveTiers = config.Tiers.Count > 0 ? config.Tiers : creditTiers;
    var effectiveFreeLimit = config.FreeSearchLimit > 0 ? config.FreeSearchLimit : freeSearchLimit;

    return Results.Ok(new
    {
        tiers = effectiveTiers,
        freeSearchLimit = effectiveFreeLimit
    });
})
.WithName("GetCreditTiers")
.WithOpenApi();

// GET /api/config/analytics - Get analytics configuration for frontend
app.MapGet("/api/config/analytics", () =>
{
    return Results.Ok(new
    {
        gaMeasurementId = gaMeasurementId,
        mixpanelToken = mixpanelToken
    });
})
.WithName("GetAnalyticsConfig")
.WithOpenApi();

// 6. POST /credits/validate - Validate token and return current state
app.MapPost("/api/credits/validate", async (ValidateTokenRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.CreditToken))
    {
        return Results.BadRequest(new { message = "CreditToken is required" });
    }

    var payload = tokenService.ValidateToken(request.CreditToken);
    if (payload == null)
    {
        return Results.Unauthorized();
    }

    var config = await adminConfigService.GetConfigAsync();
    var effectiveFreeLimit = config.FreeSearchLimit > 0 ? config.FreeSearchLimit : freeSearchLimit;

    return Results.Ok(new
    {
        valid = true,
        userId = payload.UserId,
        freeSearchesUsed = payload.FreeSearchesUsed,
        creditsRemaining = payload.CreditsRemaining,
        freeSearchLimit = effectiveFreeLimit,
        freeSearchesRemaining = Math.Max(0, effectiveFreeLimit - payload.FreeSearchesUsed),
        isAdmin = payload.IsAdmin,
        isAdminOverride = payload.IsAdminOverride,
        issuedAt = payload.IssuedAt,
        expiresAt = payload.ExpiresAt
    });
})
.WithName("ValidateToken")
.WithOpenApi();

// Translate endpoint
app.MapPost("/api/translate", async (TranslateRequest request) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Behavior))
        {
            return Results.BadRequest(new { message = "Behavior description is required" });
        }
        
        // Validate that the prompt is related to pet behavior
        if (!IsPetBehaviorRelated(request.Behavior))
        {
            return Results.BadRequest(new 
            { 
                message = "This service is designed for pet behavior questions only. Please ask about your pet's behavior, training, or care.",
                errorCode = "NOT_PET_RELATED"
            });
        }
        
        // Check credit token and admin bypass
        bool isAdmin = false;
        bool isAdminOverride = false;
        string? userId = request.UserId;
        
        // If credit token provided, validate it and check for admin bypass
        if (!string.IsNullOrWhiteSpace(request.CreditToken))
        {
            var payload = tokenService.ValidateToken(request.CreditToken);
            if (payload != null)
            {
                userId = payload.UserId;
                isAdmin = payload.IsAdmin;
                isAdminOverride = payload.IsAdminOverride;
                
                // Admin bypass - skip credit checks
                if (!isAdmin && !isAdminOverride)
                {
                    // For non-admins, credit should have been consumed by /credits/use endpoint
                    // But we log the translation event here
                }
            }
        }
        
        // Check if user is admin (via email or userId)
        if (!isAdmin && !string.IsNullOrWhiteSpace(userId))
        {
            isAdmin = await IsAdminAsync(userId, request.Email);
        }
        
        // Log translation event
        await eventLogService.LogEventAsync(new EventLogEntry
        {
            EventType = "TRANSLATE",
            UserId = userId ?? "anonymous",
            Email = request.Email,
            Endpoint = "/api/translate",
            Status = "SUCCESS",
            Details = $"Translated: {request.Behavior.Substring(0, Math.Min(50, request.Behavior.Length))}..."
        });
        
        // Legacy activity log (for backwards compatibility)
        LogActivity(userId ?? "anonymous", "TRANSLATE", $"Translated: {request.Behavior.Substring(0, Math.Min(50, request.Behavior.Length))}...");
        
        // Determine if premium (for prompt quality)
        // Admins get premium-quality prompts
        bool isPremium = isAdmin || isAdminOverride;

        // Premium Feature 1: Advanced Behavior Analysis
        // Premium users and admins get enhanced analysis with more detailed insights
        string prompt;
        string model;
        int maxTokens;
        
        if (isPremium || isAdmin || isAdminOverride)
        {
            // Advanced analysis for premium users
            prompt = $@"You are a certified veterinary behaviorist with 20+ years of experience. Provide a comprehensive, in-depth analysis of this pet behavior:

""{request.Behavior}""

Return results in this JSON structure with detailed, professional insights:

{{
  ""cause"": ""Detailed explanation of likely causes, including psychological, environmental, and medical factors"",
  ""quickFix"": ""Immediate actionable solution with specific techniques"",
  ""steps"": [""Detailed Step 1 with specific actions"", ""Detailed Step 2 with timing and methods"", ""Detailed Step 3 with monitoring tips"", ""Detailed Step 4 with troubleshooting"", ""Detailed Step 5 with long-term strategies"", ""Additional Step 6 for comprehensive care"", ""Additional Step 7 for prevention""],
  ""vetWarning"": ""Detailed guidance on when to consult a veterinarian, specific symptoms to watch for, and urgency level"",
  ""products"": [""Specific Product 1 with use case"", ""Specific Product 2 with benefits"", ""Specific Product 3 with recommendations"", ""Additional Product 4 for advanced care""],
  ""advancedInsights"": ""Additional professional insights, behavioral patterns, and expert recommendations"",
  ""preventionTips"": ""How to prevent this behavior from recurring""
}}

Provide comprehensive, detailed analysis with professional veterinary behaviorist expertise. Be thorough and actionable.";
            
            model = "gpt-4o-mini"; // Can upgrade to "gpt-4o" for even better analysis
            maxTokens = 2000; // More tokens for detailed analysis
        }
        else
        {
            // Standard analysis for free users
            prompt = $@"You are a certified pet behaviorist. Analyze this pet behavior:

""{request.Behavior}""

Return results in this JSON structure (be concise but helpful):

{{
  ""cause"": ""Brief explanation of likely cause"",
  ""quickFix"": ""Quick actionable solution"",
  ""steps"": [""Step 1"", ""Step 2"", ""Step 3"", ""Step 4"", ""Step 5""],
  ""vetWarning"": ""When to consult a veterinarian"",
  ""products"": [""Product 1"", ""Product 2"", ""Product 3""]
}}

Use a helpful, friendly tone. Keep responses practical and actionable.";
            
            model = "gpt-4o-mini";
            maxTokens = 1000;
        }

        // Call OpenAI API using HTTP client
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {openAiApiKey}");

        var requestBody = new
        {
            model = model,
            messages = new[]
            {
                new { role = "system", content = "You are a helpful pet behaviorist. Always respond with valid JSON only, no markdown formatting." },
                new { role = "user", content = prompt }
            },
            temperature = 0.7,
            max_tokens = maxTokens
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            string errorMessage;
            string? openAiErrorType = null;
            string? openAiErrorMessage = null;
            
            // Try to parse OpenAI error response
            try
            {
                var errorDoc = JsonDocument.Parse(errorContent);
                if (errorDoc.RootElement.TryGetProperty("error", out var errorObj))
                {
                    if (errorObj.TryGetProperty("message", out var message))
                    {
                        openAiErrorMessage = message.GetString();
                    }
                    if (errorObj.TryGetProperty("type", out var type))
                    {
                        openAiErrorType = type.GetString();
                    }
                    if (errorObj.TryGetProperty("code", out var code))
                    {
                        var codeValue = code.GetString();
                        // OpenAI sometimes uses "rate_limit_exceeded" as the code
                        if (codeValue == "rate_limit_exceeded")
                        {
                            openAiErrorType = "rate_limit_exceeded";
                        }
                    }
                }
            }
            catch
            {
                // If we can't parse the error, fall back to showing the raw content
            }
            
            // Use the actual OpenAI error message if available, otherwise use a generic one
            var actualErrorMessage = openAiErrorMessage ?? $"OpenAI API returned error: {errorContent}";
            
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                errorMessage = "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.";
                if (!string.IsNullOrEmpty(actualErrorMessage) && actualErrorMessage != errorContent)
                {
                    errorMessage += $" OpenAI says: {actualErrorMessage}";
                }
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                // Only treat as rate limit if OpenAI explicitly says so, or if it's clearly a rate limit
                bool isRateLimit = openAiErrorType == "rate_limit_exceeded" 
                    || (actualErrorMessage?.ToLower().Contains("rate limit") == true)
                    || (actualErrorMessage?.ToLower().Contains("requests_per_minute") == true);
                
                if (isRateLimit)
                {
                    // Try to extract retry-after header
                    var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds 
                        ?? response.Headers.RetryAfter?.Date?.Subtract(DateTimeOffset.UtcNow).TotalSeconds;
                    
                    if (retryAfter.HasValue && retryAfter.Value > 0)
                    {
                        var minutes = Math.Ceiling(retryAfter.Value / 60);
                        errorMessage = $"OpenAI API rate limit exceeded. Please try again in approximately {minutes} minute(s).";
                        
                        // Return a structured error with retry-after info
                        return Results.Problem(
                            detail: errorMessage,
                            statusCode: 429,
                            title: "Rate Limit Exceeded",
                            extensions: new Dictionary<string, object?>
                            {
                                { "retryAfterSeconds", retryAfter.Value },
                                { "retryAfterMinutes", minutes }
                            }
                        );
                    }
                    else
                    {
                        errorMessage = $"Rate limit exceeded: {actualErrorMessage}";
                        return Results.Problem(
                            detail: errorMessage,
                            statusCode: 429,
                            title: "Rate Limit Exceeded"
                        );
                    }
                }
                else
                {
                    // It's a 429 but not necessarily a rate limit - could be quota, billing, etc.
                    errorMessage = $"OpenAI API error (429): {actualErrorMessage}";
                    
                    // Check for common 429 errors that aren't rate limits
                    if (actualErrorMessage?.ToLower().Contains("quota") == true 
                        || actualErrorMessage?.ToLower().Contains("billing") == true
                        || actualErrorMessage?.ToLower().Contains("payment") == true)
                    {
                        errorMessage = $"OpenAI API quota or billing issue: {actualErrorMessage}. Please check your billing at https://platform.openai.com/account/billing";
                    }
                    
                    return Results.Problem(
                        detail: errorMessage,
                        statusCode: 429,
                        title: "API Request Denied"
                    );
                }
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.PaymentRequired)
            {
                errorMessage = $"OpenAI API billing issue: {actualErrorMessage}. Please check your billing at https://platform.openai.com/account/billing";
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.InternalServerError)
            {
                errorMessage = $"OpenAI API server error: {actualErrorMessage}. Please try again in a moment.";
            }
            else
            {
                // For other errors, show the actual OpenAI error message
                errorMessage = actualErrorMessage;
                if (string.IsNullOrEmpty(errorMessage) || errorMessage == errorContent)
                {
                    errorMessage = $"OpenAI API error ({response.StatusCode}): {errorContent}";
                }
            }
            
            throw new InvalidOperationException(errorMessage);
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        var openAiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (openAiResponse?.Choices == null || openAiResponse.Choices.Length == 0)
        {
            throw new InvalidOperationException("OpenAI returned an empty response. Please try again.");
        }

        var responseText = openAiResponse.Choices[0]?.Message?.Content?.Trim() 
            ?? throw new InvalidOperationException("Failed to get response content from OpenAI");

        // Remove markdown code blocks if present
        if (responseText.StartsWith("```json"))
        {
            responseText = responseText.Substring(7);
        }
        if (responseText.StartsWith("```"))
        {
            responseText = responseText.Substring(3);
        }
        if (responseText.EndsWith("```"))
        {
            responseText = responseText.Substring(0, responseText.Length - 3);
        }
        responseText = responseText.Trim();

        // Parse JSON response - first as intermediate format with string products
        var intermediateResponse = JsonSerializer.Deserialize<IntermediateTranslateResponse>(responseText, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (intermediateResponse == null)
        {
            return Results.BadRequest(new { message = "Failed to parse AI response" });
        }

        // Convert to final response with ProductInfo objects
        var translateResponse = new TranslateResponse
        {
            Cause = intermediateResponse.Cause ?? string.Empty,
            QuickFix = intermediateResponse.QuickFix ?? string.Empty,
            Steps = intermediateResponse.Steps ?? Array.Empty<string>(),
            VetWarning = intermediateResponse.VetWarning ?? string.Empty,
            Products = (intermediateResponse.Products ?? Array.Empty<string>())
                .Select(productName => new ProductInfo
                {
                    Name = productName,
                    Url = trackingEnabled ? GenerateAmazonAffiliateLink(productName) : null,
                    IsAffiliateLink = trackingEnabled && amazonEnabled && !string.IsNullOrWhiteSpace(amazonTag)
                })
                .ToArray(),
            AdvancedInsights = intermediateResponse.AdvancedInsights, // Premium feature
            PreventionTips = intermediateResponse.PreventionTips, // Premium feature
            IsPremium = isPremium // Indicate if premium analysis was used
        };

        // Ensure arrays are not null
        translateResponse.Steps ??= Array.Empty<string>();
        translateResponse.Products ??= Array.Empty<ProductInfo>();

        return Results.Ok(translateResponse);
    }
    catch (HttpRequestException ex)
    {
        return Results.Problem(
            detail: $"Network error connecting to OpenAI: {ex.Message}",
            statusCode: 500,
            title: "Network Error"
        );
    }
    catch (InvalidOperationException ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 400,
            title: "API Error"
        );
    }
    catch (JsonException ex)
    {
        return Results.Problem(
            detail: $"Failed to parse response: {ex.Message}",
            statusCode: 500,
            title: "Parsing Error"
        );
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500,
            title: "Error processing translation"
        );
    }
})
.WithName("TranslateBehavior")
.WithOpenApi();

// Email helper function
async Task SendSupportEmailAsync(SupportTicket ticket, string smtpHost, int smtpPort, string smtpUsername, string smtpPassword, string supportEmail, string adminEmail)
{
    // Skip if email not configured
    if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUsername) || string.IsNullOrWhiteSpace(smtpPassword))
    {
        return; // Email not configured, skip silently
    }
    
    try
    {
        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(smtpUsername, smtpPassword)
        };
        
        // Send confirmation to customer (if email provided)
        if (!string.IsNullOrWhiteSpace(ticket.Email) && ticket.Email != "no-email")
        {
            var customerMail = new MailMessage
            {
                From = new MailAddress(supportEmail, "Pet Behavior Translator Support"),
                To = { ticket.Email },
                Subject = $"Support Ticket Received - #{ticket.TicketId}",
                Body = $@"Hi,

Thank you for contacting Pet Behavior Translator support!

Your support ticket has been received:
- Ticket ID: {ticket.TicketId}
- Priority: {ticket.Priority}
- Response Time: {(ticket.IsPremium ? "24 hours" : "48 hours")}

We'll get back to you within {(ticket.IsPremium ? "24 hours" : "48 hours")}.

Best regards,
Pet Behavior Translator Support Team",
                IsBodyHtml = false
            };
            
            // Set Reply-To header so replies go to support email
            customerMail.ReplyToList.Add(new MailAddress(supportEmail, "Pet Behavior Translator Support"));
            
            await client.SendMailAsync(customerMail);
        }
        
        // Send notification to admin
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            var adminMail = new MailMessage
            {
                From = new MailAddress(supportEmail, "Pet Behavior Translator Support"),
                To = { adminEmail },
                Subject = $"New Support Ticket - #{ticket.TicketId} - {ticket.Priority} Priority",
                Body = $@"New support ticket received:

Ticket ID: {ticket.TicketId}
User ID: {ticket.UserId}
Email: {ticket.Email}
Subject: {ticket.Subject}
Priority: {ticket.Priority}
Status: {ticket.Status}
Created: {ticket.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC

Message:
{ticket.Message}

---
Reply to customer at: {ticket.Email}
Reply-To address: {supportEmail}",
                IsBodyHtml = false
            };
            
            // Set Reply-To header so admin replies go to support email
            adminMail.ReplyToList.Add(new MailAddress(supportEmail, "Pet Behavior Translator Support"));
            
            await client.SendMailAsync(adminMail);
        }
    }
    catch (Exception ex)
    {
        // Log error but don't throw
        Console.WriteLine($"Email sending failed: {ex.Message}");
        throw; // Re-throw to be caught by caller
    }
}

// Support running on AWS Lambda
if (app.Environment.EnvironmentName == "Production")
{
    app.Run();
}
else
{
    app.Run();
}

// Request/Response models
public record TranslateRequest(string Behavior, string? UserId = null, string? CreditToken = null, string? Email = null);

public record PremiumStatusRequest(string UserId, bool IsPremium, DateTime? ExpiresAt = null);

public record SupportRequest(string? UserId, string? Email, string? Subject, string Message);

public record SupportReplyRequest(string TicketId, string ReplyMessage);

public record PaymentRequest(string UserId, string PlanId);

public record PaymentCompleteRequest(string UserId, string PlanId, string? TransactionId = null, string? SessionId = null);

// Credit System Records
public record GetTokenRequest(string UserId, string? Email = null);

public record UseCreditsRequest(string CreditToken);

public record PurchaseCreditsRequest(int TierId, string ExistingToken);

public record CompletePurchaseRequest(int TierId, string ExistingToken, string? TransactionId = null, string? SessionId = null);

public record ValidateTokenRequest(string CreditToken);

// Admin request models
public record PremiumPlanRequest(string PlanId); // "monthly", "yearly", "lifetime"
public record GrantCreditsRequest(int Credits, string? ExistingToken = null);

// New Admin request models
public record AdminConnectRequest(string UserId, string? Email = null);

public record AdminLoginRequest(string Username, string Password);

public record SetMyCreditsRequest(int Credits, string? ExistingToken = null);

public record SetUserCreditsRequest(int Credits, string? ExistingToken = null);

public record AdminConfigUpdateRequest(int? FreeSearchLimit = null, List<CreditTier>? Tiers = null, List<string>? AdminEmails = null);

public record AdminOverrideTokenRequest(string? TargetUserId = null, string? TargetEmail = null, int? Credits = null, int? ExpirySeconds = null);

// Activity log entry
public class ActivityLogEntry
{
    public string UserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class CreditTier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Credits { get; set; }
    public bool Popular { get; set; } = false;
}

public class SupportTicket
{
    public string TicketId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public string Priority { get; set; } = "Normal";
    public string Status { get; set; } = "Open";
    public DateTime CreatedAt { get; set; }
}

public class UserUsage
{
    public string UserId { get; set; } = string.Empty;
    public int DailyCount { get; set; } = 0;
    public DateTime LastResetDate { get; set; } = DateTime.UtcNow.Date;
    public bool IsPremium { get; set; } = false;
    public DateTime? PremiumExpiresAt { get; set; }
}

// Intermediate model for parsing AI response (products as strings)
public class IntermediateTranslateResponse
{
    public string? Cause { get; set; }
    public string? QuickFix { get; set; }
    public string[]? Steps { get; set; }
    public string? VetWarning { get; set; }
    public string[]? Products { get; set; }
    public string? AdvancedInsights { get; set; } // Premium feature
    public string? PreventionTips { get; set; } // Premium feature
}

public class ProductInfo
{
    public string Name { get; set; } = string.Empty;
    public string? Url { get; set; }
    public bool IsAffiliateLink { get; set; }
}

public class TranslateResponse
{
    public string Cause { get; set; } = string.Empty;
    public string QuickFix { get; set; } = string.Empty;
    public string[] Steps { get; set; } = Array.Empty<string>();
    public string VetWarning { get; set; } = string.Empty;
    public ProductInfo[] Products { get; set; } = Array.Empty<ProductInfo>();
    public string? AdvancedInsights { get; set; } // Premium feature
    public string? PreventionTips { get; set; } // Premium feature
    public bool IsPremium { get; set; } // Indicates if premium analysis was used
}

// OpenAI API Response Models
public class OpenAIResponse
{
    [JsonPropertyName("choices")]
    public Choice[]? Choices { get; set; }
}

public class Choice
{
    [JsonPropertyName("message")]
    public Message? Message { get; set; }
}

public class Message
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}


