-- Fix friend request RLS policy to also check email for users who haven't signed up yet
-- This allows users to see friend requests sent to their email even if they haven't created a profile yet

DROP POLICY IF EXISTS "Users can read own friend requests" ON friend_requests;

CREATE POLICY "Users can read own friend requests" ON friend_requests
  FOR SELECT USING (
    from_user_id = auth.uid() OR 
    to_user_id = auth.uid() OR
    to_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Also allow users to update friend requests by email (for accepting/declining)
DROP POLICY IF EXISTS "Users can update received friend requests" ON friend_requests;

CREATE POLICY "Users can update received friend requests" ON friend_requests
  FOR UPDATE USING (
    to_user_id = auth.uid() OR
    to_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

