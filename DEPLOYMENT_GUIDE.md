# Vireo Deployment Guide

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project details:
   - Name: `vireo` (or your preferred name)
   - Password: Set a strong database password
   - Region: Choose closest to your users
4. Click "Create new project"

### 1.2 Get Your Project Credentials
1. Once project is ready, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: Found under "Project API keys"

### 1.3 Create Environment File
Create `.env.local` in your Vireo project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 1.4 Set Up Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire SQL schema from [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) (the "Database Setup" section)
4. Click "Run"

> **Important**: The SQL includes:
> - All required tables (profiles, todos, calendar_events, etc.)
> - Row Level Security (RLS) policies
> - Trigger to auto-create profiles on user signup
> - All necessary indexes

### 1.5 Configure Authentication Providers (Optional but Recommended)
1. Go to **Authentication** → **Providers**
2. Enable **Email** (recommended for testing)
3. Enable **Google**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase
4. Enable **GitHub** (alternative):
   - Create OAuth App in GitHub Settings
   - Set callback URL: `https://your-project-id.supabase.co/auth/v1/callback`

## Step 2: Local Testing

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Run Development Server
```bash
npm run dev
```

### 2.3 Test Features
Follow the [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) to verify all features work:
- Sign up/in with Google/GitHub/Email
- Create todos, habits, journal entries
- Test Pomodoro timer
- Customize dashboard layout
- Update settings
- View habit forest

### 2.4 Fix Common Issues
- **TypeScript errors**: Run `npx tsc --noEmit` to check
- **Supabase connection issues**: Verify `.env.local` values
- **Database errors**: Check SQL was executed successfully in Supabase
- **Auth issues**: Verify provider redirect URLs match

## Step 3: Prepare for Vercel Deployment

### 3.1 Vercel Account Setup
1. Sign up at [vercel.com](https://vercel.com)
2. Install Vercel CLI (optional): `npm i -g vercel`

### 3.2 Environment Variables for Vercel
When deploying to Vercel, you need to set the same environment variables:
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://your-project-id.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `your-anon-key-here`
   - **Important**: Set both to **Production** and **Preview** environments

### 3.3 Project Configuration
Vercel should automatically detect:
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 3.4 Deployment Options

#### Option A: Vercel Dashboard (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. In Vercel dashboard, click "New Project"
3. Import your Vireo repository
4. Vercel will auto-detect Next.js settings
5. Add environment variables (see 3.2)
6. Click "Deploy"

#### Option B: Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow prompts:
# - Set up and deploy "~/Projects/Vireo"? [Y/n]: Y
# - Which scope do you want to deploy to? <your-username>
# - Link to existing project? [y/N]: N
# - What's your project name? vireo
# - In which directory is your code located? ./ 
# - Want to override build settings? [y/N]: N
# - Want to override install command? [y/N]: N
# - Want to override build command? [y/N]: N
# - Want to override dev command? [y/N]: N
# - Want to override output directory? [y/N]: N
```

#### Option C: Git Integration
1. Connect your GitHub/GitLab/Bitbucket account to Vercel
2. Import repository
3. Vercel will auto-deploy on pushes to main branch
4. Set environment variables in project settings

### 3.5 Post-Deployment Checks
After deploying to Vercel:
1. Visit your deployed URL (e.g., `https://vireo.vercel.app`)
2. Test authentication works
3. Verify data persists in Supabase
4. Check browser console for errors
5. Test responsive design on mobile

## Step 4: Production Considerations

### 4.1 Database Backups
Supabase automatically backs up your database, but you can:
- Enable Point-in-Time Recovery (PITR) in project settings
- Use `pg_dump` for manual backups
- Set up replication if needed

### 4.2 Rate Limits & Quotas
Monitor usage in Supabase dashboard:
- Database rows
- Bandwidth
- Auth requests
- Edge function executions (if used)

### 4.3 Environment Variables Security
Never commit `.env.local` to git:
- Verify `.env.local` is in `.gitignore`
- Use Vercel's encrypted environment variables
- Consider using Vercel Environment Variables for different environments

### 4.4 Performance Optimization
- Enable Vercel Analytics (built-in)
- Consider adding a CDN for static assets
- Monitor Supabase query performance
- Use Supabase caching where appropriate

## Step 5: Troubleshooting

### 5.1 Common Deployment Issues

**Issue: "Invalid API key"**
- Solution: Double-check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars
- Remember: These are **public** keys, safe to expose in frontend

**Issue: "Database connection failed"**
- Solution: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is active (not paused)
- Ensure network allows outbound to Supabase

**Issue: Auth callbacks not working**
- Solution: Verify redirect URLs in Supabase match:
  - For Vercel: `https://your-app.vercel.app/auth/callback`
  - For local: `http://localhost:3000/auth/callback`

**Issue: RLS policies blocking access**
- Solution: In Supabase SQL Editor, run:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'your_table';
  ```
- Ensure policies allow `SELECT`, `INSERT`, `UPDATE`, `DELETE` for authenticated users

### 5.2 Getting Help
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)
- Join Supabase Discord community
- Check GitHub Issues for both Supabase and Next.js

## Step 6: Maintenance

### 6.1 Updates
Regularly update dependencies:
```bash
npm update
npm audit fix
```

### 6.2 Monitoring
- Set up Vercel Alerts for deployment failures
- Monitor Supabase usage metrics
- Check error logs in Vercel dashboard
- Use Sentry or similar for frontend error tracking

### 6.3 Scaling
- Supabase scales automatically with your plan
- Vercel automatically scales serverless functions
- Consider upgrading Supabase plan as you grow
- Use Supabase Read Replicas for heavy read workloads

---

## Quick Reference

### Supabase URLs Format
```
Project URL: https://[project-id].supabase.co
API Keys: Found in Settings → API
```

### Vercel Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

### Important File Locations
- Environment: `.env.local` (local) / Vercel Env Vars (production)
- Database Schema: Copy from TESTING_CHECKLIST.md
- Auth Providers: Supabase Dashboard → Authentication → Providers
- Deployment Settings: Vercel Project Settings

### First-Time User Flow
1. User visits your Vercel-deployed URL
2. Clicks "Sign in with Google" (or other provider)
3. Supabase creates user account
4. Trigger automatically creates profile record
5. User lands on dashboard
6. All data stored in user's Supabase project

---

**You're ready to deploy!** Follow these steps and your Vireo app will be running on Vercel with Supabase as the backend in no time.