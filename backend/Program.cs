using System.Text.Json;
using System.Text.Json.Serialization;
using System.Linq;
using System.Net.Mail;
using System.Net;

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

// Get OpenAI API key from environment variable
var openAiApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
    ?? builder.Configuration["OpenAI:ApiKey"] 
    ?? throw new InvalidOperationException("OPENAI_API_KEY environment variable is not set");

// Get Affiliate configuration
var amazonTag = Environment.GetEnvironmentVariable("AMAZON_ASSOCIATE_TAG") 
    ?? builder.Configuration["Affiliate:AmazonAssociates:Tag"] 
    ?? string.Empty;
var amazonEnabled = builder.Configuration.GetValue<bool>("Affiliate:AmazonAssociates:Enabled", false);
var trackingEnabled = builder.Configuration.GetValue<bool>("Affiliate:TrackingEnabled", true);

// Get Email configuration
var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") 
    ?? builder.Configuration["Email:SmtpHost"] 
    ?? string.Empty;
var smtpPort = builder.Configuration.GetValue<int>("Email:SmtpPort", 587);
var smtpUsername = Environment.GetEnvironmentVariable("SMTP_USERNAME") 
    ?? builder.Configuration["Email:SmtpUsername"] 
    ?? string.Empty;
var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD") 
    ?? builder.Configuration["Email:SmtpPassword"] 
    ?? string.Empty;
var supportEmail = Environment.GetEnvironmentVariable("SUPPORT_EMAIL") 
    ?? builder.Configuration["Email:SupportEmail"] 
    ?? "support@yourdomain.com";
var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL") 
    ?? builder.Configuration["Email:AdminEmail"] 
    ?? string.Empty;

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

// Load credit tiers from configuration
var creditTiers = builder.Configuration.GetSection("CreditSystem:Tiers").Get<List<CreditTier>>() 
    ?? new List<CreditTier>();

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

// In-memory storage for usage tracking (replace with DynamoDB in production)
var usageTracker = new Dictionary<string, UserUsage>();

// Premium/Usage endpoints
app.MapGet("/api/usage/{userId}", (string userId) =>
{
    if (!usageTracker.ContainsKey(userId))
    {
        return Results.Ok(new { dailyCount = 0, isPremium = false, dailyLimit = 5 });
    }
    
    var usage = usageTracker[userId];
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

app.MapPost("/api/premium/status", (PremiumStatusRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (!usageTracker.ContainsKey(request.UserId))
    {
        usageTracker[request.UserId] = new UserUsage { UserId = request.UserId };
    }
    
    var usage = usageTracker[request.UserId];
    usage.IsPremium = request.IsPremium;
    
    if (request.IsPremium)
    {
        usage.PremiumExpiresAt = request.ExpiresAt ?? DateTime.UtcNow.AddMonths(1);
    }
    
    return Results.Ok(new { success = true, isPremium = usage.IsPremium });
})
.WithName("SetPremiumStatus")
.WithOpenApi();

// Admin endpoint - Set any user to premium/admin (no restrictions)
app.MapPost("/api/admin/set-premium/{userId}", (string userId) =>
{
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (!usageTracker.ContainsKey(userId))
    {
        usageTracker[userId] = new UserUsage { UserId = userId };
    }
    
    var usage = usageTracker[userId];
    usage.IsPremium = true;
    usage.PremiumExpiresAt = DateTime.UtcNow.AddYears(10); // 10 years expiration
    usage.DailyCount = 0; // Reset count
    
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

// Admin endpoint - Remove premium status (revert to normal user)
app.MapPost("/api/admin/remove-premium/{userId}", (string userId) =>
{
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (!usageTracker.ContainsKey(userId))
    {
        usageTracker[userId] = new UserUsage { UserId = userId };
    }
    
    var usage = usageTracker[userId];
    usage.IsPremium = false;
    usage.PremiumExpiresAt = null;
    usage.DailyCount = 0; // Reset count to start fresh
    
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

// Admin endpoint - Get all users (for admin dashboard)
app.MapGet("/api/admin/users", () =>
{
    var users = usageTracker.Values.Select(u => new
    {
        u.UserId,
        u.DailyCount,
        u.IsPremium,
        u.PremiumExpiresAt,
        u.LastResetDate
    }).ToList();
    
    return Results.Ok(new { users, totalCount = users.Count });
})
.WithName("GetAllUsers")
.WithOpenApi();

// Admin endpoint - Set premium status with specific plan
app.MapPost("/api/admin/set-premium-plan/{userId}", (string userId, PremiumPlanRequest request) =>
{
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { message = "User ID is required" });
    }
    
    if (!usageTracker.ContainsKey(userId))
    {
        usageTracker[userId] = new UserUsage { UserId = userId };
    }
    
    var usage = usageTracker[userId];
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

// Admin endpoint - Grant credits to a user
app.MapPost("/api/admin/grant-credits/{userId}", (string userId, GrantCreditsRequest request) =>
{
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

// Premium Feature 2: Priority Support
// In-memory support tickets (replace with database in production)
var supportTickets = new List<SupportTicket>();

app.MapPost("/api/support/contact", async (SupportRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Message))
    {
        return Results.BadRequest(new { message = "Message is required" });
    }
    
    // Check if user is premium for priority handling
    bool isPremium = false;
    if (!string.IsNullOrWhiteSpace(request.UserId))
    {
        if (usageTracker.ContainsKey(request.UserId))
        {
            isPremium = usageTracker[request.UserId].IsPremium;
        }
    }
    
    var ticket = new SupportTicket
    {
        TicketId = Guid.NewGuid().ToString(),
        UserId = request.UserId ?? "anonymous",
        Email = request.Email ?? "no-email",
        Subject = request.Subject ?? "General Inquiry",
        Message = request.Message,
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

// Payment endpoints
app.MapPost("/api/payment/create-checkout", (PaymentRequest request) =>
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
    
    // In production, integrate with Stripe here
    // For now, create a mock checkout URL with success/cancel callbacks
    var baseUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "https://www.petbehaviortranslator.com";
    var successUrl = $"{baseUrl}/payment/success?userId={request.UserId}&planId={request.PlanId}";
    var cancelUrl = $"{baseUrl}/premium";
    
    // For demo: return a mock checkout URL
    // In production, use Stripe Checkout API
    return Results.Ok(new
    {
        checkoutUrl = $"{baseUrl}/payment/mock-checkout?userId={request.UserId}&planId={request.PlanId}&price={price}&name={Uri.EscapeDataString(name)}&success={Uri.EscapeDataString(successUrl)}&cancel={Uri.EscapeDataString(cancelUrl)}"
    });
})
.WithName("CreateCheckout")
.WithOpenApi();

app.MapPost("/api/payment/webhook", async (HttpContext context) =>
{
    // In production, verify Stripe webhook signature
    // For now, handle mock payment completion
    
    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();
    
    // Parse webhook data (in production, use Stripe library)
    // For demo purposes, just return success
    
    return Results.Ok(new { received = true });
})
.WithName("PaymentWebhook")
.WithOpenApi();

app.MapPost("/api/payment/complete", (PaymentCompleteRequest request) =>
{
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
    if (!usageTracker.ContainsKey(request.UserId))
    {
        usageTracker[request.UserId] = new UserUsage { UserId = request.UserId };
    }
    
    var usage = usageTracker[request.UserId];
    usage.IsPremium = true;
    usage.PremiumExpiresAt = DateTime.UtcNow.AddDays(planDurations[request.PlanId]);
    usage.DailyCount = 0;
    
    return Results.Ok(new
    {
        success = true,
        isPremium = true,
        message = "Payment successful! Premium access granted.",
        expiresAt = usage.PremiumExpiresAt,
        planId = request.PlanId
    });
})
.WithName("CompletePayment")
.WithOpenApi();

// ============================================================================
// CREDIT SYSTEM ENDPOINTS - Stateless token-based metered usage
// ============================================================================

// 1. GET /credits/get-token - Create or retrieve a credit token for a user
app.MapPost("/api/credits/get-token", (GetTokenRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.UserId))
    {
        return Results.BadRequest(new { message = "UserId is required" });
    }

    // Create new token with initial values
    var token = tokenService.CreateToken(request.UserId, freeSearchesUsed: 0, creditsRemaining: 0);
    
    return Results.Ok(new
    {
        token,
        userId = request.UserId,
        freeSearchesUsed = 0,
        creditsRemaining = 0,
        freeSearchLimit = freeSearchLimit
    });
})
.WithName("GetCreditToken")
.WithOpenApi();

// 2. POST /credits/use - Use a free search or credit
app.MapPost("/api/credits/use", (UseCreditsRequest request) =>
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

    // Check if user has free searches remaining
    if (payload.FreeSearchesUsed < freeSearchLimit)
    {
        payload.FreeSearchesUsed++;
        var newToken = tokenService.UpdateToken(payload);
        
        return Results.Ok(new
        {
            token = newToken,
            freeSearchesUsed = payload.FreeSearchesUsed,
            creditsRemaining = payload.CreditsRemaining,
            freeSearchLimit = freeSearchLimit,
            usedFreeSearch = true
        });
    }

    // No free searches left, check credits
    if (payload.CreditsRemaining > 0)
    {
        payload.CreditsRemaining--;
        var newToken = tokenService.UpdateToken(payload);
        
        return Results.Ok(new
        {
            token = newToken,
            freeSearchesUsed = payload.FreeSearchesUsed,
            creditsRemaining = payload.CreditsRemaining,
            freeSearchLimit = freeSearchLimit,
            usedCredit = true
        });
    }

    // No credits remaining
    return Results.Ok(new
    {
        error = "NO_CREDITS",
        message = "No free searches or credits remaining. Please purchase credits to continue.",
        freeSearchesUsed = payload.FreeSearchesUsed,
        creditsRemaining = payload.CreditsRemaining,
        freeSearchLimit = freeSearchLimit
    });
})
.WithName("UseCredits")
.WithOpenApi();

// 3. POST /credits/purchase - Purchase credits (integrates with existing payment flow)
app.MapPost("/api/credits/purchase", (PurchaseCreditsRequest request) =>
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

    // Find the tier
    var tier = creditTiers.FirstOrDefault(t => t.Id == request.TierId);
    if (tier == null)
    {
        return Results.BadRequest(new { message = "Invalid tier ID" });
    }

    // In production, integrate with Stripe/PayPal here
    // For now, create a mock checkout URL similar to premium payment
    var baseUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "https://www.petbehaviortranslator.com";
    var successUrl = $"{baseUrl}/credits/success?userId={payload.UserId}&tierId={tier.Id}&token={Uri.EscapeDataString(request.ExistingToken)}";
    var cancelUrl = $"{baseUrl}/credits";

    return Results.Ok(new
    {
        checkoutUrl = $"{baseUrl}/credits/mock-checkout?userId={payload.UserId}&tierId={tier.Id}&price={tier.Price}&name={Uri.EscapeDataString(tier.Name)}&credits={tier.Credits}&token={Uri.EscapeDataString(request.ExistingToken)}&success={Uri.EscapeDataString(successUrl)}&cancel={Uri.EscapeDataString(cancelUrl)}"
    });
})
.WithName("PurchaseCredits")
.WithOpenApi();

// 4. POST /credits/complete-purchase - Complete credit purchase and update token
app.MapPost("/api/credits/complete-purchase", (CompletePurchaseRequest request) =>
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

    // Find the tier
    var tier = creditTiers.FirstOrDefault(t => t.Id == request.TierId);
    if (tier == null)
    {
        return Results.BadRequest(new { message = "Invalid tier ID" });
    }

    // Add credits to token
    payload.CreditsRemaining += tier.Credits;
    var newToken = tokenService.UpdateToken(payload);

    return Results.Ok(new
    {
        success = true,
        token = newToken,
        creditsAdded = tier.Credits,
        creditsRemaining = payload.CreditsRemaining,
        tierName = tier.Name,
        message = $"Successfully purchased {tier.Credits} credits!"
    });
})
.WithName("CompleteCreditPurchase")
.WithOpenApi();

// 5. GET /credits/tiers - Get available credit tiers
app.MapGet("/api/credits/tiers", () =>
{
    return Results.Ok(new
    {
        tiers = creditTiers,
        freeSearchLimit = freeSearchLimit
    });
})
.WithName("GetCreditTiers")
.WithOpenApi();

// 6. POST /credits/validate - Validate token and return current state
app.MapPost("/api/credits/validate", (ValidateTokenRequest request) =>
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

    return Results.Ok(new
    {
        valid = true,
        userId = payload.UserId,
        freeSearchesUsed = payload.FreeSearchesUsed,
        creditsRemaining = payload.CreditsRemaining,
        freeSearchLimit = freeSearchLimit,
        freeSearchesRemaining = Math.Max(0, freeSearchLimit - payload.FreeSearchesUsed),
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
        
        // Check usage limits and determine if premium
        string? userId = request.UserId;
        bool isPremium = false;
        
        if (!string.IsNullOrWhiteSpace(userId))
        {
            if (!usageTracker.ContainsKey(userId))
            {
                usageTracker[userId] = new UserUsage { UserId = userId };
            }
            
            var usage = usageTracker[userId];
            var today = DateTime.UtcNow.Date;
            
            // Reset daily count if new day
            if (usage.LastResetDate < today)
            {
                usage.DailyCount = 0;
                usage.LastResetDate = today;
            }
            
            // Check premium expiration
            if (usage.IsPremium && usage.PremiumExpiresAt.HasValue && usage.PremiumExpiresAt.Value < DateTime.UtcNow)
            {
                usage.IsPremium = false;
                usage.PremiumExpiresAt = null;
            }
            
            isPremium = usage.IsPremium;
            
            // Check daily limit for free users
            if (!isPremium && usage.DailyCount >= 5)
            {
                return Results.Problem(
                    detail: "Daily limit reached. Upgrade to Premium for unlimited translations!",
                    statusCode: 429,
                    title: "Daily Limit Exceeded",
                    extensions: new Dictionary<string, object?>
                    {
                        { "dailyLimit", 5 },
                        { "upgradeRequired", true }
                    }
                );
            }
            
            // Increment usage counter
            usage.DailyCount++;
        }

        // Premium Feature 1: Advanced Behavior Analysis
        // Premium users get enhanced analysis with more detailed insights
        string prompt;
        string model;
        int maxTokens;
        
        if (isPremium)
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
Respond at: {supportEmail}",
                IsBodyHtml = false
            };
            
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
public record TranslateRequest(string Behavior, string? UserId = null);

public record PremiumStatusRequest(string UserId, bool IsPremium, DateTime? ExpiresAt = null);

public record SupportRequest(string? UserId, string? Email, string? Subject, string Message);

public record PaymentRequest(string UserId, string PlanId);

public record PaymentCompleteRequest(string UserId, string PlanId, string? TransactionId = null);

// Credit System Records
public record GetTokenRequest(string UserId);

public record UseCreditsRequest(string CreditToken);

public record PurchaseCreditsRequest(int TierId, string ExistingToken);

public record CompletePurchaseRequest(int TierId, string ExistingToken, string? TransactionId = null);

public record ValidateTokenRequest(string CreditToken);

// Admin request models
public record PremiumPlanRequest(string PlanId); // "monthly", "yearly", "lifetime"
public record GrantCreditsRequest(int Credits, string? ExistingToken = null);

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

