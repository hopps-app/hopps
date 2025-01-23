import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { useStore } from '@/store/store.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import organizationTreeService from '@/services/OrganizationTreeService.ts';
import apiService from '@/services/ApiService.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { useToast } from '@/hooks/use-toast.ts';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    const { showError } = useToast();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

    const loadTree = async () => {
        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel!.id!);
        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, rootBommel!.id);

        setTree(nodes);
    };

    const createTreeNode = async () => {
        try {
            const node = await apiService.bommel.createBommel({
                name: 'New item',
                emoji: 'grey_question',
                children: [],
                parent: { id: rootBommel!.id },
            });
            return organizationTreeService.bommelsToTreeNodes([node], rootBommel!.id)[0];
        } catch (e) {
            console.error(e);
            showError('Failed to create.');
        }
    };
    const updateTreeNode = async (node: OrganizationTreeNodeModel) => {
        let isSuccess = false;

        try {
            await apiService.bommel.updateBommel(node.id as number, {
                name: node.text,
                emoji: node.data?.emoji,
                parent: { id: node.parent as number },
            });
            isSuccess = true;
        } catch (e) {
            console.error(e);
            showError('Failed to update.');
        }

        return isSuccess;
    };

    const moveTreeNode = async (node: OrganizationTreeNodeModel) => {
        let isSuccess = false;
        setIsLoading(true);
        try {
            const parent = node.parent ? node.parent : rootBommel!.id;
            await apiService.bommel.moveBommel(node.id as number, parent as number);
            isSuccess = true;
        } catch (e) {
            console.error(e);
            showError('Failed to move bommel.');
        }
        setIsLoading(false);

        return isSuccess;
    };

    const deleteTreeNode = async (id: string | number) => {
        setIsLoading(true);
        try {
            await apiService.bommel.deleteBommel(id as number);
            await loadTree();
            return true;
        } catch (e) {
            console.error(e);
            showError('Failed to delete.');
        }
        setIsLoading(false);
        return false;
    };

    useEffect(() => {
        if (!rootBommel) {
            setTree([]);
            return;
        }

        loadTree().then(() => {
            setIsLoading(false);
        });
    }, [rootBommel]);

    useEffect(() => {
        const organization = store.organization;

        if (!organization?.id) {
            setIsOrganizationError(true);
            return;
        }

        organizationTreeService.ensureRootBommelCreated(organization.id).then((bommel) => {
            if (bommel) {
                setRootBommel(bommel);
            } else {
                setIsOrganizationError(true);
            }
        });
    }, []);

    return (
        <>
            <SettingsPageHeader />
            {isLoading && <LoadingOverlay />}

            {isOrganizationError ? (
                <div>{t('organization.settings.error')}</div>
            ) : (
                <>
                    <h3>Structure:</h3>
                    <h3>{t('organization.settings.structure')}:</h3>
                    <OrganizationTree
                        tree={tree}
                        editable={true}
                        selectable={false}
                        createNode={createTreeNode}
                        updateNode={updateTreeNode}
                        deleteNode={deleteTreeNode}
                        moveNode={moveTreeNode}
                    />
                </>
            )}
        </>
    );
}

export default OrganizationSettingsView;
