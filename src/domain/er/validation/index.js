import { DEFAULT_DIAGNOSTICS } from "./diagnostics";
import { VALIDATION_RULES } from "./validationRules";

export { DEFAULT_DIAGNOSTICS } from "./diagnostics";
export { VALIDATION_RULES } from "./validationRules";
export * from "./rules";

// Runs all validation rules and returns a flat diagnostic object. The UI later
// groups these diagnostic flags into user-facing sections and messages.
export function validateGraph(graph) {
    const diagnostics = { ...DEFAULT_DIAGNOSTICS };

    for (const rule of VALIDATION_RULES) {
        if (rule.fails(graph)) {
            diagnostics[rule.diagnostic] = false;
            diagnostics.isValid = false;
        }
    }

    return diagnostics;
}
