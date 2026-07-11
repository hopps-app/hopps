-- Per-day login/activity record backing the admin LoginActivityChart. One row per member per day they made an
-- authenticated request (written idempotently by LastSeenFilter). The table is kept small: a scheduled job prunes
-- rows older than the retention window (currently 7 days), so it only ever holds the recent activity used by the chart.
create table member_activity_day (
    member_id     bigint not null references member (id) on delete cascade,
    activity_date date   not null,
    primary key (member_id, activity_date)
);

create index idx_member_activity_date on member_activity_day (activity_date);
