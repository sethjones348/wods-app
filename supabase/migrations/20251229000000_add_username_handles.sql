-- Add username/handle support for friend connections
DO $$
BEGIN
  -- Add username column to users table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    
    -- Create unique index for username (allows nulls)
    CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN users.username IS 'Unique username/handle for friend connections';
  END IF;
END $$;

-- Make to_email nullable (for backward compatibility, but username is now primary)
DO $$
BEGIN
  -- Make to_email nullable if it's currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'friend_requests' 
    AND column_name = 'to_email' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE friend_requests ALTER COLUMN to_email DROP NOT NULL;
  END IF;
END $$;

-- Add to_username column to friend_requests table
DO $$
BEGIN
  -- Add to_username column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friend_requests' AND column_name = 'to_username') THEN
    ALTER TABLE friend_requests ADD COLUMN to_username TEXT;
    
    -- Create index for username lookups
    CREATE INDEX idx_friend_requests_to_username ON friend_requests(to_username);
    
    -- Update unique constraint to include username (keep email for backward compatibility)
    -- Drop existing unique constraint if it exists
    ALTER TABLE friend_requests DROP CONSTRAINT IF EXISTS friend_requests_from_user_id_to_email_key;
    
    -- Add new unique constraint for (from_user_id, to_email) OR (from_user_id, to_username)
    -- We'll handle this at the application level since PostgreSQL doesn't support OR in unique constraints
    -- But we can add a unique constraint for username-based requests
    CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_from_user_id_to_username_unique 
      ON friend_requests(from_user_id, to_username) 
      WHERE to_username IS NOT NULL;
    
    -- Keep the email-based unique constraint
    CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_from_user_id_to_email_unique 
      ON friend_requests(from_user_id, to_email) 
      WHERE to_email IS NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN friend_requests.to_username IS 'Username/handle of the user to send friend request to (replaces to_email)';
  END IF;
END $$;

