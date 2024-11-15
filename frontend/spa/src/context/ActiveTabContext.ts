import { createContext, useContext } from 'react';

import { MenuItem } from '@/components/SettingsPage/MenuItem.ts';

interface ActiveTabContextProps {
    activeTab?: MenuItem;
    setActiveTab: (value: string) => void;
}

export const ActiveTabContext = createContext<ActiveTabContextProps>({
    activeTab: undefined,
    setActiveTab: () => {},
});

export const useActiveTab = () => {
    const context = useContext(ActiveTabContext);
    if (!context) {
        throw new Error('useActiveTab must be used within an ActiveTabProvider');
    }
    return context;
};
