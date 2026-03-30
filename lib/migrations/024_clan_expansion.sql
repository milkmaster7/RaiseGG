-- ═══════════════════════════════════════════════════════════
-- 024: Clan Expansion — Chat, Applications, Recruitment, Treasury
-- ═══════════════════════════════════════════════════════════

-- Clan chat messages
CREATE TABLE IF NOT EXISTS clan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clan_messages_clan_id_created
  ON clan_messages (clan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clan_messages_player_id
  ON clan_messages (player_id);

-- Clan applications (for invite-only / recruitment)
CREATE TABLE IF NOT EXISTS clan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  message TEXT DEFAULT '' CHECK (char_length(message) <= 300),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clan_id, player_id, status)
);

CREATE INDEX IF NOT EXISTS idx_clan_applications_clan_status
  ON clan_applications (clan_id, status);

CREATE INDEX IF NOT EXISTS idx_clan_applications_player
  ON clan_applications (player_id);

-- Add recruitment and treasury columns to clans table
ALTER TABLE clans ADD COLUMN IF NOT EXISTS recruiting BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS min_elo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS treasury_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE clan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for clan_messages
CREATE POLICY "clan_messages_select" ON clan_messages
  FOR SELECT USING (true);

CREATE POLICY "clan_messages_insert" ON clan_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clan_members
      WHERE clan_members.clan_id = clan_messages.clan_id
        AND clan_members.player_id = clan_messages.player_id
        AND clan_members.status = 'active'
    )
  );

-- RLS policies for clan_applications
CREATE POLICY "clan_applications_select" ON clan_applications
  FOR SELECT USING (true);

CREATE POLICY "clan_applications_insert" ON clan_applications
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

CREATE POLICY "clan_applications_update" ON clan_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clan_members
      WHERE clan_members.clan_id = clan_applications.clan_id
        AND clan_members.player_id = auth.uid()::text::uuid
        AND clan_members.role IN ('leader', 'officer')
        AND clan_members.status = 'active'
    )
  );
