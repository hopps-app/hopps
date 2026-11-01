// Which tab of the Konten page is open. Account tabs are identified by the account's id.

export const ALL_TAB = 'all';
export const IMPORTS_TAB = 'importe';

export type KontenTabId = string;

/**
 * The overview across accounts only earns its tab with more than one place money sits in. With a single one the page
 * opens that one directly. A cash box is to count here as well once it exists.
 */
export const hasAllTab = (accounts: { id?: number }[]) => accounts.length > 1;

/**
 * The tab to show: what the user selected while it still exists, otherwise the page's start. A selection falls away with
 * its account, and "Alle" falls away when only one account is left.
 *
 * @param selected what the user clicked last, null before the first click
 */
export function resolveKontenTab(selected: KontenTabId | null, accounts: { id?: number }[]): KontenTabId {
    const allTab = hasAllTab(accounts);
    const stillThere = selected === IMPORTS_TAB || (selected === ALL_TAB && allTab) || accounts.some((a) => String(a.id) === selected);
    if (selected !== null && stillThere) return selected;
    return accounts.length === 1 ? String(accounts[0].id) : ALL_TAB;
}
