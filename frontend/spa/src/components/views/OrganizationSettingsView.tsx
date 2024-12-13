import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import Button from '@/components/ui/Button.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import { useStore } from '@/store/store.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import organizationTreeService from '@/services/OrganizationTreeService.ts';

function OrganizationSettingsView() {
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [originalBommels, setOriginalBommels] = useState<Map<number, Bommel>>(new Map());
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

    const loadTree = async () => {
        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel!.id!);
        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, rootBommel!.id);

        setOriginalBommels(new Map<number, Bommel>(bommels.map((bommel) => [bommel.id, bommel])));
        setTree(nodes);
    };

    const onTreeChanged = (newTree: OrganizationTreeNodeModel[]) => {
        setTree(newTree);
    };

    const onClickSave = async () => {
        const sortedTree = organizationTreeService.sortTreeByDepth(tree);
        try {
            await organizationTreeService.saveOrganizationTree(sortedTree, rootBommel!.id!, originalBommels);
            showSuccess(t('organization.settings.saved'));
        } catch (e) {
            console.error(e);
            showError(t('organization.settings.saveError'));
        }
    };

    useEffect(() => {
        if (!rootBommel) {
            setTree([]);
            return;
        }

        loadTree();
    }, [rootBommel]);

    useEffect(() => {
        const organization = store.organization;

        if (!organization?.id) {
            setIsOrganizationError(true);
            return;
        }

        const loadRootBommel = async () => {
            return await apiService.bommel.getRootBommel(organization.id);
        };
        const createRootBommel = async () => {
            return await apiService.bommel.createRootBommel({
                organization: { id: organization.id },
                name: 'root',
                emoji: '',
                children: [],
                parent: undefined,
            });
        };

        loadRootBommel().then(async (rootBommel) => {
            console.log('ROOT', rootBommel);

            if (rootBommel) {
                setRootBommel(rootBommel);
                return;
            }

            await createRootBommel().then((rootBommel) => {
                setRootBommel(rootBommel);
            });
        });
    }, []);

    return (
        <>
            <SettingsPageHeader>
                <Button onClick={onClickSave}>Save</Button>
            </SettingsPageHeader>

            <h3>Structure:</h3>
            {isOrganizationError ? <div>Error</div> : <OrganizationTree tree={tree} onTreeChanged={onTreeChanged} />}
        </>
    );
}

export default OrganizationSettingsView;
