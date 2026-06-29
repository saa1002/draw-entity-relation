import toast from "react-hot-toast";
import {
    ATTRIBUTE_OWNER_TYPES,
    addAttributeToOwner,
    addChildAttributeToAttribute,
    convertPartialKeyToPrimaryKey,
    convertPrimaryKeyToPartialKey,
    convertSimpleAttributeToCompositeAttribute,
    convertSubattributeToSimpleAttributeById,
    createAttribute,
    findAttributeTreeOwnerById,
    findEntityById,
    findRelationById,
    generateUniqueAttributeName,
    getDefaultAttributeSemantics,
    getLastAttribute,
    groupRootAttributesIntoCompositeAttribute,
    isEntityIsaSpecialization,
    isFirstAttributeForOwner,
    isMultivaluedAttribute,
    isWeakEntity,
    toggleExclusivePartialKeyAttributeInTree,
    toggleExclusivePrimaryKeyAttributeInTree,
} from "../../../domain/er";
import {
    isAttributeShapeCell,
    isEntityShapeCell,
    isRelationShapeCell,
} from "../utils/mxStyles/diagramStyles";
import { isWeakEntityDecoratorCell } from "../utils/rendering/entityRendering";
import {
    canAddChildAttributeToSelection,
    canConvertSelectedSubattributeToSimple,
    getCompositeAttributeSelectionTarget,
    getEntityAttributeKeySelectionData,
    getEntityMultivaluedAttributeSelectionData,
    getSimpleEntityAttributesGroupingSelectionData,
} from "../utils/selection/attributeSelection";

// Attribute actions coordinate tree-shaped attribute updates with mxGraph cells,
// decorators and persistence.

const hasSiblingAttributeWithName = ({
    owner,
    name,
    ignoredAttributeIds = [],
}) => {
    const ignoredIds = new Set(ignoredAttributeIds);

    return (owner?.attributes ?? []).some(
        (attribute) =>
            !ignoredIds.has(attribute.idMx) && attribute.name === name,
    );
};

export function useAttributeActions({
    graph,
    selected,
    diagramRef,
    accessCell,
    t,
    createAttributeGraphCells,
    syncWeakEntityDecorator,
    ensureWeakEntityDecorator,
    removeWeakEntityDecorator,
    syncAttributeVisualRepresentation,
    removeAttributeConnectionEdges,
    reparentAttributeCellToCurrentOwner,
    removeAttributesCells,
    setOwnerAttributesVisible,
    refreshGraph,
    syncAndPersistDiagramData,
    setRefreshDiagram,
    setEntityWithAttributesHidden,
    clearIdentifyingRelationSemantics,
}) {
    const getSelectedEntityData = () =>
        findEntityById(diagramRef.current, selected?.id);

    const getSelectedEntityAttributeKeyData = () =>
        getEntityAttributeKeySelectionData({
            diagram: diagramRef.current,
            selectedCell: selected,
        });

    const getSelectedEntityMultivaluedAttributeData = () =>
        getEntityMultivaluedAttributeSelectionData({
            diagram: diagramRef.current,
            selectedCell: selected,
        });

    const getSelectedSimpleEntityAttributesForGrouping = () =>
        getSimpleEntityAttributesGroupingSelectionData({
            diagram: diagramRef.current,
            selectionCells:
                typeof graph?.getSelectionCells === "function"
                    ? graph.getSelectionCells()
                    : [],
        });

    const getCompositeAttributeNameFromUser = (owner) => {
        const defaultName = generateUniqueAttributeName(
            owner?.attributes,
            "Atributo compuesto",
        );

        const compositeName = window.prompt(
            t("feedback.compositeAttributePrompt"),
            defaultName,
        );

        return compositeName?.trim() ?? "";
    };

    const convertEntityPrimaryKeyToPartialKey = (entity) => {
        const changedAttributes = convertPrimaryKeyToPartialKey(
            entity?.attributes,
        );

        changedAttributes.forEach(syncAttributeVisualRepresentation);
    };

    const convertEntityPartialKeyToPrimaryKey = (entity) => {
        const changedAttributes = convertPartialKeyToPrimaryKey(
            entity?.attributes,
        );

        changedAttributes.forEach(syncAttributeVisualRepresentation);
    };

    // Adds a root attribute to the selected entity or relation. Default semantics
    // depend on the owner type, weak-entity state and ISA specialization state.
    const addAttribute = () => {
        let selectedDiag;
        let isRelation = false;

        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            selectedDiag = findEntityById(diagramRef.current, selected.id);
        } else if (isRelationShapeCell(selected)) {
            selectedDiag = findRelationById(diagramRef.current, selected.id);
            isRelation = true;
        }

        if (!selectedDiag) return;

        const ownerType = isRelation
            ? ATTRIBUTE_OWNER_TYPES.RELATION
            : ATTRIBUTE_OWNER_TYPES.ENTITY;

        const semantics = getDefaultAttributeSemantics({
            ownerType,
            isFirstAttribute: isFirstAttributeForOwner(selectedDiag),
            isWeakEntityOwner: !isRelation && isWeakEntity(selectedDiag),
            isIsaSpecializationOwner:
                !isRelation &&
                isEntityIsaSpecialization(
                    diagramRef.current,
                    selectedDiag.idMx,
                ),
        });

        const source = selected;

        let offsetX = 120;
        let offsetY = -40;

        // New attributes are placed close to the last existing attribute to keep the
        // diagram readable without requiring manual repositioning every time.
        const lastAttribute = getLastAttribute(selectedDiag.attributes);

        if (lastAttribute) {
            const lastAttrCell = graph.getModel().getCell(lastAttribute.idMx);

            if (lastAttrCell?.geometry) {
                offsetX = lastAttrCell.geometry.x - source.geometry.x;
                offsetY = lastAttrCell.geometry.y - source.geometry.y + 20;
            }
        }

        const uniqueAttributeName = generateUniqueAttributeName(
            selectedDiag.attributes,
        );

        const { target, edge } = createAttributeGraphCells({
            name: uniqueAttributeName,
            source,
            offsetX,
            offsetY,
            semantics,
        });

        if (!isRelation && isWeakEntity(selectedDiag)) {
            syncWeakEntityDecorator(selected);
        }

        addAttributeToOwner(
            selectedDiag,
            createAttribute({
                idMx: target.id,
                name: target.value,
                position: {
                    x: target.geometry.x,
                    y: target.geometry.y,
                },
                key: semantics.key,
                partialKey: semantics.partialKey,
                cell: [target.id, edge.id],
                offsetX: target.geometry.x - selected.geometry.x,
                offsetY: target.geometry.y - selected.geometry.y,
            }),
        );

        syncAndPersistDiagramData();
        toast.success(t("feedback.attributeInserted"));
    };

    const getSelectedCompositeAttributeTarget = (attributeOwner) =>
        getCompositeAttributeSelectionTarget(attributeOwner);

    const canAddChildAttributeToSelectedAttribute = (attributeOwner) =>
        canAddChildAttributeToSelection(attributeOwner);

    // Creates a child attribute under an existing composite attribute and records the
    // new mxGraph vertex/edge ids in the domain model.
    const createSiblingSubattribute = ({
        parentAttribute,
        source,
        childAttributes,
        offsetX,
        offsetY,
        name = generateUniqueAttributeName(childAttributes),
    }) => {
        const semantics = {
            key: false,
            partialKey: false,
        };

        const { target, edge } = createAttributeGraphCells({
            name,
            source,
            offsetX,
            offsetY,
            semantics,
        });

        const childAttribute = createAttribute({
            idMx: target.id,
            name: target.value,
            position: {
                x: target.geometry.x,
                y: target.geometry.y,
            },
            key: false,
            partialKey: false,
            cell: [target.id, edge.id],
            offsetX,
            offsetY,
        });

        addChildAttributeToAttribute(parentAttribute, childAttribute);

        return childAttribute;
    };

    // Groups selected simple root attributes into a new composite attribute. Existing
    // cells are reparented instead of being recreated from scratch.
    const groupSelectedSimpleAttributesIntoComposite = () => {
        const selectionData = getSelectedSimpleEntityAttributesForGrouping();

        if (!selectionData) {
            toast.error(t("feedback.selectSimpleAttributesSameEntity"));
            return;
        }

        const { owner, attributeOwners } = selectionData;
        const childAttributes = attributeOwners.map(
            (attributeOwner) => attributeOwner.attribute,
        );
        const childAttributeIds = childAttributes.map(
            (attribute) => attribute.idMx,
        );
        const compositeName = getCompositeAttributeNameFromUser(owner);

        if (!compositeName) {
            toast.error(t("feedback.compositeAttributeNeedsName"));
            return;
        }

        if (
            hasSiblingAttributeWithName({
                owner,
                name: compositeName,
                ignoredAttributeIds: childAttributeIds,
            })
        ) {
            toast.error(t("feedback.attributeNameAlreadyExists"));
            return;
        }

        const ownerCell = accessCell(owner.idMx);

        if (!ownerCell?.geometry) return;

        const childAttributeCells = childAttributes
            .map((attribute) => accessCell(attribute.idMx))
            .filter((cell) => cell?.geometry);

        if (childAttributeCells.length !== childAttributes.length) {
            toast.error(t("feedback.selectedAttributesNotFound"));
            return;
        }

        // The composite connector is placed near the geometric center of the selected
        // attributes to minimize visual jumps after grouping.
        const averageChildX =
            childAttributeCells.reduce(
                (sum, cell) => sum + cell.geometry.x,
                0,
            ) / childAttributeCells.length;

        const averageChildY =
            childAttributeCells.reduce(
                (sum, cell) => sum + cell.geometry.y,
                0,
            ) / childAttributeCells.length;

        const offsetX = averageChildX - ownerCell.geometry.x;
        const offsetY = averageChildY - ownerCell.geometry.y;

        const createdCompositeCells = createAttributeGraphCells({
            name: compositeName,
            source: ownerCell,
            offsetX,
            offsetY,
            semantics: {
                key: false,
                partialKey: false,
            },
        });

        if (!createdCompositeCells) return;

        const { target, edge } = createdCompositeCells;

        const compositeAttribute = createAttribute({
            idMx: target.id,
            name: compositeName,
            position: {
                x: target.geometry.x,
                y: target.geometry.y,
            },
            key: false,
            partialKey: false,
            cell: [target.id, edge.id],
            offsetX,
            offsetY,
        });

        childAttributes.forEach(removeAttributeConnectionEdges);

        const groupingResult = groupRootAttributesIntoCompositeAttribute({
            owner,
            attributeIds: childAttributeIds,
            compositeAttribute,
        });

        if (!groupingResult.compositeAttribute) {
            removeAttributesCells([compositeAttribute]);
            toast.error(t("feedback.attributesCouldNotBeGrouped"));
            return;
        }

        childAttributes.forEach((attribute) => {
            reparentAttributeCellToCurrentOwner({
                attribute,
                attributeOwner: findAttributeTreeOwnerById(
                    diagramRef.current,
                    attribute.idMx,
                ),
            });
        });

        syncAttributeVisualRepresentation(compositeAttribute);

        graph.setSelectionCell(target);
        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(t("feedback.attributesGrouped"));
    };

    // Adds a child to a composite attribute. If the selected attribute is still a
    // simple root attribute, it is first converted into a composite node.
    const addChildAttribute = () => {
        if (!isAttributeShapeCell(selected)) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        if (!canAddChildAttributeToSelectedAttribute(attributeOwner)) {
            toast.error(t("feedback.cannotConvertMultivaluedToComposite"));
            return;
        }

        const { compositeAttribute } =
            getSelectedCompositeAttributeTarget(attributeOwner);

        const source = accessCell(compositeAttribute.idMx);

        if (!source) return;
        // The original simple attribute becomes the first child so its visible label is
        // preserved after converting the root into a composite connector.
        if (
            attributeOwner.depth === 0 &&
            !compositeAttribute.children &&
            !isMultivaluedAttribute(compositeAttribute)
        ) {
            const originalAttributeName = compositeAttribute.name;
            const { target, edge } = createAttributeGraphCells({
                name: originalAttributeName,
                source,
                offsetX: 120,
                offsetY: -40,
                semantics: {
                    key: false,
                    partialKey: false,
                },
            });

            const originalLeaf = createAttribute({
                idMx: target.id,
                name: target.value,
                position: {
                    x: target.geometry.x,
                    y: target.geometry.y,
                },
                key: false,
                partialKey: false,
                cell: [target.id, edge.id],
                offsetX: 120,
                offsetY: -40,
            });

            convertSimpleAttributeToCompositeAttribute(
                compositeAttribute,
                originalLeaf,
            );
        }

        const childAttributes = compositeAttribute.children ?? [];

        let offsetX = 120;
        let offsetY = 40;

        const lastChildAttribute = getLastAttribute(childAttributes);

        if (lastChildAttribute) {
            const lastChildCell = graph
                .getModel()
                .getCell(lastChildAttribute.idMx);

            if (lastChildCell?.geometry) {
                offsetX = lastChildCell.geometry.x - source.geometry.x;
                offsetY = lastChildCell.geometry.y - source.geometry.y + 40;
            }
        }

        createSiblingSubattribute({
            parentAttribute: compositeAttribute,
            source,
            childAttributes,
            offsetX,
            offsetY,
        });

        syncAttributeVisualRepresentation(compositeAttribute);

        syncAndPersistDiagramData();
        toast.success(t("feedback.siblingSubattributeInserted"));
    };

    const setAttributesVisibility = (isRelationNM, visible) => {
        const selectedOwner = !isRelationNM
            ? findEntityById(diagramRef.current, selected.id)
            : findRelationById(diagramRef.current, selected.id);

        if (!selectedOwner) return;

        setOwnerAttributesVisible(selectedOwner, visible);

        setEntityWithAttributesHidden((currentAttributesHidden) => ({
            ...(currentAttributesHidden ?? {}),
            [selected.id]: !visible,
        }));

        refreshGraph();
    };

    const hideAttributes = (isRelationNM) => {
        setAttributesVisibility(isRelationNM, false);
    };

    const showAttributes = (isRelationNM) => {
        setAttributesVisibility(isRelationNM, true);
    };

    // Primary-key toggling is restricted to strong, non-ISA-specialization entities
    // and cannot be applied to multivalued attributes.
    const toggleAttrKey = () => {
        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute, selectedAttribute } =
            selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            toast.error(t("feedback.keyCannotBeMultivalued"));
            return;
        }

        if (isWeakEntity(entity)) {
            toast.error(t("feedback.weakEntityCannotHavePrimaryKey"));
            return;
        }

        if (isEntityIsaSpecialization(diagramRef.current, entity.idMx)) {
            toast.error(t("feedback.isaSpecializationCannotHavePrimaryKey"));
            return;
        }

        const result = toggleExclusivePrimaryKeyAttributeInTree(
            entity.attributes,
            selectedAttribute.idMx,
        );

        if (!result.updated) return;

        result.changedAttributes.forEach(syncAttributeVisualRepresentation);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            result.enabled
                ? t("feedback.attributeMarkedAsKey")
                : t("feedback.attributeKeyRemoved"),
        );
    };

    // Switching between strong and weak entity states also converts key markers and
    // updates the weak-entity visual decorator.
    const toggleWeakEntity = () => {
        if (!selected) return;
        if (!isEntityShapeCell(selected)) return;
        if (isWeakEntityDecoratorCell(selected)) return;

        const entity = getSelectedEntityData();
        if (!entity) return;

        const shouldBecomeWeak = !isWeakEntity(entity);

        entity.weak = shouldBecomeWeak;

        if (shouldBecomeWeak) {
            convertEntityPrimaryKeyToPartialKey(entity);
            ensureWeakEntityDecorator(selected, entity);
            toast.success(t("feedback.entityMarkedWeak"));
        } else {
            clearIdentifyingRelationSemantics(entity.identifyingRelationId);
            convertEntityPartialKeyToPrimaryKey(entity);
            removeWeakEntityDecorator(entity.idMx);
            toast.success(t("feedback.entityMarkedStrong"));
        }

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    // Partial keys are used only as weak-entity discriminants and cannot be
    // multivalued.
    const togglePartialKey = () => {
        if (!selected) return;
        if (!isAttributeShapeCell(selected)) return;

        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute, selectedAttribute } =
            selectedEntityAttribute;

        if (!isWeakEntity(entity)) {
            toast.error(t("feedback.onlyWeakEntitiesCanHaveDiscriminant"));
            return;
        }

        if (isMultivaluedAttribute(attribute)) {
            toast.error(t("feedback.discriminantCannotBeMultivalued"));
            return;
        }

        const result = toggleExclusivePartialKeyAttributeInTree(
            entity.attributes,
            selectedAttribute.idMx,
        );

        if (!result.updated) return;

        result.changedAttributes.forEach(syncAttributeVisualRepresentation);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            result.enabled
                ? t("feedback.attributeMarkedAsDiscriminant")
                : t("feedback.discriminantRemoved"),
        );
    };

    // Multivalued semantics are applied at root level and are incompatible with
    // primary-key or partial-key semantics.
    const toggleMultivaluedAttribute = () => {
        const selectedEntityAttribute =
            getSelectedEntityMultivaluedAttributeData();

        if (!selectedEntityAttribute) return;

        const { attribute } = selectedEntityAttribute;

        if (attribute.key) {
            toast.error(t("feedback.keyCannotBeMultivalued"));
            return;
        }

        if (attribute.partialKey) {
            toast.error(t("feedback.discriminantCannotBeMultivalued"));
            return;
        }

        const shouldBecomeMultivalued = !isMultivaluedAttribute(attribute);

        if (shouldBecomeMultivalued) {
            attribute.multivalued = true;
        } else {
            attribute.multivalued = undefined;
        }

        syncAttributeVisualRepresentation(attribute);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            shouldBecomeMultivalued
                ? t("feedback.attributeMarkedMultivalued")
                : t("feedback.attributeMultivaluedRemoved"),
        );
    };

    const canConvertSelectedSubattributeToSimpleAttribute = (attributeOwner) =>
        canConvertSelectedSubattributeToSimple(attributeOwner);

    // Converts a direct child of a composite attribute back into a root attribute,
    // reparenting graph cells so the visual model remains consistent.
    const convertSelectedSubattributeToSimpleAttribute = () => {
        if (!isAttributeShapeCell(selected)) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!canConvertSelectedSubattributeToSimpleAttribute(attributeOwner)) {
            return;
        }

        const { owner } = attributeOwner;

        const { convertedAttributes, removedCompositeAttribute } =
            convertSubattributeToSimpleAttributeById(owner, selected.id);

        if (convertedAttributes.length === 0) return;

        convertedAttributes.forEach(removeAttributeConnectionEdges);

        removeAttributesCells([removedCompositeAttribute].filter(Boolean));

        convertedAttributes.forEach((attribute) => {
            reparentAttributeCellToCurrentOwner({
                attribute,
                attributeOwner: findAttributeTreeOwnerById(
                    diagramRef.current,
                    attribute.idMx,
                ),
            });
        });

        syncAndPersistDiagramData();

        toast.success(
            convertedAttributes.length > 1
                ? t("feedback.subattributesConvertedToSimple")
                : t("feedback.subattributeConvertedToSimple"),
        );
    };

    return {
        getSelectedEntityData,
        getSelectedEntityAttributeKeyData,
        getSelectedEntityMultivaluedAttributeData,
        getSelectedSimpleEntityAttributesForGrouping,
        addAttribute,
        canAddChildAttributeToSelectedAttribute,
        groupSelectedSimpleAttributesIntoComposite,
        addChildAttribute,
        hideAttributes,
        showAttributes,
        toggleAttrKey,
        toggleWeakEntity,
        togglePartialKey,
        toggleMultivaluedAttribute,
        canConvertSelectedSubattributeToSimpleAttribute,
        convertSelectedSubattributeToSimpleAttribute,
    };
}
