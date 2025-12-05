using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace PetBehaviorTranslator;

/// <summary>
/// Stateless token service for managing user credits without database storage.
/// Tokens contain usage state and are signed with HMAC-SHA256.
/// </summary>
public class TokenService
{
    private readonly string _secretKey;

    public TokenService(string secretKey)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            throw new ArgumentException("Secret key cannot be empty", nameof(secretKey));
        
        _secretKey = secretKey;
    }

    /// <summary>
    /// Creates a new token for a user with initial values.
    /// </summary>
    public string CreateToken(string userId, int freeSearchesUsed = 0, int creditsRemaining = 0)
    {
        var payload = new TokenPayload
        {
            UserId = userId,
            FreeSearchesUsed = freeSearchesUsed,
            CreditsRemaining = creditsRemaining,
            IssuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ExpiresAt = DateTimeOffset.UtcNow.AddYears(1).ToUnixTimeSeconds() // 1 year expiry
        };

        return SignToken(payload);
    }

    /// <summary>
    /// Validates and decodes a token. Returns null if invalid.
    /// </summary>
    public TokenPayload? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        try
        {
            var parts = token.Split('.');
            if (parts.Length != 2)
                return null;

            var payloadBase64 = parts[0];
            var signatureBase64 = parts[1];

            // Verify signature
            var expectedSignature = ComputeSignature(payloadBase64);
            if (signatureBase64 != expectedSignature)
                return null;

            // Decode payload
            var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(payloadBase64));
            var payload = JsonSerializer.Deserialize<TokenPayload>(payloadJson);

            if (payload == null)
                return null;

            // Check expiration
            if (payload.ExpiresAt > 0 && DateTimeOffset.UtcNow.ToUnixTimeSeconds() > payload.ExpiresAt)
                return null;

            return payload;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Updates the token with new usage values.
    /// </summary>
    public string UpdateToken(TokenPayload payload)
    {
        return SignToken(payload);
    }

    /// <summary>
    /// Signs the payload and returns a token string.
    /// </summary>
    private string SignToken(TokenPayload payload)
    {
        var payloadJson = JsonSerializer.Serialize(payload);
        var payloadBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(payloadJson));
        var signature = ComputeSignature(payloadBase64);

        return $"{payloadBase64}.{signature}";
    }

    /// <summary>
    /// Computes HMAC-SHA256 signature for the payload.
    /// </summary>
    private string ComputeSignature(string payloadBase64)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadBase64));
        return Convert.ToBase64String(hashBytes);
    }
}

/// <summary>
/// Token payload containing user credit state.
/// </summary>
public class TokenPayload
{
    public string UserId { get; set; } = string.Empty;
    public int FreeSearchesUsed { get; set; } = 0;
    public int CreditsRemaining { get; set; } = 0;
    public long IssuedAt { get; set; }
    public long ExpiresAt { get; set; }
}


