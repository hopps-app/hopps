import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { HintBanner } from './HintBanner';

export function EditModeBanner() {
    const { t } = useTranslation();

    return (
        <HintBanner icon={Info} compact>
            {t('bommel.editModeHint')}
        </HintBanner>
    );
}

export default EditModeBanner;
