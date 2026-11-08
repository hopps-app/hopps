import { Bommel, BommelStatistics, BommelStatisticsMap } from '@hopps/api-client';
import { useCallback, useMemo, useRef, useState } from 'react';

import { generateRandomBommelEmoji, generateRandomBommelName } from './useBommelTree';

import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';
import type { DeleteImpact } from '@/components/BommelTreeView/hooks/useDeleteImpact';

export interface BommelTreeData {
    isOrganizationError: boolean;
    isLoading: boolean;
    rootBommel: Bommel | null;
    tree: BommelTreeNodeModel[];
    createChildBommel: (parentId: number) => Promise<number | boolean>;
    updateTreeNode: (node: BommelTreeNodeModel) => Promise<boolean>;
    moveTreeNode: (node: BommelTreeNodeModel) => Promise<boolean>;
    deleteTreeNode: (id: string | number) => Promise<boolean>;
}

// Negative IDs to avoid collisions with real database IDs
const DEMO_IDS = {
    ROOT: -1,
    FUSSBALL: -2,
    HANDBALL: -3,
    EVENTS: -4,
    LIGA_1: -5,
    LIGA_2: -6,
    FANARTIKEL: -7,
    TEAM_U13: -8,
    TEAM_U18: -9,
    SOMMERFEST: -10,
    WEIHNACHTSFEIER: -11,
} as const;

interface DemoBommel {
    id: number;
    parent: number;
    text: string;
    emoji: string;
    /** Amounts booked directly on this bommel; sums over the bommels below are worked out from these. */
    income: number;
    expenses: number;
    transactionsCount: number;
}

/**
 * The example structure. Every bommel carries its own amounts, so the totals can be shown either way: only what is
 * booked on it, or including everything below it. Moving a bommel therefore changes the sums, like in the real page.
 * `parent: 0` here means the top level, as in the tree model.
 */
const DEMO_BOMMELS: DemoBommel[] = [
    { id: DEMO_IDS.ROOT, parent: 0, text: 'Sportverein', emoji: 'herb', income: 1200, expenses: 300, transactionsCount: 3 },
    { id: DEMO_IDS.FUSSBALL, parent: 0, text: 'Fußball', emoji: 'soccer', income: 1500, expenses: 900, transactionsCount: 6 },
    { id: DEMO_IDS.HANDBALL, parent: 0, text: 'Handball', emoji: 'person_playing_handball', income: 800, expenses: 400, transactionsCount: 4 },
    { id: DEMO_IDS.EVENTS, parent: 0, text: 'Events/Feiern', emoji: 'balloon', income: 600, expenses: 250, transactionsCount: 3 },
    { id: DEMO_IDS.LIGA_1, parent: DEMO_IDS.FUSSBALL, text: '1. Liga', emoji: 'one', income: 3000, expenses: 1000, transactionsCount: 5 },
    { id: DEMO_IDS.LIGA_2, parent: DEMO_IDS.FUSSBALL, text: '2. Liga', emoji: 'two', income: 3500, expenses: 1500, transactionsCount: 8 },
    { id: DEMO_IDS.FANARTIKEL, parent: DEMO_IDS.LIGA_1, text: 'Fanartikel', emoji: 'sparkling_heart', income: 2000, expenses: 800, transactionsCount: 5 },
    { id: DEMO_IDS.TEAM_U13, parent: DEMO_IDS.HANDBALL, text: 'Team U13', emoji: 'boy', income: 2600, expenses: 800, transactionsCount: 7 },
    { id: DEMO_IDS.TEAM_U18, parent: DEMO_IDS.HANDBALL, text: 'Team U18', emoji: 'child', income: 2600, expenses: 600, transactionsCount: 7 },
    { id: DEMO_IDS.SOMMERFEST, parent: DEMO_IDS.EVENTS, text: 'Sommerfest', emoji: 'sunny', income: 2500, expenses: 700, transactionsCount: 8 },
    { id: DEMO_IDS.WEIHNACHTSFEIER, parent: DEMO_IDS.EVENTS, text: 'Weihnachtsfeier', emoji: 'santa', income: 2000, expenses: 350, transactionsCount: 7 },
];

/** The ids of a bommel and everything below it. */
function withDescendants(id: number, bommels: DemoBommel[]): number[] {
    return [id, ...bommels.filter((b) => b.parent === id).flatMap((child) => withDescendants(child.id, bommels))];
}

/** The example as it starts. Here the top level hangs under the root; the tree model puts it under 0 again. */
function initialBommels(): DemoBommel[] {
    return DEMO_BOMMELS.map((b) => (b.id === DEMO_IDS.ROOT || b.parent !== 0 ? { ...b } : { ...b, parent: DEMO_IDS.ROOT }));
}

interface DemoAmounts {
    income: number;
    expenses: number;
    transactionsCount: number;
}

function amountsOf(id: number, bommels: DemoBommel[], aggregate: boolean): DemoAmounts {
    const ids = aggregate ? withDescendants(id, bommels) : [id];
    return bommels
        .filter((b) => ids.includes(b.id))
        .reduce<DemoAmounts>(
            (sum, b) => ({
                income: sum.income + b.income,
                expenses: sum.expenses + b.expenses,
                transactionsCount: sum.transactionsCount + b.transactionsCount,
            }),
            { income: 0, expenses: 0, transactionsCount: 0 }
        );
}

function buildDemoTree(bommels: DemoBommel[], aggregate: boolean): BommelTreeNodeModel[] {
    return bommels.map((bommel) => {
        const isRoot = bommel.id === DEMO_IDS.ROOT;
        const { income, expenses, transactionsCount } = amountsOf(bommel.id, bommels, aggregate);
        return {
            id: bommel.id,
            // The tree models the root as parent 0 and its children as top level, like the real data
            parent: isRoot || bommel.parent === DEMO_IDS.ROOT ? 0 : bommel.parent,
            text: bommel.text,
            droppable: !isRoot,
            data: {
                emoji: bommel.emoji,
                id: bommel.id,
                ...(isRoot ? { isRoot: true } : {}),
                total: income - expenses,
                income,
                expenses,
                transactionsCount,
                subBommelsCount: bommels.filter((b) => b.parent === bommel.id).length,
            },
        };
    });
}

function buildDemoRootBommel(): Bommel {
    return new Bommel({
        id: DEMO_IDS.ROOT,
        name: 'Sportverein',
        emoji: 'herb',
        children: [],
    });
}

function buildDemoStatistics(tree: BommelTreeNodeModel[], aggregate: boolean): BommelStatisticsMap {
    const statsMap = new BommelStatisticsMap();
    statsMap.statistics = {};
    statsMap.includeDrafts = false;
    statsMap.aggregated = aggregate;

    for (const node of tree) {
        statsMap.statistics[String(node.id)] = new BommelStatistics({
            bommelId: node.id as number,
            bommelName: node.text,
            total: node.data?.total ?? 0,
            income: node.data?.income ?? 0,
            expenses: node.data?.expenses ?? 0,
            transactionsCount: node.data?.transactionsCount ?? 0,
            aggregated: aggregate,
        });
    }

    return statsMap;
}

/** The move the guide demonstrates by drag and drop: Sommerfest onto Handball, neighbours in the default view. */
export const DEMO_DRAG_HINT = { fromId: DEMO_IDS.SOMMERFEST, toId: DEMO_IDS.HANDBALL } as const;

/** New example bommels count down from here, clear of the fixed ones above. */
const FIRST_NEW_ID = -100;

/**
 * The example structure for the demo mode and the guide. Everything the real page offers works on it (adding, renaming,
 * deleting, moving), but in memory only: nothing is sent to the server, and `reset` puts the example back as it was.
 * `aggregate` decides whether the amounts include the bommels below.
 */
export function useDemoTree(
    aggregate: boolean = false
): BommelTreeData & { bommelStats: BommelStatisticsMap; reset: () => void; deleteImpact: (id: number) => DeleteImpact } {
    const [bommels, setBommels] = useState<DemoBommel[]>(initialBommels);
    const nextId = useRef(FIRST_NEW_ID);

    const tree = useMemo(() => buildDemoTree(bommels, aggregate), [bommels, aggregate]);
    const rootBommel = useMemo(() => buildDemoRootBommel(), []);
    const bommelStats = useMemo(() => buildDemoStatistics(tree, aggregate), [tree, aggregate]);

    const createChildBommel = useCallback(async (parentId: number): Promise<number> => {
        const id = nextId.current--;
        const created: DemoBommel = {
            id,
            parent: parentId === 0 ? DEMO_IDS.ROOT : parentId,
            text: generateRandomBommelName(),
            emoji: generateRandomBommelEmoji(),
            income: 0,
            expenses: 0,
            transactionsCount: 0,
        };
        setBommels((current) => [...current, created]);
        return id;
    }, []);

    const updateTreeNode = useCallback(async (node: BommelTreeNodeModel): Promise<boolean> => {
        const id = Number(node.id);
        setBommels((current) => current.map((b) => (b.id === id ? { ...b, text: node.text, emoji: node.data?.emoji || b.emoji } : b)));
        return true;
    }, []);

    const moveTreeNode = useCallback(async (node: BommelTreeNodeModel): Promise<boolean> => {
        const id = Number(node.id);
        const target = node.parent === 0 ? DEMO_IDS.ROOT : Number(node.parent);
        // A bommel cannot go below itself or below one of its own sub-bommels
        setBommels((current) => (withDescendants(id, current).includes(target) ? current : current.map((b) => (b.id === id ? { ...b, parent: target } : b))));
        return true;
    }, []);

    const deleteTreeNode = useCallback(async (nodeId: string | number): Promise<boolean> => {
        const id = Number(nodeId);
        if (id === DEMO_IDS.ROOT) return false;
        // Like the real delete: the sub-bommels go with it
        setBommels((current) => {
            const removed = new Set(withDescendants(id, current));
            return current.filter((b) => !removed.has(b.id));
        });
        return true;
    }, []);

    // What the delete dialog reports for the example. It has transactions, but no receipts and nothing confirmed.
    const deleteImpact = useCallback(
        (id: number): DeleteImpact => {
            const ids = new Set(withDescendants(id, bommels));
            const transactionCount = bommels.filter((b) => ids.has(b.id)).reduce((sum, b) => sum + b.transactionsCount, 0);
            return { loading: false, transactionCount, confirmedTransactionCount: 0, receiptCount: 0, confirmedReceiptCount: 0 };
        },
        [bommels]
    );

    const reset = useCallback(() => {
        setBommels(initialBommels());
        nextId.current = FIRST_NEW_ID;
    }, []);

    return {
        isOrganizationError: false,
        isLoading: false,
        rootBommel,
        tree,
        bommelStats,
        reset,
        deleteImpact,
        createChildBommel,
        updateTreeNode,
        moveTreeNode,
        deleteTreeNode,
    };
}

export default useDemoTree;
