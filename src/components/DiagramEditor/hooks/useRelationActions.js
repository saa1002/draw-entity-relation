import toast from "react-hot-toast";
import {
    applyIdentifyingRelationCardinalities,
    clearIdentifyingRelationDomainSemantics,
    convertPrimaryKeyToPartialKey,
    findRelationById,
    getCascadedWeakConversionCandidate,
    getRelationSideKeys,
    getRelationSideLabelDisplayValue,
    getWeakAndStrongSidesForRelation,
    isIdentifyingRelation,
    relationHasBothEntitySides,
    removeAllAttributesFromOwner,
    resetRelationSides,
} from "../../../domain/er";
import { removeRelationConfigurationGraphCells } from "../utils/graph/graphCanvas";
import {
    getRelationStyleString,
    isRelationShapeCell,
} from "../utils/mxStyles/diagramStyles";
import { isIdentifyingRelationDecoratorCell } from "../utils/rendering/relationRendering";

// Relation actions coordinate domain updates, mxGraph decorators and persisted
// state for relation configuration and identifying relations.
export function useRelationActions({
    graph,
    selected,
    diagramRef,
    accessCell,
    t,
    getAttributesCells,
    removeAttributesCells,
    removeIdentifyingRelationDecorator,
    removeIdentifyingRelationEdgeDecorator,
    ensureIdentifyingRelationDecorator,
    ensureIdentifyingRelationEdgeDecorator,
    ensureWeakEntityDecorator,
    syncAttributeVisualRepresentation,
    refreshGraph,
    syncAndPersistDiagramData,
    setRefreshDiagram,
}) {
    const getSelectedRelationData = () =>
        findRelationById(diagramRef.current, selected?.id) ?? null;

    const convertEntityPrimaryKeyToPartialKey = (entity) => {
        const changedAttributes = convertPrimaryKeyToPartialKey(
            entity?.attributes,
        );

        changedAttributes.forEach(syncAttributeVisualRepresentation);
    };

    // Clears both domain semantics and visual decorators for an identifying relation.
    const clearIdentifyingRelationSemantics = (relationId) => {
        const { relation } = clearIdentifyingRelationDomainSemantics(
            diagramRef.current,
            relationId,
        );

        if (!relation) return;

        removeIdentifyingRelationDecorator(relation.idMx);
        removeIdentifyingRelationEdgeDecorator(relation.idMx);

        const relationCell = accessCell(relation.idMx);

        if (relationCell) {
            graph
                .getModel()
                .setStyle(relationCell, getRelationStyleString(relation));
        }
    };

    // Relation side labels show cardinality and, when needed, role information.
    const syncRelationCardinalityLabels = (relationData) => {
        if (!relationData) return;

        getRelationSideKeys(relationData).forEach((sideKey) => {
            const sideLabel = accessCell(relationData?.[sideKey]?.cell);

            if (sideLabel) {
                graph.model.setValue(
                    sideLabel,
                    getRelationSideLabelDisplayValue(relationData, sideKey),
                );
                graph.updateCellSize(sideLabel);
            }
        });
    };

    const removeRelationAttributes = (relationData) => {
        if (!relationData) return;

        const removedAttributes = removeAllAttributesFromOwner(relationData);

        removeAttributesCells(removedAttributes);

        relationData.canHoldAttributes = false;
    };

    // Removing a relation configuration keeps the relation vertex but deletes its
    // participant edges, cardinality cells and identifying semantics.
    const removeRelationConfiguration = (relation) => {
        if (!relation) return;

        clearIdentifyingRelationSemantics(relation.idMx);

        removeRelationConfigurationGraphCells({
            graph,
            relation,
            accessCell,
            getAttributesCells,
        });

        resetRelationSides(relation);
    };

    // Toggling an identifying relation can also convert an entity to weak, update
    // cardinalities, remove relation attributes and create visual decorators.
    const toggleIdentifyingRelation = () => {
        if (!selected) return;
        if (isIdentifyingRelationDecoratorCell(selected)) return;
        if (!isRelationShapeCell(selected)) return;

        const relation = getSelectedRelationData();
        if (!relation) return;

        let { weakEntity, strongEntity: ownerEntity } =
            getWeakAndStrongSidesForRelation(diagramRef.current, relation);

        if (!isIdentifyingRelation(relation)) {
            if (!relationHasBothEntitySides(relation)) {
                toast.error(t("feedback.configureBothRelationSidesFirst"));
                return;
            }

            if (!weakEntity || !ownerEntity) {
                // When the user did not pre-mark a weak entity, the editor only auto-converts
                // safe cascaded cases.
                const conversionCandidate = getCascadedWeakConversionCandidate(
                    diagramRef.current,
                    relation,
                );

                if (!conversionCandidate) {
                    toast.error(
                        t("feedback.identifyingRelationRequiresWeakAndOwner"),
                    );
                    return;
                }

                weakEntity = conversionCandidate.weakEntity;
                ownerEntity = conversionCandidate.ownerEntity;
                weakEntity.weak = true;
                convertEntityPrimaryKeyToPartialKey(weakEntity);

                const weakEntityCell = accessCell(weakEntity.idMx);
                if (weakEntityCell) {
                    ensureWeakEntityDecorator(weakEntityCell, weakEntity);
                }
            }
            // A weak entity can only keep one identifying relation in the simplified model.
            if (
                weakEntity.identifyingRelationId &&
                weakEntity.identifyingRelationId !== relation.idMx
            ) {
                clearIdentifyingRelationSemantics(
                    weakEntity.identifyingRelationId,
                );
            }

            relation.isIdentifying = true;
            weakEntity.identifyingRelationId = relation.idMx;
            weakEntity.ownerEntityId = ownerEntity.idMx;

            const identifyingCardinalitiesApplied =
                applyIdentifyingRelationCardinalities(
                    diagramRef.current,
                    relation,
                );

            if (!identifyingCardinalitiesApplied) {
                relation.isIdentifying = false;
                weakEntity.identifyingRelationId = null;
                weakEntity.ownerEntityId = null;

                toast.error(t("feedback.identifyingCardinalitiesFailed"));
                return;
            }

            removeRelationAttributes(relation);
            syncRelationCardinalityLabels(relation);

            ensureIdentifyingRelationDecorator(selected, relation);
            ensureIdentifyingRelationEdgeDecorator(selected, relation);

            toast.success(t("feedback.relationMarkedIdentifying"));
        } else {
            clearIdentifyingRelationSemantics(relation.idMx);
            toast.success(t("feedback.identifyingRelationUnmarked"));
        }

        const relationCell = accessCell(relation.idMx);
        if (relationCell) {
            graph
                .getModel()
                .setStyle(relationCell, getRelationStyleString(relation));
        }

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    return {
        getSelectedRelationData,
        clearIdentifyingRelationSemantics,
        syncRelationCardinalityLabels,
        removeRelationAttributes,
        removeRelationConfiguration,
        toggleIdentifyingRelation,
    };
}
