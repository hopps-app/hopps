import { CategoryGroupTemplateRequest, TemplateOrderRequest, type CategoryGroupTemplateResponse, type TemplateSummaryResponse } from '@hopps/api-client';

import type { CategoryGroupTemplate, TemplateRow } from './types';

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

function mapCategoryGroupTemplate(r: CategoryGroupTemplateResponse): CategoryGroupTemplate {
    return {
        id: r.id ?? null,
        name: r.name ?? '',
        description: r.description ?? '',
        active: r.active ?? false,
        required: r.required ?? false,
        values: r.values ?? [],
        usageCount: r.usageCount ?? 0,
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
        values: template.values,
    });
    const saved =
        template.id === null ? await apiClient.createAdminCategoryGroupTemplate(body) : await apiClient.updateAdminCategoryGroupTemplate(template.id, body);
    return mapCategoryGroupTemplate(saved);
}

/** Saves the order of all templates, first to last. */
export async function reorderTemplates(ids: number[]): Promise<void> {
    await apiClient.reorderAdminTemplates(new TemplateOrderRequest({ ids }));
}

export async function deleteTemplate(id: number): Promise<void> {
    await apiClient.deleteAdminTemplate(id);
}
