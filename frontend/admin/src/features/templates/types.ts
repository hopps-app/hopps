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

/** One category of a template. The parent is referenced by its value, values are unique per template. */
export type TemplateValue = {
    value: string;
    parent?: string;
    bookable: boolean;
    hidden: boolean;
};

export type CategoryGroupTemplate = {
    id: number | null;
    name: string;
    description: string;
    active: boolean;
    required: boolean;
    values: TemplateValue[];
    usageCount: number;
    /** Stable id shared with export files. Null until the server assigned one. */
    sourceKey: string | null;
};
