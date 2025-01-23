import { useEffect, useState } from 'react';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import organizationTreeService from '@/services/OrganizationTreeService.ts';
import { Bommel } from '@/services/api/types/Bommel.ts';
import { useStore } from '@/store/store.ts';

interface Props {
    onChange: (id: number) => void;
    className?: string;
}

const InvoiceUploadFormBommelSelector: React.FC<Props> = ({ onChange, className }: Props) => {
    const store = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel] = useState<Bommel | null>(store.organization?.rootBommel || null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);

    const loadTree = async () => {
        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel!.id!);
        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, rootBommel!.id);

        setTree(nodes);
    };

    const onSelectBommel = (id: number) => {
        onChange(id);
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
    return (
        <div className={className}>
            {isLoading ? 'Loading...' : <OrganizationTree tree={tree} editable={false} selectable={true} onSelect={onSelectBommel} />}
        </div>
    );
};

export default InvoiceUploadFormBommelSelector;
