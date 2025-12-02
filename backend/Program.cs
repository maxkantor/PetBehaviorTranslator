using System.Text.Json;
using System.Text.Json.Serialization;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

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

// Translate endpoint
app.MapPost("/api/translate", async (TranslateRequest request) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(request.Behavior))
        {
            return Results.BadRequest(new { message = "Behavior description is required" });
        }

        var prompt = $@"You are a certified pet behaviorist. Analyze this pet behavior:

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

        // Call OpenAI API using HTTP client
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {openAiApiKey}");

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new[]
            {
                new { role = "system", content = "You are a helpful pet behaviorist. Always respond with valid JSON only, no markdown formatting." },
                new { role = "user", content = prompt }
            },
            temperature = 0.7,
            max_tokens = 1000
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
                .ToArray()
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

app.Run();

// Request/Response models
public record TranslateRequest(string Behavior);

// Intermediate model for parsing AI response (products as strings)
public class IntermediateTranslateResponse
{
    public string? Cause { get; set; }
    public string? QuickFix { get; set; }
    public string[]? Steps { get; set; }
    public string? VetWarning { get; set; }
    public string[]? Products { get; set; }
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

