-- Tracks the last time a member made an authenticated request, stamped (throttled) by LastSeenFilter.
-- Used by the admin API to derive an organization's lastActivityAt as MAX(last_seen_at) across its members.
-- Nullable: members that have never been seen since this column was introduced stay NULL.
alter table member
    add column last_seen_at timestamptz;
