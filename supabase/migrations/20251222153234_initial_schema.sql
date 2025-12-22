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

