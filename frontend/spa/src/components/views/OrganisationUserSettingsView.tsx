import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/store/store';
import apiService from '@/services/ApiService';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader';

type Member = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
};

const OrganisationUserSettingsView = () => {
    const { t } = useTranslation();
    const organization = useStore((state) => state.organization);
    const user = useStore((state) => state.user);
    const [members, setMembers] = useState<Member[]>([]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!organization?.slug) return;
            try {
                const data = await apiService.organization.getOrganizationMembers(organization.slug);
                setMembers(data);
            } catch (e) {
                setMembers([]);
            }
        };
        fetchMembers();
    }, [organization]);

    return (
        <>
            <SettingsPageHeader />
            <div className="rounded">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-black/10">
                                <th className="px-4 py-2 text-left rounded-tl-xl">{t('userManagement.user')}</th>
                                <th className="px-4 py-2 text-left">{t('userManagement.role')}</th>
                                <th className="px-4 py-2 text-left rounded-tr-xl text-right">{t('userManagement.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <tr key={member.id} className="border-b last:border-b-0 hover:bg-accent/30">
                                    <td className="px-4 py-2">
                                        {member.firstName} {member.lastName}
                                        {user?.email === member.email && <span className="ml-2 text-xs text-gray-500">({t('userManagement.you')})</span>}
                                    </td>
                                    <td className="px-4 py-2">{member.role || 'Member'}</td>
                                    <td className="px-4 py-2 flex gap-2 justify-end text-right">
                                        <button className="hover:text-primary">
                                            <Icon icon="Pencil1" />
                                        </button>
                                        {user?.email !== member.email && (
                                            <button className="hover:text-destructive">
                                                <Icon icon="Trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-8">
                    <Button icon="Plus" className="bg-primary text-white" style={{ background: '#8e5be8' }}>
                        {t('userManagement.addUser')}
                    </Button>
                </div>
            </div>
        </>
    );
};

export default OrganisationUserSettingsView;
