import { Bommel } from '@hopps/api-client';

export type BommelTreeItem = {
    id: number;
    name: string;
    emoji: string;
    depth: number;
};

type Node = { bommel: Bommel; children: Node[] };

/**
 * The API returns a flat list in which every bommel carries its `parent`. Rebuild the hierarchy from
 * it so the filter can render the tree and so we can expand a selection to its whole subtree — the
 * backend matches `bommel.id in (...)` exactly and does not walk children for us.
 */
function buildNodes(bommels: Bommel[]): { roots: Node[]; byId: Map<number, Node> } {
    const byId = new Map<number, Node>();
    bommels.forEach((bommel) => {
        if (bommel.id != null) {
            byId.set(bommel.id, { bommel, children: [] });
        }
    });

    const roots: Node[] = [];
    byId.forEach((node) => {
        const parentId = node.bommel.parent?.id;
        const parent = parentId != null ? byId.get(parentId) : undefined;
        if (parent) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortByName = (nodes: Node[]) => {
        nodes.sort((a, b) => (a.bommel.name ?? '').localeCompare(b.bommel.name ?? ''));
        nodes.forEach((node) => sortByName(node.children));
    };
    sortByName(roots);

    return { roots, byId };
}

/**
 * Flattens the hierarchy in display order. The organization root is not offered as an option —
 * "all bommels" already stands for the whole organization — so its children start at depth 0.
 */
export function flattenBommelTree(bommels: Bommel[], rootBommelId?: number): BommelTreeItem[] {
    const { roots } = buildNodes(bommels);
    const items: BommelTreeItem[] = [];

    const walk = (nodes: Node[], depth: number) => {
        nodes.forEach((node) => {
            if (node.bommel.id === rootBommelId) {
                walk(node.children, depth);
                return;
            }
            items.push({
                id: node.bommel.id!,
                name: node.bommel.name ?? '',
                emoji: node.bommel.emoji ?? '',
                depth,
            });
            walk(node.children, depth + 1);
        });
    };
    walk(roots, 0);

    return items;
}

/** The selected bommel plus every bommel below it, so a parent selection includes its children's figures. */
export function collectSubtreeIds(bommels: Bommel[], bommelId: number): number[] {
    const { byId } = buildNodes(bommels);
    const start = byId.get(bommelId);
    if (!start) {
        return [bommelId];
    }

    const ids: number[] = [];
    const walk = (node: Node) => {
        if (node.bommel.id != null) {
            ids.push(node.bommel.id);
        }
        node.children.forEach(walk);
    };
    walk(start);

    return ids;
}
