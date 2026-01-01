-- Add admin support to users table
-- This migration adds an is_admin column and sets initial admin users

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index on is_admin for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Set initial admin users
-- Note: These users must exist in the users table (they will be created on first login via OAuth)
-- We'll use a function that safely updates admin status
UPDATE users 
SET is_admin = TRUE 
WHERE email IN ('sethjones348@gmail.com', 'samjones5308@gmail.com')
AND is_admin = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin privileges (can manage other users)';

-- RLS Policies for admin functionality
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read friend profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Admins can read all user profiles
-- Regular users can read their own profile and friend profiles
-- Note: We check if the current user is an admin by querying their own profile
CREATE POLICY "Users can read own and friend profiles, admins can read all" ON users
  FOR SELECT USING (
    -- Admins can read all users (check current user's admin status)
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true OR
    -- Users can read their own profile
    auth.uid() = id OR
    -- Users can read friend profiles
    id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
      UNION
      SELECT follower_id FROM follows WHERE following_id = auth.uid()
    )
  );

-- Update policy: Admins can update any user, regular users can only update themselves
-- Note: We'll handle admin status restrictions in the application layer (adminService)
CREATE POLICY "Users can update own profile, admins can update any" ON users
  FOR UPDATE USING (
    -- Admins can update any user (check current user's admin status)
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true OR
    -- Users can update their own profile
    auth.uid() = id
  );

