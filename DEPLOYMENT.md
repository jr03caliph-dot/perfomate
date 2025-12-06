# Performate Deployment Guide

This guide will help you deploy your Performate application to various hosting platforms.

## Prerequisites

1. **Supabase Project**: Make sure your Supabase project is set up and all migrations are applied
2. **Environment Variables**: You'll need your Supabase URL and Anon Key

## Environment Variables

You need to set these environment variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Find these in your Supabase Dashboard → Settings → API

## Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest and fastest option for React/Vite apps.

### Steps:

1. **Install Vercel CLI** (optional, you can also use GitHub integration):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   - Go to your project on Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Redeploy after adding variables

5. **Connect GitHub** (optional):
   - Import your GitHub repository
   - Vercel will auto-deploy on every push

### Or use GitHub Integration:

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables in the setup wizard
5. Deploy!

## Option 2: Deploy to Netlify

Netlify is also great for static sites with excellent free tier.

### Steps:

1. **Install Netlify CLI** (optional):
   ```bash
   npm i -g netlify-cli
   ```

2. **Build your project**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables**:
   - Go to Site settings → Environment variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Redeploy

### Or use Netlify Dashboard:

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `dist` folder, OR
3. Connect GitHub repository
4. Add environment variables in Site settings
5. Deploy!

## Option 3: Deploy to GitHub Pages

### Steps:

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json**:
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Set base in vite.config.ts**:
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     plugins: [react()],
   })
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

**Note**: Environment variables need to be prefixed with `VITE_` and will be embedded in the build.

## Option 4: Deploy to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables
5. Deploy!

## Post-Deployment Checklist

### 1. Database Migrations
Make sure all migrations are applied in Supabase:
- Run all SQL files in `supabase/migrations/` folder
- Especially important: `create_reasons_and_history.sql`

### 2. Storage Buckets
Create these buckets in Supabase Storage:
- `student-photos` (public)
- `morning-bliss-photos` (public)

See `SETUP.md` for detailed instructions.

### 3. Environment Variables
Verify environment variables are set correctly:
- Check in your hosting platform's dashboard
- Ensure they're prefixed with `VITE_`

### 4. Test the Application
- Login functionality
- Database operations
- File uploads
- Realtime features

## Troubleshooting

### Build Fails
- Check if all dependencies are installed: `npm install`
- Verify TypeScript errors: `npm run build`
- Check environment variables are set

### Environment Variables Not Working
- Ensure variables are prefixed with `VITE_`
- Redeploy after adding/changing variables
- Check browser console for errors

### Database Connection Issues
- Verify Supabase URL and Anon Key are correct
- Check Supabase project is active
- Verify RLS policies are set correctly

### Realtime Not Working
- Ensure Supabase Realtime is enabled
- Check WebSocket connections aren't blocked
- Verify Realtime settings in Supabase Dashboard

## Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records

## Continuous Deployment

Both Vercel and Netlify support automatic deployments:
- Push to `main` branch = Production deployment
- Push to other branches = Preview deployment

## Need Help?

- Check Supabase logs: Dashboard → Logs
- Check hosting platform logs
- Verify browser console for client-side errors

