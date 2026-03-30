-- 022_hubs.sql — Game Hubs: community-run competitive spaces

-- Hubs table
create table if not exists hubs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  game        text not null check (game in ('cs2', 'dota2', 'deadlock')),
  description text not null default '',
  rules       text not null default '',
  region      text not null,
  min_elo     int not null default 0,
  max_elo     int not null default 5000,
  owner_id    uuid not null references players(id),
  member_count int not null default 0,
  match_count  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Hub members table
create table if not exists hub_members (
  hub_id     uuid not null references hubs(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  hub_elo    int not null default 1000,
  wins       int not null default 0,
  losses     int not null default 0,
  joined_at  timestamptz not null default now(),
  primary key (hub_id, player_id)
);

-- Add hub_id to matches for hub-scoped matches
alter table matches add column if not exists hub_id uuid references hubs(id);

-- Indexes
create index if not exists idx_hubs_slug on hubs (slug);
create index if not exists idx_hubs_game on hubs (game);
create index if not exists idx_hubs_region on hubs (region);
create index if not exists idx_hubs_active on hubs (is_active) where is_active = true;
create index if not exists idx_hubs_owner on hubs (owner_id);
create index if not exists idx_hub_members_hub on hub_members (hub_id);
create index if not exists idx_hub_members_player on hub_members (player_id);
create index if not exists idx_hub_members_elo on hub_members (hub_id, hub_elo desc);
create index if not exists idx_matches_hub on matches (hub_id) where hub_id is not null;

-- Seed default hubs (owner_id will be the first admin/system user — use a placeholder)
-- Run after ensuring a system user exists
insert into hubs (slug, name, game, description, rules, region, min_elo, max_elo, owner_id, member_count, match_count, is_active)
select
  v.slug, v.name, v.game, v.description, v.rules, v.region, v.min_elo, v.max_elo,
  (select id from players order by created_at limit 1),
  0, 0, true
from (values
  ('turkish-cs2-hub', 'Turkish CS2 Hub', 'cs2',
   'The top competitive CS2 hub for players in Turkey. 128-tick servers, active admins, weekly prizes.',
   E'1. English or Turkish in chat.\n2. No cheating — VAC bans = permanent removal.\n3. Respect all players.\n4. Use voice comms during matches.\n5. Report griefers via hub Discord.',
   'Turkey', 800, 3000),
  ('georgian-dota2-hub', 'Georgian Dota 2 Hub', 'dota2',
   E'Georgia''s premier Dota 2 hub. Captain''s mode, in-house leagues, and regional tournaments.',
   E'1. No smurfing.\n2. Pick phase: respect captain.\n3. Abandon = 3-day ban.\n4. Toxic behavior = warning then ban.\n5. Minimum 100 Dota 2 ranked matches required.',
   'CIS', 900, 3500),
  ('balkan-deadlock-hub', 'Balkan Deadlock Hub', 'deadlock',
   'Deadlock competitive hub for Balkan players. Fast queues, balanced matches, active community.',
   E'1. All Balkan countries welcome.\n2. English in match chat.\n3. No AFK during picks.\n4. Stream sniping = permanent ban.\n5. Report issues in hub forum.',
   'Balkans', 700, 2500),
  ('cis-cs2-hub', 'CIS CS2 Hub', 'cs2',
   'Competitive CS2 for CIS region players. High skill ceiling, serious matches, anti-cheat enforced.',
   E'1. Russian or English in chat.\n2. 128-tick servers hosted in Moscow.\n3. Overtime rules: MR3.\n4. No stand-ins without admin approval.\n5. Minimum ELO 1000 to queue.',
   'CIS', 1000, 4000),
  ('eastern-european-dota2', 'Eastern European Dota 2', 'dota2',
   E'The largest Eastern European Dota 2 hub. All-pick and captain''s draft, skill-based matchmaking.',
   E'1. English in all-chat.\n2. Native language allowed in team chat.\n3. Griefing = 7-day ban.\n4. Smurfs detected by MMR verification.\n5. Weekly leaderboard resets.',
   'Europe', 800, 3500)
) as v(slug, name, game, description, rules, region, min_elo, max_elo)
where not exists (select 1 from hubs where hubs.slug = v.slug);
