using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;

namespace PetBehaviorTranslator;

/// <summary>
/// Service for managing admin configuration from SSM Parameter Store.
/// Supports caching to reduce SSM calls.
/// </summary>
public class AdminConfigService
{
    private readonly string _adminConfigSsmParameter;
    private AdminConfig? _cachedConfig;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5); // Cache for 5 minutes

    public AdminConfigService(string adminConfigSsmParameter = "/pettranslator/admin-config")
    {
        _adminConfigSsmParameter = adminConfigSsmParameter;
    }

    /// <summary>
    /// Gets admin configuration, using cache if available.
    /// </summary>
    public async Task<AdminConfig> GetConfigAsync()
    {
        // Return cached config if still valid
        if (_cachedConfig != null && DateTime.UtcNow < _cacheExpiry)
        {
            return _cachedConfig;
        }

        try
        {
            using var ssmClient = new AmazonSimpleSystemsManagementClient();
            var request = new GetParameterRequest
            {
                Name = _adminConfigSsmParameter,
                WithDecryption = true
            };

            var response = await ssmClient.GetParameterAsync(request);
            var configJson = response.Parameter.Value;

            _cachedConfig = JsonSerializer.Deserialize<AdminConfig>(configJson) 
                ?? new AdminConfig(); // Default if deserialization fails

            _cacheExpiry = DateTime.UtcNow.Add(_cacheDuration);
            return _cachedConfig;
        }
        catch (ParameterNotFoundException)
        {
            // Parameter doesn't exist, return default config
            _cachedConfig = new AdminConfig();
            _cacheExpiry = DateTime.UtcNow.Add(_cacheDuration);
            return _cachedConfig;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ADMIN CONFIG] Error loading config from SSM: {ex.Message}");
            // Return default config on error
            return _cachedConfig ?? new AdminConfig();
        }
    }

    /// <summary>
    /// Saves admin configuration to SSM Parameter Store.
    /// </summary>
    public async Task SaveConfigAsync(AdminConfig config)
    {
        try
        {
            var configJson = JsonSerializer.Serialize(config);
            
            using var ssmClient = new AmazonSimpleSystemsManagementClient();
            var request = new PutParameterRequest
            {
                Name = _adminConfigSsmParameter,
                Value = configJson,
                Type = ParameterType.String,
                Overwrite = true
            };

            await ssmClient.PutParameterAsync(request);
            
            // Update cache
            _cachedConfig = config;
            _cacheExpiry = DateTime.UtcNow.Add(_cacheDuration);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ADMIN CONFIG] Error saving config to SSM: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Checks if a user email is in the admin list.
    /// </summary>
    public async Task<bool> IsAdminEmailAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        var config = await GetConfigAsync();
        return config.AdminEmails != null && 
               config.AdminEmails.Any(e => 
                   string.Equals(e.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Invalidates the cache, forcing a fresh load on next request.
    /// </summary>
    public void InvalidateCache()
    {
        _cachedConfig = null;
        _cacheExpiry = DateTime.MinValue;
    }
}

/// <summary>
/// Admin configuration structure.
/// </summary>
public class AdminConfig
{
    public List<string> AdminEmails { get; set; } = new List<string>();
    public int FreeSearchLimit { get; set; } = 5;
    public List<CreditTier> Tiers { get; set; } = new List<CreditTier>();
    public int AdminBypassExpirySeconds { get; set; } = 86400; // 24 hours default
}
