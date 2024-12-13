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
    const { toast } = useToast();
    const { t } = useTranslation();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    // const savedTree = localStorage.getItem('organizationTree');
    // const saveTreeNodes = savedTree ? (JSON.parse(savedTree) as OrganizationTreeNodeModel[]) : [];
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

    const onTreeChanged = (newTree: OrganizationTreeNodeModel[]) => {
        setTree(newTree);
    };

    const onClickSave = async () => {
        // localStorage.setItem('organizationTree', JSON.stringify(tree));
        await organizationTreeService.saveOrganizationTree(tree, rootBommel!.id!);

        toast({ title: t('organizationSettings.saved'), variant: 'success' });
    };

    useEffect(() => {
        console.log('rootBommel changed', rootBommel);
        if (!rootBommel) {
            setTree([]);
            return;
        }

        //@todo load bommel tree
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
