import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import Button from '@/components/ui/Button.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useStore } from '@/store/store.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import organizationTreeService from '@/services/OrganizationTreeService.ts';

function OrganizationSettingsView() {
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(true);
        const sortedTree = organizationTreeService.sortTreeByDepth(tree);
        try {
            await organizationTreeService.saveOrganizationTree(sortedTree, rootBommel!.id!, originalBommels);
            await loadTree();
            showSuccess(t('organization.settings.saved'));
        } catch (e) {
            console.error(e);
            showError(t('organization.settings.saveError'));
        } finally {
            console.log('Finally');
            setIsLoading(false);
        }
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

    console.log('RENDER', isLoading);

    return (
        <>
            <SettingsPageHeader>
                {!isOrganizationError && (
                    <Button onClick={onClickSave} disabled={isLoading}>
                        Save
                    </Button>
                )}
            </SettingsPageHeader>

            {isOrganizationError ? (
                <div>{t('organization.settings.error')}</div>
            ) : (
                <>
                    <h3>Structure:</h3>
                    <OrganizationTree tree={tree} onTreeChanged={onTreeChanged} />
                </>
            )}
        </>
    );
}

export default OrganizationSettingsView;
