import {
    findAttributeTreeOwnerById,
    findEntityIndexById,
    findIsaIndexById,
    findRelationIndexById,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isWeakEntity,
    isaInvolvesEntity,
    relationInvolvesEntity,
    removeAttributeFromOwnerTreeByIdWithPromotion,
} from "../../../domain/er";
import {
    removeEntityGraphCells,
    removeIsaGraphCells,
    removeRelationGraphCells,
} from "../utils/graph/graphCanvas";
import {
    isAttributeShapeCell,
    isEntityShapeCell,
    isIsaShapeCell,
    isRelationShapeCell,
} from "../utils/mxStyles/diagramStyles";
import { isWeakEntityDecoratorCell } from "../utils/rendering/entityRendering";

// Deletion actions remove both domain objects and their mxGraph cells. Some
// deletions also clear dependent relation or ISA configurations.
export function useDeletionActions({
    graph,
    selected,
    diagramRef,
    accessCell,
    getAttributesCells,
    getWeakEntityDecoratorId,
    removeAttributesCells,
    reparentAttributeCellToCurrentOwner,
    syncAttributeVisualRepresentation,
    clearIdentifyingRelationSemantics,
    removeRelationConfiguration,
    removeIsaConfiguration,
    refreshGraph,
    syncAndPersistDiagramData,
    clearEditorSelection,
}) {
    // Supports both single selection and mxGraph multiselection while deduplicating
    // cells that may appear more than once.
    const getSelectedDiagramCells = () => {
        const selectionCells =
            typeof graph?.getSelectionCells === "function"
                ? graph.getSelectionCells()
                : [];

        const cells =
            selectionCells.length > 1
                ? selectionCells
                : [...selectionCells, selected].filter(Boolean);

        return Array.from(
            new Map(
                cells
                    .filter(Boolean)
                    .filter((cell) => typeof cell.id === "string")
                    .map((cell) => [cell.id, cell]),
            ).values(),
        );
    };

    // Entity primary-key attributes are protected from direct deletion. Relation
    // attributes can be deleted because they are descriptive columns.
    const canDeleteAttributeCell = (cell) => {
        if (!isAttributeShapeCell(cell)) {
            return false;
        }

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            cell.id,
        );

        if (!attributeOwner) {
            return false;
        }

        const isKey = isPrimaryKeyAttribute(attributeOwner?.attribute);
        const isFromRelation = isRelationAttributeOwner(attributeOwner);

        return isFromRelation || !isKey;
    };

    const canDeleteSelectedAttribute = () => canDeleteAttributeCell(selected);

    // Deleting an entity also clears any relation or ISA configuration that points
    // to it, preventing stale references in the diagram model.
    const deleteEntityCell = (cell, { syncAfterDelete = true } = {}) => {
        const isEntity =
            isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell);

        if (!isEntity) {
            return false;
        }

        const entityIndex = findEntityIndexById(diagramRef.current, cell.id);

        if (entityIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const entity = diagramRef.current.entities[entityIndex];

        diagramRef.current.entities.splice(entityIndex, 1);

        removeEntityGraphCells({
            graph,
            entity,
            accessCell,
            getAttributesCells,
            getWeakEntityDecoratorId,
            isWeakEntity,
        });

        diagramRef.current.relations
            .filter((relation) => relationInvolvesEntity(relation, entity.idMx))
            .forEach(removeRelationConfiguration);

        (diagramRef.current.isas ?? [])
            .filter((isa) => isaInvolvesEntity(isa, entity.idMx))
            .forEach(removeIsaConfiguration);

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    // Attribute deletion may promote remaining children when a composite attribute no
    // longer has enough children to justify the composite node.
    const deleteAttributeCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!canDeleteAttributeCell(cell)) {
            return false;
        }

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            cell.id,
        );

        if (!attributeOwner) {
            return false;
        }

        const { owner } = attributeOwner;
        const parentAttribute = attributeOwner.parent;

        const {
            removedAttribute,
            removedCompositeAttribute,
            promotedAttribute,
        } = removeAttributeFromOwnerTreeByIdWithPromotion(owner, cell.id);

        if (!removedAttribute) {
            return false;
        }

        removeAttributesCells(
            [removedAttribute, removedCompositeAttribute].filter(Boolean),
        );

        reparentAttributeCellToCurrentOwner({
            attribute: promotedAttribute,
            attributeOwner: promotedAttribute
                ? findAttributeTreeOwnerById(
                      diagramRef.current,
                      promotedAttribute.idMx,
                  )
                : null,
        });

        if (!promotedAttribute && parentAttribute) {
            syncAttributeVisualRepresentation(parentAttribute);
        }

        if (syncAfterDelete) {
            refreshGraph();
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteRelationCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!isRelationShapeCell(cell)) {
            return false;
        }

        const relationIndex = findRelationIndexById(
            diagramRef.current,
            cell.id,
        );

        if (relationIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const relation = diagramRef.current.relations[relationIndex];

        clearIdentifyingRelationSemantics(relation.idMx);

        diagramRef.current.relations.splice(relationIndex, 1);

        removeRelationGraphCells({
            graph,
            relation,
            accessCell,
            getAttributesCells,
        });

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteIsaCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!isIsaShapeCell(cell)) {
            return false;
        }

        const isaIndex = findIsaIndexById(diagramRef.current, cell.id);

        if (isaIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const isa = diagramRef.current.isas[isaIndex];

        diagramRef.current.isas.splice(isaIndex, 1);

        removeIsaGraphCells({
            graph,
            isa,
            accessCell,
        });

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteDiagramElementCell = (
        cell,
        { syncAfterDelete = true } = {},
    ) => {
        if (!cell) {
            return false;
        }

        if (isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell)) {
            return deleteEntityCell(cell, { syncAfterDelete });
        }

        if (isRelationShapeCell(cell)) {
            return deleteRelationCell(cell, { syncAfterDelete });
        }

        if (isAttributeShapeCell(cell)) {
            return deleteAttributeCell(cell, { syncAfterDelete });
        }

        if (isIsaShapeCell(cell)) {
            return deleteIsaCell(cell, { syncAfterDelete });
        }

        return false;
    };

    const deleteSelectedDiagramElement = () => {
        if (!selected) {
            return false;
        }

        return deleteDiagramElementCell(selected);
    };

    // Relations and ISA nodes are deleted before entities so dependent configurations
    // are cleared in a predictable order during batch deletion.
    const getCellDeletionPriority = (cell) => {
        if (isRelationShapeCell(cell)) return 1;
        if (isIsaShapeCell(cell)) return 2;

        if (isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell)) {
            return 3;
        }

        if (isAttributeShapeCell(cell)) return 4;

        return 5;
    };

    // Batch deletion delays synchronization until all selected cells have been
    // processed to avoid persisting intermediate inconsistent states.
    const deleteSelectedDiagramElements = () => {
        if (!graph) {
            return false;
        }

        const cells = getSelectedDiagramCells()
            .filter((cell) => getCellDeletionPriority(cell) < 5)
            .sort(
                (cellA, cellB) =>
                    getCellDeletionPriority(cellA) -
                    getCellDeletionPriority(cellB),
            );

        if (cells.length <= 1) {
            return deleteSelectedDiagramElement();
        }

        let deleted = false;

        cells.forEach((cell) => {
            deleted =
                deleteDiagramElementCell(cell, {
                    syncAfterDelete: false,
                }) || deleted;
        });

        if (!deleted) {
            return false;
        }

        clearEditorSelection();
        refreshGraph();
        syncAndPersistDiagramData();

        return true;
    };

    return {
        canDeleteSelectedAttribute,
        deleteSelectedDiagramElements,
    };
}
