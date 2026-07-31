import { Bommel, CategoryGroupResponse } from '@hopps/api-client';

/** Index bommels by id for quick parent-chain walks. */
export function buildBommelIndex(bommels: Bommel[]): Map<number, Bommel> {
    const byId = new Map<number, Bommel>();
    for (const b of bommels) {
        if (b.id != null) {
            byId.set(b.id, b);
        }
    }
    return byId;
}

/** The bommel id plus all of its ancestor ids (walking `parent`), guarding against cycles. */
export function selfAndAncestorIds(bommelId: number | null | undefined, byId: Map<number, Bommel>): Set<number> {
    const ids = new Set<number>();
    let current = bommelId != null ? byId.get(bommelId) : undefined;
    // include the starting bommel itself even if it isn't in the index
    if (bommelId != null) {
        ids.add(bommelId);
    }
    while (current?.parent?.id != null && !ids.has(current.parent.id)) {
        const parentId = current.parent.id;
        ids.add(parentId);
        current = byId.get(parentId);
    }
    return ids;
}

/** The organization's root bommel (the parent-less node); falls back to the first bommel. */
export function rootBommel(bommels: Bommel[]): Bommel | undefined {
    return bommels.find((b) => b.parent?.id == null) ?? bommels[0];
}

/**
 * Groups that apply to the given bommel: those assigned to the bommel itself or to any of its ancestors. Groups with no
 * bommel assignment never apply (empty assignment = "no bommel"; assign the root bommel to apply everywhere).
 */
export function groupsForBommel(groups: CategoryGroupResponse[], bommelId: number | null | undefined, byId: Map<number, Bommel>): CategoryGroupResponse[] {
    if (bommelId == null) {
        return [];
    }
    const ancestry = selfAndAncestorIds(bommelId, byId);
    return groups.filter((g) => (g.bommelIds ?? []).some((id) => ancestry.has(id)));
}

/** Applicable, required groups that have no value selected yet. */
export function missingRequiredGroups(
    groups: CategoryGroupResponse[],
    bommelId: number | null | undefined,
    byId: Map<number, Bommel>,
    values: Record<number, string>
): CategoryGroupResponse[] {
    return groupsForBommel(groups, bommelId, byId).filter((g) => {
        if (!g.required) {
            return false;
        }
        const value = g.id != null ? values[g.id] : undefined;
        return value == null || value.trim() === '';
    });
}
