import React from 'react';

import Icon from '@/components/ui/Icon.tsx';
import { useActiveTab } from '@/context/ActiveTabContext.tsx';

interface SettingsPageHeaderProps {
    children?: React.ReactNode;
}

function SettingsPageHeader(props: SettingsPageHeaderProps) {
    const { activeTab } = useActiveTab();

    return (
        <>
            <div className="flex flex-row justify-between">
                <h1 className="flex flex-row gap-2 items-center h-10">
                    {activeTab?.icon && <Icon icon={activeTab.icon} size="md" />}
                    {activeTab?.title}
                </h1>

                <div>{props.children}</div>
            </div>
            <hr />
        </>
    );
}

export default SettingsPageHeader;
