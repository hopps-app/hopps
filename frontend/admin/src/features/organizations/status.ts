import type { AdminOrganizationRow } from './types';

/**
 * Derived activity status — a view over data the row already carries, not a stored field.
 * Answers "is this Verein alive?" at a glance for the estate-monitoring table.
 *
 * Priority order matters: "never active" and "new" are checked before the
 * active/dormant split, since a Verein with no activity at all is neither.
 */
export type OrgStatus = 'active' | 'dormant' | 'new' | 'never';

/** A Verein is "new" if it was created within this window and has no Belege yet. */
const NEW_DAYS = 30;
/** Beyond this much silence, an otherwise-active Verein counts as dormant. */
const DORMANT_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

export function deriveStatus(row: AdminOrganizationRow, now: number): OrgStatus {
    // No recorded activity ever — distinct from "went quiet".
    if (row.lastActivityAt === null) {
        const created = row.createdAt ? new Date(row.createdAt).getTime() : null;
        const isRecent = created !== null && !Number.isNaN(created) && now - created < NEW_DAYS * DAY;
        // Recently registered and hasn't done anything yet: still finding its feet.
        if (isRecent && row.belegeCount === 0) {
            return 'new';
        }
        return 'never';
    }

    const last = new Date(row.lastActivityAt).getTime();
    if (Number.isNaN(last)) {
        return 'never';
    }
    return now - last < DORMANT_DAYS * DAY ? 'active' : 'dormant';
}

/** Klar badge tone per status. `never` uses the negative tone — a Verein that
    registered and never did anything is the state a support dashboard most wants to spot. */
export const STATUS_TONE: Record<OrgStatus, 'pos' | 'neg' | 'purple' | 'warn'> = {
    active: 'pos',
    dormant: 'warn',
    new: 'purple',
    never: 'neg',
};
