import { mapErDiagramToRelationalModel } from "../domain/relational/erToRelationalModel";
import { renderRelationalModelToSQL } from "./sqlRenderer";

// High-level SQL generation entry point: first map the E/R diagram to the
// intermediate relational model, then render that model as SQL text.
export function generateSQL(graph) {
    const relationalModel = mapErDiagramToRelationalModel(graph);

    return renderRelationalModelToSQL(relationalModel);
}
