/**
 * Helper to get the correct translation from a dynamic data field.
 *
 * @param {string|object} content - The content to translate (string or JSON object).
 * @param {string} lang - The current language code (e.g., 'id', 'en').
 * @returns {string} - The translated string.
 */
export const getTrans = (content, lang = "id") => {
    if (!content) return "";

    // If content is just a string, return it (backward compatibility or non-translated fields)
    if (typeof content === "string") {
        try {
            // Check if it's a JSON string
            const parsed = JSON.parse(content);
            if (typeof parsed === "object" && parsed !== null) {
                return (
                    parsed[lang] ||
                    parsed["id"] ||
                    parsed["en"] ||
                    Object.values(parsed)[0] ||
                    ""
                );
            }
        } catch (e) {
            return content;
        }
    }

    // If it's already an object (which it should be with our API change)
    if (typeof content === "object") {
        return (
            content[lang] ||
            content["id"] ||
            content["en"] ||
            Object.values(content)[0] ||
            ""
        );
    }

    return String(content);
};

/**
 * Helper to process notification interpolation parameters
 * and translate any embedded bilingual JSON objects.
 */
export const processTransParams = (params, lang = "id") => {
    if (!params || typeof params !== "object") return params;

    const processed = { ...params };
    for (const key in processed) {
        // If the value is a string that looks like a JSON dictionary, try parsing it
        if (
            typeof processed[key] === "string" &&
            processed[key].startsWith("{") &&
            processed[key].endsWith("}")
        ) {
            try {
                const parsed = JSON.parse(processed[key]);
                if (parsed && (parsed.id || parsed.en)) {
                    processed[key] = getTrans(parsed, lang);
                }
            } catch (e) {
                // Ignore parse errors (not a real JSON)
            }
        }
        // If it was already an object
        else if (
            typeof processed[key] === "object" &&
            processed[key] !== null
        ) {
            if (processed[key].id || processed[key].en) {
                processed[key] = getTrans(processed[key], lang);
            }
        }
    }
    return processed;
};
