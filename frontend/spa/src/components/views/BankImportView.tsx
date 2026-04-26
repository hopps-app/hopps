import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ImportWizard } from '@/components/BankAccounts/ImportWizard';
import Button from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/use-page-title';

export function BankImportView() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const accountId = Number(id);
    const navigate = useNavigate();

    usePageTitle(t('bankImport.title'), 'Upload');

    return (
        <div className="flex flex-col gap-4 max-w-screen-lg">
            <div>
                <button
                    type="button"
                    onClick={() => navigate(`/bank-accounts/${accountId}`)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('bankAccounts.title')}
                </button>
            </div>

            <ImportWizard accountId={accountId} />
        </div>
    );
}

export default BankImportView;
