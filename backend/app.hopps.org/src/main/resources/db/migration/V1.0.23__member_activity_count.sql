-- Add a per-day activity counter to member_activity_day. Previously the table held one row per member per day (mere
-- presence), so the admin activity chart could only report DISTINCT active members. The counter lets us report the
-- total number of activity events per day instead: LastSeenFilter increments it (on conflict) each time the throttled
-- activity signal fires, i.e. at most once per member per throttle window (~10 min) -- so it approximates "active
-- 10-minute windows", not raw logins. Existing rows represent one recorded activity, hence the default of 1.
alter table member_activity_day
    add column activity_count integer not null default 1;
