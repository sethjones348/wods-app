-- Extend user settings to include notification and email preferences
-- This migration updates the default settings JSONB structure

-- Update default settings for new users (existing users will need to be updated via app)
-- Note: This doesn't change existing users, only the default for new users
-- Existing users will get these defaults when they first access settings

-- The settings structure will now be:
-- {
--   "workoutPrivacy": "public" | "private",
--   "showEmail": boolean,
--   "notifications": {
--     "comments": boolean,
--     "reactions": boolean,
--     "follows": boolean,
--     "friendRequests": boolean
--   },
--   "emailNotifications": {
--     "enabled": boolean,
--     "frequency": "instant" | "daily" | "weekly" | "never",
--     "comments": boolean,
--     "reactions": boolean,
--     "follows": boolean,
--     "friendRequests": boolean
--   }
-- }

-- Function to ensure settings have notification/email preferences
CREATE OR REPLACE FUNCTION ensure_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure settings object exists
  IF NEW.settings IS NULL THEN
    NEW.settings := '{}'::jsonb;
  END IF;

  -- Set default notification preferences if not present
  IF NOT (NEW.settings ? 'notifications') THEN
    NEW.settings := NEW.settings || '{
      "notifications": {
        "comments": true,
        "reactions": true,
        "follows": true,
        "friendRequests": true
      }
    }'::jsonb;
  END IF;

  -- Set default email notification preferences if not present
  IF NOT (NEW.settings ? 'emailNotifications') THEN
    NEW.settings := NEW.settings || '{
      "emailNotifications": {
        "enabled": true,
        "frequency": "daily",
        "comments": true,
        "reactions": true,
        "follows": true,
        "friendRequests": true
      }
    }'::jsonb;
  END IF;

  -- Ensure legacy settings exist
  IF NOT (NEW.settings ? 'workoutPrivacy') THEN
    NEW.settings := NEW.settings || '{"workoutPrivacy": "public"}'::jsonb;
  END IF;

  IF NOT (NEW.settings ? 'showEmail') THEN
    NEW.settings := NEW.settings || '{"showEmail": false}'::jsonb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure settings on insert
DROP TRIGGER IF EXISTS ensure_notification_settings_on_insert ON users;
CREATE TRIGGER ensure_notification_settings_on_insert
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_notification_settings();

-- Trigger to ensure settings on update (only if settings are being updated)
DROP TRIGGER IF EXISTS ensure_notification_settings_on_update ON users;
CREATE TRIGGER ensure_notification_settings_on_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.settings IS DISTINCT FROM OLD.settings)
  EXECUTE FUNCTION ensure_notification_settings();

