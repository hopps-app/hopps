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

        const buildTreeNode = (nodes: OrganizationTreeNodeModel[], parentId: string | number = 0): TreeNodeData[] => {
            const filteredNodes = nodes.filter((node) => node.parent === parentId);

            return filteredNodes.map((node) => {
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
                    },
                    children: children.length > 0 ? children : undefined,
                };
            });
        };

        const topLevelNodes = buildTreeNode(treeWithoutRoot, 0);

        // If no top-level nodes but we have a root bommel, return just the root
        if (topLevelNodes.length === 0 && rootBommel) {
            return {
                name: rootBommel.name || 'Organization',
                attributes: {
                    id: rootBommel.id || 0,
                    emoji: rootNode?.data?.emoji || 'building',
                    nodeId: rootBommel.id || 0,
                    total: rootNode?.data?.total || 0,
                    income: rootNode?.data?.income || 0,
                    expenses: rootNode?.data?.expenses || 0,
                    transactionsCount: rootNode?.data?.transactionsCount || 0,
                    isRoot: true,
                },
            };
        }

        // If multiple top-level nodes, wrap them under the root
        if (topLevelNodes.length > 1) {
            return {
                name: rootBommel?.name || 'Organization',
                attributes: {
                    id: rootBommel?.id || 0,
                    emoji: rootNode?.data?.emoji || 'building',
                    nodeId: rootBommel?.id || 0,
                    total: rootNode?.data?.total || 0,
                    income: rootNode?.data?.income || 0,
                    expenses: rootNode?.data?.expenses || 0,
                    transactionsCount: rootNode?.data?.transactionsCount || 0,
                    isRoot: true,
                },
                children: topLevelNodes,
            };
        }

        // Single top-level node is the root
        if (topLevelNodes[0]) {
            topLevelNodes[0].attributes = { ...topLevelNodes[0].attributes!, isRoot: true };
        }

        return topLevelNodes[0] || null;
    }, [tree, rootBommel]);
}

export default useTreeData;
