# Supabase Google OAuth Setup

Since we're using Supabase Auth with Google provider, you need to configure Google OAuth in your Supabase dashboard.

## Steps

1. **Go to Supabase Dashboard** → Your Project → **Authentication** → **Providers**

2. **Enable Google Provider**:
   - Toggle "Google" to enabled
   - You'll need to provide:
     - **Client ID (for OAuth)**: Your Google OAuth Client ID
     - **Client Secret (for OAuth)**: Your Google OAuth Client Secret

3. **Get Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project (or create one)
   - Go to **APIs & Services** → **Credentials**
   - Create OAuth 2.0 Client ID (or use existing)
   - **Application type**: Web application
   - **Authorized redirect URIs**: 
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - For local dev: `http://localhost:5173/auth/v1/callback` (if needed)
   - Copy the **Client ID** and **Client Secret**

4. **Add to Supabase**:
   - Paste Client ID and Client Secret in Supabase dashboard
   - Save

5. **Test**:
   - Click "Sign in with Google" in your app
   - Should redirect to Google for authentication
   - After auth, redirects back to your app
   - User is authenticated via Supabase Auth

## Benefits

- ✅ Users still authenticate with Google (same UX)
- ✅ Supabase Auth manages the session
- ✅ RLS policies work (auth.uid() is available)
- ✅ No need for @react-oauth/google package
- ✅ Automatic session management

## Note

The Google OAuth Client ID you use in Supabase can be the same one you were using with `@react-oauth/google`, but you need to add the Supabase callback URL to the authorized redirect URIs.

