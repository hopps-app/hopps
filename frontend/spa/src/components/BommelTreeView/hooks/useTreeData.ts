import { Bommel } from '@hopps/api-client';
import { useMemo } from 'react';

import { TreeNodeData } from '../types';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

interface UseTreeDataOptions {
    tree: OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
}

export function useTreeData({ tree, rootBommel }: UseTreeDataOptions): TreeNodeData | null {
    return useMemo(() => {
        if (!tree.length && !rootBommel) {
            return null;
        }

        // Find root node to get its statistics
        const rootNode = tree.find((node) => node.data?.isRoot);

        // Filter out the root bommel from tree nodes to avoid duplicate display
        const treeWithoutRoot = tree.filter((node) => !node.data?.isRoot);

        // Resolve the actual root bommel ID (parent=0 in tree model maps to root bommel in DB)
        const actualRootId = (rootBommel?.id || rootNode?.id || 0) as number;

        const buildTreeNode = (nodes: OrganizationTreeNodeModel[], parentId: string | number = 0): TreeNodeData[] => {
            const filteredNodes = nodes.filter((node) => node.parent === parentId);

            return filteredNodes.map((node, index) => {
                const children = buildTreeNode(nodes, node.id);
                return {
                    name: node.text || 'Unnamed',
                    attributes: {
                        id: node.id as number,
                        emoji: node.data?.emoji || '',
                        nodeId: node.id as number,
                        total: node.data?.total || 0,
                        income: node.data?.income || 0,
                        expenses: node.data?.expenses || 0,
                        transactionsCount: node.data?.transactionsCount || 0,
                        isLastSibling: index === filteredNodes.length - 1,
                        parentId: parentId === 0 ? actualRootId : (parentId as number),
                    },
                    children: children.length > 0 ? children : undefined,
                };
            });
        };

        const childNodes = buildTreeNode(treeWithoutRoot, 0);

        // Always show root bommel at the top of the tree
        return {
            name: rootBommel?.name || rootNode?.text || 'Organization',
            attributes: {
                id: actualRootId,
                emoji: rootNode?.data?.emoji || rootBommel?.emoji || '',
                nodeId: actualRootId,
                total: rootNode?.data?.total || 0,
                income: rootNode?.data?.income || 0,
                expenses: rootNode?.data?.expenses || 0,
                transactionsCount: rootNode?.data?.transactionsCount || 0,
                isRoot: true,
            },
            children: childNodes.length > 0 ? childNodes : undefined,
        };
    }, [tree, rootBommel]);
}

export default useTreeData;
