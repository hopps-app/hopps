import * as _ from 'lodash';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import apiService from '@/services/ApiService.ts';

export class OrganizationTreeService {
    private savedNodesMap = new Map<number, number>();

    async saveOrganizationTree(tree: OrganizationTreeNodeModel[], rootBommelId: number, originalBommelsMap: Map<number, Bommel>) {
        this.savedNodesMap.clear();

        // create and update bommels
        for (const node of tree) {
            let parentBommelId = rootBommelId;
            const nodeParentId = node.parent as number;
            if (nodeParentId !== 0) {
                const parentNode = tree.find((n) => n.id === nodeParentId);
                if (parentNode) {
                    parentBommelId = (parentNode.data?.id || parentNode.id) as number;
                }
            }

            await this.saveTreeNode(node, parentBommelId, originalBommelsMap);
        }

        // Collect IDs to delete
        const treeIds = new Set(tree.map((node) => node.id));
        const idsToDelete: number[] = [];

        for (const id of originalBommelsMap.keys()) {
            if (!treeIds.has(id)) {
                idsToDelete.push(id);
            }
        }

        if (idsToDelete.length) {
            await Promise.allSettled(idsToDelete.map((id) => apiService.bommel.deleteBommel(id)));
        }
    }

    async getOrganizationBommels(rootBommelId: number): Promise<Bommel[]> {
        const items = await apiService.bommel.getBommelChildrenRecursive(rootBommelId);
        const bommelsWithDepth: (Bommel & { depth: number })[] = [];

        items.forEach((item) => {
            bommelsWithDepth.push({ ...item.bommel, depth: 0 });
        });

        bommelsWithDepth.sort((a, b) => a.depth - b.depth);

        return (
            bommelsWithDepth.map((item) => {
                return _.omit(item, 'depth');
            }) || []
        );
    }

    bommelsToTreeNodes(bommels: Bommel[], rootBommelId: number): OrganizationTreeNodeModel[] {
        return bommels.map((bommel) => {
            return this.bommelToTreeNode(bommel, bommel.parent?.id && bommel.parent.id !== rootBommelId ? bommel.parent.id : 0);
        });
    }

    sortTreeByDepth(tree: OrganizationTreeNodeModel[]): OrganizationTreeNodeModel[] {
        const nodeMap = new Map<number, OrganizationTreeNodeModel[]>();

        // Group nodes by parent ID
        tree.forEach((node) => {
            const parent = node.parent as number;
            if (!nodeMap.has(parent)) {
                nodeMap.set(parent, []);
            }
            nodeMap.get(parent)!.push(node);
        });

        const sortedTree: OrganizationTreeNodeModel[] = [];
        const queue: OrganizationTreeNodeModel[] = nodeMap.get(0) || [];

        // Process nodes level by level
        while (queue.length > 0) {
            const node = queue.shift()!;
            sortedTree.push(node);

            if (nodeMap.has(node.id as number)) {
                queue.push(...nodeMap.get(node.id as number)!);
            }
        }

        return sortedTree;
    }

    compareBommels(bommel1: Partial<Bommel>, bommel2: Partial<Bommel>) {
        return bommel1.id === bommel2.id && bommel1.name === bommel2.name && bommel1.emoji === bommel2.emoji && bommel1.parent?.id === bommel2.parent?.id;
    }

    protected async saveTreeNode(node: OrganizationTreeNodeModel, parentId: number, originalBommelsMap: Map<number, Bommel>) {
        let bommel = this.treeNodeToBommel(node, parentId);

        if (!bommel.id) {
            // save new bommel
            bommel = await apiService.bommel.createBommel(bommel);
            node.data = { id: bommel.id, emoji: bommel.emoji || '' };
        } else {
            // update existing bommel
            const original = originalBommelsMap.get(bommel.id!);
            const isChanged = !(original && this.compareBommels(bommel, original));
            const isMoved = isChanged && bommel.parent?.id !== original?.parent?.id;

            if (isChanged) {
                const moveTo = isMoved ? bommel.parent?.id : undefined;
                bommel = await apiService.bommel.updateBommel(bommel.id!, _.omit(bommel, ['parent', 'children']));
                if (isMoved && moveTo) {
                    await apiService.bommel.moveBommel(bommel.id!, moveTo);
                }
            }
        }
    }

    protected treeNodeToBommel(node: OrganizationTreeNodeModel, parentId?: number): Partial<Bommel> {
        return {
            id: node.data?.id,
            name: node.text,
            emoji: node.data?.emoji,
            children: [],
            parent: parentId ? { id: parentId } : undefined,
        };
    }

    protected bommelToTreeNode(bommel: Bommel, parentId?: number) {
        const node: OrganizationTreeNodeModel = {
            id: bommel.id!,
            parent: parentId || 0,
            text: bommel.name,
            droppable: true,
            data: { emoji: bommel.emoji, id: bommel.id },
        };

        return node;
    }

    async ensureRootBommelCreated(organizationId: number): Promise<Bommel> {
        const loadRootBommel = async () => {
            return await apiService.bommel.getRootBommel(organizationId);
        };

        const createRootBommel = async () => {
            return await apiService.bommel.createRootBommel({
                organizationId,
                name: 'root',
                emoji: '',
                children: [],
                parent: undefined,
            });
        };

        try {
            let rootBommel = await loadRootBommel().catch(() => undefined);
            if (!rootBommel) {
                rootBommel = await createRootBommel();
            }

            return rootBommel;
        } catch (e) {
            console.error('Failed to load root bommel', e);
            return await createRootBommel();
        }
    }
}

const organizationTreeService = new OrganizationTreeService();
export default organizationTreeService;
