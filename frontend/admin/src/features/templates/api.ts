import {
    CategoryGroupExport,
    CategoryGroupTemplateRequest,
    CategoryValueEntry,
    TemplateOrderRequest,
    type CategoryGroupTemplateResponse,
    type TemplateSummaryResponse,
} from '@hopps/api-client';

import type { CategoryGroupTemplate, TemplateRow, TemplateValue } from './types';

import { apiClient } from '@/services/apiClient';

/**
 * Adapter between the generated api-client and the templates feature. Maps the optional-everything wire DTOs onto
 * the stricter view types, like `features/organizations/api.ts` does.
 */

function toIso(d: Date | undefined): string | null {
    return d ? new Date(d).toISOString() : null;
}

function mapRow(r: TemplateSummaryResponse): TemplateRow {
    return {
        id: r.id ?? 0,
        type: r.type ?? 'CATEGORY_GROUP',
        name: r.name ?? '',
        description: r.description ?? null,
        active: r.active ?? false,
        sortIndex: r.sortIndex ?? 0,
        itemCount: r.itemCount ?? 0,
        usageCount: r.usageCount ?? 0,
        updatedAt: toIso(r.updatedAt),
        createdAt: toIso(r.createdAt),
    };
}

function mapValue(v: CategoryValueEntry): TemplateValue {
    return { value: v.value ?? '', parent: v.parent ?? undefined, bookable: v.bookable ?? true, hidden: v.hidden ?? false };
}

function mapCategoryGroupTemplate(r: CategoryGroupTemplateResponse): CategoryGroupTemplate {
    return {
        id: r.id ?? null,
        name: r.name ?? '',
        description: r.description ?? '',
        active: r.active ?? false,
        required: r.required ?? false,
        values: (r.values ?? []).map(mapValue),
        usageCount: r.usageCount ?? 0,
        sourceKey: r.sourceKey ?? null,
    };
}

export async function fetchTemplates(): Promise<TemplateRow[]> {
    const rows = await apiClient.listAdminTemplates(undefined);
    return rows.map(mapRow);
}

export async function fetchCategoryGroupTemplate(id: number): Promise<CategoryGroupTemplate> {
    return mapCategoryGroupTemplate(await apiClient.getAdminCategoryGroupTemplate(id));
}

export async function saveCategoryGroupTemplate(template: CategoryGroupTemplate): Promise<CategoryGroupTemplate> {
    const body = new CategoryGroupTemplateRequest({
        name: template.name,
        description: template.description,
        active: template.active,
        required: template.required,
        values: template.values.map((v) => new CategoryValueEntry(v)),
        sourceKey: template.sourceKey ?? undefined,
    });
    const saved =
        template.id === null ? await apiClient.createAdminCategoryGroupTemplate(body) : await apiClient.updateAdminCategoryGroupTemplate(template.id, body);
    return mapCategoryGroupTemplate(saved);
}

/** Format of the export file this app can read. */
const EXPORT_FORMAT_VERSION = 1;

/** Downloads a template as an export file, in the format organizations use for their groups. */
export async function exportCategoryGroupTemplate(id: number): Promise<void> {
    const file = await apiClient.exportAdminCategoryGroupTemplate(id);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kategorien_${(file.name ?? 'export').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/** The part of a template an export file fills in; null when the text is not a file this app can read. */
export function parseTemplateFile(text: string): Pick<CategoryGroupTemplate, 'name' | 'required' | 'values' | 'sourceKey'> | null {
    let data: { formatVersion?: unknown; name?: unknown; values?: unknown } | null;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (data?.formatVersion !== EXPORT_FORMAT_VERSION || typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.values)) {
        return null;
    }
    const file = CategoryGroupExport.fromJS(data);
    return { name: file.name ?? '', required: file.required ?? false, values: (file.values ?? []).map(mapValue), sourceKey: file.sourceKey ?? null };
}

/** Saves the order of all templates, first to last. */
export async function reorderTemplates(ids: number[]): Promise<void> {
    await apiClient.reorderAdminTemplates(new TemplateOrderRequest({ ids }));
}

export async function deleteTemplate(id: number): Promise<void> {
    await apiClient.deleteAdminTemplate(id);
}
