/**
 * Receipt files for the Pleo import are sent in several requests, because one request may carry at most 10 MB. Files of
 * the same expense ("2600009a.pdf", "2600009b.pdf") stay in one request: only there can the backend merge them or link
 * them to the same movement.
 */

/** Stays below the server's 10 MB request limit, with room for the multipart overhead. */
export const RECEIPT_BATCH_BYTES = 8 * 1024 * 1024;

/** The files a request may hold at most. */
export const MAX_RECEIPT_FILE_BYTES = RECEIPT_BATCH_BYTES;

export const RECEIPT_ACCEPT = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/zip': ['.zip'],
    'application/x-zip-compressed': ['.zip'],
};

type NamedFile = Pick<File, 'name' | 'size'>;

/** The expense a receipt file belongs to, by its name: "2600009a.pdf" and "2600009_2.pdf" both mean "2600009". */
export function receiptGroupKey(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    const stem = (dot > 0 ? fileName.slice(0, dot) : fileName).trim().toLowerCase();
    const match = /^(.+?)(?:[ _-]?[a-z]|[ _-]\d{1,2})$/.exec(stem);
    return match ? match[1] : stem;
}

export function isZipFile(file: NamedFile): boolean {
    return file.name.toLowerCase().endsWith('.zip');
}

/**
 * Packs the files into requests of at most `maxBytes`: each ZIP on its own, the files of one expense together. A group
 * larger than the limit still goes in one request of its own (the server then rejects it, which the dialog reports).
 */
export function buildReceiptBatches<T extends NamedFile>(files: T[], maxBytes: number = RECEIPT_BATCH_BYTES): T[][] {
    const groups = new Map<string, T[]>();
    const batches: T[][] = [];
    for (const file of files) {
        if (isZipFile(file)) {
            batches.push([file]);
            continue;
        }
        const key = receiptGroupKey(file.name);
        groups.set(key, [...(groups.get(key) ?? []), file]);
    }

    let current: T[] = [];
    let currentBytes = 0;
    for (const group of groups.values()) {
        const groupBytes = group.reduce((sum, f) => sum + f.size, 0);
        if (current.length > 0 && currentBytes + groupBytes > maxBytes) {
            batches.push(current);
            current = [];
            currentBytes = 0;
        }
        current.push(...group);
        currentBytes += groupBytes;
    }
    if (current.length > 0) {
        batches.push(current);
    }
    return batches;
}
