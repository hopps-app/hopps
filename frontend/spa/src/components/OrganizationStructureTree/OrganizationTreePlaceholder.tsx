import { NodeModel } from '@minoru/react-dnd-treeview';

type Props = {
    node: NodeModel;
    depth: number;
};

function OrganizationTreePlaceholder(props: Props) {
    return <div className="absolute bg-primary top-0 right-0 h-1 transform-[translateY(-50%)]" style={{ left: props.depth * 24 }}></div>;
}

export default OrganizationTreePlaceholder;
