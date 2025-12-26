# ET-SAFE Kebele Subscription Web Portal

A production-ready web portal for ET-SAFE (AgriAdapt) that enables kebele agriculture offices to register farmers without smartphones, generate localized climate-smart recommendations, and schedule SMS alerts.

## Features

- **Farmer Registration**: Complete registration form with location, farm details, and consent management
- **Advisory Engine**: Rule-based advisory generation with weather integration
- **SMS Alert System**: Automated alert generation and queuing with mock SMS provider
- **Role-Based Access Control**: Three user roles (Kebele Staff, Admin, Super Admin)
- **Dashboards**: Role-specific dashboards with analytics and reporting
- **CSV Export**: Export farmer data for reporting
- **Audit Logging**: Complete audit trail for all actions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based session management
- **Deployment**: Docker Compose for local development

## Architecture

```
┌─────────────────┐
│  Kebele Staff   │
│   (Registrar)   │
└────────┬────────┘
         │
         │ Registers Farmer
         ▼
┌─────────────────┐
│  Farmer Profile │
│   + Location    │
└────────┬────────┘
         │
         │ Triggers
         ▼
┌─────────────────┐      ┌──────────────┐
│ Advisory Engine │◄─────│   Weather    │
│  (Rules + AI)   │      │   Service    │
└────────┬────────┘      └──────────────┘
         │
         │ Generates
         ▼
┌─────────────────┐
│  Recommendations│
│  + Risk Summary │
└────────┬────────┘
         │
         │ Creates
         ▼
┌─────────────────┐      ┌──────────────┐
│  Alert Queue    │─────►│ SMS Provider │
│   (Scheduled)   │      │   (Mock)     │
└─────────────────┘      └──────────────┘
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for database)
- PostgreSQL (if not using Docker)

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/et_safe?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
SMS_PROVIDER="mock"
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token-here"
```

**Note**: The map uses OpenLayers with OpenStreetMap tiles - no API key required!

### 3. Start Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Or use your own PostgreSQL instance
# Make sure DATABASE_URL in .env points to it
```

### 4. Database Migration and Seeding

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with demo data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Demo Credentials

After seeding, you can login with:

- **Kebele Staff 1**: `staff@kebele1.gov.et` / `password123`
- **Kebele Staff 2**: `staff@kebele2.gov.et` / `password123`
- **Admin**: `admin@woreda.gov.et` / `admin123`
- **Super Admin**: `superadmin@et-safe.gov.et` / `superadmin123`

## Demo Flow

### 1. Register a Farmer

1. Login as Kebele Staff
2. Navigate to "Register New Farmer"
3. Fill in farmer details:
   - Personal info (name, phone, language)
   - Location (auto-filled for kebele staff)
   - Farm details (type, crop, soil, water access)
   - Consent checkbox
4. Submit form
5. System automatically:
   - Creates farmer profile
   - Creates subscription (if consented)
   - Generates initial advisory
   - Queues SMS alerts

### 2. Generate Advisory

1. Navigate to a farmer's profile
2. Click "Generate New Advisory"
3. System evaluates rules based on:
   - Weather forecast (mock)
   - Farmer profile (crop type, soil, water access)
4. View generated recommendations and risk summary

### 3. View Alerts

1. Navigate to farmer profile
2. View "Alert History" section
3. See all sent/failed alerts with status

### 4. Export Data

1. Navigate to Farmers list
2. Use search/filter if needed
3. Click "Export CSV"
4. Download farmer data

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Farmers
- `GET /api/farmers` - List farmers (with search/filter)
- `POST /api/farmers` - Register new farmer
- `GET /api/farmers/export` - Export farmers as CSV

### Advisory
- `POST /api/advisory/generate?farmerId=xxx` - Generate advisory for farmer

### Alerts
- `POST /api/alerts/process` - Process queued alerts (Admin only)
- `POST /api/alerts/generate` - Generate alerts for all active farmers (Admin only)

## Advisory Rules

The system includes the following rules (expandable via JSON config):

1. **Drought Risk for Rain-fed Farms**: High drought risk + rain-fed → water saving recommendations
2. **Heavy Rainfall and Flood Risk**: High flood risk → drainage and protection recommendations
3. **Clay Soil Waterlogging**: Clay soil + heavy rain → drainage recommendations
4. **Heat Stress Warning**: High temperatures → irrigation timing recommendations
5. **Teff Drought Resilience**: Teff crop + drought → drought-resistant practices
6. **Optimal Planting Window**: Low risks → favorable planting conditions

Rules are defined in `lib/advisory/rules.json` and can be easily extended.

## SMS Provider

Currently uses a **Mock SMS Provider** that:
- Logs messages to console
- Simulates 5% failure rate
- Stores message IDs in database

To integrate with EthioTelecom:
1. Set `SMS_PROVIDER=ethiotelecom` in `.env`
2. Add `ETHIO_TELECOM_API_KEY` and `ETHIO_TELECOM_API_URL`
3. Implement API calls in `lib/sms/provider.ts`

## Data Model

### Core Entities

- **User**: System users (staff, admin, super admin)
- **Location Hierarchy**: Region → Zone → Woreda → Kebele
- **Farmer**: Registered farmers with farm details
- **Subscription**: Farmer subscription plans (FREE/PREMIUM)
- **Advisory**: Generated climate-smart recommendations
- **Alert**: SMS alerts with status tracking
- **WeatherSnapshot**: Cached weather forecasts
- **AuditLog**: Complete audit trail

## Testing

```bash
# Run unit tests (when implemented)
npm test

# Test advisory generation
# Use the "Generate Advisory" button in farmer profile

# Test alert processing
# Call POST /api/alerts/process as admin
```

## Production Deployment

1. Set strong `JWT_SECRET` in environment
2. Use production PostgreSQL database
3. Configure real SMS provider (EthioTelecom)
4. Set up weather API integration
5. Configure proper CORS and security headers
6. Enable HTTPS
7. Set up monitoring and logging
8. Configure backup strategy

## Development

```bash
# Database operations
npm run db:migrate    # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

## File Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── farmers/           # Farmer management pages
│   └── login/             # Login page
├── components/            # React components
│   ├── dashboard/        # Dashboard components
│   └── farmers/          # Farmer components
├── lib/                   # Core libraries
│   ├── advisory/         # Advisory engine
│   ├── sms/              # SMS provider
│   └── auth.ts           # Authentication
├── prisma/                # Database schema and migrations
└── public/                # Static assets
```

## License

This project is part of ET-SAFE (AgriAdapt) initiative.

## Support

For issues or questions, please contact the development team.



