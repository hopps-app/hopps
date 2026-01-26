import { NodeModel } from '@minoru/react-dnd-treeview';

export type OrganizationTreeNodeData = {
    id?: number;
    emoji: string;
    isNew?: boolean;
    isRoot?: boolean;
    // Financial and statistics data
    total?: number;
    income?: number;
    expenses?: number;
    transactionsCount?: number;
    subBommelsCount?: number;
};

export type OrganizationTreeNodeModel = NodeModel<OrganizationTreeNodeData>;
