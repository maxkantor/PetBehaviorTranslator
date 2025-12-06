using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;

namespace PetBehaviorTranslator;

/// <summary>
/// Service for logging events to S3 for dashboard metrics.
/// Uses per-minute JSONL files to avoid concurrency issues.
/// </summary>
public class EventLogService
{
    private readonly string? _bucketName;
    private readonly string? _prefix;
    private readonly bool _enabled;

    public EventLogService(string? bucketName = null, string? prefix = "events")
    {
        _bucketName = bucketName ?? Environment.GetEnvironmentVariable("EVENT_LOG_BUCKET");
        _prefix = prefix;
        _enabled = !string.IsNullOrWhiteSpace(_bucketName);
        
        if (!_enabled)
        {
            Console.WriteLine("[EVENT LOG] S3 event logging disabled (no bucket configured)");
        }
    }

    /// <summary>
    /// Logs an event to S3 (fire-and-forget, doesn't throw).
    /// </summary>
    public async Task LogEventAsync(EventLogEntry entry)
    {
        if (!_enabled)
            return;

        try
        {
            // Use per-minute file to avoid concurrency issues
            var now = DateTime.UtcNow;
            var fileName = $"{_prefix}/{now:yyyy/MM/dd/HH/mm}.jsonl";
            
            var eventJson = JsonSerializer.Serialize(entry);
            var eventLine = eventJson + "\n";

            using var s3Client = new AmazonS3Client();
            
            // Try to append to existing file, or create new
            try
            {
                // Get existing content
                var getRequest = new GetObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileName
                };
                
                string existingContent;
                try
                {
                    using var response = await s3Client.GetObjectAsync(getRequest);
                    using var reader = new System.IO.StreamReader(response.ResponseStream);
                    existingContent = await reader.ReadToEndAsync();
                }
                catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    existingContent = string.Empty;
                }

                // Append new event
                var newContent = existingContent + eventLine;
                var contentBytes = Encoding.UTF8.GetBytes(newContent);

                var putRequest = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileName,
                    ContentBody = newContent,
                    ContentType = "application/x-ndjson"
                };

                await s3Client.PutObjectAsync(putRequest);
            }
            catch (Exception ex)
            {
                // Log error but don't throw - event logging should not break the app
                Console.WriteLine($"[EVENT LOG] Error writing to S3: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EVENT LOG] Error in LogEventAsync: {ex.Message}");
        }
    }

    /// <summary>
    /// Reads recent events from S3 for dashboard display.
    /// </summary>
    public async Task<List<EventLogEntry>> GetRecentEventsAsync(int limit = 200)
    {
        if (!_enabled)
            return new List<EventLogEntry>();

        try
        {
            using var s3Client = new AmazonS3Client();
            var events = new List<EventLogEntry>();

            // Read last 24 hours of files (worst case: 1440 files, but we'll limit)
            var now = DateTime.UtcNow;
            var filesToRead = new List<string>();

            // Get files from last 24 hours
            for (int hoursBack = 0; hoursBack < 24 && events.Count < limit; hoursBack++)
            {
                var targetTime = now.AddHours(-hoursBack);
                var fileName = $"{_prefix}/{targetTime:yyyy/MM/dd/HH/mm}.jsonl";
                filesToRead.Add(fileName);
            }

            // Read files in reverse chronological order
            foreach (var fileName in filesToRead.OrderByDescending(f => f))
            {
                if (events.Count >= limit)
                    break;

                try
                {
                    var getRequest = new GetObjectRequest
                    {
                        BucketName = _bucketName,
                        Key = fileName
                    };

                    using var response = await s3Client.GetObjectAsync(getRequest);
                    using var reader = new System.IO.StreamReader(response.ResponseStream);
                    var content = await reader.ReadToEndAsync();

                    // Parse JSONL (one JSON object per line)
                    var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                    foreach (var line in lines.Reverse()) // Most recent first
                    {
                        if (events.Count >= limit)
                            break;

                        try
                        {
                            var entry = JsonSerializer.Deserialize<EventLogEntry>(line);
                            if (entry != null)
                            {
                                events.Add(entry);
                            }
                        }
                        catch
                        {
                            // Skip invalid lines
                        }
                    }
                }
                catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    // File doesn't exist, skip
                    continue;
                }
            }

            return events.OrderByDescending(e => e.Timestamp).Take(limit).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EVENT LOG] Error reading events from S3: {ex.Message}");
            return new List<EventLogEntry>();
        }
    }

    /// <summary>
    /// Gets summary statistics for dashboard.
    /// </summary>
    public async Task<EventSummary> GetSummaryAsync()
    {
        if (!_enabled)
            return new EventSummary();

        try
        {
            var today = DateTime.UtcNow.Date;
            var events = await GetRecentEventsAsync(10000); // Get more for accurate stats

            var todayEvents = events.Where(e => e.Timestamp >= today).ToList();

            return new EventSummary
            {
                TodaysTranslations = todayEvents.Count(e => e.EventType == "TRANSLATE"),
                TodaysPurchases = todayEvents.Count(e => e.EventType == "PURCHASE"),
                ActiveTokensApprox = events
                    .Where(e => e.EventType == "TOKEN_ISSUED" || e.EventType == "TOKEN_UPDATED")
                    .Select(e => e.UserId)
                    .Distinct()
                    .Count()
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EVENT LOG] Error getting summary: {ex.Message}");
            return new EventSummary();
        }
    }
}

/// <summary>
/// Event log entry structure.
/// </summary>
public class EventLogEntry
{
    public string EventType { get; set; } = string.Empty; // TRANSLATE, PURCHASE, TOKEN_ISSUED, etc.
    public string UserId { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Endpoint { get; set; }
    public string? Details { get; set; }
    public string? Status { get; set; } // SUCCESS, ERROR, etc.
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Summary statistics for dashboard.
/// </summary>
public class EventSummary
{
    public int TodaysTranslations { get; set; }
    public int TodaysPurchases { get; set; }
    public int ActiveTokensApprox { get; set; }
}
