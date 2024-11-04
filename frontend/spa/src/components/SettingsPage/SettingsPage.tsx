import SettingsPageMenu from '@/components/SettingsPage/SettingsPageMenu.tsx';

interface MenuItem {
    title: string;
    value: string;
}

interface SettingsPageProps {
    menu: MenuItem[];
    activeTab: string;
    onActiveTabChanged?: (value: string) => void;
    children: React.ReactNode;
}

function SettingsPage({ activeTab, menu, children, onActiveTabChanged }: SettingsPageProps) {
    const activeItem = menu.find((item) => item.value === activeTab);
    const onChangeTab = (value: string) => {
        if (onActiveTabChanged) {
            onActiveTabChanged(value);
        }
    };

    return (
        <div className="settings-page flex flex-row bg-white dark:bg-black/20 rounded shadow h-[calc(100vh-260px)]">
            <div className="settings-page__nav flex-shrink-0 w-[300px] border-0 border-r-2 border-r-accent">
                <SettingsPageMenu items={menu} activeTab={activeTab} onChange={onChangeTab} />
            </div>
            <div className="settings-page__content w-full">
                <div className="px-10 pt-4">
                    <h1 className="text-center">{activeItem?.title}</h1>
                    <div className="py-4">
                        <hr />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
