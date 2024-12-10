import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import Button from '@/components/ui/Button.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { useToast } from '@/hooks/use-toast.ts';

function OrganizationSettingsView() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const savedTree = localStorage.getItem('organizationTree');
    const saveTreeNodes = savedTree ? (JSON.parse(savedTree) as OrganizationTreeNodeModel[]) : [];

    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>(saveTreeNodes);

    const onTreeChanged = (newTree: OrganizationTreeNodeModel[]) => {
        setTree(newTree);
    };

    const onClickSave = () => {
        localStorage.setItem('organizationTree', JSON.stringify(tree));

        toast({ title: t('organizationSettings.saved'), variant: 'success' });
    };

    return (
        <>
            <SettingsPageHeader>
                <Button onClick={onClickSave}>Save</Button>
            </SettingsPageHeader>

            <h3>Structure:</h3>
            <OrganizationTree tree={tree} onTreeChanged={onTreeChanged} />
        </>
    );
}

export default OrganizationSettingsView;
