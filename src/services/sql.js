import { mapErDiagramToRelationalModel } from "../domain/relational/erToRelationalModel";
import { renderRelationalModelToSQL } from "./sqlRenderer";

// Generate SQL
export function generateSQL(graph) {
    const relationalModel = mapErDiagramToRelationalModel(graph);

    return renderRelationalModelToSQL(relationalModel);
}
