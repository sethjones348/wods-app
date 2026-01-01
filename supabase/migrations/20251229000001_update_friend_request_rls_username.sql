-- Update friend request RLS policies to support username
-- This allows users to see friend requests sent to their username

DROP POLICY IF EXISTS "Users can read own friend requests" ON friend_requests;

CREATE POLICY "Users can read own friend requests" ON friend_requests
  FOR SELECT USING (
    from_user_id = auth.uid() OR 
    to_user_id = auth.uid() OR
    to_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    to_username = (SELECT username FROM users WHERE id = auth.uid())
  );

-- Also allow users to update friend requests by username (for accepting/declining)
DROP POLICY IF EXISTS "Users can update received friend requests" ON friend_requests;

CREATE POLICY "Users can update received friend requests" ON friend_requests
  FOR UPDATE USING (
    to_user_id = auth.uid() OR
    to_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    to_username = (SELECT username FROM users WHERE id = auth.uid())
  );

