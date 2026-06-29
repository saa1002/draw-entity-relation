import {
    ISA_CELL_LABEL,
    getAttributeChildren,
    getRelationSideKeys,
    getRelationSideLabelDisplayValue,
    isIdentifyingRelation,
    isIsaConfigured,
    isRelationConfigured,
    isWeakEntity,
} from "../../../../domain/er";
import {
    getAttributeDimensions,
    getCardinalityStyleString,
    getEntityDimensions,
    getEntityStyleString,
    getIsaDimensions,
    getIsaEdgeStyleString,
    getIsaStyleString,
    getRelationDimensions,
    getRelationStyleString,
} from "../mxStyles/diagramStyles";
import {
    getAttributeDisplayValue,
    getAttributeRenderDimensions,
    getAttributeStyleString,
} from "../rendering/attributeRendering";

// Rebuilds mxGraph cells from persisted diagram data. The order matters: main
// nodes are created first, while relation and ISA edges require existing endpoints.
export const reconstructDiagramGraph = ({
    graph,
    diagram,
    accessCell,
    mxPoint,
    createWeakEntityDecorator,
    ensureDiscriminantUnderline,
    ensureMultivaluedAttributeDecorator,
    ensureIdentifyingRelationDecorator,
    ensureIdentifyingRelationEdgeDecorator,
    syncRepeatedParticipantRelationEdges,
}) => {
    if (!graph || !diagram) return;
    // Recreates an attribute subtree. Composite attributes are represented by small
    // connector cells, while leaf attributes carry visible labels and decorators.
    const recreateAttribute = (
        attribute,
        source,
        {
            inheritedKey = false,
            inheritedPartialKey = false,
            inheritedMultivalued = false,
        } = {},
    ) => {
        // Key, partial-key and multivalued semantics can be inherited by descendants of
        // composite attributes for visual rendering.
        const effectiveKey = inheritedKey || attribute?.key === true;
        const effectivePartialKey =
            inheritedPartialKey || attribute?.partialKey === true;

        const { width, height } = getAttributeRenderDimensions(
            attribute,
            getAttributeDimensions,
        );

        const target = graph.insertVertex(
            null,
            attribute.idMx,
            getAttributeDisplayValue(attribute),
            attribute.position.x,
            attribute.position.y,
            width,
            height,
            getAttributeStyleString(attribute, { inheritedKey }),
        );
        // Keep the stored edge id when available so persisted diagrams preserve stable
        // references between the model and mxGraph cells.
        const storedEdgeId = attribute.cell?.at(1) ?? null;

        const edge = graph.insertEdge(
            source,
            storedEdgeId,
            null,
            source,
            target,
        );

        attribute.cell = [target.id, edge.id];

        const childAttributes = getAttributeChildren(attribute);
        const isCompositeAttribute = childAttributes.length > 0;

        if (effectivePartialKey && !isCompositeAttribute) {
            ensureDiscriminantUnderline(target);
        }

        const shouldRenderMultivaluedDecorator =
            (attribute.multivalued === true || inheritedMultivalued) &&
            !isCompositeAttribute;

        if (shouldRenderMultivaluedDecorator) {
            ensureMultivaluedAttributeDecorator(target);
        }

        graph.orderCells(true, [edge]);

        const shouldPassMultivaluedDecoratorToChildren =
            (attribute.multivalued === true || inheritedMultivalued) &&
            isCompositeAttribute;
        // Composite semantics are propagated to children because only leaf attributes
        // display the final key, partial-key or multivalued markers.
        childAttributes.forEach((childAttribute) => {
            recreateAttribute(childAttribute, target, {
                inheritedKey: effectiveKey,
                inheritedPartialKey: effectivePartialKey,
                inheritedMultivalued: shouldPassMultivaluedDecoratorToChildren,
            });
        });
    };

    const recreateEntity = (entity) => {
        const { width, height } = getEntityDimensions(entity.name);

        const source = graph.insertVertex(
            null,
            entity.idMx,
            entity.name,
            entity.position.x,
            entity.position.y,
            width,
            height,
            getEntityStyleString(),
        );

        if (isWeakEntity(entity)) {
            const decorator = createWeakEntityDecorator(entity);
            graph.orderCells(false, [decorator]);
        }

        for (const attribute of entity.attributes) {
            recreateAttribute(attribute, source);
        }
    };

    // Recreates the relation vertex, its own attributes and, when configured, the
    // participant edges with their cardinality or role labels.
    const recreateRelation = (relation) => {
        const { width, height } = getRelationDimensions(relation.name);

        const source = graph.insertVertex(
            null,
            relation.idMx,
            relation.name,
            relation.position.x,
            relation.position.y,
            width,
            height,
            getRelationStyleString(relation),
        );

        if (isIdentifyingRelation(relation)) {
            ensureIdentifyingRelationDecorator(source, relation);
        }

        for (const attribute of relation.attributes) {
            recreateAttribute(attribute, source);
        }

        if (isRelationConfigured(relation)) {
            const connectedSides = getRelationSideKeys(relation).map(
                (sideKey) => {
                    const relationSide = relation[sideKey];
                    const target = accessCell(relationSide.entity.idMx);

                    const edge = graph.insertEdge(
                        source,
                        relationSide.edgeId,
                        null,
                        source,
                        target,
                    );

                    const cardinalityValue =
                        relationSide.cardinality === ""
                            ? "X:X"
                            : relationSide.cardinality;

                    // Cardinality labels are mxGraph vertices embedded in each relation edge.
                    const cardinality = graph.insertVertex(
                        edge,
                        relationSide.cell,
                        getRelationSideLabelDisplayValue(relation, sideKey, {
                            fallbackCardinality: cardinalityValue,
                        }),
                        0,
                        0,
                        1,
                        1,
                        getCardinalityStyleString(),
                        true,
                    );

                    graph.updateCellSize(cardinality);

                    return {
                        sideKey,
                        target,
                        edge,
                        cardinality,
                    };
                },
            );

            // Repeated participants need custom edge routes to keep parallel connections visible.
            syncRepeatedParticipantRelationEdges?.(source, relation);

            if (isIdentifyingRelation(relation)) {
                ensureIdentifyingRelationEdgeDecorator(source, relation);
            }

            graph.orderCells(
                true,
                connectedSides.map((connectedSide) => connectedSide.edge),
            );
        }
    };

    const recreateIsa = (isa) => {
        const { width, height } = getIsaDimensions();

        graph.insertVertex(
            null,
            isa.idMx,
            ISA_CELL_LABEL,
            isa.position.x,
            isa.position.y,
            width,
            height,
            getIsaStyleString(),
        );
    };

    // ISA links are recreated after entities and ISA nodes because edges need both
    // endpoints to exist in mxGraph.
    const recreateIsaLinks = (isa) => {
        if (!isIsaConfigured(isa)) return;

        const isaCell = accessCell(isa.idMx);

        if (!isaCell) return;

        const links = [isa.generalization, ...(isa.specializations ?? [])];

        const edges = links
            .map((link) => {
                const target = accessCell(link?.entity?.idMx);

                if (!target) return null;

                return graph.insertEdge(
                    isaCell,
                    link.edgeId,
                    null,
                    isaCell,
                    target,
                    getIsaEdgeStyleString(),
                );
            })
            .filter(Boolean);

        graph.orderCells(true, edges);
    };

    for (const entity of diagram.entities) {
        recreateEntity(entity);
    }

    for (const relation of diagram.relations) {
        recreateRelation(relation);
    }

    for (const isa of diagram.isas ?? []) {
        recreateIsa(isa);
    }

    for (const isa of diagram.isas ?? []) {
        recreateIsaLinks(isa);
    }
};
