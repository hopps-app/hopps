import List from '@/components/ui/List/List.tsx';

interface MenuItem {
    title: string;
    value: string;
}

interface SettingsPageMenuProps {
    items: MenuItem[];
    activeTab: string;
    onChange: (value: string) => void;
}

function SettingsPageMenu({ items, activeTab, onChange }: SettingsPageMenuProps) {
    const listItems = items.map((item, index) => ({
        id: item.title + index,
        title: item.title,
        onClick: () => onChange(item.value),
        active: activeTab === item.value,
    }));

    return <List items={listItems} />;
}

export default SettingsPageMenu;
