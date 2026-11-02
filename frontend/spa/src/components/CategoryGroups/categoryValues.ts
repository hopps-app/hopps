import { CategoryGroupExport } from '@hopps/api-client';

/** A category before it is saved: new groups and import previews work on these. */
export type PendingCategory = { value: string; parent?: string; bookable: boolean; hidden: boolean };

/** Format of the export file this app can read. */
const EXPORT_FORMAT_VERSION = 1;

/** Each top-level category directly followed by its children, as the server orders them. */
export function inTreeOrder<T extends { value?: string; parent?: string }>(categories: T[]): T[] {
    const known = new Set(categories.map((c) => c.value));
    const topLevel = categories.filter((c) => !c.parent || !known.has(c.parent));
    return topLevel.flatMap((c) => [c, ...categories.filter((child) => child.parent != null && child.parent === c.value)]);
}

/** Removes a category; its children move to the top level, as they do on the server. */
export function withoutCategory(categories: PendingCategory[], value: string): PendingCategory[] {
    return categories.filter((c) => c.value !== value).map((c) => (c.parent === value ? { ...c, parent: undefined } : c));
}

/** Reads an export file; null when the text is not one this app can import. */
export function parseCategoryGroupFile(text: string): CategoryGroupExport | null {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    const file = data as { formatVersion?: unknown; name?: unknown; values?: unknown } | null;
    if (file?.formatVersion !== EXPORT_FORMAT_VERSION || typeof file.name !== 'string' || !file.name.trim() || !Array.isArray(file.values)) {
        return null;
    }
    return CategoryGroupExport.fromJS(data);
}

/** Hands an export file to the browser as a download. */
export function downloadCategoryGroupFile(file: CategoryGroupExport) {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kategorien_${(file.name ?? 'export').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
