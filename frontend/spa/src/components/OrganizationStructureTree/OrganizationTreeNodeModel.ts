import { NodeModel } from '@minoru/react-dnd-treeview';

export type OrganizationTreeNodeData = {
    id?: number;
    emoji: string;
    isNew?: boolean;
    // Financial and statistics data
    receiptsCount?: number;
    receiptsOpen?: number;
    subBommelsCount?: number;
    income?: number;
    expenses?: number;
    revenue?: number;
};

export type OrganizationTreeNodeModel = NodeModel<OrganizationTreeNodeData>;
