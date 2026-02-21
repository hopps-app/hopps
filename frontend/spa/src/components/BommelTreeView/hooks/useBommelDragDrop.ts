import { useCallback, useRef, useState } from 'react';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

interface DragState {
    isDragging: boolean;
    draggedNodeId: number | null;
    draggedNodeName: string;
    draggedNodeEmoji: string;
    pointerX: number;
    pointerY: number;
    hoverTargetId: number | null;
    invalidTargetIds: Set<number>;
}

interface DragResult {
    draggedNodeId: number;
    dropTargetId: number;
}

const DRAG_THRESHOLD = 5;

const initialState: DragState = {
    isDragging: false,
    draggedNodeId: null,
    draggedNodeName: '',
    draggedNodeEmoji: '',
    pointerX: 0,
    pointerY: 0,
    hoverTargetId: null,
    invalidTargetIds: new Set(),
};

function getDescendantIds(parentId: number, allBommels: OrganizationTreeNodeModel[]): Set<number> {
    const ids = new Set<number>();
    const children = allBommels.filter((b) => b.parent === parentId);
    children.forEach((child) => {
        ids.add(child.id as number);
        const childDescendants = getDescendantIds(child.id as number, allBommels);
        childDescendants.forEach((id) => ids.add(id));
    });
    return ids;
}

export function useBommelDragDrop(allBommels: OrganizationTreeNodeModel[]) {
    const [dragState, setDragState] = useState<DragState>(initialState);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const pendingDragRef = useRef<{ nodeId: number; name: string; emoji: string; parentId: number } | null>(null);
    const thresholdMetRef = useRef(false);

    const startDrag = useCallback((nodeId: number, name: string, emoji: string, parentId: number, clientX: number, clientY: number) => {
        pointerStartRef.current = { x: clientX, y: clientY };
        pendingDragRef.current = { nodeId, name, emoji, parentId };
        thresholdMetRef.current = false;
    }, []);

    const updateDrag = useCallback(
        (clientX: number, clientY: number) => {
            if (!pendingDragRef.current) return;

            if (!thresholdMetRef.current) {
                const start = pointerStartRef.current!;
                const dx = clientX - start.x;
                const dy = clientY - start.y;
                if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
                thresholdMetRef.current = true;

                const { nodeId, name, emoji, parentId } = pendingDragRef.current;
                const descendantIds = getDescendantIds(nodeId, allBommels);
                const invalidIds = new Set<number>([nodeId, parentId, ...descendantIds]);

                setDragState({
                    isDragging: true,
                    draggedNodeId: nodeId,
                    draggedNodeName: name,
                    draggedNodeEmoji: emoji,
                    pointerX: clientX,
                    pointerY: clientY,
                    hoverTargetId: null,
                    invalidTargetIds: invalidIds,
                });
            } else {
                setDragState((prev) => ({
                    ...prev,
                    pointerX: clientX,
                    pointerY: clientY,
                }));
            }
        },
        [allBommels]
    );

    const setHoverTarget = useCallback((targetId: number) => {
        setDragState((prev) => (prev.isDragging ? { ...prev, hoverTargetId: targetId } : prev));
    }, []);

    const clearHoverTarget = useCallback((targetId: number) => {
        setDragState((prev) => (prev.isDragging && prev.hoverTargetId === targetId ? { ...prev, hoverTargetId: null } : prev));
    }, []);

    const endDrag = useCallback((): DragResult | null => {
        const { isDragging, draggedNodeId, hoverTargetId, invalidTargetIds } = dragState;
        pendingDragRef.current = null;
        pointerStartRef.current = null;
        thresholdMetRef.current = false;
        setDragState(initialState);

        if (!isDragging || draggedNodeId === null || hoverTargetId === null) return null;
        if (invalidTargetIds.has(hoverTargetId)) return null;

        return { draggedNodeId, dropTargetId: hoverTargetId };
    }, [dragState]);

    const cancelDrag = useCallback(() => {
        pendingDragRef.current = null;
        pointerStartRef.current = null;
        thresholdMetRef.current = false;
        setDragState(initialState);
    }, []);

    const hasPendingDrag = useCallback(() => pendingDragRef.current !== null, []);

    return {
        dragState,
        startDrag,
        updateDrag,
        setHoverTarget,
        clearHoverTarget,
        endDrag,
        cancelDrag,
        hasPendingDrag,
    };
}
