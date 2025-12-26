# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │   Farmers    │  │   Advisory   │    │
│  │   Pages      │  │   Pages      │  │   Views       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   /api/      │  │   /api/      │  │   /api/       │    │
│  │   farmers    │  │   advisory   │  │   alerts     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Business Logic
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Libraries                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Advisory   │  │   Alert      │  │   Weather    │    │
│  │   Engine     │  │   Engine     │  │   Service    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Auth       │  │   RBAC       │  │   Audit      │    │
│  │   Service   │  │   Service   │  │   Logging    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Data Access
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Users      │  │   Farmers    │  │   Advisories │    │
│  │   Locations  │  │   Alerts     │  │   Subscriptions│   │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ External Services
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services (Future)                  │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Weather    │  │   SMS        │                        │
│  │   API        │  │   Provider   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Farmer Registration Flow

```
User (Kebele Staff)
  │
  ├─> Fill Registration Form
  │
  ├─> POST /api/farmers
  │   │
  │   ├─> Validate Input
  │   ├─> Check Phone Uniqueness
  │   ├─> Create Farmer Record
  │   ├─> Create Subscription (if consented)
  │   │
  │   ├─> Generate Initial Advisory
  │   │   │
  │   │   ├─> Get Weather Data
  │   │   ├─> Evaluate Rules
  │   │   ├─> Generate Recommendations
  │   │   └─> Save Advisory
  │   │
  │   └─> Generate Initial Alerts
  │       │
  │       ├─> Evaluate Conditions
  │       ├─> Create Alert Records
  │       └─> Queue for SMS
  │
  └─> Return Success Response
```

### 2. Advisory Generation Flow

```
User Request
  │
  ├─> POST /api/advisory/generate?farmerId=xxx
  │   │
  │   ├─> Load Farmer Profile
  │   │
  │   ├─> Get Weather Forecast
  │   │   │
  │   │   ├─> Check Cache (WeatherSnapshot)
  │   │   └─> Generate/Retrieve Forecast
  │   │
  │   ├─> Advisory Engine
  │   │   │
  │   │   ├─> Load Rules (JSON)
  │   │   ├─> Evaluate Each Rule
  │   │   ├─> Match Conditions
  │   │   ├─> Build Recommendations
  │   │   └─> Calculate Risk Summary
  │   │
  │   ├─> Render Advisory Text
  │   │
  │   └─> Save to Database
  │
  └─> Return Advisory JSON
```

### 3. Alert Processing Flow

```
Scheduled Job / Manual Trigger
  │
  ├─> POST /api/alerts/process
  │   │
  │   ├─> Load Queued Alerts
  │   │   (status = QUEUED, scheduleTime <= now)
  │   │
  │   ├─> For Each Alert:
  │   │   │
  │   │   ├─> Check Farmer Consent
  │   │   │
  │   │   ├─> Send via SMS Provider
  │   │   │   │
  │   │   │   ├─> Mock Provider (dev)
  │   │   │   └─> EthioTelecom (prod)
  │   │   │
  │   │   ├─> Update Alert Status
  │   │   │   ├─> SENT (success)
  │   │   │   └─> FAILED (after retries)
  │   │   │
  │   │   └─> Log Attempt
  │   │
  └─> Return Processing Summary
```

## Key Components

### Advisory Engine

**Location**: `lib/advisory/engine.ts`

- **Rules Engine**: Evaluates JSON-based rules against farmer profile and weather data
- **Rule Matching**: Condition-based matching with support for:
  - Weather conditions (drought risk, flood risk, temperature)
  - Farmer attributes (crop type, soil type, water access)
- **Recommendation Generation**: Prioritized recommendations based on risk levels
- **Text Rendering**: Converts structured data to human-readable advisory text

**Rules Configuration**: `lib/advisory/rules.json`
- Easily extensible JSON format
- Each rule defines:
  - Conditions (weather + farmer attributes)
  - Risk level
  - Recommendations
  - Explanation

### Alert Engine

**Location**: `lib/sms/alert-engine.ts`

- **Alert Generation**: Creates alerts based on advisory risk summary
- **Template System**: Alert type templates with message generation
- **Queue Management**: Processes queued alerts with retry logic
- **SMS Integration**: Pluggable SMS provider interface

**Alert Types**:
- DROUGHT
- HEAVY_RAINFALL
- TEMPERATURE_EXTREME
- PLANTING_REMINDER
- MARKET_PRICE
- CUSTOM

### Weather Service

**Location**: `lib/weather.ts`

- **Mock Implementation**: Generates consistent mock forecasts based on location
- **Caching**: Stores weather snapshots in database (6-hour cache)
- **Forecast Structure**: 14-day forecasts with:
  - Rainfall probability and amount
  - Temperature ranges
  - Risk calculations (drought, flood)

**Future Integration**: Replace mock with real weather API

### Authentication & Authorization

**Location**: `lib/auth.ts`, `lib/rbac.ts`

- **JWT-based Sessions**: Secure session management with httpOnly cookies
- **Role-Based Access Control**: Three roles with different permissions
- **Middleware Protection**: Route-level authentication checks

**Roles**:
- `KEBELE_STAFF`: Can only access their assigned kebele
- `ADMIN`: Can access all kebeles in their jurisdiction
- `SUPER_ADMIN`: Full system access

## Database Schema

### Core Entities

1. **User**: System users with roles and kebele assignments
2. **Location Hierarchy**: Region → Zone → Woreda → Kebele
3. **Farmer**: Registered farmers with farm details
4. **Subscription**: Farmer subscription plans and status
5. **Advisory**: Generated climate-smart recommendations
6. **Alert**: SMS alerts with delivery tracking
7. **WeatherSnapshot**: Cached weather forecasts
8. **AuditLog**: Complete audit trail

### Relationships

- User → Kebele (many-to-one, optional)
- Farmer → Kebele (many-to-one, required)
- Farmer → Subscription (one-to-many)
- Farmer → Advisory (one-to-many)
- Farmer → Alert (one-to-many)
- Kebele → WeatherSnapshot (one-to-many)

## Security Considerations

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Signed with secret key
3. **HTTP-only Cookies**: Prevents XSS attacks
4. **RBAC**: Role-based access control at API level
5. **Input Validation**: Phone format, required fields
6. **Audit Logging**: All actions logged for compliance

## Scalability

### Current Limitations
- In-memory alert processing (single instance)
- Mock weather service
- Mock SMS provider

### Production Enhancements
- Background job queue (Bull, BullMQ)
- Real weather API integration
- SMS provider integration (EthioTelecom)
- Redis for caching
- Database connection pooling
- CDN for static assets
- Load balancing

## Testing Strategy

### Unit Tests (To Implement)
- Advisory engine rule evaluation
- Weather service forecast generation
- Alert template message generation

### Integration Tests (To Implement)
- Farmer registration flow
- Advisory generation flow
- Alert processing flow

### E2E Tests (To Implement)
- Complete user workflows
- Role-based access verification




