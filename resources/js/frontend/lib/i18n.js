import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import commonID from "../locales/id/common.json";
import commonEN from "../locales/en/common.json";

// Configure standard resources
const resources = {
    id: {
        common: commonID,
    },
    en: {
        common: commonEN,
    },
};

i18n
    // detect user language
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    .init({
        resources,
        fallbackLng: "id", // Default language
        lng: "id", // Force start with ID (optional, removable if using detector fully)
        debug: true, // Enable debug for development
        ns: ["common"],
        defaultNS: "common",

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
        },
    });

export default i18n;
