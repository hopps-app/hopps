import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bommel } from '@hopps/api-client';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { BommelTreeComponent } from '@/components/BommelTreeView';
import { ViewMode } from '@/components/BommelTreeView/types';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import organizationTreeService from '@/services/OrganisationTreeService.ts';
import { useStore } from '@/store/store.ts';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    const { showError } = useToast();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const loadTree = async () => {
        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel!.id!);
        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, rootBommel!.id);

        setTree(nodes);
    };

    const createTreeNode = async () => {
        try {
            const node = await apiService.orgService.bommelPOST(
                new Bommel({
                    name: 'New item',
                    emoji: 'grey_question',
                    children: [],
                    parent: new Bommel({ id: rootBommel!.id }),
                })
            );

            return organizationTreeService.bommelsToTreeNodes([node], rootBommel!.id)[0];
        } catch (e) {
            console.error(e);
            showError('Failed to create.');
        }
    };
    const updateTreeNode = async (node: OrganizationTreeNodeModel) => {
        let isSuccess = false;

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
            await apiService.orgService.to(node.id as number, parent as number);
            isSuccess = true;
        } catch (e) {
            console.error(e);
            showError('Failed to move bommel.');
        } finally {
            setIsLoading(false);
        }

        return isSuccess;
    };

    const deleteTreeNode = async (id: string | number) => {
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
            <Header title={t('settings.menu.organization')} icon="Backpack" />
            {isLoading && <LoadingOverlay />}

            {isOrganizationError ? (
                <div>{t('organization.settings.error')}</div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <h3>{t('organization.settings.structure')}:</h3>
                        <div className="flex gap-2">
                            <Button variant={viewMode === 'list' ? 'default' : 'outline'} icon="TriangleDown" onClick={() => setViewMode('list')}>
                                List View
                            </Button>
                            <Button variant={viewMode === 'tree' ? 'default' : 'outline'} icon="TriangleRight" onClick={() => setViewMode('tree')}>
                                Tree View
                            </Button>
                        </div>
                    </div>

                    {viewMode === 'list' ? (
                        <OrganizationTree
                            tree={tree}
                            editable={true}
                            selectable={false}
                            createNode={createTreeNode}
                            updateNode={updateTreeNode}
                            deleteNode={deleteTreeNode}
                            moveNode={moveTreeNode}
                        />
                    ) : (
                        <BommelTreeComponent
                            tree={tree}
                            rootBommel={rootBommel}
                            width={800}
                            height={500}
                            onNodeClick={(nodeData) => {
                                console.log('Node clicked:', nodeData);
                            }}
                        />
                    )}
                </>
            )}
        </>
    );
}

export default OrganizationSettingsView;
