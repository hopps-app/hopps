/** The IBAN without spaces, in upper case: the form it is stored and compared in. */
export function normalizeIban(value: string): string {
    return value.replace(/\s+/g, '').toUpperCase();
}

/** The IBAN in groups of four, as printed on bank statements: "CH93 0076 2011 6238 5295 7". */
export function formatIban(value: string): string {
    return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * Caret position in `formatted` right after its `count`-th IBAN character (spaces not counted). Keeps the caret where
 * the user was typing when the input is re-grouped, instead of jumping to the end.
 */
export function caretAfterChars(formatted: string, count: number): number {
    if (count <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ' ' && ++seen === count) return i + 1;
    }
    return formatted.length;
}
