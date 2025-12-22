# Production OAuth Redirect Setup

## Problem
After signing in with Google in production, users are redirected to `localhost:3000` instead of your production URL.

## Solution

### 1. Configure Supabase Dashboard Redirect URLs

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add your production URL:
   - `https://yourdomain.com`
   - `https://yourdomain.com/*` (to allow all paths)
   - If using GitHub Pages: `https://yourusername.github.io/sam-fit`
   - If using custom domain: `https://samfit.xyz` (or your domain)

5. **Site URL** should also be set to your production URL:
   - `https://yourdomain.com`

### 2. Configure Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - This is the Supabase callback URL that handles the OAuth flow

**Important**: The Google OAuth redirect URI should be the Supabase callback URL, NOT your app URL. Supabase handles the OAuth flow and then redirects to your app.

### 3. Verify Configuration

After making changes:
1. Wait 2-3 minutes for changes to propagate
2. Clear browser cache or use incognito mode
3. Try signing in again

## How It Works

1. User clicks "Sign In with Google"
2. App calls `supabase.auth.signInWithOAuth()` with `redirectTo: currentUrl`
3. Supabase redirects to Google OAuth
4. User authenticates with Google
5. Google redirects to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
6. Supabase processes the OAuth response
7. Supabase redirects to your app URL (the `redirectTo` value)

## Troubleshooting

If you're still being redirected to `localhost:3000`:

1. **Check Supabase Dashboard**: Make sure your production URL is in the Redirect URLs list
2. **Check Site URL**: Should match your production domain
3. **Check Browser Console**: Look for any errors about redirect URLs
4. **Verify redirectTo**: The code uses `window.location.origin + window.location.pathname` which should be correct

## Example Configuration

For a GitHub Pages deployment at `https://sethjones348.github.io/sam-fit`:

**Supabase Dashboard → Authentication → URL Configuration:**
- Site URL: `https://sethjones348.github.io/sam-fit`
- Redirect URLs:
  - `https://sethjones348.github.io/sam-fit`
  - `https://sethjones348.github.io/sam-fit/*`

**Google Cloud Console → OAuth 2.0 Client ID:**
- Authorized redirect URIs:
  - `https://mfnxmnlzdsttpxfdxsmt.supabase.co/auth/v1/callback` (your Supabase project callback)

