# db-migrate Configuration Plan

## Current Issue
The db-migrate tool is using the database.json file which has hardcoded values for the database connection. The database.json file is configured with `postgres.railway.internal` as the host, which is not available during the Docker build process.

## Analysis
1. The db-migrate tool uses the database.json file to determine database connection parameters
2. The current database.json file has hardcoded values that don't work in the Railway environment
3. The migrate script in package.json is `db-migrate up --env prod` which uses the prod environment from database.json
4. The application code itself correctly uses the DATABASE_URL environment variable

## Proposed Solution
Update the database.json file to use environment variables that match the DATABASE_URL format. The DATABASE_URL in the .env file is:
```
DATABASE_URL=postgresql://postgres:MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd@metro.proxy.rlwy.net:56048/railway
```

This means:
- User: postgres
- Password: MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd
- Host: metro.proxy.rlwy.net
- Port: 56048
- Database: railway

## Updated database.json
```json
{
  "prod": {
    "driver": "pg",
    "user": "postgres",
    "password": "MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd",
    "host": "metro.proxy.rlwy.net",
    "database": "railway",
    "port": 56048
  }
}
```

This configuration will match the DATABASE_URL and should work in the Railway environment.

## Alternative Approach
We could also update the database.json to use environment variables:
```json
{
  "prod": {
    "driver": "pg",
    "user": {"ENV": "PGUSER"},
    "password": {"ENV": "PGPASSWORD"},
    "host": {"ENV": "PGHOST"},
    "database": {"ENV": "PGDATABASE"},
    "port": {"ENV": "PGPORT"}
  }
}
```

And then we would need to set these environment variables in Railway to match the DATABASE_URL components.

## Recommended Approach
I recommend the first approach (hardcoding the values in database.json) because:
1. It's simpler and more straightforward
2. It matches the existing DATABASE_URL
3. It doesn't require additional environment variable configuration
4. The values are already known and documented

The second approach would be more flexible but requires additional configuration in Railway.