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
                        income: node.data?.income || 0,
                        expenses: node.data?.expenses || 0,
                        revenue: node.data?.revenue || 0,
                        receiptsCount: node.data?.receiptsCount || 0,
                        receiptsOpen: node.data?.receiptsOpen || 0,
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
                    emoji: 'building',
                    nodeId: rootBommel.id || 0,
                    income: 0,
                    expenses: 0,
                    revenue: 0,
                    receiptsCount: 0,
                    receiptsOpen: 0,
                },
            };
        }

        // If multiple top-level nodes, wrap them under the root
        if (topLevelNodes.length > 1) {
            return {
                name: rootBommel?.name || 'Organization',
                attributes: {
                    id: rootBommel?.id || 0,
                    emoji: 'building',
                    nodeId: rootBommel?.id || 0,
                    income: 0,
                    expenses: 0,
                    revenue: 0,
                    receiptsCount: 0,
                    receiptsOpen: 0,
                },
                children: topLevelNodes,
            };
        }

        return topLevelNodes[0] || null;
    }, [tree, rootBommel]);
}

export default useTreeData;
