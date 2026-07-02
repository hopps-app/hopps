import { BankAccountResponse } from '@hopps/api-client';
import { Landmark, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { BankAccountDrawer } from '@/components/BankAccounts/BankAccountDrawer';
import Button from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/use-page-title';
import { useBankAccounts } from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number | undefined, currency = 'EUR'): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

function ColorChip({ color }: { color?: string }) {
    if (!color) return null;
    return (
        <span
            className="inline-block w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
        />
    );
}

function BankAccountCard({ account, onClick }: { account: BankAccountResponse; onClick: () => void }) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-[20px] shadow border border-gray-100 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-primary/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full"
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <ColorChip color={account.color} />
                    <span className="font-semibold text-base truncate">{account.name}</span>
                </div>
                <span
                    className={cn(
                        'text-lg font-bold flex-shrink-0',
                        (account.balance ?? account.openingBalance ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                    )}
                >
                    {formatCurrency(account.balance ?? account.openingBalance, account.currency ?? 'EUR')}
                </span>
            </div>

            {account.iban && (
                <p className="text-sm text-muted-foreground font-mono truncate mb-1">
                    {account.iban}
                </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {account.currency && (
                    <span className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5">{account.currency}</span>
                )}
                {account.bommelName && (
                    <span className="truncate">{account.bommelName}</span>
                )}
                {account.defaultSchemaName && (
                    <span className="truncate">{t('bankAccounts.card.schema')}: {account.defaultSchemaName}</span>
                )}
            </div>
        </button>
    );
}

export function BankAccountsView() {
    const { t } = useTranslation();
    usePageTitle(t('bankAccounts.title'), 'CardStack');
    const navigate = useNavigate();
    const { data: accounts = [], isLoading, refetch } = useBankAccounts(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl">
            <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">{t('bankAccounts.subtitle')}</p>
                <Button icon="Plus" onClick={() => setDrawerOpen(true)}>
                    <span className="hidden sm:inline">{t('bankAccounts.newAccount')}</span>
                    <span className="sm:hidden"><Plus className="w-4 h-4" /></span>
                </Button>
            </div>

            {isLoading ? (
                <div className="py-12">
                    <LoadingState size="lg" />
                </div>
            ) : accounts.length === 0 ? (
                <EmptyState
                    title={t('bankAccounts.emptyState.title')}
                    description={t('bankAccounts.emptyState.description')}
                    icon={Landmark}
                    action={{ label: t('bankAccounts.newAccount'), onClick: () => setDrawerOpen(true) }}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                        <BankAccountCard
                            key={account.id}
                            account={account}
                            onClick={() => navigate(`/bank-accounts/${account.id}`)}
                        />
                    ))}
                </div>
            )}

            <BankAccountDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onSuccess={() => {
                    refetch();
                    setDrawerOpen(false);
                }}
            />
        </div>
    );
}

export default BankAccountsView;
