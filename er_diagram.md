# Database ER Diagram

```mermaid
erDiagram
    users ||--o{ participants : "makes"
    events ||--o{ participants : "has"
    events {
        SERIAL id PK
        TEXT title
        TEXT description
        TEXT category
        TEXT options
        INTEGER entry_fee
        INTEGER max_participants
        INTEGER current_participants
        INTEGER prize_pool
        TIMESTAMP start_time
        TIMESTAMP end_time
        TEXT status
        TEXT correct_answer
        INTEGER event_type_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TEXT cryptocurrency "default: bitcoin"
        DECIMAL initial_price
        DECIMAL final_price
        TEXT resolution_status "enum: pending, resolved"
        INTERVAL prediction_window "default: 24 hours"
    }
    participants {
        SERIAL id PK
        INTEGER event_id FK
        INTEGER user_id FK
        TEXT prediction
        INTEGER points_paid
        TIMESTAMP created_at
    }
    users {
        SERIAL id PK
        TEXT email
        TEXT username
        TEXT password_hash
        TEXT wallet_address
        INTEGER points
        INTEGER total_events
        INTEGER won_events
        TIMESTAMP last_claim_date
        TIMESTAMP created_at
    }
    event_types {
        SERIAL id PK
        TEXT name
        TEXT description
    }
    events }o--|| event_types : "has"