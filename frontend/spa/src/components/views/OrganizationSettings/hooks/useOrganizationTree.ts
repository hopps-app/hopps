import { Bommel } from '@hopps/api-client';
import { useCallback, useEffect, useState } from 'react';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import organizationTreeService from '@/services/OrganisationTreeService';
import { useStore } from '@/store/store';

export function useOrganizationTree() {
    const { showError } = useToast();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

    const getNodeDepth = useCallback((node: OrganizationTreeNodeModel, allNodes: OrganizationTreeNodeModel[]): number => {
        let depth = 0;
        let currentNode = node;
        while (currentNode.parent && currentNode.parent !== 0) {
            depth++;
            const parentNode = allNodes.find((n) => n.id === currentNode.parent);
            if (!parentNode) break;
            currentNode = parentNode;
        }
        return depth;
    }, []);

    const loadTree = useCallback(async () => {
        const organizationId = store.organization?.id;
        if (!organizationId) return;

        const bommels = await organizationTreeService.getOrganizationBommels(organizationId);

        // First bommel in the list is the root bommel
        const loadedRootBommel = bommels.length > 0 ? bommels[0] : null;
        if (loadedRootBommel && !rootBommel) {
            setRootBommel(loadedRootBommel);
        }

        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, loadedRootBommel?.id);

        // Add mock data for demonstration
        const nodesWithMockData = nodes
            .map((node) => {
                const depth = getNodeDepth(node, nodes);
                const baseMultiplier = Math.max(1, 5 - depth);

                return {
                    ...node,
                    data: {
                        ...node.data,
                        emoji: node.data?.emoji || '',
                        receiptsCount: Math.floor(Math.random() * 50 + 10) * baseMultiplier,
                        receiptsOpen: Math.floor(Math.random() * 10),
                        subBommelsCount: nodes.filter((n) => n.parent === node.id).length,
                        income: Math.floor(Math.random() * 3000 + 1000) * baseMultiplier,
                        expenses: -Math.floor(Math.random() * 200 + 50) * baseMultiplier,
                        revenue: 0,
                    },
                };
            })
            .map((node) => ({
                ...node,
                data: {
                    ...node.data!,
                    revenue: (node.data!.income || 0) + (node.data!.expenses || 0),
                },
            }));

        setTree(nodesWithMockData);
    }, [store.organization?.id, rootBommel, getNodeDepth]);

    const createTreeNode = useCallback(async () => {
        if (!rootBommel?.id) return;

        try {
            const node = await apiService.orgService.bommelPOST(
                new Bommel({
                    name: 'New item',
                    emoji: 'grey_question',
                    children: [],
                    parent: new Bommel({ id: rootBommel.id }),
                })
            );

            return organizationTreeService.bommelsToTreeNodes([node], rootBommel.id)[0];
        } catch (e) {
            console.error(e);
            showError('Failed to create.');
        }
    }, [rootBommel, showError]);

    const createChildBommel = useCallback(
        async (parentId: number) => {
            setIsLoading(true);
            try {
                await apiService.orgService.bommelPOST(
                    new Bommel({
                        name: 'New item',
                        emoji: 'grey_question',
                        children: [],
                        parent: new Bommel({ id: parentId }),
                    })
                );
                await loadTree();
                return true;
            } catch (e) {
                console.error(e);
                showError('Failed to create child bommel.');
            } finally {
                setIsLoading(false);
            }
            return false;
        },
        [loadTree, showError]
    );

    const updateTreeNode = useCallback(
        async (node: OrganizationTreeNodeModel) => {
            let isSuccess = false;
            setIsLoading(true);

            try {
                await apiService.orgService.bommelPUT(
                    node.id as number,
                    new Bommel({
                        name: node.text,
                        emoji: node.data?.emoji,
                        parent: new Bommel({ id: node.parent as number }),
                    })
                );
                isSuccess = true;
                await loadTree();
            } catch (e) {
                console.error(e);
                showError('Failed to update.');
            } finally {
                setIsLoading(false);
            }

            return isSuccess;
        },
        [loadTree, showError]
    );

    const moveTreeNode = useCallback(
        async (node: OrganizationTreeNodeModel) => {
            let isSuccess = false;
            setIsLoading(true);
            try {
                const parent = node.parent ? node.parent : rootBommel!.id;
                await apiService.orgService.to(node.id as number, parent as number);
                await loadTree();
                isSuccess = true;
            } catch (e) {
                console.error(e);
                showError('Failed to move bommel.');
            } finally {
                setIsLoading(false);
            }

            return isSuccess;
        },
        [loadTree, rootBommel, showError]
    );

    const deleteTreeNode = useCallback(
        async (id: string | number) => {
            setIsLoading(true);
            try {
                await apiService.orgService.bommelDELETE(id as number, false);
                await loadTree();
                return true;
            } catch (e) {
                console.error(e);
                showError('Failed to delete.');
            } finally {
                setIsLoading(false);
            }
            return false;
        },
        [loadTree, showError]
    );

    // Initialize and load tree when organization changes
    useEffect(() => {
        const organizationId = store.organization?.id;

        if (!organizationId) {
            setIsOrganizationError(true);
            setTree([]);
            return;
        }

        const initializeTree = async () => {
            // Ensure root bommel exists (creates it if needed)
            await organizationTreeService.ensureRootBommelCreated(organizationId);

            // Load all bommels including root
            await loadTree();
            setIsLoading(false);
        };

        initializeTree().catch(() => {
            setIsOrganizationError(true);
            setIsLoading(false);
        });
    }, [store.organization?.id, loadTree]);

    return {
        isOrganizationError,
        isLoading,
        rootBommel,
        tree,
        createTreeNode,
        createChildBommel,
        updateTreeNode,
        moveTreeNode,
        deleteTreeNode,
    };
}

export default useOrganizationTree;
