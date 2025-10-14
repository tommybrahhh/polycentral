# Platform Fee Management - Admin Documentation

## Overview

This document provides detailed instructions on how to use the admin endpoints for managing platform fees in the predictions app. The system automatically collects a 5% fee from each event's pot, which can then be transferred to users by authorized administrators.

## Platform Fee Collection Mechanism

### How Fees Are Collected

1. When an event is resolved, the system calculates the total pot from all participants' bets
2. A 5% platform fee is automatically deducted from the total pot
3. The fee amount is stored in the `platform_fee` column of the `events` table
4. Individual fee contributions are also tracked in the `platform_fees` table

### Database Schema

#### Events Table (with platform_fee column)
```sql
ALTER TABLE events ADD COLUMN platform_fee INTEGER NOT NULL DEFAULT 0;
```

#### Platform Fees Tracking Table
```sql
CREATE TABLE IF NOT EXISTS platform_fees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    fee_amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Admin Authentication

All admin endpoints require authentication using the `ADMIN_API_KEY` environment variable.

### Authentication Header Format
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

The ADMIN_API_KEY can be found in the `backend/.env` file:
```
ADMIN_API_KEY=adm_7xK9pR2sT8wN4mV1qL6hY3jZ5nX9cB7vE2rP8tQ4wM6kL9nD3sF7jH1pV5bN8mR4t
```

## Admin Endpoints

### 1. Get Total Platform Fees

Retrieve the total accumulated platform fees across all events.

**Endpoint:** `GET /api/admin/platform-fees/total`

**Authentication:** Required

**Response:**
```json
{
  "total_platform_fees": 1250
}
```

**Example Usage:**
```bash
curl -H "Authorization: Bearer adm_7xK9pR2sT8wN4mV1qL6hY3jZ5nX9cB7vE2rP8tQ4wM6kL9nD3sF7jH1pV5bN8mR4t" \
http://localhost:8080/api/admin/platform-fees/total
```

### 2. Transfer Platform Fees to User

Transfer a specified amount of platform fees to a user's account.

**Endpoint:** `POST /api/admin/platform-fees/transfer`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": 123,
  "amount": 500,
  "reason": "Monthly platform fee distribution"
}
```

**Response (Success):**
```json
{
  "success": true,
  "amount_transferred": 500,
  "user_id": 123,
  "user_username": "example_user",
  "user_points_before": 1000,
  "user_points_after": 1500
}
```

**Response (Error - Insufficient Funds):**
```json
{
  "error": "Insufficient platform fees",
  "available": 250
}
```

**Response (Error - User Not Found):**
```json
{
  "error": "User not found"
}
```

**Example Usage:**
```bash
curl -X POST \
-H "Authorization: Bearer adm_7xK9pR2sT8wN4mV1qL6hY3jZ5nX9cB7vE2rP8tQ4wM6kL9nD3sF7jH1pV5bN8mR4t" \
-H "Content-Type: application/json" \
-d '{
  "userId": 123,
  "amount": 500,
  "reason": "Monthly platform fee distribution"
}' \
http://localhost:8080/api/admin/platform-fees/transfer
```

## Audit Trail

All platform fee transfers are automatically logged in the `audit_logs` table for transparency and accountability:

```sql
INSERT INTO audit_logs (action, details) VALUES ('platform_fee_transfer', $1)
```

The audit log includes:
- Admin ID (if available)
- User ID and username
- Amount transferred
- Reason for transfer
- User's points before and after transfer
- Timestamp of the transaction

## Best Practices

1. **Always check available fees first**: Use the `GET /api/admin/platform-fees/total` endpoint to verify sufficient funds before attempting a transfer

2. **Maintain detailed records**: Provide a clear reason for each transfer to maintain proper audit trails

3. **Transfer regularly**: Consider establishing a regular schedule for distributing platform fees to users or for platform maintenance

4. **Monitor audit logs**: Regularly review the audit logs to ensure all transfers are legitimate and properly documented

## Error Handling

The admin endpoints will return appropriate HTTP status codes and error messages:

- `401 Unauthorized`: Missing or invalid ADMIN_API_KEY
- `400 Bad Request`: Invalid request parameters (missing userId, invalid amount, etc.)
- `404 Not Found`: Specified user does not exist
- `500 Internal Server Error`: Database or server issues

## Security Considerations

1. **Protect the ADMIN_API_KEY**: Never expose the ADMIN_API_KEY in client-side code or public repositories
2. **Use HTTPS in production**: Ensure all admin API calls are made over secure connections
3. **Limit access**: Only authorized personnel should have access to the ADMIN_API_KEY
4. **Regular auditing**: Periodically review audit logs for suspicious activity

## Example Workflow

1. Check total platform fees:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
   http://localhost:8080/api/admin/platform-fees/total
   ```

2. Transfer fees to a user:
   ```bash
   curl -X POST \
   -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
   -H "Content-Type: application/json" \
   -d '{"userId": 123, "amount": 500, "reason": "Monthly distribution"}' \
   http://localhost:8080/api/admin/platform-fees/transfer
   ```

3. Verify the transfer by checking the user's points or reviewing audit logs