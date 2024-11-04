import { NodeModel } from '@minoru/react-dnd-treeview';

export function getMaxId(tree: NodeModel[]): number {
    return tree.reduce((max, node) => Math.max(max, typeof node.id === 'number' ? node.id : parseInt(node.id)), 0);
}
