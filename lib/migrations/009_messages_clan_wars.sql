-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 500),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- Clan Wars
CREATE TABLE IF NOT EXISTS clan_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_a_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  clan_b_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  winner_clan_id UUID REFERENCES clans(id),
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clan_wars_clans ON clan_wars(clan_a_id, clan_b_id);
CREATE INDEX IF NOT EXISTS idx_clan_wars_status ON clan_wars(status, scheduled_at);

-- Clan war registrations
CREATE TABLE IF NOT EXISTS clan_war_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  registered_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clan_id, week_start)
);
