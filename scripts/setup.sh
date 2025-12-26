#!/bin/bash

echo "🚀 Setting up ET-SAFE Kebele Portal..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✅ Please update .env with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start database
echo "🗄️  Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run db:generate

# Run migrations
echo "📊 Running database migrations..."
npm run db:migrate

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"
echo ""
echo "🔑 Demo credentials:"
echo "   Kebele Staff: staff@kebele1.gov.et / password123"
echo "   Admin: admin@woreda.gov.et / admin123"
echo "   Super Admin: superadmin@et-safe.gov.et / superadmin123"
echo ""




