-- 023: Notifications system
-- Stores in-app notifications for players

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'system'
              CHECK (type IN ('match_invite', 'friend_request', 'tournament_start', 'achievement', 'system')),
  title       TEXT NOT NULL,
  body        TEXT,
  data_json   JSONB DEFAULT '{}',
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: player's unread notifications, newest first
CREATE INDEX idx_notifications_player_read_created
  ON notifications (player_id, read, created_at DESC);

-- Cleanup: auto-delete notifications older than 90 days (run via cron or pg_cron)
-- DELETE FROM notifications WHERE created_at < now() - INTERVAL '90 days';
