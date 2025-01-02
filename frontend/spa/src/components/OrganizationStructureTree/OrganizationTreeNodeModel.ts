import { NodeModel } from '@minoru/react-dnd-treeview';

export type OrganizationTreeNodeData = {
    id?: number;
    emoji: string;
    isNew?: boolean;
};

export type OrganizationTreeNodeModel = NodeModel<OrganizationTreeNodeData>;
