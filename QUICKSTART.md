# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed and running
- npm or yarn package manager

## Setup (5 minutes)

### Option 1: Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `JWT_SECRET` (use a strong random string)

3. **Start database:**
   ```bash
   docker-compose up -d
   ```

4. **Setup database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   Navigate to `http://localhost:3000`

## Login Credentials

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Kebele Staff 1 | `staff@kebele1.gov.et` | `password123` |
| Kebele Staff 2 | `staff@kebele2.gov.et` | `password123` |
| Admin | `admin@woreda.gov.et` | `admin123` |
| Super Admin | `superadmin@et-safe.gov.et` | `superadmin123` |

## Quick Demo Flow

1. **Login** as Kebele Staff 1
2. **Register a Farmer:**
   - Click "Register New Farmer"
   - Fill in farmer details
   - Check consent checkbox
   - Submit
3. **View Farmer Profile:**
   - Click on a farmer from the list
   - View generated advisory
   - Check alert history
4. **Generate Advisory:**
   - Click "Generate New Advisory" button
   - View recommendations and risk summary
5. **Export Data:**
   - Go to Farmers list
   - Click "Export CSV"

## Troubleshooting

### Database Connection Error
- Ensure Docker is running
- Check if PostgreSQL container is up: `docker ps`
- Verify DATABASE_URL in `.env`

### Migration Errors
- Reset database: `docker-compose down -v && docker-compose up -d`
- Re-run migrations: `npm run db:migrate`

### Port Already in Use
- Change port in `docker-compose.yml` (default: 5432)
- Update DATABASE_URL accordingly

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the codebase structure
- Customize advisory rules in `lib/advisory/rules.json`
- Configure SMS provider for production




