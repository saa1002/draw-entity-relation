import {
    getAttributeChildren,
    getRelationCardinalityDisplayValue,
    getRelationSideKeys,
    isIdentifyingRelation,
    isRelationConfigured,
    isWeakEntity,
} from "../../../../domain/er";
import {
    getAttributeDimensions,
    getCardinalityStyleString,
    getEntityDimensions,
    getEntityStyleString,
    getRelationDimensions,
    getRelationStyleString,
} from "../mxStyles/diagramStyles";
import {
    getAttributeDisplayValue,
    getAttributeRenderDimensions,
    getAttributeStyleString,
} from "../rendering/attributeRendering";

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

    const recreateAttribute = (
        attribute,
        source,
        {
            inheritedKey = false,
            inheritedPartialKey = false,
            inheritedMultivalued = false,
        } = {},
    ) => {
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

                    const cardinality = graph.insertVertex(
                        edge,
                        relationSide.cell,
                        getRelationCardinalityDisplayValue(
                            relation,
                            cardinalityValue,
                        ),
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

    for (const entity of diagram.entities) {
        recreateEntity(entity);
    }

    for (const relation of diagram.relations) {
        recreateRelation(relation);
    }
};
