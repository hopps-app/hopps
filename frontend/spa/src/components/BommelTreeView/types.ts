import { Bommel } from '@hopps/api-client';

import type { DeleteImpact } from './hooks/useDeleteImpact';

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
        /** Balance at the start of the period, while the balance is shown */
        carryOver?: number;
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
    /**
     * Width (px) beyond the canvas to include when fitting the tree, e.g. a panel that currently covers that space.
     * Fitting against the same total with and without the panel keeps the tree from rescaling when it opens.
     */
    fitExtraWidth?: number;
    /** Extra classes for the canvas, e.g. `flex-1` to fill the page height */
    className?: string;
    /** What the delete dialog reports, worked out by the caller instead of loaded (the example structure) */
    deleteImpact?: (nodeId: number) => DeleteImpact;
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
    deleteImpact?: (nodeId: number) => DeleteImpact;
}

export interface BommelCardStatsProps {
    total: number;
    income: number;
    expenses: number;
    isRoot?: boolean;
    /** Balance at the start of the period; when given it is shown and included in the total */
    carryOver?: number;
}

export type ViewMode = 'list' | 'tree';
