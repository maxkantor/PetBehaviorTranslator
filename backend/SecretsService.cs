using System.Collections.Concurrent;
using System.Text.Json;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;

namespace PetBehaviorTranslator;

/// <summary>
/// Single secret source: AWS Systems Manager Parameter Store.
/// Individual SecureString parameters under /pettranslator/*, with an optional
/// JSON bundle at /pettranslator/app-secrets. No committed defaults for credentials.
/// </summary>
public class SecretsService
{
    public const string ParameterPrefix = "/pettranslator";
    public const string BundleParameterName = "/pettranslator/app-secrets";

    private static readonly HashSet<string> CredentialKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "OPENAI_API_KEY",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "STRIPE_SECRET_KEY",
        "STRIPE_SECRET_KEY_TEST",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_WEBHOOK_SECRET_TEST",
        "ADMIN_PASSWORD",
        "CREDIT_TOKEN_SECRET",
        "MIXPANEL_TOKEN",
        "VITE_MIXPANEL_TOKEN"
    };

    private static readonly Dictionary<string, string[]> ParameterAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OPENAI_API_KEY"] = ["/pettranslator/openai-api-key"],
        ["SMTP_HOST"] = ["/pettranslator/smtp-host"],
        ["SMTP_PORT"] = ["/pettranslator/smtp-port"],
        ["SMTP_USERNAME"] = ["/pettranslator/smtp-username"],
        ["SMTP_PASSWORD"] = ["/pettranslator/smtp-password"],
        ["SUPPORT_EMAIL"] = ["/pettranslator/support-email"],
        ["ADMIN_EMAIL"] = ["/pettranslator/admin-email"],
        ["ADMIN_USER_ID"] = ["/pettranslator/admin-user-id"],
        ["ADMIN_USERNAME"] = ["/pettranslator/admin-username"],
        ["ADMIN_PASSWORD"] = ["/pettranslator/admin-password"],
        ["STRIPE_SECRET_KEY"] = ["/pettranslator/stripe-secret-key"],
        ["STRIPE_SECRET_KEY_TEST"] = ["/pettranslator/stripe-secret-key-test"],
        ["STRIPE_WEBHOOK_SECRET"] = ["/pettranslator/stripe-webhook-secret"],
        ["STRIPE_WEBHOOK_SECRET_TEST"] = ["/pettranslator/stripe-webhook-secret-test"],
        ["FRONTEND_URL"] = ["/pettranslator/frontend-url"],
        ["EVENT_LOG_BUCKET"] = ["/pettranslator/event-log-bucket"],
        ["AMAZON_ASSOCIATE_TAG"] = ["/pettranslator/amazon-associate-tag"],
        ["CREDIT_TOKEN_SECRET"] = ["/pettranslator/credit-token-secret"],
        ["GA_MEASUREMENT_ID"] = ["/pettranslator/ga-measurement-id"],
        ["VITE_GA_MEASUREMENT_ID"] = ["/pettranslator/ga-measurement-id"],
        ["VITE_GA_MEASURMENT"] = ["/pettranslator/ga-measurement-id"],
        ["MIXPANEL_TOKEN"] = ["/pettranslator/mixpanel-token"],
        ["VITE_MIXPANEL_TOKEN"] = ["/pettranslator/mixpanel-token"],
        ["VITE_API_URL"] = ["/pettranslator/vite-api-url"]
    };

    private readonly AmazonSimpleSystemsManagementClient _ssm = new();
    private readonly ConcurrentDictionary<string, string> _parameterCache = new(StringComparer.OrdinalIgnoreCase);
    private Dictionary<string, string>? _bundleCache;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);

    public async Task<string> GetRequiredAsync(string key)
    {
        var value = await GetSecretOrEnvAsync(key);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"Required secret '{key}' was not found in SSM Parameter Store.");
        return value;
    }

    public async Task<string?> GetSecretAsync(string key, string? defaultValue = null)
    {
        var value = await ResolveAsync(key);
        if (!string.IsNullOrWhiteSpace(value))
            return value;
        return IsCredential(key) ? null : defaultValue;
    }

    public async Task<string> GetSecretOrEnvAsync(string key, string? envVarName = null, string? defaultValue = null)
    {
        var value = await ResolveAsync(key);
        if (!string.IsNullOrWhiteSpace(value))
            return value;

        var envValue = Environment.GetEnvironmentVariable(envVarName ?? key);
        if (!string.IsNullOrWhiteSpace(envValue))
            return envValue;

        if (!IsCredential(key) && !string.IsNullOrWhiteSpace(defaultValue))
            return defaultValue;

        return string.Empty;
    }

    public void ClearCache()
    {
        _parameterCache.Clear();
        _bundleCache = null;
        _cacheExpiry = DateTime.MinValue;
    }

    private async Task<string?> ResolveAsync(string key)
    {
        EnsureCacheWindow();

        foreach (var name in CandidateParameterNames(key))
        {
            var parameter = await GetParameterAsync(name);
            if (!string.IsNullOrWhiteSpace(parameter))
                return parameter;
        }

        var bundle = await GetBundleAsync();
        if (bundle.TryGetValue(key, out var bundled) && !string.IsNullOrWhiteSpace(bundled))
            return bundled;

        return null;
    }

    private static IEnumerable<string> CandidateParameterNames(string key)
    {
        if (ParameterAliases.TryGetValue(key, out var aliases))
        {
            foreach (var alias in aliases)
                yield return alias;
        }

        yield return $"{ParameterPrefix}/{ToKebab(key)}";
    }

    private async Task<string?> GetParameterAsync(string name)
    {
        if (_parameterCache.TryGetValue(name, out var cached))
            return cached;

        try
        {
            var response = await _ssm.GetParameterAsync(new GetParameterRequest
            {
                Name = name,
                WithDecryption = true
            });

            var value = response.Parameter?.Value;
            if (!string.IsNullOrWhiteSpace(value))
            {
                _parameterCache[name] = value;
                return value;
            }
        }
        catch (ParameterNotFoundException)
        {
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SECRETS] Failed to read SSM parameter {name}: {ex.Message}");
        }

        return null;
    }

    private async Task<Dictionary<string, string>> GetBundleAsync()
    {
        EnsureCacheWindow();
        if (_bundleCache != null)
            return _bundleCache;

        var raw = await GetParameterAsync(BundleParameterName);
        if (string.IsNullOrWhiteSpace(raw))
        {
            _bundleCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            return _bundleCache;
        }

        try
        {
            _bundleCache = JsonSerializer.Deserialize<Dictionary<string, string>>(raw)
                ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SECRETS] Failed to parse {BundleParameterName}: {ex.Message}");
            _bundleCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return _bundleCache;
    }

    private void EnsureCacheWindow()
    {
        if (DateTime.UtcNow < _cacheExpiry)
            return;

        _parameterCache.Clear();
        _bundleCache = null;
        _cacheExpiry = DateTime.UtcNow.Add(_cacheDuration);
    }

    private static bool IsCredential(string key) => CredentialKeys.Contains(key);

    private static string ToKebab(string key)
    {
        return key.Replace('_', '-').ToLowerInvariant();
    }
}
