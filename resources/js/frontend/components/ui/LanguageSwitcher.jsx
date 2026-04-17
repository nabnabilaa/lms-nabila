import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'id' ? 'en' : 'id';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm font-medium"
            title="Ganti Bahasa / Switch Language"
        >
            <Globe className="w-4 h-4" />
            <span>{i18n.language === 'id' ? 'ID' : 'EN'}</span>
        </button>
    );
};

export default LanguageSwitcher;
