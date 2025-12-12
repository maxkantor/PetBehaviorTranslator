using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
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

            await _dynamoDbClient.PutItemAsync(new PutItemRequest
            {
                TableName = UserUsageTable,
                Item = item
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error saving user usage: {ex.Message}");
        }
    }

    public async Task<List<UserUsage>> GetAllUserUsageAsync()
    {
        try
        {
            var response = await _dynamoDbClient.ScanAsync(new ScanRequest
            {
                TableName = UserUsageTable
            });

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
        catch (Exception ex)
        {
            Console.WriteLine($"[DYNAMODB] Error getting all user usage: {ex.Message}");
            return new List<UserUsage>();
        }
    }

    // ActivityLog methods
    public async Task SaveActivityLogAsync(ActivityLogEntry entry)
    {
        try
        {
            var eventId = $"{entry.UserId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..8]}";
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            
            var item = new Dictionary<string, AttributeValue>
            {
                { "EventId", new AttributeValue { S = eventId } },
                { "Timestamp", new AttributeValue { N = timestamp.ToString() } },
                { "UserId", new AttributeValue { S = entry.UserId } },
                { "Action", new AttributeValue { S = entry.Action } },
                { "Details", new AttributeValue { S = entry.Details } },
                { "TimestampDate", new AttributeValue { S = entry.Timestamp.ToString("O") } }
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
                .OrderByDescending(item => long.Parse(item["Timestamp"].N))
                .Take(limit)
                .Select(item => new ActivityLogEntry
                {
                    UserId = item["UserId"].S,
                    Action = item["Action"].S,
                    Details = item["Details"].S,
                    Timestamp = item.ContainsKey("TimestampDate") 
                        ? DateTime.Parse(item["TimestampDate"].S) 
                        : DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(item["Timestamp"].N)).DateTime
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

