import { Bommel, BommelStatistics, BommelStatisticsMap } from '@hopps/api-client';
import { useMemo } from 'react';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

export interface OrganizationTreeData {
    isOrganizationError: boolean;
    isLoading: boolean;
    rootBommel: Bommel | null;
    tree: OrganizationTreeNodeModel[];
    createTreeNode: () => Promise<OrganizationTreeNodeModel | undefined>;
    createChildBommel: (parentId: number) => Promise<number | boolean>;
    updateTreeNode: (node: OrganizationTreeNodeModel) => Promise<boolean>;
    moveTreeNode: (node: OrganizationTreeNodeModel) => Promise<boolean>;
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

function buildDemoTree(): OrganizationTreeNodeModel[] {
    return [
        // Root node
        {
            id: DEMO_IDS.ROOT,
            parent: 0,
            text: 'Sportverein',
            droppable: false,
            data: { emoji: 'herb', id: DEMO_IDS.ROOT, isRoot: true, total: 12450, income: 18200, expenses: 5750, transactionsCount: 47, subBommelsCount: 3 },
        },
        // Level 1
        {
            id: DEMO_IDS.FUSSBALL,
            parent: 0,
            text: 'Fußball',
            droppable: true,
            data: { emoji: 'soccer', id: DEMO_IDS.FUSSBALL, total: 5200, income: 8500, expenses: 3300, transactionsCount: 18, subBommelsCount: 2 },
        },
        {
            id: DEMO_IDS.HANDBALL,
            parent: 0,
            text: 'Handball',
            droppable: true,
            data: {
                emoji: 'person_playing_handball',
                id: DEMO_IDS.HANDBALL,
                total: 3800,
                income: 5200,
                expenses: 1400,
                transactionsCount: 14,
                subBommelsCount: 2,
            },
        },
        {
            id: DEMO_IDS.EVENTS,
            parent: 0,
            text: 'Events/Feiern',
            droppable: true,
            data: { emoji: 'balloon', id: DEMO_IDS.EVENTS, total: 3450, income: 4500, expenses: 1050, transactionsCount: 15, subBommelsCount: 2 },
        },
        // Level 2 - Fußball children
        {
            id: DEMO_IDS.LIGA_1,
            parent: DEMO_IDS.FUSSBALL,
            text: '1. Liga',
            droppable: true,
            data: { emoji: 'one', id: DEMO_IDS.LIGA_1, total: 3200, income: 5000, expenses: 1800, transactionsCount: 10, subBommelsCount: 1 },
        },
        {
            id: DEMO_IDS.LIGA_2,
            parent: DEMO_IDS.FUSSBALL,
            text: '2. Liga',
            droppable: true,
            data: { emoji: 'two', id: DEMO_IDS.LIGA_2, total: 2000, income: 3500, expenses: 1500, transactionsCount: 8, subBommelsCount: 0 },
        },
        // Level 3 - Fußball > 1. Liga children
        {
            id: DEMO_IDS.FANARTIKEL,
            parent: DEMO_IDS.LIGA_1,
            text: 'Fanartikel',
            droppable: true,
            data: { emoji: 'sparkling_heart', id: DEMO_IDS.FANARTIKEL, total: 1200, income: 2000, expenses: 800, transactionsCount: 5, subBommelsCount: 0 },
        },
        // Level 2 - Handball children
        {
            id: DEMO_IDS.TEAM_U13,
            parent: DEMO_IDS.HANDBALL,
            text: 'Team U13',
            droppable: true,
            data: { emoji: 'boy', id: DEMO_IDS.TEAM_U13, total: 1800, income: 2600, expenses: 800, transactionsCount: 7, subBommelsCount: 0 },
        },
        {
            id: DEMO_IDS.TEAM_U18,
            parent: DEMO_IDS.HANDBALL,
            text: 'Team U18',
            droppable: true,
            data: { emoji: 'child', id: DEMO_IDS.TEAM_U18, total: 2000, income: 2600, expenses: 600, transactionsCount: 7, subBommelsCount: 0 },
        },
        // Level 2 - Events children
        {
            id: DEMO_IDS.SOMMERFEST,
            parent: DEMO_IDS.EVENTS,
            text: 'Sommerfest',
            droppable: true,
            data: { emoji: 'sunny', id: DEMO_IDS.SOMMERFEST, total: 1800, income: 2500, expenses: 700, transactionsCount: 8, subBommelsCount: 0 },
        },
        {
            id: DEMO_IDS.WEIHNACHTSFEIER,
            parent: DEMO_IDS.EVENTS,
            text: 'Weihnachtsfeier',
            droppable: true,
            data: { emoji: 'santa', id: DEMO_IDS.WEIHNACHTSFEIER, total: 1650, income: 2000, expenses: 350, transactionsCount: 7, subBommelsCount: 0 },
        },
    ];
}

function buildDemoRootBommel(): Bommel {
    return new Bommel({
        id: DEMO_IDS.ROOT,
        name: 'Sportverein',
        emoji: 'herb',
        children: [],
    });
}

function buildDemoStatistics(): BommelStatisticsMap {
    const statsMap = new BommelStatisticsMap();
    statsMap.statistics = {};
    statsMap.includeDrafts = false;
    statsMap.aggregated = false;

    const demoTree = buildDemoTree();
    for (const node of demoTree) {
        const id = String(node.id);
        statsMap.statistics[id] = new BommelStatistics({
            bommelId: node.id as number,
            bommelName: node.text,
            total: node.data?.total ?? 0,
            income: node.data?.income ?? 0,
            expenses: node.data?.expenses ?? 0,
            transactionsCount: node.data?.transactionsCount ?? 0,
            aggregated: false,
        });
    }

    return statsMap;
}

export function useDemoTree(): OrganizationTreeData & { bommelStats: BommelStatisticsMap } {
    const tree = useMemo(() => buildDemoTree(), []);
    const rootBommel = useMemo(() => buildDemoRootBommel(), []);
    const bommelStats = useMemo(() => buildDemoStatistics(), []);

    return {
        isOrganizationError: false,
        isLoading: false,
        rootBommel,
        tree,
        createTreeNode: async (): Promise<OrganizationTreeNodeModel | undefined> => undefined,
        createChildBommel: async (_parentId: number): Promise<number | boolean> => false,
        updateTreeNode: async (_node: OrganizationTreeNodeModel): Promise<boolean> => false,
        moveTreeNode: async (_node: OrganizationTreeNodeModel): Promise<boolean> => false,
        deleteTreeNode: async (_id: string | number): Promise<boolean> => false,
        bommelStats,
    };
}

export default useDemoTree;
