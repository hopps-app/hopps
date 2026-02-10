import { Bommel } from '@hopps/api-client';
import { RawNodeDatum } from 'react-d3-tree';

export interface TreeNodeData {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        nodeId?: number;
        total?: number;
        income?: number;
        expenses?: number;
        transactionsCount?: number;
    };
    children?: TreeNodeData[];
}

export interface BommelTreeComponentProps {
    tree: import('@/components/OrganizationStructureTree/OrganizationTreeNodeModel').OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    editable?: boolean;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<boolean>;
    onMove?: (nodeId: number, newParentId: number) => Promise<boolean>;
    width?: number;
    height?: number;
}

export interface BommelCardProps {
    nodeDatum: RawNodeDatum;
    toggleNode: () => void;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<boolean>;
    onMove?: (nodeId: number) => void;
    editable: boolean;
}

export interface BommelCardStatsProps {
    total: number;
    income: number;
    expenses: number;
    transactionsCount: number;
}

export type ViewMode = 'list' | 'tree';
