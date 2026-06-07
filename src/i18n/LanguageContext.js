import * as React from "react";
import {
    DEFAULT_LANGUAGE,
    LANGUAGE_STORAGE_KEY,
    isSupportedLanguage,
    translate,
} from "./translations";

const LanguageContext = React.createContext({
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key, values) => translate(DEFAULT_LANGUAGE, key, values),
});

const readInitialLanguage = () => {
    if (typeof window === "undefined") {
        return DEFAULT_LANGUAGE;
    }

    try {
        const storedLanguage =
            window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

        return isSupportedLanguage(storedLanguage)
            ? storedLanguage
            : DEFAULT_LANGUAGE;
    } catch (error) {
        return DEFAULT_LANGUAGE;
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = React.useState(readInitialLanguage);

    const setLanguage = React.useCallback((nextLanguage) => {
        const normalizedLanguage = isSupportedLanguage(nextLanguage)
            ? nextLanguage
            : DEFAULT_LANGUAGE;

        setLanguageState(normalizedLanguage);

        try {
            window.localStorage.setItem(
                LANGUAGE_STORAGE_KEY,
                normalizedLanguage,
            );
        } catch (error) {
            // The language selector should keep working even if localStorage fails.
        }
    }, []);

    const t = React.useCallback(
        (key, values = {}) => translate(language, key, values),
        [language],
    );

    const value = React.useMemo(
        () => ({
            language,
            setLanguage,
            t,
        }),
        [language, setLanguage, t],
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => React.useContext(LanguageContext);
