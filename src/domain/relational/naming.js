const accentMap = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    Á: "A",
    É: "E",
    Í: "I",
    Ó: "O",
    Ú: "U",
    ä: "a",
    ë: "e",
    ï: "i",
    ö: "o",
    ü: "u",
    Ä: "A",
    Ë: "E",
    Ï: "I",
    Ö: "O",
    Ü: "U",
    à: "a",
    è: "e",
    ì: "i",
    ò: "o",
    ù: "u",
    À: "A",
    È: "E",
    Ì: "I",
    Ò: "O",
    Ù: "U",
    â: "a",
    ê: "e",
    î: "i",
    ô: "o",
    û: "u",
    Â: "A",
    Ê: "E",
    Î: "I",
    Ô: "O",
    Û: "U",
    ã: "a",
    õ: "o",
    ñ: "n",
    Ã: "A",
    Õ: "O",
    Ñ: "N",
    å: "a",
    Å: "A",
    ç: "c",
    Ç: "C",
};

// Converts user-facing names into simple SQL identifiers by removing supported
// accents and replacing whitespace with underscores.
export const normalizeIdentifier = (name) => {
    return name
        .split("")
        .map((char) => accentMap[char] || char)
        .join("")
        .replace(/\s+/g, "_");
};
