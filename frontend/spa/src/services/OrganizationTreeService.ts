import * as _ from 'lodash';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import apiService from '@/services/ApiService.ts';

export class OrganizationTreeService {
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

    async ensureRootBommelCreated(slug: string): Promise<Bommel | undefined> {
        try {
            return await apiService.bommel.getRootBommel(slug);
        } catch (e) {
            console.error('Failed to load root bommel', e);
        }
    }
}

const organizationTreeService = new OrganizationTreeService();
export default organizationTreeService;
