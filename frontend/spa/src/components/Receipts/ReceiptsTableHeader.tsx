import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const ReceiptsTableHeader: FC = () => {
    const { t } = useTranslation();

    return (
        <div className="hidden md:block rounded-[10px] border border-[var(--purple-300)] bg-[var(--purple-50)] overflow-hidden shadow-sm">
            <div className="grid grid-cols-[24px_2fr_1fr_1fr_1fr_100px_100px_48px] items-center gap-1 px-5 py-3">
                <span></span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider">{t('receipts.table.issuer')}</span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider">{t('receipts.table.date')}</span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider">{t('receipts.table.project')}</span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider">{t('receipts.table.category')}</span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider pl-0.5">{t('receipts.table.status')}</span>
                <span className="text-xs font-bold text-[var(--purple-900)] uppercase tracking-wider text-right">{t('receipts.table.amount')}</span>
                <span></span>
            </div>
        </div>
    );
};

export default ReceiptsTableHeader;
