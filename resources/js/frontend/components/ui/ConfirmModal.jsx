import React from "react";
import ReactDOM from "react-dom";
import { AlertTriangle, Trash2, Info, Check, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    message,
    title,
    variant = "danger",
    confirmLabel,
    cancelLabel,
    icon = null,
}) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const VARIANTS = {
        danger: {
            accentBg: "bg-red-100 dark:bg-red-900/30",
            accentBorder: "border-red-500",
            icon: icon || <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />,
            confirmClass: "bg-red-600 hover:bg-red-700 shadow-red-500/30",
            titleDefault: t('modal.confirm_delete'),
            confirmDefault: t('modal.yes_delete'),
        },
        warning: {
            accentBg: "bg-yellow-100 dark:bg-yellow-900/10",
            accentBorder: "border-yellow-400",
            icon: icon || <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />,
            confirmClass: "bg-yellow-500 hover:bg-yellow-600 shadow-yellow-400/20",
            titleDefault: t('modal.warning'),
            confirmDefault: t('modal.yes_proceed'),
        },
        info: {
            accentBg: "bg-blue-100 dark:bg-blue-900/10",
            accentBorder: "border-blue-500",
            icon: icon || <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
            confirmClass: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
            titleDefault: t('common.confirm'),
            confirmDefault: t('modal.yes_proceed'),
        },
        confirm: {
            accentBg: "bg-green-100 dark:bg-green-900/10",
            accentBorder: "border-green-500",
            icon: icon || <Check className="h-8 w-8 text-green-600 dark:text-green-400" />,
            confirmClass: "bg-green-600 hover:bg-green-700 shadow-green-500/20",
            titleDefault: t('modal.save_changes'),
            confirmDefault: t('modal.yes_save'),
        },
    };

    const v = VARIANTS[variant] || VARIANTS.danger;
    const finalTitle = title || v.titleDefault;
    const finalConfirmLabel = confirmLabel || v.confirmDefault;
    const cLabel = cancelLabel || t('common.cancel');

    // Use Portal to render at document body level for full-screen backdrop
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-t-8 ${v.accentBorder} animate-in zoom-in duration-200`}
            >
                <div className="p-8 text-center">
                    <div
                        className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${v.accentBg} mb-6`}
                    >
                        {v.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{finalTitle}</h3>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        {message}
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            {cLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-6 py-3 text-base font-medium text-white rounded-xl flex items-center gap-2 transition shadow-lg ${v.confirmClass}`}
                        >
                            {variant === "danger" && <Trash2 className="w-5 h-5" />}
                            {finalConfirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
