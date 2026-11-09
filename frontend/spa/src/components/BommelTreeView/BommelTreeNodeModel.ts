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
    /** Balance at the start of the period; only set while the balance is shown. Total + carry-over = balance. */
    carryOver?: number;
    /** Opening balance of the bommel itself and its date (yyyy-MM-dd), if one is set */
    openingBalance?: number;
    openingBalanceDate?: string;
};

/** Flat tree node: `parent` is the parent's id, 0 for top-level Bommels under the root */
export type BommelTreeNodeModel = {
    id: number | string;
    parent: number | string;
    text: string;
    droppable?: boolean;
    data?: BommelTreeNodeData;
};
