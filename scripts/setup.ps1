# PowerShell setup script for Windows

Write-Host "🚀 Setting up ET-SAFE Kebele Portal..." -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Please update .env with your configuration" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Start database
Write-Host "🗄️  Starting PostgreSQL database..." -ForegroundColor Yellow
docker-compose up -d

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate

# Run migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
npm run db:migrate

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npm run db:seed

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your configuration"
Write-Host "2. Run 'npm run dev' to start the development server"
Write-Host "3. Visit http://localhost:3000"
Write-Host ""
Write-Host "🔑 Demo credentials:" -ForegroundColor Cyan
Write-Host "   Kebele Staff: staff@kebele1.gov.et / password123"
Write-Host "   Admin: admin@woreda.gov.et / admin123"
Write-Host "   Super Admin: superadmin@et-safe.gov.et / superadmin123"
Write-Host ""




