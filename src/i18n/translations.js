export const DEFAULT_LANGUAGE = "es";

export const LANGUAGE_STORAGE_KEY = "draw-er-language";

export const SUPPORTED_LANGUAGES = [
    {
        code: "es",
        labelKey: "language.optionSpanish",
    },
    {
        code: "en",
        labelKey: "language.optionEnglish",
    },
];

export const TRANSLATIONS = {
    es: {
        "app.buildLabel": "Compilacion: {{date}}",

        "language.sectionTitle": "Idioma",
        "language.label": "Idioma",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",
    },
    en: {
        "app.buildLabel": "Build: {{date}}",

        "language.sectionTitle": "Language",
        "language.label": "Language",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",
    },
};

export const isSupportedLanguage = (language) =>
    SUPPORTED_LANGUAGES.some(
        (supportedLanguage) => supportedLanguage.code === language,
    );

const interpolate = (text, values = {}) =>
    Object.entries(values).reduce(
        (result, [key, value]) =>
            result.split(`{{${key}}}`).join(String(value)),
        text,
    );

export const translate = (language, key, values = {}) => {
    const selectedLanguage = isSupportedLanguage(language)
        ? language
        : DEFAULT_LANGUAGE;

    const translatedText =
        TRANSLATIONS[selectedLanguage]?.[key] ??
        TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ??
        key;

    return interpolate(translatedText, values);
};
