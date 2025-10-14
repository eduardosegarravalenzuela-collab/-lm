/*
  # Advanced Features Migration - Part 2: RLS Policies
  
  Adds Row Level Security policies for all new tables
*/

-- Enable RLS on all new tables
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bluetooth_devices ENABLE ROW LEVEL SECURITY;

-- Places policies
CREATE POLICY "Users can view own places"
  ON public.places FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own places"
  ON public.places FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own places"
  ON public.places FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own places"
  ON public.places FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Routines policies
CREATE POLICY "Users can view own routines"
  ON public.routines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
  ON public.routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON public.routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
  ON public.routines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Alarm history policies
CREATE POLICY "Users can view own alarm history"
  ON public.alarm_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alarm history"
  ON public.alarm_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alarm history"
  ON public.alarm_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view own stats"
  ON public.user_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Family groups policies
CREATE POLICY "Group members can view their groups"
  ON public.family_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = family_groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.family_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.family_groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = family_groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Group creators can delete groups"
  ON public.family_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Group members can view other members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    ) OR
    auth.uid() = user_id
  );

CREATE POLICY "Group admins can update members"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Admins or self can leave group"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Shared trackers policies
CREATE POLICY "Group members can view shared trackers"
  ON public.shared_trackers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = shared_trackers.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Tracker owners can share trackers"
  ON public.shared_trackers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = tracker_id
      AND trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Sharers can unshare trackers"
  ON public.shared_trackers FOR DELETE
  TO authenticated
  USING (auth.uid() = shared_by);

-- Subscription tiers policies
CREATE POLICY "Users can view own subscription"
  ON public.subscription_tiers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscription_tiers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscription_tiers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Bluetooth devices policies
CREATE POLICY "Users can view bluetooth devices for their trackers"
  ON public.bluetooth_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = bluetooth_devices.tracker_id
      AND trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bluetooth devices"
  ON public.bluetooth_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = tracker_id
      AND trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bluetooth devices"
  ON public.bluetooth_devices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = bluetooth_devices.tracker_id
      AND trackers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = bluetooth_devices.tracker_id
      AND trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bluetooth devices"
  ON public.bluetooth_devices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE trackers.id = bluetooth_devices.tracker_id
      AND trackers.user_id = auth.uid()
    )
  );
