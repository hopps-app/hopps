import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import apiService from '@/services/ApiService.ts';

export class OrganizationTreeService {
    async saveOrganizationTree(tree: OrganizationTreeNodeModel[], rootBommelId: number) {
        console.log(tree);

        for (const node of tree) {
            await this.saveNodeRecursively(node, rootBommelId);
        }

        // tree.map((node) => this.saveNodeRecursively(node, rootBommelId));

        // tree.map((node) => {
        //     const bommel = this.treeNodeToBommel(node);
        //
        //     console.log(bommel);
        // });
    }

    protected async saveNodeRecursively(node: OrganizationTreeNodeModel, parentId: number) {
        let bommel = this.treeNodeToBommel(node);

        if (!bommel.id) {
            // save new bommel
            bommel = await apiService.bommel.createBommel({
                ...bommel,
                parent: { id: parentId },
            });
            console.log('BOMMEL CREATED', bommel);
        } else {
            bommel = await apiService.bommel.updateBommel(bommel.id!, { ...bommel, parent: { id: parentId } });
            console.log('BOMMEL UPDATED', bommel);
        }
    }

    treeNodeToBommel(node: OrganizationTreeNodeModel) {
        const bommel: Partial<Bommel> = {
            id: node.data?.id,
            name: node.text,
            emoji: node.data?.emoji,
            children: [],
        };

        return bommel;
    }
}

const organizationTreeService = new OrganizationTreeService();
export default organizationTreeService;
