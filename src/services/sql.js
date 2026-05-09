import { mapErDiagramToRelationalModel } from "../domain/relational/erToRelationalModel";
import { renderRelationalModelToSQL } from "./sqlRenderer";

export { normalizeIdentifier } from "../domain/relational/naming";

export {
    filterTables,
    process1NRelation,
    process11Relation,
    processNMRelation,
    mapErDiagramToRelationalModel,
} from "../domain/relational/erToRelationalModel";

export {
    generate1NSQL,
    generate11SQL,
    generateNMSQL,
    renderRelationalModelToSQL,
} from "./sqlRenderer";

// Generate SQL
export function generateSQL(graph) {
    const relationalModel = mapErDiagramToRelationalModel(graph);
    return renderRelationalModelToSQL(relationalModel);
}
