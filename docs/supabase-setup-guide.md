# Supabase Setup Guide

This guide will help you set up Supabase for SamFit, including database schema, storage, and security policies.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Basic knowledge of SQL
- Access to your Supabase project dashboard

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - **Name**: `sam-fit` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier
4. Click "Create new project"
5. Wait for project to be created (~2 minutes)

## Step 2: Get API Keys

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
3. Save these for environment variables

## Step 3: Create Database Schema

1. In your project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the following SQL schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  bio TEXT,
  settings JSONB DEFAULT '{"workoutPrivacy": "public", "showEmail": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend requests table
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_email)
);

-- Follows table (created when friend request is accepted)
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Can't follow yourself
);

-- Workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_text TEXT[],
  workout_type TEXT CHECK (workout_type IN ('time', 'reps', 'unknown')) DEFAULT 'unknown',
  rounds INTEGER,
  movements TEXT[],
  times INTEGER[], -- in seconds
  reps INTEGER[],
  image_url TEXT, -- Supabase Storage URL
  privacy TEXT CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE
);

-- Reactions table (fist bumps)
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workout_id, user_id) -- One reaction per user per workout
);

-- Indexes for performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_privacy ON workouts(privacy);
CREATE INDEX idx_workouts_created_at ON workouts(created_at DESC);
CREATE INDEX idx_workouts_user_privacy ON workouts(user_id, privacy);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

CREATE INDEX idx_comments_workout_id ON comments(workout_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

CREATE INDEX idx_reactions_workout_id ON reactions(workout_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

CREATE INDEX idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX idx_friend_requests_to_email ON friend_requests(to_email);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL
5. Verify tables were created by going to **Table Editor** and checking all tables exist

## Step 4: Set up Row Level Security (RLS)

1. Go to **SQL Editor** → **New query**
2. Copy and paste the following RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read profiles of users they follow or who follow them
CREATE POLICY "Users can read friend profiles" ON users
  FOR SELECT USING (
    id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
      UNION
      SELECT follower_id FROM follows WHERE following_id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workouts policies
-- Users can read their own workouts
CREATE POLICY "Users can read own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read public workouts from users they follow
CREATE POLICY "Users can read friend public workouts" ON workouts
  FOR SELECT USING (
    privacy = 'public' AND
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
  );

-- Users can insert their own workouts
CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own workouts
CREATE POLICY "Users can update own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own workouts
CREATE POLICY "Users can delete own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
-- Users can read comments on workouts they can see
CREATE POLICY "Users can read comments on visible workouts" ON comments
  FOR SELECT USING (
    workout_id IN (
      SELECT id FROM workouts WHERE
        user_id = auth.uid() OR
        (privacy = 'public' AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        ))
    )
  );

-- Users can insert comments on visible workouts
CREATE POLICY "Users can insert comments on visible workouts" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    workout_id IN (
      SELECT id FROM workouts WHERE
        user_id = auth.uid() OR
        (privacy = 'public' AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        ))
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions policies
-- Users can read reactions on workouts they can see
CREATE POLICY "Users can read reactions on visible workouts" ON reactions
  FOR SELECT USING (
    workout_id IN (
      SELECT id FROM workouts WHERE
        user_id = auth.uid() OR
        (privacy = 'public' AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        ))
    )
  );

-- Users can insert reactions on visible workouts
CREATE POLICY "Users can insert reactions on visible workouts" ON reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    workout_id IN (
      SELECT id FROM workouts WHERE
        user_id = auth.uid() OR
        (privacy = 'public' AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid()
        ))
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
-- Users can read their own follow relationships
CREATE POLICY "Users can read own follows" ON follows
  FOR SELECT USING (
    follower_id = auth.uid() OR following_id = auth.uid()
  );

-- Users can insert their own follow relationships
CREATE POLICY "Users can insert own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follow relationships
CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Friend requests policies
-- Users can read friend requests they sent or received
CREATE POLICY "Users can read own friend requests" ON friend_requests
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- Users can insert friend requests they send
CREATE POLICY "Users can insert own friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update friend requests they received
CREATE POLICY "Users can update received friend requests" ON friend_requests
  FOR UPDATE USING (to_user_id = auth.uid());
```

3. Click "Run" to execute
4. Verify policies were created in **Authentication** → **Policies**

## Step 5: Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click "New bucket"
3. Configure bucket:
   - **Name**: `workout-images`
   - **Public bucket**: ✅ Enable (or configure policies if you want more control)
4. Click "Create bucket"
5. (Optional) Go to **Policies** tab and configure access policies if needed

## Step 6: Configure Environment Variables

1. In your local project, create/update `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

2. Replace with your actual values from Step 2
3. Add to `.gitignore` if not already there
4. For production, add these as GitHub Secrets:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Step 7: Install Supabase Client

In your project directory:

```bash
npm install @supabase/supabase-js
```

## Step 8: Create Supabase Client File

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

## Step 9: Test Connection

Create a test file or add to an existing component:

```typescript
import { supabase } from './lib/supabase';

// Test query
async function testConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('count');
  
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connected successfully!');
  }
}
```

## Step 10: Set up Authentication (Optional)

If you want to use Supabase Auth instead of Google OAuth:

1. Go to **Authentication** → **Providers**
2. Enable Google provider
3. Add Google OAuth credentials
4. Update your auth code to use Supabase Auth

**OR** continue using Google OAuth and manually create user records in the `users` table when users log in.

## Verification Checklist

- [ ] Supabase project created
- [ ] API keys copied
- [ ] Database schema created (all tables exist)
- [ ] Indexes created
- [ ] RLS policies enabled and created
- [ ] Storage bucket created
- [ ] Environment variables configured
- [ ] Supabase client installed
- [ ] Test connection works
- [ ] Can query database from code

## Next Steps

1. Follow the [Social Feed Implementation Plan](./social-feed-implementation-plan.md)
2. Start with Phase 1: Supabase Setup & Migration
3. Build migration script to move data from Google Drive
4. Update storage service to use Supabase

## Troubleshooting

### RLS Policy Errors
- Check that policies are correctly scoped
- Verify `auth.uid()` is available (user must be authenticated)
- Test policies in SQL Editor with different user contexts

### Connection Issues
- Verify environment variables are set correctly
- Check that anon key is correct (not the service role key)
- Ensure project is not paused (free tier projects pause after inactivity)

### Storage Upload Issues
- Verify bucket is public or policies allow upload
- Check file size limits (free tier: 50MB per file)
- Verify storage policies are configured correctly

### Performance Issues
- Check that indexes are created
- Use `EXPLAIN ANALYZE` in SQL Editor to debug slow queries
- Consider adding more indexes if needed

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

