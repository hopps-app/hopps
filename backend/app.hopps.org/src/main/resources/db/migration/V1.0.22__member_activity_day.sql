-- Per-day record of time spent in the application, backing the admin activity chart. One row per member per day they
-- were active, written by LastSeenFilter (on any authenticated request) and by the SPA heartbeat.
--
-- active_seconds accumulates real elapsed time rather than counting events: each activity signal adds the gap since
-- last_beat_at, but only when that gap is at most MemberActivityRepository.MAX_GAP_SECONDS. A longer gap means the
-- member was away and adds nothing, so an idle tab costs nothing, and a client calling the heartbeat endpoint in a
-- loop adds only the real time between its calls rather than a fixed amount per call.
--
-- last_beat_at is the anchor for that delta. It lives on the daily row, so each calendar day starts its own clock and
-- a session spanning midnight simply restarts it. It is nullable so that a row created by anything other than the
-- accumulator (a backfill, say) is still safe to accumulate onto.
--
-- The table stays bounded: MemberActivityPruneJob deletes rows older than MemberActivityRepository.RETENTION_DAYS.
create table member_activity_day (
    member_id      bigint not null references member (id) on delete cascade,
    activity_date  date   not null,
    active_seconds bigint not null default 0,
    last_beat_at   timestamptz,
    primary key (member_id, activity_date)
);

create index idx_member_activity_date on member_activity_day (activity_date);
