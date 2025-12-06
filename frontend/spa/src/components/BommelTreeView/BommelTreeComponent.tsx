import { useMemo } from 'react';
import { Bommel } from '@hopps/api-client';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import SimpleBommelTree from './SimpleBommelTree';

// Interface for react-d3-tree data structure
interface TreeNodeData {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        bommelData?: Bommel;
    };
    children?: TreeNodeData[];
}

interface BommelTreeComponentProps {
    tree: OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    width?: number;
    height?: number;
}

function BommelTreeComponent({ tree, rootBommel, onNodeClick }: BommelTreeComponentProps) {
    const handleNodeClick = useMemo(() => {
        return (nodeId: number) => {
            // Find the node data to pass to the callback
            const nodeData: TreeNodeData = {
                name: 'Node',
                attributes: { id: nodeId },
            };
            onNodeClick?.(nodeData);
        };
    }, [onNodeClick]);

    return <SimpleBommelTree tree={tree} rootBommel={rootBommel} onNodeClick={handleNodeClick} />;
}

export default BommelTreeComponent;
