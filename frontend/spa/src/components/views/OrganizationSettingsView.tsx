import { useState } from 'react';
import { NodeModel } from '@minoru/react-dnd-treeview';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';

function OrganizationSettingsView() {
    const savedTree = localStorage.getItem('organizationTree');
    const saveTreeNodes = savedTree ? (JSON.parse(savedTree) as NodeModel[]) : [];

    const [tree, setTree] = useState<NodeModel[]>(saveTreeNodes);

    const onTreeChanged = (newTree: NodeModel[]) => {
        setTree(newTree);

        localStorage.setItem('organizationTree', JSON.stringify(newTree));
    };

    return (
        <div>
            OrganizationSettingsView
            <OrganizationTree tree={tree} onTreeChanged={onTreeChanged} />
        </div>
    );
}

export default OrganizationSettingsView;
