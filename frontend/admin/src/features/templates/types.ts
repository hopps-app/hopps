import type { TemplateType } from '@hopps/api-client';

/** Template kinds the admin app knows how to edit. */
export type TemplateKind = TemplateType;

export type TemplateRow = {
    id: number;
    type: TemplateKind;
    name: string;
    description: string | null;
    active: boolean;
    sortIndex: number;
    /** Values for a category group template. */
    itemCount: number;
    /** Organizations that currently hold a copy. */
    usageCount: number;
    updatedAt: string | null;
    createdAt: string | null;
};

export type CategoryGroupTemplate = {
    id: number | null;
    name: string;
    description: string;
    active: boolean;
    required: boolean;
    values: string[];
    usageCount: number;
};
