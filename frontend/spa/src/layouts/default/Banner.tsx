import './Banner.scss';
import { useTranslation } from 'react-i18next';

function Banner() {
    const { t } = useTranslation();

    return (
        <div className="bg-purple-200">
            <div className="banner max-w-[50rem] mx-auto size-full text-center">
                <div className="banner__text">
                    {t('banner.text1')} <span className="font-semibold">{t('banner.text2')}</span>.
                </div>
            </div>
        </div>
    );
}

export default Banner;
