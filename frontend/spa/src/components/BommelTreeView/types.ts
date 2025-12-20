import { Bommel } from '@hopps/api-client';

export interface TreeNodeData {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        bommelData?: Bommel;
    };
    children?: TreeNodeData[];
}

export interface BommelTreeComponentProps {
    tree: import('@/components/OrganizationStructureTree/OrganizationTreeNodeModel').OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    width?: number;
    height?: number;
}

export type ViewMode = 'list' | 'tree';
