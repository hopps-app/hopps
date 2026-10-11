export type BommelTreeNodeData = {
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

/** Flat tree node: `parent` is the parent's id, 0 for top-level Bommels under the root */
export type BommelTreeNodeModel = {
    id: number | string;
    parent: number | string;
    text: string;
    droppable?: boolean;
    data?: BommelTreeNodeData;
};
