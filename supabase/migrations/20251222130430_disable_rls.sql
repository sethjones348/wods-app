-- Temporarily disable RLS on all tables for debugging
-- This will help diagnose if RLS policies are blocking access

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on workouts table
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on comments table
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on reactions table
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on follows table
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;

-- Disable RLS on friend_requests table
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;

