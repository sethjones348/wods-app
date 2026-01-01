-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reaction', 'follow', 'friend_request_accepted')),
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- User who triggered the notification
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE, -- For comment/reaction notifications
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For comment notifications
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workout_id ON notifications(workout_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID,
  p_workout_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Don't create notification if user is acting on their own content
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, actor_id, workout_id, comment_id)
  VALUES (p_user_id, p_type, p_actor_id, p_workout_id, p_comment_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for comment notifications
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_workout_owner_id UUID;
BEGIN
  -- Get the workout owner
  SELECT user_id INTO v_workout_owner_id
  FROM workouts
  WHERE id = NEW.workout_id;

  -- Create notification for workout owner
  IF v_workout_owner_id IS NOT NULL THEN
    PERFORM create_notification(
      v_workout_owner_id,
      'comment',
      NEW.user_id,
      NEW.workout_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments
DROP TRIGGER IF EXISTS trigger_notify_on_comment ON comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Trigger function for reaction notifications
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_workout_owner_id UUID;
BEGIN
  -- Get the workout owner
  SELECT user_id INTO v_workout_owner_id
  FROM workouts
  WHERE id = NEW.workout_id;

  -- Create notification for workout owner
  IF v_workout_owner_id IS NOT NULL THEN
    PERFORM create_notification(
      v_workout_owner_id,
      'reaction',
      NEW.user_id,
      NEW.workout_id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reactions
DROP TRIGGER IF EXISTS trigger_notify_on_reaction ON reactions;
CREATE TRIGGER trigger_notify_on_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reaction();

-- Trigger function for follow notifications
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the user being followed
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    NEW.follower_id,
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follows
DROP TRIGGER IF EXISTS trigger_notify_on_follow ON follows;
CREATE TRIGGER trigger_notify_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- Trigger function for friend request accepted notifications
CREATE OR REPLACE FUNCTION notify_on_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Notify the person who sent the request (they now have a new follower)
    IF NEW.from_user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.from_user_id,
        'friend_request_accepted',
        NEW.to_user_id,
        NULL,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for friend requests
DROP TRIGGER IF EXISTS trigger_notify_on_friend_request_accepted ON friend_requests;
CREATE TRIGGER trigger_notify_on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_friend_request_accepted();

