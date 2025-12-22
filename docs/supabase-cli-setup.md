# Supabase CLI Setup Guide

The Supabase CLI has been installed and initialized in your project. The database schema migration has been created.

## Next Steps

### 1. Link to Your Supabase Project

After you create a Supabase project at [supabase.com](https://supabase.com):

```bash
# Link to your remote project
supabase link --project-ref your-project-ref
```

To find your project ref:
- Go to your Supabase project dashboard
- Go to Settings → General
- Copy the "Reference ID"

**OR** you can link using your database password:

```bash
supabase link --project-ref your-project-ref --password your-db-password
```

### 2. Push Migration to Supabase

Once linked, push the migration:

```bash
supabase db push
```

This will apply the schema (tables, indexes, triggers, RLS policies) to your remote Supabase database.

### 3. Create Storage Bucket

You still need to create the storage bucket manually:

1. Go to your Supabase dashboard → Storage
2. Click "New bucket"
3. Name: `workout-images`
4. Make it public (or configure policies)
5. Click "Create bucket"

### 4. Set Environment Variables

Add to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: Settings → API in your Supabase dashboard.

### 5. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 6. Create Supabase Client File

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Verify Setup

After pushing, verify in your Supabase dashboard:

1. **Table Editor**: Check that all tables exist (users, workouts, follows, comments, reactions, friend_requests)
2. **Authentication → Policies**: Check that RLS policies are created
3. **Storage**: Verify `workout-images` bucket exists

## Useful CLI Commands

```bash
# Check migration status
supabase migration list

# Create a new migration
supabase migration new migration_name

# Reset local database (for testing)
supabase db reset

# Generate TypeScript types from your database
supabase gen types typescript --linked > src/types/supabase.ts
```

## Troubleshooting

### Link fails
- Make sure you have the correct project ref
- Verify your database password is correct
- Check that your project is not paused

### Push fails
- Check that you're linked to the correct project
- Verify you have the correct permissions
- Check Supabase dashboard for error messages

### RLS policies not working
- Make sure policies were created (check Authentication → Policies)
- Verify `auth.uid()` is available (user must be authenticated)
- Test queries in SQL Editor with different user contexts

