# Database Configuration Update Plan

## Current Issue
The database.json file has hardcoded values for the database connection, specifically using `postgres.railway.internal` as the host, which is not available during the Docker build process. The application is already configured to use the DATABASE_URL environment variable, but the database.json file is still being used by the db-migrate tool.

## Analysis
1. The application code in server.js correctly uses `process.env.DATABASE_URL` to connect to the database
2. The database.json file is only used by the db-migrate tool
3. The db-migrate tool is being called during the Docker build process, which is causing the failure
4. The database.json file has the wrong hostname for the Railway environment

## Proposed Solution
1. Update the database.json file to use environment variables instead of hardcoded values
2. Ensure the database.json file is compatible with the Railway environment
3. The database.json file should use the same connection information as the DATABASE_URL environment variable

## Updated database.json
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

This configuration will allow the db-migrate tool to use environment variables that can be set in the Railway environment.

## Alternative Solution
Since the application is already configured to use DATABASE_URL, we could also modify the package.json to pass the DATABASE_URL to the db-migrate tool:

```json
{
  "scripts": {
    "migrate": "DATABASE_URL=$DATABASE_URL db-migrate up --env prod"
  }
}
```

However, the first solution is cleaner as it maintains consistency with the existing configuration approach.