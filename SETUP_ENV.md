# Environment Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your project (or create a new one)
3. Click on **Settings** (gear icon) in the left sidebar
4. Click on **API** in the settings menu
5. You'll see two values you need:
   - **Project URL** → Copy this (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key → Copy this (long string starting with `eyJ...`)

## Step 2: Create .env File

1. In your project folder, create a new file named `.env` (just `.env`, no extension)
2. Copy the content below into the file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace `https://your-project-id.supabase.co` with your actual Project URL
4. Replace `your-anon-key-here` with your actual anon key

## Step 3: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

## Step 4: Run the App

```bash
npm run dev
```

The app will start and show you a URL like:
```
➜  Local:   http://localhost:5173/
```

Open that URL in your browser!

## Important Notes

- ✅ Never commit your `.env` file to Git (it's already in `.gitignore`)
- ✅ Use the **anon/public** key, NOT the service_role key
- ✅ The `.env` file must be in the root folder (same level as `package.json`)

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env` file exists in the root folder
- Make sure variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after creating/editing `.env`

### Can't find Supabase Dashboard
- Go to [app.supabase.com](https://app.supabase.com)
- Sign in or create an account
- Create a new project if you don't have one

### Port 5173 already in use
- The app will automatically use a different port
- Check the terminal output for the actual URL

