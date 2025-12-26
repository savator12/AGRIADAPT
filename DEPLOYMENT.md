# Deployment Guide

This guide covers deploying the ET-SAFE Kebele Portal to various platforms.

## Prerequisites

Before deploying, ensure you have:
- A PostgreSQL database (production-ready)
- Environment variables configured
- Google Gemini API key (for AI features)
- Git repository set up

## Required Environment Variables

Set these environment variables in your deployment platform:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Authentication (REQUIRED)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"

# Google Gemini AI (REQUIRED for advisory generation)
GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"  # Optional, defaults to gemini-2.5-flash

# SMS Provider (Optional)
SMS_PROVIDER="mock"  # Options: "mock" or "ethiotelecom"
# If using EthioTelecom:
# ETHIO_TELECOM_API_KEY="your-api-key"
# ETHIO_TELECOM_API_URL="https://api.ethiotelecom.com"

# Node Environment
NODE_ENV="production"
```

## Option 1: Deploy to Vercel (Recommended for Next.js)

Vercel is the recommended platform for Next.js applications.

### Steps:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts to link your project.

4. **Set Environment Variables:**
   - Go to your project dashboard on Vercel
   - Navigate to Settings → Environment Variables
   - Add all required environment variables (see above)

5. **Configure Database:**
   - Use Vercel Postgres, or
   - Use external PostgreSQL (Supabase, Neon, Railway, etc.)
   - Update `DATABASE_URL` in environment variables

6. **Run Database Migrations:**
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

7. **Seed Database (Optional):**
   ```bash
   npm run db:seed
   ```

### Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

## Option 2: Deploy to Netlify

Your project already has `netlify.toml` configured.

### Steps:

1. **Update netlify.toml:**
   The current config needs adjustment. Update it to:

   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"

   [build.environment]
     NODE_VERSION = "18"
   ```

2. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

3. **Login:**
   ```bash
   netlify login
   ```

4. **Initialize:**
   ```bash
   netlify init
   ```

5. **Set Environment Variables:**
   ```bash
   netlify env:set DATABASE_URL "your-database-url"
   netlify env:set JWT_SECRET "your-jwt-secret"
   netlify env:set GOOGLE_GEMINI_API_KEY "your-api-key"
   # ... add all other variables
   ```

6. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Important Notes for Netlify:

- Netlify requires a PostgreSQL database (use external service)
- Run migrations manually after first deployment
- Consider using Netlify Functions for API routes if needed

## Option 3: Deploy to Railway (Full-Stack)

Railway is great for deploying both the app and database together.

### Steps:

1. **Create Railway Account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will provide `DATABASE_URL` automatically

4. **Configure Environment Variables:**
   - Go to your service → Variables
   - Add all required environment variables
   - `DATABASE_URL` is automatically set by Railway

5. **Deploy:**
   - Railway will auto-deploy on git push
   - Or click "Deploy" manually

6. **Run Migrations:**
   - Go to your service → Settings → Deploy
   - Add build command: `prisma generate && next build`
   - Add start command: `npm start`
   - For migrations, use Railway CLI or add a one-time service

### Railway Configuration

Create `railway.json` (optional):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Option 4: Deploy to Render

Render provides free PostgreSQL and easy deployment.

### Steps:

1. **Create Render Account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create PostgreSQL Database:**
   - New → PostgreSQL
   - Note the connection string

3. **Create Web Service:**
   - New → Web Service
   - Connect your GitHub repository
   - Settings:
     - **Build Command:** `npm install && prisma generate && npm run build`
     - **Start Command:** `npm start`
     - **Environment:** Node

4. **Set Environment Variables:**
   - Add all required variables
   - Use the PostgreSQL connection string for `DATABASE_URL`

5. **Deploy:**
   - Render will auto-deploy on push
   - First deployment may take 5-10 minutes

## Database Setup

### Option A: Managed PostgreSQL Services

**Recommended Providers:**
- **Supabase** (Free tier available): [supabase.com](https://supabase.com)
- **Neon** (Serverless PostgreSQL): [neon.tech](https://neon.tech)
- **Railway** (Simple setup): [railway.app](https://railway.app)
- **Render** (Free tier): [render.com](https://render.com)
- **ElephantSQL** (Free tier): [elephantsql.com](https://elephantsql.com)

### Option B: Self-Hosted PostgreSQL

If you have your own server:

1. Install PostgreSQL 15+
2. Create database: `CREATE DATABASE et_safe;`
3. Update `DATABASE_URL` in environment variables

### Running Migrations

After setting up your database:

```bash
# Pull environment variables (if using Vercel/Netlify CLI)
vercel env pull .env.local  # Vercel
# or
netlify env:get > .env.local  # Netlify

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npm run db:seed
```

## Build Configuration

### Update package.json Scripts

Ensure your `package.json` has:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

The `postinstall` script ensures Prisma Client is generated during deployment.

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Database seeded (optional, for demo data)
- [ ] Google Gemini API key set
- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] Test login functionality
- [ ] Test farmer registration
- [ ] Test advisory generation
- [ ] Monitor error logs

## Troubleshooting

### Build Fails: "Prisma Client not generated"

**Solution:** Add `postinstall` script to `package.json`:
```json
"postinstall": "prisma generate"
```

### Database Connection Error

**Check:**
- `DATABASE_URL` is correctly formatted
- Database is accessible from deployment platform
- SSL mode if required (add `?sslmode=require` to connection string)

### Migration Errors

**Solution:**
```bash
# Reset and re-run migrations
npx prisma migrate reset
npx prisma migrate deploy
```

### Environment Variables Not Loading

**Solution:**
- Restart deployment after adding variables
- Check variable names match exactly (case-sensitive)
- Use platform's environment variable UI, not `.env` file

## Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS records

### Railway/Render:
- Use their provided domain or configure custom domain in settings

## Monitoring & Logs

### Vercel:
- Dashboard → Logs tab
- Real-time function logs

### Netlify:
- Site Dashboard → Functions → View logs

### Railway:
- Service → Logs tab
- Real-time streaming logs

### Render:
- Service → Logs tab
- Historical logs available

## Security Best Practices

1. **Use strong JWT_SECRET:**
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

2. **Enable HTTPS:** (Automatic on most platforms)

3. **Database Security:**
   - Use connection pooling
   - Enable SSL for database connections
   - Restrict database access to deployment IPs

4. **Environment Variables:**
   - Never commit `.env` files
   - Use platform's secret management
   - Rotate secrets regularly

5. **API Rate Limiting:**
   - Consider adding rate limiting for API routes
   - Monitor for abuse

## Cost Estimation

### Free Tier Options:
- **Vercel:** Free tier available (suitable for small apps)
- **Netlify:** Free tier available
- **Railway:** $5/month credit (free tier limited)
- **Render:** Free tier available (with limitations)
- **Supabase/Neon:** Free tier PostgreSQL available

### Production Recommendations:
- Use managed PostgreSQL (Supabase/Neon) - $0-25/month
- Vercel Pro for better performance - $20/month
- Or Railway/Render for full-stack - $5-20/month

## Support

For deployment issues:
1. Check platform-specific documentation
2. Review build logs
3. Test locally with production environment variables
4. Contact platform support if needed


