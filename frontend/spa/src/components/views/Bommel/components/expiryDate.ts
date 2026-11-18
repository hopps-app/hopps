/** End of the picked day in local time, so a link "valid until 31.12." still works on that day. */
export function endOfDay(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
}

/** Today as yyyy-mm-dd, the minimum of a date input for an expiry. */
export function todayIso(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
