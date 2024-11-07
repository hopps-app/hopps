import SettingsPageMenu from '@/components/SettingsPage/SettingsPageMenu.tsx';
import Icon from '@/components/ui/Icon.tsx';
import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';
import { ActiveTabContext } from '@/context/ActiveTabContext';

interface SettingsPageProps {
    menu: MenuItem[];
    activeTab: string;
    onActiveTabChanged: (value: string) => void;
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
        <ActiveTabContext.Provider value={{ activeTab: activeItem, setActiveTab: onActiveTabChanged }}>
            <div className="settings-page flex flex-row bg-white dark:bg-black/20 rounded shadow h-min-[calc(100vh-260px)]">
                <div className="settings-page__nav flex-shrink-0 w-[150px] md:w-[300px]  border-0 border-r-2 border-r-accent">
                    <div className="px-4 pt-4">
                        <h1 className="flex flex-row gap-2 h-10 items-center">
                            <Icon icon="HamburgerMenu" size="md" />
                            Menu
                        </h1>

                        <div className="py-4">
                            <hr />
                        </div>
                    </div>
                    <SettingsPageMenu items={menu} activeTab={activeTab} onChange={onChangeTab} />
                </div>
                <div className="settings-page__content w-full">
                    <div className="px-10 pt-4">{children}</div>
                </div>
            </div>
        </ActiveTabContext.Provider>
    );
}

export default SettingsPage;
