using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using System.Text.Json;

namespace PetBehaviorTranslator;

/// <summary>
/// Service for retrieving secrets from AWS Secrets Manager
/// </summary>
public class SecretsService
{
    private readonly string _secretName;
    private readonly AmazonSecretsManagerClient _secretsClient;
    private Dictionary<string, string>? _cachedSecrets;
    private DateTime? _cacheExpiry;

    public SecretsService(string secretName = "/pettranslator/app-secrets")
    {
        _secretName = secretName;
        _secretsClient = new AmazonSecretsManagerClient();
    }

    /// <summary>
    /// Get all secrets from the secret store
    /// </summary>
    public async Task<Dictionary<string, string>> GetSecretsAsync(bool useCache = true)
    {
        // Use cached secrets if available and not expired (5 minute cache)
        if (useCache && _cachedSecrets != null && _cacheExpiry.HasValue && DateTime.UtcNow < _cacheExpiry.Value)
        {
            return _cachedSecrets;
        }

        try
        {
            var request = new GetSecretValueRequest
            {
                SecretId = _secretName
            };

            var response = await _secretsClient.GetSecretValueAsync(request);
            
            if (string.IsNullOrWhiteSpace(response.SecretString))
            {
                throw new InvalidOperationException($"Secret {_secretName} is empty");
            }

            // Parse JSON secret
            var secrets = JsonSerializer.Deserialize<Dictionary<string, string>>(response.SecretString);
            
            if (secrets == null || secrets.Count == 0)
            {
                throw new InvalidOperationException($"Secret {_secretName} contains no values");
            }

            // Cache for 5 minutes
            _cachedSecrets = secrets;
            _cacheExpiry = DateTime.UtcNow.AddMinutes(5);

            return secrets;
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[SECRETS] Secret {_secretName} not found in Secrets Manager. Falling back to environment variables.");
            return new Dictionary<string, string>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SECRETS] Error retrieving secret {_secretName}: {ex.Message}");
            return new Dictionary<string, string>();
        }
    }

    /// <summary>
    /// Get a specific secret value by key
    /// </summary>
    public async Task<string?> GetSecretAsync(string key, string? defaultValue = null)
    {
        var secrets = await GetSecretsAsync();
        
        if (secrets.TryGetValue(key, out var value))
        {
            return value;
        }

        return defaultValue;
    }

    /// <summary>
    /// Get a secret value, falling back to environment variable if not found
    /// </summary>
    public async Task<string> GetSecretOrEnvAsync(string key, string? envVarName = null, string? defaultValue = null)
    {
        envVarName ??= key;
        
        // Try Secrets Manager first
        var secretValue = await GetSecretAsync(key);
        if (!string.IsNullOrWhiteSpace(secretValue))
        {
            return secretValue;
        }

        // Fall back to environment variable
        var envValue = Environment.GetEnvironmentVariable(envVarName);
        if (!string.IsNullOrWhiteSpace(envValue))
        {
            return envValue;
        }

        // Fall back to default
        if (!string.IsNullOrWhiteSpace(defaultValue))
        {
            return defaultValue;
        }

        // Return empty string if no value found and no default provided
        return string.Empty;
    }

    /// <summary>
    /// Clear the cache (useful for testing or when secrets are updated)
    /// </summary>
    public void ClearCache()
    {
        _cachedSecrets = null;
        _cacheExpiry = null;
    }
}

