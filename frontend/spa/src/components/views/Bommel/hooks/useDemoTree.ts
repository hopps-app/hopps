import { Bommel, BommelStatistics, BommelStatisticsMap } from '@hopps/api-client';
import { useCallback, useMemo, useState } from 'react';

import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';

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

/** The ids of a bommel and everything below it, for the given parent assignment. */
function withDescendants(id: number, parents: Record<number, number>): number[] {
    const ids = [id];
    for (const [child, parent] of Object.entries(parents)) {
        if (parent === id) ids.push(...withDescendants(Number(child), parents));
    }
    return ids;
}

function initialParents(): Record<number, number> {
    return Object.fromEntries(DEMO_BOMMELS.filter((b) => b.id !== DEMO_IDS.ROOT).map((b) => [b.id, b.parent === 0 ? DEMO_IDS.ROOT : b.parent]));
}

interface DemoAmounts {
    income: number;
    expenses: number;
    transactionsCount: number;
}

function amountsOf(id: number, parents: Record<number, number>, aggregate: boolean): DemoAmounts {
    const ids = aggregate ? withDescendants(id, parents) : [id];
    return DEMO_BOMMELS.filter((b) => ids.includes(b.id)).reduce<DemoAmounts>(
        (sum, b) => ({
            income: sum.income + b.income,
            expenses: sum.expenses + b.expenses,
            transactionsCount: sum.transactionsCount + b.transactionsCount,
        }),
        { income: 0, expenses: 0, transactionsCount: 0 }
    );
}

function buildDemoTree(parents: Record<number, number>, aggregate: boolean): BommelTreeNodeModel[] {
    return DEMO_BOMMELS.map((bommel) => {
        const isRoot = bommel.id === DEMO_IDS.ROOT;
        const { income, expenses, transactionsCount } = amountsOf(bommel.id, parents, aggregate);
        return {
            id: bommel.id,
            // The tree models the root as parent 0 and its children as top level, like the real data
            parent: isRoot || parents[bommel.id] === DEMO_IDS.ROOT ? 0 : parents[bommel.id],
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
                subBommelsCount: Object.values(parents).filter((parent) => parent === bommel.id).length,
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

/**
 * The example structure for the demo mode and the guide. Moving a bommel works in memory only (nothing is saved), and
 * `reset` puts everything back; `aggregate` decides whether the amounts include the bommels below.
 */
export function useDemoTree(aggregate: boolean = false): BommelTreeData & { bommelStats: BommelStatisticsMap; reset: () => void } {
    const [parents, setParents] = useState<Record<number, number>>(initialParents);

    const tree = useMemo(() => buildDemoTree(parents, aggregate), [parents, aggregate]);
    const rootBommel = useMemo(() => buildDemoRootBommel(), []);
    const bommelStats = useMemo(() => buildDemoStatistics(tree, aggregate), [tree, aggregate]);

    const moveTreeNode = useCallback(async (node: BommelTreeNodeModel): Promise<boolean> => {
        const id = Number(node.id);
        const target = node.parent === 0 ? DEMO_IDS.ROOT : Number(node.parent);
        // A bommel cannot go below itself or below one of its own sub-bommels
        setParents((current) => (withDescendants(id, current).includes(target) ? current : { ...current, [id]: target }));
        return true;
    }, []);

    const reset = useCallback(() => setParents(initialParents()), []);

    return {
        isOrganizationError: false,
        isLoading: false,
        rootBommel,
        tree,
        bommelStats,
        reset,
        createChildBommel: async (_parentId: number): Promise<number | boolean> => false,
        updateTreeNode: async (_node: BommelTreeNodeModel): Promise<boolean> => false,
        moveTreeNode,
        deleteTreeNode: async (_id: string | number): Promise<boolean> => false,
    };
}

export default useDemoTree;
