import { Bommel } from '@hopps/api-client';
import { RawNodeDatum } from 'react-d3-tree';

export interface TreeNodeData {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        bommelData?: Bommel;
        nodeId?: number;
        income?: number;
        expenses?: number;
        revenue?: number;
        receiptsCount?: number;
        receiptsOpen?: number;
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
    editable: boolean;
}

export interface BommelCardStatsProps {
    income: number;
    expenses: number;
    revenue: number;
    receiptsCount: number;
    receiptsOpen: number;
}

export type ViewMode = 'list' | 'tree';
