import {
    getAttributeChildren,
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
            const target1 = accessCell(relation.side1.entity.idMx);
            const target2 = accessCell(relation.side2.entity.idMx);

            const edge1 = graph.insertEdge(
                source,
                relation.side1.edgeId,
                null,
                source,
                target1,
            );

            const edge2 = graph.insertEdge(
                source,
                relation.side2.edgeId,
                null,
                source,
                target2,
            );

            const cardinality1 = graph.insertVertex(
                edge1,
                relation.side1.cell,
                relation.side1.cardinality === ""
                    ? "X:X"
                    : relation.side1.cardinality,
                0,
                0,
                1,
                1,
                getCardinalityStyleString(),
                true,
            );

            const cardinality2 = graph.insertVertex(
                edge2,
                relation.side2.cell,
                relation.side2.cardinality === ""
                    ? "X:X"
                    : relation.side2.cardinality,
                0,
                0,
                1,
                1,
                getCardinalityStyleString(),
                true,
            );

            graph.updateCellSize(cardinality1);
            graph.updateCellSize(cardinality2);

            if (target1 && target2 && target1.id === target2.id) {
                const x1 = target1.geometry.x + target1.geometry.width / 2;
                const x2 = source.geometry.x + source.geometry.width / 2;
                const y1 = target1.geometry.y + target1.geometry.height / 2;
                const y2 = source.geometry.y + source.geometry.height / 2;

                edge1.geometry.points = [new mxPoint(x2, y1)];
                edge2.geometry.points = [new mxPoint(x1, y2)];
            }

            if (isIdentifyingRelation(relation)) {
                ensureIdentifyingRelationEdgeDecorator(source, relation);
            }

            graph.orderCells(true, [edge1, edge2]);
        }
    };

    for (const entity of diagram.entities) {
        recreateEntity(entity);
    }

    for (const relation of diagram.relations) {
        recreateRelation(relation);
    }
};
