import { Bommel } from '@hopps/api-client';

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
        isRoot?: boolean;
        parentId?: number;
    };
    children?: TreeNodeData[];
}

export interface BommelTreeComponentProps {
    tree: import('@/components/BommelTreeView/BommelTreeNodeModel').BommelTreeNodeModel[];
    rootBommel?: Bommel | null;
    editable?: boolean;
    dragDropEnabled?: boolean;
    selectedId?: number | null;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<number | boolean>;
    onMove?: (nodeId: number, newParentId: number) => Promise<boolean>;
    /** Called from the "add Bommel" placeholder under an empty root while not in edit mode */
    onRequestEdit?: () => void;
    /** Extra classes for the canvas, e.g. `flex-1` to fill the page height */
    className?: string;
}

export interface BommelCardProps {
    node: TreeNodeData;
    depth: number;
    expanded: boolean;
    /** Stretch to the container (vertical layout) instead of the fixed per-level widths */
    fullWidth?: boolean;
    onToggle: () => void;
    selected?: boolean;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<number | boolean>;
    editable: boolean;
    autoEdit?: boolean;
    dragDropEnabled?: boolean;
    isBeingDragged?: boolean;
    isDraggedOver?: boolean;
    isValidDropTarget?: boolean;
    onDragStart?: (nodeId: number, name: string, emoji: string, parentId: number, clientX: number, clientY: number) => void;
}

export interface BommelCardStatsProps {
    total: number;
    income: number;
    expenses: number;
    isRoot?: boolean;
}

export type ViewMode = 'list' | 'tree';
