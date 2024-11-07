import { useState } from 'react';
import { NodeModel } from '@minoru/react-dnd-treeview';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import Button from '@/components/ui/Button.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';

function OrganizationSettingsView() {
    const savedTree = localStorage.getItem('organizationTree');
    const saveTreeNodes = savedTree ? (JSON.parse(savedTree) as NodeModel[]) : [];

    const [tree, setTree] = useState<NodeModel[]>(saveTreeNodes);

    const onTreeChanged = (newTree: NodeModel[]) => {
        setTree(newTree);
    };

    const onClickSave = () => {
        localStorage.setItem('organizationTree', JSON.stringify(tree));
    };

    return (
        <>
            <SettingsPageHeader>
                <Button onClick={onClickSave}>Save</Button>
            </SettingsPageHeader>
            <div className="flex flex-row">
                <div className="w-full"></div>
                <div className="shrink-0 w-[400px]">
                    <h3>Structure:</h3>
                    <OrganizationTree tree={tree} onTreeChanged={onTreeChanged} />
                </div>
            </div>
        </>
    );
}

export default OrganizationSettingsView;
