# Database Migration Protocol

1. Create new migration:
```bash
npm run migrate:create -- add_query_indexes
```

5. v4 to v5 - Added query optimization indexes

2. Write idempotent SQL:
```sql
-- migrations/YYYYMMDDHHMMSS-add_user_table/up.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);

-- down.sql
DROP TABLE IF EXISTS users;
```

3. Test locally:
```bash
npm run migrate && npm run migrate:rollback
```

4. Submit PR with migration files