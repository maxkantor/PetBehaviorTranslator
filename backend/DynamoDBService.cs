using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Runtime;
using System.Text.Json;

public class DynamoDBService
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private const string UserUsageTable = "PetTranslator-UserUsage";
    private const string ActivityLogTable = "PetTranslator-ActivityLog";
    private const string SupportTicketsTable = "PetTranslator-SupportTickets";

    public DynamoDBService()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
    }

    // UserUsage methods
    public async Task<UserUsage?> GetUserUsageAsync(string userId)
    {
        try
        {
            var response = await _dynamoDbClient.GetItemAsync(new GetItemRequest
            {
                TableName = UserUsageTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "UserId", new AttributeValue { S = userId } }
                }
            });

            if (!response.Item.Any())
                return null;

            var usage = new UserUsage
            {
                UserId = response.Item["UserId"].S,
                DailyCount = response.Item.ContainsKey("DailyCount") ? int.Parse(response.Item["DailyCount"].N) : 0,
                IsPremium = response.Item.ContainsKey("IsPremium") && response.Item["IsPremium"].BOOL == true,
                LastResetDate = response.Item.ContainsKey("LastResetDate") 
                    ? DateTime.Parse(response.Item["LastResetDate"].S) 
                    : DateTime.UtcNow.Date
            };

            if (response.Item.ContainsKey("PremiumExpiresAt") && !string.IsNullOrEmpty(response.Item["PremiumExpiresAt"].S))
            {
                usage.PremiumExpiresAt = DateTime.Parse(response.Item["PremiumExpiresAt"].S);
            }

            return usage;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting user usage: {ex.Message}");
            return null;
        }
    }

    public async Task SaveUserUsageAsync(UserUsage usage)
    {
        try
        {
            Console.WriteLine($"[DYNAMODB] Attempting to save user {usage.UserId} to table {UserUsageTable}");
            
            var item = new Dictionary<string, AttributeValue>
            {
                { "UserId", new AttributeValue { S = usage.UserId } },
                { "DailyCount", new AttributeValue { N = usage.DailyCount.ToString() } },
                { "IsPremium", new AttributeValue { BOOL = usage.IsPremium } },
                { "LastResetDate", new AttributeValue { S = usage.LastResetDate.ToString("O") } }
            };

            if (usage.PremiumExpiresAt.HasValue)
            {
                item["PremiumExpiresAt"] = new AttributeValue { S = usage.PremiumExpiresAt.Value.ToString("O") };
            }

            var request = new PutItemRequest
            {
                TableName = UserUsageTable,
                Item = item
            };
            
            Console.WriteLine($"[DYNAMODB] PutItem request prepared for user {usage.UserId}");
            await _dynamoDbClient.PutItemAsync(request);
            
            Console.WriteLine($"[DYNAMODB] ✅ Successfully saved user {usage.UserId} to table {UserUsageTable}");
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException ex)
        {
            Console.WriteLine($"[DYNAMODB] ❌ ERROR: Table {UserUsageTable} does not exist: {ex.Message}");
            Console.WriteLine($"[DYNAMODB] Please create the table in AWS Console with primary key: UserId (String)");
            throw; // Re-throw so caller knows save failed
        }
        catch (AmazonServiceException ex)
        {
            Console.WriteLine($"[DYNAMODB] ❌ AWS Service Exception saving user {usage.UserId}: {ex.Message}");
            Console.WriteLine($"[DYNAMODB] Error Code: {ex.ErrorCode}, Status Code: {ex.StatusCode}");
            Console.WriteLine($"[DYNAMODB] Stack trace: {ex.StackTrace}");
            throw; // Re-throw so caller knows save failed
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] ❌ General Exception saving user {usage.UserId}: {ex.Message}");
            Console.WriteLine($"[DYNAMODB] Exception Type: {ex.GetType().FullName}");
            Console.WriteLine($"[DYNAMODB] Stack trace: {ex.StackTrace}");
            throw; // Re-throw so caller knows save failed
        }
    }

    public async Task<List<UserUsage>> GetAllUserUsageAsync()
    {
        try
        {
            // First, check if table exists
            try
            {
                var describeRequest = new Amazon.DynamoDBv2.Model.DescribeTableRequest
                {
                    TableName = UserUsageTable
                };
                await _dynamoDbClient.DescribeTableAsync(describeRequest);
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                Console.WriteLine($"[DYNAMODB] Table {UserUsageTable} does not exist. Please create it in AWS Console.");
                return new List<UserUsage>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DYNAMODB] Error checking if table exists: {ex.Message}");
                return new List<UserUsage>();
            }

            var response = await _dynamoDbClient.ScanAsync(new ScanRequest
            {
                TableName = UserUsageTable
            });

            Console.WriteLine($"[DYNAMODB] Scanned table {UserUsageTable}, found {response.Items.Count} items");

            return response.Items.Select(item => 
            {
                var usage = new UserUsage
                {
                    UserId = item["UserId"].S,
                    DailyCount = item.ContainsKey("DailyCount") ? int.Parse(item["DailyCount"].N) : 0,
                    IsPremium = item.ContainsKey("IsPremium") && item["IsPremium"].BOOL == true,
                    LastResetDate = item.ContainsKey("LastResetDate") 
                        ? DateTime.Parse(item["LastResetDate"].S) 
                        : DateTime.UtcNow.Date
                };

                if (item.ContainsKey("PremiumExpiresAt") && !string.IsNullOrEmpty(item["PremiumExpiresAt"].S))
                {
                    usage.PremiumExpiresAt = DateTime.Parse(item["PremiumExpiresAt"].S);
                }

                return usage;
            }).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException ex)
        {
            Console.WriteLine($"[DYNAMODB] Table {UserUsageTable} not found: {ex.Message}");
            return new List<UserUsage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting all user usage: {ex.Message}");
            Console.WriteLine($"[DYNAMODB] Stack trace: {ex.StackTrace}");
            return new List<UserUsage>();
        }
    }

    // ActivityLog methods
    public async Task SaveActivityLogAsync(ActivityLogEntry entry)
    {
        try
        {
            var eventId = $"{entry.UserId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..8]}";
            var timestampString = entry.Timestamp.ToString("O"); // ISO 8601 format
            
            var item = new Dictionary<string, AttributeValue>
            {
                { "EventId", new AttributeValue { S = eventId } },
                { "Timestamp", new AttributeValue { S = timestampString } }, // Changed to String type
                { "UserId", new AttributeValue { S = entry.UserId } },
                { "Action", new AttributeValue { S = entry.Action } },
                { "Details", new AttributeValue { S = entry.Details } },
                { "TimestampDate", new AttributeValue { S = timestampString } } // Use same value
            };

            await _dynamoDbClient.PutItemAsync(new PutItemRequest
            {
                TableName = ActivityLogTable,
                Item = item
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error saving activity log: {ex.Message}");
        }
    }

    public async Task<List<ActivityLogEntry>> GetRecentActivityLogsAsync(int limit = 100)
    {
        try
        {
            var response = await _dynamoDbClient.ScanAsync(new ScanRequest
            {
                TableName = ActivityLogTable,
                Limit = limit
            });

            return response.Items
                .OrderByDescending(item => 
                {
                    // Handle both String and Number types for backward compatibility
                    if (item["Timestamp"].S != null)
                        return DateTime.Parse(item["Timestamp"].S);
                    else if (item["Timestamp"].N != null)
                        return DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(item["Timestamp"].N)).DateTime;
                    else if (item.ContainsKey("TimestampDate"))
                        return DateTime.Parse(item["TimestampDate"].S);
                    return DateTime.MinValue;
                })
                .Take(limit)
                .Select(item => new ActivityLogEntry
                {
                    UserId = item["UserId"].S,
                    Action = item["Action"].S,
                    Details = item["Details"].S,
                    Timestamp = item["Timestamp"].S != null
                        ? DateTime.Parse(item["Timestamp"].S)
                        : (item.ContainsKey("TimestampDate") 
                            ? DateTime.Parse(item["TimestampDate"].S) 
                            : DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(item["Timestamp"].N)).DateTime)
                }).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting activity logs: {ex.Message}");
            return new List<ActivityLogEntry>();
        }
    }

    // SupportTickets methods
    public async Task<SupportTicket?> GetSupportTicketAsync(string ticketId)
    {
        try
        {
            var response = await _dynamoDbClient.GetItemAsync(new GetItemRequest
            {
                TableName = SupportTicketsTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "TicketId", new AttributeValue { S = ticketId } }
                }
            });

            if (!response.Item.Any())
                return null;

            return new SupportTicket
            {
                TicketId = response.Item["TicketId"].S,
                UserId = response.Item["UserId"].S,
                Email = response.Item["Email"].S,
                Subject = response.Item["Subject"].S,
                Message = response.Item["Message"].S,
                IsPremium = response.Item.ContainsKey("IsPremium") && response.Item["IsPremium"].BOOL == true,
                Priority = response.Item.ContainsKey("Priority") ? response.Item["Priority"].S : "Normal",
                Status = response.Item.ContainsKey("Status") ? response.Item["Status"].S : "Open",
                CreatedAt = DateTime.Parse(response.Item["CreatedAt"].S)
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting support ticket: {ex.Message}");
            return null;
        }
    }

    public async Task SaveSupportTicketAsync(SupportTicket ticket)
    {
        try
        {
            var item = new Dictionary<string, AttributeValue>
            {
                { "TicketId", new AttributeValue { S = ticket.TicketId } },
                { "UserId", new AttributeValue { S = ticket.UserId } },
                { "Email", new AttributeValue { S = ticket.Email } },
                { "Subject", new AttributeValue { S = ticket.Subject } },
                { "Message", new AttributeValue { S = ticket.Message } },
                { "IsPremium", new AttributeValue { BOOL = ticket.IsPremium } },
                { "Priority", new AttributeValue { S = ticket.Priority } },
                { "Status", new AttributeValue { S = ticket.Status } },
                { "CreatedAt", new AttributeValue { S = ticket.CreatedAt.ToString("O") } }
            };

            await _dynamoDbClient.PutItemAsync(new PutItemRequest
            {
                TableName = SupportTicketsTable,
                Item = item
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error saving support ticket: {ex.Message}");
        }
    }

    public async Task<List<SupportTicket>> GetAllSupportTicketsAsync()
    {
        try
        {
            var response = await _dynamoDbClient.ScanAsync(new ScanRequest
            {
                TableName = SupportTicketsTable
            });

            return response.Items.Select(item => new SupportTicket
            {
                TicketId = item["TicketId"].S,
                UserId = item["UserId"].S,
                Email = item["Email"].S,
                Subject = item["Subject"].S,
                Message = item["Message"].S,
                IsPremium = item.ContainsKey("IsPremium") && item["IsPremium"].BOOL == true,
                Priority = item.ContainsKey("Priority") ? item["Priority"].S : "Normal",
                Status = item.ContainsKey("Status") ? item["Status"].S : "Open",
                CreatedAt = DateTime.Parse(item["CreatedAt"].S)
            }).OrderByDescending(t => t.CreatedAt).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting all support tickets: {ex.Message}");
            return new List<SupportTicket>();
        }
    }
}

