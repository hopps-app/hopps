import { useMemo, useCallback } from 'react';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

export function useTreeCalculations(tree: OrganizationTreeNodeModel[]) {
    const countTotalBommels = useMemo(() => tree.length, [tree]);

    const calculateTotal = useMemo(() => tree.reduce((sum, node) => sum + (node.data?.total || 0), 0), [tree]);

    const calculateTotalTransactions = useMemo(() => tree.reduce((sum, node) => sum + (node.data?.transactionsCount || 0), 0), [tree]);

    const countSubBommels = useCallback(
        (node: OrganizationTreeNodeModel): number => {
            const children = tree.filter((n) => n.parent === node.id);
            if (children.length === 0) return 0;

            let count = children.length;
            children.forEach((child) => {
                count += countSubBommels(child);
            });

            return count;
        },
        [tree]
    );

    const getNodeDepth = useCallback(
        (node: OrganizationTreeNodeModel): number => {
            let depth = 0;
            let currentNode = node;
            while (currentNode.parent && currentNode.parent !== 0) {
                depth++;
                const parentNode = tree.find((n) => n.id === currentNode.parent);
                if (!parentNode) break;
                currentNode = parentNode;
            }
            return depth;
        },
        [tree]
    );

    return {
        countTotalBommels,
        calculateTotal,
        calculateTotalTransactions,
        countSubBommels,
        getNodeDepth,
    };
}

export default useTreeCalculations;
