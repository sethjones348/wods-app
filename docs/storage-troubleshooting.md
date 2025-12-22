# Storage Upload Troubleshooting

If you're seeing "Bucket check timeout" or "Session check timeout" errors, here's how to debug:

## 1. Verify Environment Variables

Check that your `.env.local` file has:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- The URL should be your project URL (not localhost)
- The anon key should start with `eyJ`
- Restart your dev server after changing `.env.local`

## 2. Verify Supabase Project is Active

1. Go to https://supabase.com/dashboard
2. Check that your project is not paused
3. If paused, click "Restore project"

## 3. Verify Bucket Exists

1. Go to Supabase Dashboard → Storage
2. Check that `workout-images` bucket exists
3. If it doesn't exist, create it:
   - Click "New bucket"
   - Name: `workout-images`
   - Public bucket: ✅ Enable
   - Click "Create bucket"

## 4. Check Storage Policies

The storage policies migration should be applied. Run:
```bash
supabase db push
```

Or manually create policies in Supabase Dashboard:
1. Go to Storage → Policies
2. Select `workout-images` bucket
3. Create these policies:

**INSERT Policy:**
```sql
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**SELECT Policy:**
```sql
CREATE POLICY "Users can read their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**DELETE Policy:**
```sql
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 5. Test Connection

Open browser console and check:
- "Supabase client initialized" log should show URL and key configured
- If you see "Missing Supabase environment variables", your `.env.local` isn't being loaded

## 6. Network Issues

If timeouts persist:
- Check browser network tab for failed requests to `*.supabase.co`
- Check for CORS errors
- Try accessing your Supabase project URL directly in browser
- Check if your network/firewall is blocking Supabase

## 7. Temporary Workaround

If storage continues to fail, you can temporarily save workouts without images by modifying the code to catch and ignore storage errors (not recommended for production).

