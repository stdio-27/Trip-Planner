/**
 * Scans text for balanced-brace JSON object candidates.
 * Respects string literals and escape sequences.
 * Tries each top-level object candidate in order, returning the first one that JSON.parse accepts.
 *
 * @param {string} text - Raw model response text
 * @returns {Record<string, any>|null} - Parsed JSON object, or null if no valid candidate found
 */
export function extractJson(text) {
  if (typeof text !== "string") {
    return null;
  }

  const length = text.length;

  for (let i = 0; i < length; i += 1) {
    if (text[i] === "{") {
      const startIndex = i;
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let j = startIndex; j < length; j += 1) {
        const char = text[j];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
        } else {
          if (char === '"') {
            inString = true;
          } else if (char === "{") {
            depth += 1;
          } else if (char === "}") {
            depth -= 1;
            if (depth === 0) {
              const candidate = text.slice(startIndex, j + 1);
              try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  return parsed;
                }
              } catch {
                // Not valid JSON, continue scanning for subsequent candidates
              }
              break;
            }
          }
        }
      }
    }
  }

  return null;
}
