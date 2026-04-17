# 🚀 Implementation Flowchart - Backend Magang Guide


---

## 📊 High-Level System Flow

```mermaid
graph TB
    subgraph "Frontend - React"
        A[User Interaction] --> B[Event Handler]
        B --> C[API Service Call]
        C --> D[Loading State]
    end
    
    subgraph "Backend - Laravel 12"
        C --> E[Routes (api.php)]
        E --> F[Middleware Sanctum]
        F --> G[Controller]
        G --> H{Validation}
        H -->|Invalid| I[Return Error 422]
        H -->|Valid| J[Service/Business Logic]
        J --> K[Eloquent Model]
        K --> L[(Database)]
        L --> K
        K --> J
        J --> M[Format Response]
    end
    
    M --> N[JSON Response]
    N --> D
    D --> O[Update UI State]
    O --> P[Re-render Component]
    
    style A fill:#e1f5ff
    style L fill:#ffe1e1
    style M fill:#e1ffe1
```

---

## 🔐 1. Authentication Flow (Sanctum)

### Diagram: Login Process

```mermaid
sequenceDiagram
    participant U as User
    participant LP as LoginPage.jsx
    participant API as api.js
    participant BE as AuthController
    participant DB as Database
    
    U->>LP: Enter email & password
    LP->>LP: Validate input
    LP->>API: api.login(email, password)
    API->>BE: POST /api/login
    BE->>BE: Validate credentials (Email, Password)
    BE->>DB: SELECT * FROM users WHERE email=?
    DB->>BE: User data + Hashed PW
    BE->>BE: Hash::check(password)
    
    alt Password Valid
        BE->>BE: Create Token (createToken)
        BE->>DB: Store token in personal_access_tokens
        BE->>API: { success: true, user, token }
        API->>LP: Store token in localStorage
        LP->>LP: Redirect to Dashboard
    else Password Invalid
        BE->>API: { success: false, error: "Invalid credentials" }
        API->>LP: Show error toast
    end
```

---

## 📚 2. Course Display Flow (N+1 Prevention)

### Diagram: Fetch & Display Courses

```mermaid
sequenceDiagram
    participant D as DashboardPage
    participant API as api.js
    participant CC as CourseController
    participant DB as Database
    
    D->>D: useEffect on mount
    D->>API: api.getCourses()
    API->>CC: GET /api/courses
    
    Note over CC,DB: CRITICAL: Use Eager Loading
    CC->>DB: Course::with(['modules', 'sessions'])->get()
    DB->>CC: Data in 1-2 queries (not N+1)
    
    CC->>API: { success: true, data: [...] }
    API->>D: Update courses state
    D->>D: Re-render with Course Cards
```

---

## ✅ 3. Content Progress & XP Flow

### Diagram: Complete Content Logic

```mermaid
flowchart TD
    A[User clicks Complete] --> B[API: POST /api/contents/:id/complete]
    B --> C[Backend: ContentController@complete]
    
    C --> D[Start DB Transaction]
    D --> E[Update/Create UserContentProgress]
    E --> F[Calculate XP Reward from 'contents.xp_reward']
    F --> G[Update user.xp_points]
    G --> H[Create UserXpLog Entry]
    H --> I[Check Achievement Criteria]
    
    I --> J{Criteria Met?}
    J -->|Yes| K[Award Achievement & Extra XP]
    J -->|No| L[Skip]
    
    K --> M[Update Course Progress %]
    L --> M
    M --> N[Commit Transaction]
    N --> O[Return JSON: xp_earned, achievements]
    
    style D fill:#fff3cd
    style N fill:#d4edda
```

---

## 📜 4. Certificate Generation Flow

### Diagram: Score Calculation

```mermaid
flowchart TD
    A[Requirement: All contents completed] --> B[Fetch CertificateTemplate for Course]
    B --> C[Fetch CertificateMappings (Weights)]
    C --> D[Loop through Mappings]
    
    D --> E[Calculate Module Avg Quiz Score]
    E --> F[Apply Weight: Score * (Weight / 100)]
    F --> G[Sum to Final Score]
    G --> H{More Mappings?}
    H -->|Yes| D
    H -->|No| I[Final Score >= passing_grade?]
    
    I -->|Yes| J[Generate Certificate ID]
    J --> K[Create Certificate Record]
    K --> L[Return Success]
    
    I -->|No| M[Return Info: Score lower than required]
    
    style B fill:#fff3cd
    style I fill:#cfe2ff
```

---

## 🗄️ 5. Database Schema (ERD)

```mermaid
erDiagram
    USERS ||--o{ COURSE_ENROLLMENTS : enrolls
    USERS ||--o{ USER_CONTENT_PROGRESS : tracks
    USERS ||--o{ USER_ACHIEVEMENTS : earns
    USERS ||--o{ USER_XP_LOGS : logs
    
    COURSES ||--o{ MODULES : contains
    COURSES ||--o{ SESSIONS : has
    COURSES ||--o{ COURSE_ENROLLMENTS : registered
    COURSES ||--|{ CERTIFICATE_TEMPLATES : has
    
    MODULES ||--o{ DAYS : includes
    DAYS ||--o{ CONTENTS : contains
    
    CONTENTS ||--o{ USER_CONTENT_PROGRESS : recorded
    CONTENTS ||--o{ DISCUSSIONS : "starts thread"
    DISCUSSIONS ||--o{ DISCUSSION_REPLIES : "has replies"
    
    CERTIFICATE_TEMPLATES ||--o{ CERTIFICATE_MAPPINGS : defines
    CERTIFICATE_TEMPLATES ||--o{ CERTIFICATES : issues
    
    ACHIEVEMENTS ||--o{ USER_ACHIEVEMENTS : achieved
```

