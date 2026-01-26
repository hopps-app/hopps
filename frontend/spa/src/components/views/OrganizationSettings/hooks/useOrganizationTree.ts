import { Bommel, BommelStatisticsMap } from '@hopps/api-client';
import { useCallback, useEffect, useState } from 'react';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import organizationTreeService from '@/services/OrganisationTreeService';
import { useStore } from '@/store/store';

interface UseOrganizationTreeOptions {
    bommelStats?: BommelStatisticsMap | null;
}

export function useOrganizationTree(options?: UseOrganizationTreeOptions) {
    const { showError } = useToast();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

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

        // Add statistics data from API (or fallback to zero values)
        // Note: JSON object keys are always strings, so we need to access by string key
        const nodesWithStats = nodes.map((node) => {
            const nodeId = node.id as number;
            const stats = options?.bommelStats?.statistics?.[String(nodeId)];

            return {
                ...node,
                data: {
                    ...node.data,
                    emoji: node.data?.emoji || '',
                    total: stats?.total ?? 0,
                    income: stats?.income ?? 0,
                    expenses: stats?.expenses ?? 0,
                    transactionsCount: stats?.transactionsCount ?? 0,
                    subBommelsCount: nodes.filter((n) => n.parent === node.id).length,
                },
            };
        });

        setTree(nodesWithStats);
    }, [store.organization?.id, rootBommel, options?.bommelStats]);

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
