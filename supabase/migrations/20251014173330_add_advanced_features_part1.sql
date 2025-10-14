/*
  # Advanced Features Migration - Part 1: Table Structures
  
  Creates all table structures without circular RLS dependencies
*/

-- Add new columns to trackers
ALTER TABLE public.trackers
ADD COLUMN IF NOT EXISTS bluetooth_device_id text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS battery_level integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add new columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS driving_mode_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS driving_speed_threshold double precision DEFAULT 13.4,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sound text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS offline_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- Create places table
CREATE TABLE IF NOT EXISTS public.places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters double precision DEFAULT 100.0 NOT NULL,
  is_private boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create routines table
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  days_of_week integer[] DEFAULT '{}' NOT NULL,
  time time NOT NULL,
  required_tracker_ids uuid[] DEFAULT '{}' NOT NULL,
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create alarm_history table
CREATE TABLE IF NOT EXISTS public.alarm_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  severity text DEFAULT 'info' NOT NULL,
  tracker_ids uuid[] DEFAULT '{}',
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  user_lat double precision,
  user_lng double precision,
  was_dismissed boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type text NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  items_forgotten integer DEFAULT 0 NOT NULL,
  alarms_triggered integer DEFAULT 0 NOT NULL,
  routines_completed integer DEFAULT 0 NOT NULL,
  places_visited uuid[] DEFAULT '{}',
  streak_days integer DEFAULT 0 NOT NULL,
  UNIQUE(user_id, date)
);

-- Create family_groups table
CREATE TABLE IF NOT EXISTS public.family_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  can_see_location boolean DEFAULT true NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create shared_trackers table
CREATE TABLE IF NOT EXISTS public.shared_trackers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id uuid REFERENCES public.trackers(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tracker_id, group_id)
);

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier text DEFAULT 'free' NOT NULL,
  expires_at timestamptz,
  features jsonb DEFAULT '{"max_trackers": 3, "max_places": 3, "max_history_days": 30, "private_zones": false, "family_groups": false}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create bluetooth_devices table
CREATE TABLE IF NOT EXISTS public.bluetooth_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id uuid REFERENCES public.trackers(id) ON DELETE CASCADE NOT NULL,
  device_id text NOT NULL,
  device_name text NOT NULL,
  device_type text DEFAULT 'generic' NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  battery_level integer DEFAULT 100,
  is_connected boolean DEFAULT false NOT NULL,
  UNIQUE(device_id)
);

-- Create triggers
CREATE TRIGGER set_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON public.trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_places_user_id ON public.places(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_history_user_id ON public.alarm_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_history_created_at ON public.alarm_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_date ON public.user_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bluetooth_devices_tracker_id ON public.bluetooth_devices(tracker_id);
