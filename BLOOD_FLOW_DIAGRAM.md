# Blood Analysis System - Flow Diagrams

## 1. Complete End-to-End Flow

```mermaid
graph TB
    A[Client Upload PDF] -->|POST /upload| B[Parse PDF]
    B --> C[Extract Markers]
    C --> D[Extract Patient Info]
    D --> E{Markers Found?}
    E -->|No| F[Error: No biomarkers detected]
    E -->|Yes| G[Client Submits]

    G -->|POST /submit| H[Verify Payment]
    H --> I[Analyze Bloodwork]
    I --> J[Get RAG Context]
    J --> K{AI Mode?}

    K -->|Sync| L[Generate AI - 2 retries, 120s timeout]
    K -->|Async| M[Generate AI - 3 retries, 900s timeout]

    L --> N{Quality Gate?}
    M --> N

    N -->|Fail| O[No AI Report - PENDING]
    N -->|Pass| P[Save to DB]

    P --> Q[Send Admin Notification]
    Q --> R[Schedule Delivery: NOW + 24h]
    R --> S[Status: SCHEDULED]

    S --> T[Cron Job - Every 5 min]
    T --> U{Time >= scheduled_for?}
    U -->|No| T
    U -->|Yes| V[Attempt Email Delivery]

    V --> W{Quality Gate?}
    W -->|Fail| X{Retries < 5?}
    W -->|Pass| Y[Send Email with HTML]

    X -->|Yes| Z[Retry count++, Re-schedule]
    X -->|No| AA[Status: DELIVERY_BLOCKED]
    Z --> T

    Y --> AB[Log to blood_email_deliveries]
    AB --> AC[Status: SENT]

    AC --> AD[Client receives email]
    AD --> AE[Client opens HTML attachment]
    AE --> AF[View tabbed dashboard]

    style N fill:#ff6b6b
    style W fill:#ff6b6b
    style P fill:#51cf66
    style AC fill:#51cf66
```

## 2. Quality Gate Flow

```mermaid
graph LR
    A[AI Report Generated] --> B[Strip Forbidden Formatting]
    B --> C{Length >= 9000 chars?}
    C -->|No| Z[REJECT]
    C -->|Yes| D{Has 12 required sections?}
    D -->|No| Z
    D -->|Yes| E{No placeholders?}
    E -->|No| Z
    E -->|Yes| F{No fallback text?}
    F -->|No| Z
    F -->|Yes| G[PASS - Deliverable]

    G --> H[Render HTML attachment]
    H --> I{Email Quality Gate}
    I --> J{All sections in HTML?}
    J -->|No| ZZ[BLOCK EMAIL]
    J -->|Yes| K{Interactive tabs present?}
    K -->|No| ZZ
    K -->|Yes| L{No em-dashes/emojis?}
    L -->|No| ZZ
    L -->|Yes| M[SEND EMAIL]

    style Z fill:#ff6b6b
    style ZZ fill:#ff6b6b
    style G fill:#51cf66
    style M fill:#51cf66
```

## 3. Retry & Recovery Logic

```mermaid
stateDiagram-v2
    [*] --> PENDING: Report created
    PENDING --> SCHEDULED: AI report ready

    SCHEDULED --> SENDING: Cron picks up
    SENDING --> Quality_Check: Attempt delivery

    Quality_Check --> SENT: Gate pass
    Quality_Check --> SCHEDULED: Gate fail, retry < 5
    Quality_Check --> DELIVERY_BLOCKED: Gate fail, retry >= 5

    SENDING --> SCHEDULED: Crash/Error (recovery)

    SCHEDULED --> SCHEDULED: Wait for next cron

    SENT --> [*]
    DELIVERY_BLOCKED --> SENT: Admin force-send
    DELIVERY_BLOCKED --> [*]: Manual review needed

    note right of SCHEDULED
        Cron runs every 5 min
        Checks: report_scheduled_for <= NOW()
    end note

    note right of DELIVERY_BLOCKED
        Max 5 retries exhausted
        Admin alert recommended
    end note
```

## 4. Database Schema Relationships

```mermaid
erDiagram
    BLOOD_REPORTS ||--o{ BLOOD_EMAIL_DELIVERIES : "has"
    BLOOD_TESTS ||--o{ BLOOD_EMAIL_DELIVERIES : "has"

    BLOOD_REPORTS {
        varchar id PK
        varchar email
        jsonb profile
        jsonb markers
        jsonb analysis
        text ai_report
        varchar delivery_status
        integer delivery_retries
        timestamp report_scheduled_for
        timestamp email_sent_at
        timestamp created_at
    }

    BLOOD_TESTS {
        varchar id PK
        varchar user_id
        varchar file_name
        jsonb markers
        jsonb analysis
        jsonb patient_profile
        varchar status
        timestamp created_at
    }

    BLOOD_EMAIL_DELIVERIES {
        varchar id PK
        varchar report_id FK
        varchar recipient_email
        varchar client_name
        varchar order_ref
        varchar status
        boolean quality_pass
        jsonb quality_checks
        varchar sendpulse_id
        timestamp created_at
        timestamp sent_at
    }
```

## 5. API Endpoints Map

```mermaid
graph TB
    subgraph "Public Endpoints"
        A1[POST /api/blood-analysis/upload]
        A2[POST /api/blood-analysis/submit]
        A3[POST /api/blood-analysis/purchase]
        A4[GET /api/blood-analysis/report/:id]
        A5[POST /api/blood-analysis/analyze]
    end

    subgraph "Admin Endpoints (require x-admin-key)"
        B1[POST /admin/blood-analysis/report/:id/regenerate]
        B2[POST /admin/blood-analysis/report/:id/force-send]
        B3[GET /admin/blood-analysis/deliveries]
    end

    subgraph "Rate Limiting"
        RL1[3 uploads/min]
        RL2[5 purchases/min]
    end

    A1 -.->|protected by| RL1
    A3 -.->|protected by| RL2

    subgraph "Security Checks"
        S1[JWT + Ownership]
        S2[Timing-safe comparison]
    end

    A4 -.->|requires| S1
    B1 -.->|requires| S2
    B2 -.->|requires| S2
    B3 -.->|requires| S2
```

## 6. AI Generation Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Storage
    participant RAG
    participant Claude
    participant Cron
    participant Email

    Client->>API: POST /submit (markers, profile)
    API->>Storage: Analyze markers
    API->>RAG: Get knowledge context
    API->>Claude: Generate AI report (attempt 1)

    alt AI Success
        Claude-->>API: Report text (validated)
        API->>Storage: Save report (SCHEDULED)
        API->>Email: Send admin notification
        API-->>Client: 200 OK (reportId)
    else AI Timeout
        Claude--xAPI: Timeout (120s)
        API->>Claude: Retry (attempt 2)
        alt Retry Success
            Claude-->>API: Report text
            API->>Storage: Save (SCHEDULED)
            API-->>Client: 200 OK
        else Retry Fail
            API->>Storage: Queue async generation
            API-->>Client: 200 OK (status: processing)
            Note over API,Claude: Background: attempt 3 (900s)
        end
    end

    Note over Cron: Wait 24h...

    Cron->>Storage: Get SCHEDULED reports
    Cron->>Email: Quality gate check

    alt Quality Pass
        Email->>Email: Send with HTML attachment
        Email->>Storage: Log delivery (SENT)
    else Quality Fail
        Email->>Storage: Increment retry, reschedule
    end
```

## 7. Security Architecture

```mermaid
graph TB
    subgraph "Attack Vectors"
        V1[Brute force uploads]
        V2[Unauthorized report access]
        V3[Admin endpoint abuse]
        V4[XSS in emails]
        V5[Timing attacks]
    end

    subgraph "Defenses"
        D1[Rate Limiter: 3/min]
        D2[JWT + checkBloodReportOwnership]
        D3[Admin key + timingSafeEqual]
        D4[escapeHtml + stripForbidden]
        D5[crypto.timingSafeEqual]
    end

    V1 -->|blocked by| D1
    V2 -->|blocked by| D2
    V3 -->|blocked by| D3
    V4 -->|blocked by| D4
    V5 -->|blocked by| D5

    style D1 fill:#51cf66
    style D2 fill:#51cf66
    style D3 fill:#51cf66
    style D4 fill:#51cf66
    style D5 fill:#51cf66
```

## 8. Monitoring Points

```mermaid
graph LR
    A[System Metrics] --> B[Reports Submitted]
    A --> C[AI Generation Duration]
    A --> D[Delivery Attempts]
    A --> E[Quality Gate Failures]

    B --> F{Alert if > threshold}
    C --> G{Alert if > 180s}
    D --> H{Alert if > 5 retries}
    E --> I{Alert by failure reason}

    H --> J[Admin Email: DELIVERY_BLOCKED]
    I --> K[Dashboard: Quality issues]

    style J fill:#ff6b6b
    style K fill:#ffd93d
```

---

## Legend

- 🟢 Green: Success state
- 🔴 Red: Failure/block state
- 🟡 Yellow: Warning/retry state
- ⚪ White: Neutral/processing state

---

**Note:** Ces diagrammes peuvent être rendus avec Mermaid dans GitHub, GitLab, ou tools comme draw.io.

**Generated:** 2026-03-21
