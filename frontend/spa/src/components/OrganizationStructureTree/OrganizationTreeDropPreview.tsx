import type { DragLayerMonitorProps } from '@minoru/react-dnd-treeview';

type Props = {
    monitorProps: DragLayerMonitorProps<unknown>;
};

function OrganizationTreeDropPreview(props: Props) {
    const item = props.monitorProps.item;

    return (
        <div className="flex">
            <div className="bg-primary text-primary-foreground px-1 rounded shadow">{item.text}</div>
        </div>
    );
}

export default OrganizationTreeDropPreview;
