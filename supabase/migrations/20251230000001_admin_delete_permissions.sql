-- Add admin DELETE permissions for content management
-- This allows admins to delete workouts, comments, reactions, and other user-generated content

-- Workouts: Allow admins to delete any workout
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
CREATE POLICY "Users can delete own workouts, admins can delete any" ON workouts
  FOR DELETE USING (
    auth.uid() = user_id OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  );

-- Comments: Allow admins to delete any comment
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments, admins can delete any" ON comments
  FOR DELETE USING (
    auth.uid() = user_id OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  );

-- Reactions: Allow admins to delete any reaction
DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
CREATE POLICY "Users can delete own reactions, admins can delete any" ON reactions
  FOR DELETE USING (
    auth.uid() = user_id OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  );

-- Comment reactions: Allow admins to delete any comment reaction
DROP POLICY IF EXISTS "Users can delete own comment reactions" ON comment_reactions;
CREATE POLICY "Users can delete own comment reactions, admins can delete any" ON comment_reactions
  FOR DELETE USING (
    auth.uid() = user_id OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  );

-- Notifications: Allow admins to delete any notification (optional, for cleanup)
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications, admins can delete any" ON notifications
  FOR DELETE USING (
    auth.uid() = user_id OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  );

-- Storage policies: Allow admins to delete any image
-- Drop existing delete policies
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Workout images: Users can delete their own, admins can delete any
CREATE POLICY "Users can delete their own images, admins can delete any"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  )
);

-- Profile images: Users can delete their own, admins can delete any
CREATE POLICY "Users can delete their own profile pictures, admins can delete any"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    COALESCE((SELECT is_admin FROM users WHERE id = auth.uid()), false) = true
  )
);

