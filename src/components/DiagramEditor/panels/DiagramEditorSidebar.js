import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
} from "@mui/material";
import * as React from "react";
import toast from "react-hot-toast";
import {
    IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY,
    IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES,
    POSSIBLE_CARDINALITIES,
    RELATION_ARITIES,
    TERNARY_RELATION_CARDINALITIES,
    canRelationHoldAttributes,
    canRelationTypeHoldAttributes,
    createEmptyRelationSide,
    findAttributeTreeOwnerById,
    findEntityById,
    findRelationById,
    getRelationArity,
    getRelationCardinalityDisplayValue,
    getRelationSideDisplayName,
    getRelationSideKeys,
    getWeakAndStrongSidesForRelation,
    isBinaryRelation,
    isEntityIsaSpecialization,
    isIdentifyingRelation,
    isMultivaluedAttribute,
    isRelationConfigured,
    isTernaryRelation,
    isWeakEntity,
    resetRelationSides,
} from "../../../domain/er";
import {
    connectRelationGraphSides,
    getConfiguredRelationGraphCells,
    removeExistingGraphCells,
} from "../utils/graph/graphCanvas";
import {
    getCardinalityStyleString,
    isAttributeShapeCell,
    isEntityShapeCell,
    isIsaShapeCell,
    isRelationShapeCell,
} from "../utils/mxStyles/diagramStyles";
import { isWeakEntityDecoratorCell } from "../utils/rendering/entityRendering";
import { isIdentifyingRelationDecoratorCell } from "../utils/rendering/relationRendering";
import {
    SidebarActionButton,
    SidebarSection,
    renderSidebarAction,
} from "./DiagramEditorPanelControls";

// Contextual sidebar actions for the current mxGraph selection. Most buttons are
// shown only when the selected logical E/R element supports the corresponding action.

const DRAGGABLE_DIALOG_TITLE_CLASS = "draggable-dialog-title";

// Material UI dialogs are made draggable through the title area so large
// configuration dialogs do not permanently cover the diagram.
const DraggableDialogPaper = React.forwardRef(
    function DraggableDialogPaper(props, ref) {
        const { onMouseDown, style, ...paperProps } = props;
        const [position, setPosition] = React.useState({ x: 0, y: 0 });
        const positionRef = React.useRef(position);
        const dragStateRef = React.useRef(null);

        React.useEffect(() => {
            positionRef.current = position;
        }, [position]);

        const handleMouseMove = React.useCallback((event) => {
            const dragState = dragStateRef.current;

            if (!dragState) {
                return;
            }

            const nextPosition = {
                x: dragState.initialX + event.clientX - dragState.startX,
                y: dragState.initialY + event.clientY - dragState.startY,
            };

            positionRef.current = nextPosition;
            setPosition(nextPosition);
        }, []);

        const handleMouseUp = React.useCallback(() => {
            dragStateRef.current = null;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        }, [handleMouseMove]);

        React.useEffect(
            () => () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            },
            [handleMouseMove, handleMouseUp],
        );

        const handleMouseDown = (event) => {
            onMouseDown?.(event);

            const target = event.target;

            if (
                !(target instanceof Element) ||
                !target.closest(`.${DRAGGABLE_DIALOG_TITLE_CLASS}`)
            ) {
                return;
            }

            if (event.button !== 0) {
                return;
            }

            event.preventDefault();

            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                initialX: positionRef.current.x,
                initialY: positionRef.current.y,
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };

        return (
            <Paper
                ref={ref}
                {...paperProps}
                onMouseDown={handleMouseDown}
                style={{
                    ...style,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                }}
            />
        );
    },
);

export function DiagramEditorSidebar({
    graph,
    selected,
    selectionSize,
    entityWithAttributesHidden,
    setEntityWithAttributesHidden,
    diagramRef,
    accessCell,
    t,

    pushCellsBack,

    syncSelfRelationEdges,
    syncRepeatedParticipantRelationEdges,

    refreshGraph,
    syncAndPersistDiagramData,

    getSelectedEntityData,
    getSelectedRelationData,
    getSelectedIsaData,

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

    clearIdentifyingRelationSemantics,
    syncRelationCardinalityLabels,
    removeRelationAttributes,
    toggleIdentifyingRelation,

    configureIsaHierarchy,

    canDeleteSelectedAttribute,
    deleteSelectedDiagramElements,
}) {
    const hasMultipleSelectedCells = selectionSize > 1;

    const MoveBackAndFrontButtons = () =>
        selected && (
            <React.Fragment>
                <SidebarActionButton onClick={pushCellsBack(true)}>
                    {t("action.sendToBack")}
                </SidebarActionButton>
                <SidebarActionButton onClick={pushCellsBack(false)}>
                    {t("action.bringToFront")}
                </SidebarActionButton>
            </React.Fragment>
        );

    const SelectedElementHeader = () => {
        if (!selected) {
            return null;
        }

        let selectedType = "";

        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            selectedType = t("selection.selectedEntity");
        } else if (
            isRelationShapeCell(selected) &&
            !isIdentifyingRelationDecoratorCell(selected)
        ) {
            selectedType = t("selection.selectedRelation");
        } else if (isIsaShapeCell(selected)) {
            selectedType = t("selection.selectedIsa");
        } else if (isAttributeShapeCell(selected)) {
            selectedType = t("selection.selectedAttribute");
        } else {
            return null;
        }

        return <p className="selected-element-kind">{selectedType}</p>;
    };

    const EmptySelectionGuidance = () => {
        if (selected) {
            return null;
        }

        if (hasMultipleSelectedCells) {
            return (
                <p className="empty-selection-guidance">
                    {t("selection.multipleGuidance")}
                </p>
            );
        }

        return (
            <p className="empty-selection-guidance">
                {t("selection.emptyGuidance")}
            </p>
        );
    };

    const AddAttributeButton = () => {
        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            return (
                <SidebarActionButton onClick={addAttribute}>
                    {t("action.addAttribute")}
                </SidebarActionButton>
            );
        }
    };

    const RelationAddAttributeButton = () => {
        if (
            canRelationHoldAttributes(
                findRelationById(diagramRef.current, selected?.id),
            )
        ) {
            return (
                <SidebarActionButton onClick={addAttribute}>
                    {t("action.addAttribute")}
                </SidebarActionButton>
            );
        }
    };

    const GroupSelectedAttributesButton = () => {
        if (!getSelectedSimpleEntityAttributesForGrouping()) {
            return;
        }

        return (
            <SidebarActionButton
                onClick={groupSelectedSimpleAttributesIntoComposite}
            >
                {t("action.groupCompositeAttribute")}
            </SidebarActionButton>
        );
    };

    const AddChildAttributeButton = () => {
        if (!isAttributeShapeCell(selected)) {
            return;
        }

        const selectedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (!selectedAttributeOwner) {
            return;
        }

        if (!canAddChildAttributeToSelectedAttribute(selectedAttributeOwner)) {
            return;
        }

        return (
            <SidebarActionButton onClick={addChildAttribute}>
                {t("action.addSiblingSubattribute")}
            </SidebarActionButton>
        );
    };

    const ConvertSubattributeToSimpleButton = () => {
        if (!isAttributeShapeCell(selected)) {
            return;
        }

        const selectedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (
            !canConvertSelectedSubattributeToSimpleAttribute(
                selectedAttributeOwner,
            )
        ) {
            return;
        }

        return (
            <SidebarActionButton
                onClick={convertSelectedSubattributeToSimpleAttribute}
            >
                {t("action.convertToSimpleAttribute")}
            </SidebarActionButton>
        );
    };

    const ToggleAttributesButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);
        const isRelationNM =
            isRelationShapeCell(selected) &&
            canRelationHoldAttributes(
                findRelationById(diagramRef.current, selected?.id),
            );

        if (isEntity || isRelationNM) {
            if (
                entityWithAttributesHidden &&
                !entityWithAttributesHidden.hasOwnProperty(selected.id)
            ) {
                const updatedAttributesHidden = {
                    ...entityWithAttributesHidden,
                };
                updatedAttributesHidden[selected.id] = false;
                setEntityWithAttributesHidden(updatedAttributesHidden);
            }
            const attributesHidden = entityWithAttributesHidden?.[selected.id];

            if (attributesHidden !== true) {
                return (
                    <SidebarActionButton
                        onClick={() => hideAttributes(isRelationNM)}
                    >
                        {t("action.hideAttributes")}
                    </SidebarActionButton>
                );
            }
            return (
                <SidebarActionButton
                    onClick={() => showAttributes(isRelationNM)}
                >
                    {t("action.showAttributes")}
                </SidebarActionButton>
            );
        }
    };

    // Primary-key actions are hidden for weak entities, ISA specializations and
    // multivalued attributes because those cases use different key semantics.
    const ToggleAttrKeyButton = () => {
        const isAttribute = isAttributeShapeCell(selected);

        if (!isAttribute) {
            return;
        }

        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();

        if (!selectedEntityAttribute) {
            return;
        }

        const { entity, attribute } = selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            return;
        }

        if (isWeakEntity(entity)) {
            return;
        }

        if (isEntityIsaSpecialization(diagramRef.current, entity.idMx)) {
            return;
        }

        return (
            <SidebarActionButton onClick={toggleAttrKey}>
                {attribute.key
                    ? t("action.removeKey")
                    : t("action.convertToKey")}
            </SidebarActionButton>
        );
    };

    const TogglePartialKeyButton = () => {
        const isAttribute = isAttributeShapeCell(selected);
        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { entity, attribute } = selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            return;
        }

        if (!isWeakEntity(entity)) {
            return;
        }

        if (attribute.key) {
            return;
        }

        return (
            <SidebarActionButton onClick={togglePartialKey}>
                {attribute.partialKey
                    ? t("action.removeDiscriminant")
                    : t("action.convertToDiscriminant")}
            </SidebarActionButton>
        );
    };

    // Multivalued actions are exposed only for attribute shapes that can still be
    // represented by the supported relational transformation.
    const ToggleMultivaluedAttributeButton = () => {
        const isAttribute = isAttributeShapeCell(selected);
        const selectedEntityAttribute =
            getSelectedEntityMultivaluedAttributeData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { attribute, isCompositeMultivaluedTarget } =
            selectedEntityAttribute;

        if (attribute.key || attribute.partialKey) {
            return;
        }

        const label = isCompositeMultivaluedTarget
            ? isMultivaluedAttribute(attribute)
                ? t("action.removeCompositeMultivalued")
                : t("action.markCompositeMultivalued")
            : isMultivaluedAttribute(attribute)
              ? t("action.removeMultivalued")
              : t("action.markMultivalued");

        return (
            <SidebarActionButton onClick={toggleMultivaluedAttribute}>
                {label}
            </SidebarActionButton>
        );
    };

    const ToggleWeakEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        const selectedEntityDiag = getSelectedEntityData();

        if (isEntity && selectedEntityDiag) {
            return (
                <SidebarActionButton onClick={toggleWeakEntity}>
                    {isWeakEntity(selectedEntityDiag)
                        ? t("action.removeWeakEntity")
                        : t("action.markWeakEntity")}
                </SidebarActionButton>
            );
        }
    };

    const ToggleIdentifyingRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedRelationDiag = getSelectedRelationData();

        if (
            isRelation &&
            selectedRelationDiag &&
            isBinaryRelation(selectedRelationDiag)
        ) {
            return (
                <SidebarActionButton onClick={toggleIdentifyingRelation}>
                    {isIdentifyingRelation(selectedRelationDiag)
                        ? t("action.unmarkIdentifyingRelation")
                        : t("action.markIdentifyingRelation")}
                </SidebarActionButton>
            );
        }
    };

    // Relation configuration connects the relation vertex to its participant entities
    // and stores the generated edge/cardinality cell ids in the relation sides.
    const RelationConfigurationButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const [open, setOpen] = React.useState(false);
        const [relationArity, setRelationArity] = React.useState(
            RELATION_ARITIES.BINARY,
        );
        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");
        const [side3, setSide3] = React.useState("");
        const [side1Role, setSide1Role] = React.useState("");
        const [side2Role, setSide2Role] = React.useState("");
        const [side3Role, setSide3Role] = React.useState("");

        const selectedArityIsTernary =
            relationArity === RELATION_ARITIES.TERNARY;

        const selectedRelationSides = {
            side1,
            side2,
            side3,
        };

        const getSelectedSideEntityId = (sideKey) =>
            selectedRelationSides[sideKey]?.idMx ?? "";

        // Roles are required only when a ternary relation repeats the same entity in
        // multiple participant sides.
        const sideRequiresRole = (sideKey) => {
            if (!selectedArityIsTernary) {
                return false;
            }

            const sideEntityId = getSelectedSideEntityId(sideKey);

            if (!sideEntityId) {
                return false;
            }

            const repeatedSideCount = ["side1", "side2", "side3"].filter(
                (currentSideKey) =>
                    getSelectedSideEntityId(currentSideKey) === sideEntityId,
            ).length;

            return repeatedSideCount > 1;
        };

        const getSelectedRoleForSide = (sideKey) => {
            if (!sideRequiresRole(sideKey)) {
                return "";
            }

            if (sideKey === "side1") return side1Role;
            if (sideKey === "side2") return side2Role;
            if (sideKey === "side3") return side3Role;

            return "";
        };

        const handleClickOpen = () => {
            const relation = findRelationById(diagramRef.current, selected?.id);

            setRelationArity(getRelationArity(relation));
            setSide1("");
            setSide2("");
            setSide3("");
            setSide1Role("");
            setSide2Role("");
            setSide3Role("");
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const applySelectedRelationArity = (relation) => {
            if (selectedArityIsTernary) {
                relation.arity = RELATION_ARITIES.TERNARY;
                relation.side3 = relation.side3 ?? createEmptyRelationSide();
                return;
            }

            relation.arity = undefined;
            relation.side3 = undefined;
        };

        const normalizeRelationRole = (role) => String(role ?? "").trim();

        const applySelectedRelationRoles = (relation) => {
            relation.side1.role = normalizeRelationRole(
                getSelectedRoleForSide("side1"),
            );
            relation.side2.role = normalizeRelationRole(
                getSelectedRoleForSide("side2"),
            );

            if (selectedArityIsTernary) {
                relation.side3.role = normalizeRelationRole(
                    getSelectedRoleForSide("side3"),
                );
            }
        };

        // Reconfiguration removes old relation edges and attributes because changing
        // participants or arity can invalidate previous relation semantics.
        const handleAccept = () => {
            const source = selected;
            const relation = findRelationById(diagramRef.current, source.id);

            if (!relation) return;

            if (
                !side1?.idMx ||
                !side2?.idMx ||
                (selectedArityIsTernary && !side3?.idMx)
            ) {
                return;
            }

            if (isIdentifyingRelation(relation)) {
                clearIdentifyingRelationSemantics(relation.idMx);
            }

            const wasConfigured = isRelationConfigured(relation);

            if (wasConfigured) {
                removeExistingGraphCells(
                    graph,
                    getConfiguredRelationGraphCells({ relation, accessCell }),
                );

                removeRelationAttributes(relation);
            }

            applySelectedRelationArity(relation);

            if (wasConfigured) {
                resetRelationSides(relation, { cardinality: "X:X" });
            }

            applySelectedRelationRoles(relation);

            connectRelationGraphSides({
                graph,
                relationCell: source,
                relation,
                side1EntityCell: accessCell(side1.idMx),
                side2EntityCell: accessCell(side2.idMx),
                side3EntityCell: selectedArityIsTernary
                    ? accessCell(side3.idMx)
                    : null,
                cardinalityStyle: getCardinalityStyleString(),
                syncSelfRelationEdges,
                syncRepeatedParticipantRelationEdges,
            });

            syncAndPersistDiagramData();

            setOpen(false);
            setRelationArity(RELATION_ARITIES.BINARY);
            setSide1("");
            setSide2("");
            setSide3("");
            setSide1Role("");
            setSide2Role("");
            setSide3Role("");
        };

        const acceptDisabled =
            side1 === "" ||
            side2 === "" ||
            (selectedArityIsTernary && side3 === "");

        const handleChangeRelationArity = (event) => {
            const nextArity = Number(event.target.value);

            setRelationArity(nextArity);

            if (nextArity !== RELATION_ARITIES.TERNARY) {
                setSide3("");
                setSide1Role("");
                setSide2Role("");
                setSide3Role("");
            }
        };

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };

        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        const handleChangeSide3 = (event) => {
            setSide3(event.target.value);
        };

        const handleChangeSide1Role = (event) => {
            setSide1Role(event.target.value);
        };

        const handleChangeSide2Role = (event) => {
            setSide2Role(event.target.value);
        };

        const handleChangeSide3Role = (event) => {
            setSide3Role(event.target.value);
        };

        if (isRelation) {
            return (
                <>
                    <SidebarActionButton onClick={handleClickOpen}>
                        {t("action.configureRelation")}
                    </SidebarActionButton>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperComponent={DraggableDialogPaper}
                    >
                        <DialogTitle
                            id="alert-dialog-title"
                            className={DRAGGABLE_DIALOG_TITLE_CLASS}
                            sx={{ cursor: "move", userSelect: "none" }}
                        >
                            {t("relation.dialogTitle")}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                {t("relation.dialogHelp")}
                            </DialogContentText>
                            {selectedArityIsTernary && (
                                <>
                                    <Box sx={{ minHeight: 10 }} />
                                    <DialogContentText>
                                        {t("relation.ternaryHelp")}
                                    </DialogContentText>
                                </>
                            )}
                            <Box sx={{ minHeight: 10 }} />
                            <Box sx={{ minWidth: 120 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="relation-arity-label">
                                        {t("relation.arityLabel")}
                                    </InputLabel>
                                    <Select
                                        id="relation-arity"
                                        value={relationArity}
                                        label={t("relation.arityLabel")}
                                        onChange={handleChangeRelationArity}
                                    >
                                        <MenuItem
                                            value={RELATION_ARITIES.BINARY}
                                        >
                                            {t("relation.binary")}
                                        </MenuItem>
                                        <MenuItem
                                            value={RELATION_ARITIES.TERNARY}
                                        >
                                            {t("relation.ternary")}
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side1-label">
                                        {t("relation.side1")}
                                    </InputLabel>
                                    <Select
                                        id="side1"
                                        value={side1}
                                        label={t("relation.side1")}
                                        onChange={handleChangeSide1}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                                {sideRequiresRole("side1") && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <TextField
                                            id="side1-role"
                                            label={t("relation.sideRole", {
                                                side: 1,
                                            })}
                                            value={side1Role}
                                            onChange={handleChangeSide1Role}
                                            fullWidth
                                        />
                                    </>
                                )}
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side2-label">
                                        {t("relation.side2")}
                                    </InputLabel>
                                    <Select
                                        id="side2"
                                        value={side2}
                                        label={t("relation.side2")}
                                        onChange={handleChangeSide2}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                                {sideRequiresRole("side2") && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <TextField
                                            id="side2-role"
                                            label={t("relation.sideRole", {
                                                side: 2,
                                            })}
                                            value={side2Role}
                                            onChange={handleChangeSide2Role}
                                            fullWidth
                                        />
                                    </>
                                )}
                                {selectedArityIsTernary && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <FormControl fullWidth>
                                            <InputLabel id="side3-label">
                                                {t("relation.side3")}
                                            </InputLabel>
                                            <Select
                                                id="side3"
                                                value={side3}
                                                label={t("relation.side3")}
                                                onChange={handleChangeSide3}
                                            >
                                                {diagramRef.current.entities.map(
                                                    (entity) => {
                                                        return (
                                                            <MenuItem
                                                                key={
                                                                    entity.idMx
                                                                }
                                                                value={entity}
                                                            >
                                                                {entity.name}
                                                            </MenuItem>
                                                        );
                                                    },
                                                )}
                                            </Select>
                                        </FormControl>
                                        {sideRequiresRole("side3") && (
                                            <>
                                                <Box sx={{ minHeight: 10 }} />
                                                <TextField
                                                    id="side3-role"
                                                    label={t(
                                                        "relation.sideRole",
                                                        { side: 3 },
                                                    )}
                                                    value={side3Role}
                                                    onChange={
                                                        handleChangeSide3Role
                                                    }
                                                    fullWidth
                                                />
                                            </>
                                        )}
                                    </>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose}>
                                {t("common.cancel")}
                            </Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                {t("common.accept")}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    // Role editing is limited to configured ternary relations. Repeated participants
    // must keep distinct roles to avoid ambiguous foreign-key names.
    const RelationRolesButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedRelationDiag = getSelectedRelationData();

        const [open, setOpen] = React.useState(false);
        const [roles, setRoles] = React.useState({
            side1: "",
            side2: "",
            side3: "",
        });

        const canEditRoles =
            isRelation &&
            selectedRelationDiag &&
            isTernaryRelation(selectedRelationDiag) &&
            isRelationConfigured(selectedRelationDiag);

        const normalizeRole = (role) => String(role ?? "").trim();

        const getSideKeys = (relation) =>
            relation ? getRelationSideKeys(relation) : [];

        const getSideEntityName = (relation, sideKey) => {
            const entityId = relation?.[sideKey]?.entity?.idMx;
            const entityCell = accessCell(entityId);
            const entityData = findEntityById(diagramRef.current, entityId);

            return entityCell?.value ?? entityData?.name ?? "";
        };

        const getSideLabel = (relation, sideKey) => {
            const sideNumber = sideKey.replace("side", "");
            const entityName = getSideEntityName(relation, sideKey);

            return entityName
                ? t("roles.sideLabelWithEntity", {
                      side: sideNumber,
                      entity: entityName,
                  })
                : t("roles.sideLabel", {
                      side: sideNumber,
                  });
        };

        const getRepeatedParticipantSideGroups = (relation) => {
            const groupsByEntityId = {};

            getSideKeys(relation).forEach((sideKey) => {
                const entityId = relation?.[sideKey]?.entity?.idMx;

                if (!entityId) {
                    return;
                }

                groupsByEntityId[entityId] = [
                    ...(groupsByEntityId[entityId] ?? []),
                    sideKey,
                ];
            });

            return Object.values(groupsByEntityId).filter(
                (sideGroup) => sideGroup.length > 1,
            );
        };

        const repeatedParticipantRolesAreValid = (relation) =>
            getRepeatedParticipantSideGroups(relation).every((sideGroup) => {
                const groupRoles = sideGroup.map((sideKey) =>
                    normalizeRole(roles[sideKey]),
                );

                return (
                    groupRoles.every(Boolean) &&
                    new Set(groupRoles).size === groupRoles.length
                );
            });

        const handleClickOpen = () => {
            const relation = getSelectedRelationData();

            setRoles({
                side1: relation?.side1?.role ?? "",
                side2: relation?.side2?.role ?? "",
                side3: relation?.side3?.role ?? "",
            });

            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleChangeRole = (sideKey) => (event) => {
            setRoles((previousRoles) => ({
                ...previousRoles,
                [sideKey]: event.target.value,
            }));
        };

        const handleAccept = () => {
            const relation = getSelectedRelationData();

            if (!relation) {
                return;
            }

            getSideKeys(relation).forEach((sideKey) => {
                relation[sideKey].role = normalizeRole(roles[sideKey]);
            });

            syncRelationCardinalityLabels(relation);
            refreshGraph();
            syncAndPersistDiagramData();

            setOpen(false);

            toast.success(t("feedback.relationRolesUpdated"));
        };

        if (!canEditRoles) {
            return;
        }

        const sideKeys = getSideKeys(selectedRelationDiag);
        const acceptDisabled =
            !repeatedParticipantRolesAreValid(selectedRelationDiag);

        return (
            <>
                <SidebarActionButton onClick={handleClickOpen}>
                    {t("action.editRoles")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="relation-roles-dialog-title"
                    aria-describedby="relation-roles-dialog-description"
                    PaperComponent={DraggableDialogPaper}
                >
                    <DialogTitle
                        id="relation-roles-dialog-title"
                        className={DRAGGABLE_DIALOG_TITLE_CLASS}
                        sx={{ cursor: "move", userSelect: "none" }}
                    >
                        {t("roles.dialogTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="relation-roles-dialog-description">
                            {t("roles.dialogHelp")}
                        </DialogContentText>
                        <Box sx={{ minHeight: 10 }} />
                        <Box sx={{ minWidth: 320 }}>
                            {sideKeys.map((sideKey) => (
                                <React.Fragment key={sideKey}>
                                    <TextField
                                        id={`relation-role-${sideKey}`}
                                        label={getSideLabel(
                                            selectedRelationDiag,
                                            sideKey,
                                        )}
                                        value={roles[sideKey] ?? ""}
                                        onChange={handleChangeRole(sideKey)}
                                        fullWidth
                                    />
                                    <Box sx={{ minHeight: 10 }} />
                                </React.Fragment>
                            ))}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("common.accept")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    // ISA configuration selects one generalization and one or more specializations
    // for the limited inheritance strategy implemented by the editor.
    const IsaConfigurationButton = () => {
        const isIsa = isIsaShapeCell(selected);
        const [open, setOpen] = React.useState(false);
        const [generalizationId, setGeneralizationId] = React.useState("");
        const [specializationIds, setSpecializationIds] = React.useState([]);

        const getEntityNameById = (entityId) =>
            findEntityById(diagramRef.current, entityId)?.name ?? entityId;

        const handleClickOpen = () => {
            const isa = getSelectedIsaData();

            setGeneralizationId(isa?.generalization?.entity?.idMx ?? "");
            setSpecializationIds(
                (isa?.specializations ?? [])
                    .map((specialization) => specialization?.entity?.idMx)
                    .filter(Boolean),
            );
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        // The generalization entity cannot also remain selected as a specialization.
        const handleChangeGeneralization = (event) => {
            const nextGeneralizationId = event.target.value;

            setGeneralizationId(nextGeneralizationId);
            setSpecializationIds((currentSpecializationIds) =>
                currentSpecializationIds.filter(
                    (entityId) => entityId !== nextGeneralizationId,
                ),
            );
        };

        const handleChangeSpecializations = (event) => {
            const value = event.target.value;

            setSpecializationIds(
                typeof value === "string" ? value.split(",") : value,
            );
        };

        const handleAccept = () => {
            const configured = configureIsaHierarchy({
                generalizationId,
                specializationIds,
            });

            if (configured) {
                setOpen(false);
            }
        };

        const acceptDisabled =
            generalizationId === "" ||
            specializationIds.length === 0 ||
            specializationIds.includes(generalizationId);

        if (!isIsa) {
            return;
        }

        return (
            <>
                <SidebarActionButton onClick={handleClickOpen}>
                    {t("action.configureIsa")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    PaperComponent={DraggableDialogPaper}
                >
                    <DialogTitle
                        className={DRAGGABLE_DIALOG_TITLE_CLASS}
                        sx={{ cursor: "move", userSelect: "none" }}
                    >
                        {t("isa.dialogTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {t("isa.dialogHelp")}
                        </DialogContentText>
                        <Box sx={{ minHeight: 10 }} />
                        <Box sx={{ minWidth: 260 }}>
                            <FormControl fullWidth>
                                <InputLabel id="isa-generalization-label">
                                    {t("isa.generalization")}
                                </InputLabel>
                                <Select
                                    id="isa-generalization"
                                    value={generalizationId}
                                    label={t("isa.generalization")}
                                    onChange={handleChangeGeneralization}
                                >
                                    {diagramRef.current.entities.map(
                                        (entity) => (
                                            <MenuItem
                                                key={entity.idMx}
                                                value={entity.idMx}
                                            >
                                                {entity.name}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>

                            <Box sx={{ minHeight: 10 }} />

                            <FormControl fullWidth>
                                <InputLabel id="isa-specializations-label">
                                    {t("isa.specializations")}
                                </InputLabel>
                                <Select
                                    id="isa-specializations"
                                    multiple
                                    value={specializationIds}
                                    label={t("isa.specializations")}
                                    onChange={handleChangeSpecializations}
                                    renderValue={(selectedIds) =>
                                        selectedIds
                                            .map(getEntityNameById)
                                            .join(", ")
                                    }
                                >
                                    {diagramRef.current.entities
                                        .filter(
                                            (entity) =>
                                                entity.idMx !==
                                                generalizationId,
                                        )
                                        .map((entity) => (
                                            <MenuItem
                                                key={entity.idMx}
                                                value={entity.idMx}
                                            >
                                                {entity.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("common.accept")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    // Cardinality editing updates both the domain relation sides and the visible
    // labels embedded in mxGraph relation edges.
    const RelationCardinalitiesButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedDiag = findRelationById(diagramRef.current, selected?.id);
        const [open, setOpen] = React.useState(false);
        const [cardinalities, setCardinalities] = React.useState({
            side1: "",
            side2: "",
            side3: "",
        });

        const sideKeys = getRelationSideKeys(selectedDiag);

        const getCardinalityForSide = (sideKey) => cardinalities[sideKey] ?? "";

        const resetCardinalities = () => {
            setCardinalities({
                side1: "",
                side2: "",
                side3: "",
            });
        };

        const handleClickOpen = () => {
            const nextCardinalities = sideKeys.reduce((result, sideKey) => {
                result[sideKey] = selectedDiag?.[sideKey]?.cardinality ?? "";

                return result;
            }, {});

            setCardinalities(nextCardinalities);
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            // Identifying relations keep fixed owner-side cardinality and restrict the weak
            // side to the supported weak-entity cardinalities.
            if (
                isIdentifyingRelation(selectedDiag) &&
                !side1IsWeak &&
                !side2IsWeak
            ) {
                toast.error(t("feedback.identifyingRelationSidesNotResolved"));
                return;
            }

            if (isIdentifyingRelation(selectedDiag)) {
                if (side1IsWeak) {
                    selectedDiag.side1.cardinality =
                        getCardinalityForSide("side1");
                    selectedDiag.side2.cardinality = "1:1";
                } else {
                    selectedDiag.side1.cardinality = "1:1";
                    selectedDiag.side2.cardinality =
                        getCardinalityForSide("side2");
                }

                removeRelationAttributes(selectedDiag);
            } else {
                sideKeys.forEach((sideKey) => {
                    selectedDiag[sideKey].cardinality =
                        getCardinalityForSide(sideKey);
                });

                if (canRelationTypeHoldAttributes(selectedDiag)) {
                    selectedDiag.canHoldAttributes = true;
                } else {
                    removeRelationAttributes(selectedDiag);
                }
            }

            syncRelationCardinalityLabels(selectedDiag);
            refreshGraph();

            resetCardinalities();
            setOpen(false);
            syncAndPersistDiagramData();
        };

        const handleChangeCardinality = (sideKey) => (event) => {
            setCardinalities((currentCardinalities) => ({
                ...currentCardinalities,
                [sideKey]: event.target.value,
            }));
        };

        const { weakSide, strongSide } = getWeakAndStrongSidesForRelation(
            diagramRef.current,
            selectedDiag,
        );

        const side1IsWeak =
            isIdentifyingRelation(selectedDiag) &&
            weakSide?.entity?.idMx === selectedDiag?.side1?.entity?.idMx;

        const side2IsWeak =
            isIdentifyingRelation(selectedDiag) &&
            weakSide?.entity?.idMx === selectedDiag?.side2?.entity?.idMx;

        const side1IsStrong =
            isIdentifyingRelation(selectedDiag) &&
            strongSide?.entity?.idMx === selectedDiag?.side1?.entity?.idMx;

        const side2IsStrong =
            isIdentifyingRelation(selectedDiag) &&
            strongSide?.entity?.idMx === selectedDiag?.side2?.entity?.idMx;

        const getSideIsWeak = (sideKey) => {
            if (sideKey === "side1") return side1IsWeak;
            if (sideKey === "side2") return side2IsWeak;

            return false;
        };

        const getSideIsStrong = (sideKey) => {
            if (sideKey === "side1") return side1IsStrong;
            if (sideKey === "side2") return side2IsStrong;

            return false;
        };
        // Available cardinalities depend on relation type: ternary, regular binary or
        // identifying binary relation.
        const getAllowedCardinalitiesForSide = (sideKey) => {
            if (isTernaryRelation(selectedDiag)) {
                return TERNARY_RELATION_CARDINALITIES;
            }

            if (!isIdentifyingRelation(selectedDiag)) {
                return POSSIBLE_CARDINALITIES;
            }

            if (getSideIsWeak(sideKey)) {
                return IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES;
            }

            return [IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY];
        };

        const getCardinalityDisplayValue = (cardinality) =>
            getRelationCardinalityDisplayValue(selectedDiag, cardinality);

        const cardinalitySelectIdsBySideKey = {
            side1: "side1-to-side2",
            side2: "side2-to-side1",
            side3: "side3-cardinality",
        };

        const getSideEntityName = (sideKey) =>
            getRelationSideDisplayName({
                relation: selectedDiag,
                sideKey,
                entityName:
                    accessCell(selectedDiag?.[sideKey]?.entity?.idMx)?.value ??
                    "",
            });

        const cardinalityIsAllowedForSide = (sideKey) => {
            const cardinality = getCardinalityForSide(sideKey);

            if (cardinality === "") {
                return false;
            }

            if (isTernaryRelation(selectedDiag)) {
                return TERNARY_RELATION_CARDINALITIES.includes(cardinality);
            }

            return true;
        };

        const acceptDisabled = sideKeys.some(
            (sideKey) => !cardinalityIsAllowedForSide(sideKey),
        );

        if (isRelation) {
            const isConfigured = isRelationConfigured(selectedDiag);

            return (
                <>
                    <SidebarActionButton onClick={handleClickOpen}>
                        {t("action.configureCardinalities")}
                    </SidebarActionButton>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperComponent={DraggableDialogPaper}
                    >
                        <DialogTitle
                            id="alert-dialog-title"
                            className={DRAGGABLE_DIALOG_TITLE_CLASS}
                            sx={{ cursor: "move", userSelect: "none" }}
                        >
                            {t("cardinalities.dialogTitle")}
                        </DialogTitle>
                        {!isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    {isIdentifyingRelation(selectedDiag)
                                        ? t("cardinalities.identifyingHelp")
                                        : t("cardinalities.dialogHelp")}
                                </DialogContentText>
                            </DialogContent>
                        )}
                        {isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    {isIdentifyingRelation(selectedDiag)
                                        ? t("cardinalities.identifyingHelp")
                                        : t("cardinalities.dialogHelp")}
                                </DialogContentText>
                                <Box sx={{ minHeight: 10 }} />
                                <Box sx={{ minWidth: 120 }}>
                                    {sideKeys.map((sideKey) => {
                                        const sideEntityName =
                                            getSideEntityName(sideKey);
                                        const selectId =
                                            cardinalitySelectIdsBySideKey[
                                                sideKey
                                            ];

                                        return (
                                            <React.Fragment key={sideKey}>
                                                <FormControl fullWidth>
                                                    <InputLabel
                                                        id={`${selectId}-label`}
                                                    >
                                                        {sideEntityName}
                                                    </InputLabel>
                                                    <Select
                                                        id={selectId}
                                                        value={getCardinalityForSide(
                                                            sideKey,
                                                        )}
                                                        label={sideEntityName}
                                                        onChange={handleChangeCardinality(
                                                            sideKey,
                                                        )}
                                                        disabled={
                                                            isIdentifyingRelation(
                                                                selectedDiag,
                                                            ) &&
                                                            getSideIsStrong(
                                                                sideKey,
                                                            )
                                                        }
                                                    >
                                                        {getAllowedCardinalitiesForSide(
                                                            sideKey,
                                                        ).map((cardinality) => (
                                                            <MenuItem
                                                                key={
                                                                    cardinality
                                                                }
                                                                value={
                                                                    cardinality
                                                                }
                                                            >
                                                                {getCardinalityDisplayValue(
                                                                    cardinality,
                                                                )}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <Box sx={{ minHeight: 10 }} />
                                            </React.Fragment>
                                        );
                                    })}
                                </Box>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={handleClose}>
                                {t("common.cancel")}
                            </Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                {t("common.accept")}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    const DeleteEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        if (!isEntity) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteAttributeButton = () => {
        const isAttribute = isAttributeShapeCell(selected);

        if (!isAttribute || !canDeleteSelectedAttribute()) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);

        if (!isRelation) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteIsaButton = () => {
        const isIsa = isIsaShapeCell(selected);

        if (!isIsa) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteMultipleSelectionButton = () => {
        if (!hasMultipleSelectedCells) {
            return null;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    return (
        <>
            <SidebarSection title={t("sidebar.selection")}>
                <SelectedElementHeader />
                {renderSidebarAction(EmptySelectionGuidance())}

                {renderSidebarAction(AddAttributeButton())}
                {renderSidebarAction(RelationAddAttributeButton())}
                {renderSidebarAction(GroupSelectedAttributesButton())}
                {renderSidebarAction(AddChildAttributeButton())}
                {renderSidebarAction(ConvertSubattributeToSimpleButton())}
                {renderSidebarAction(ToggleAttributesButton())}
                {renderSidebarAction(ToggleAttrKeyButton())}
                {renderSidebarAction(TogglePartialKeyButton())}
                {renderSidebarAction(ToggleMultivaluedAttributeButton())}
                {renderSidebarAction(ToggleWeakEntityButton())}
                {renderSidebarAction(ToggleIdentifyingRelationButton())}

                {renderSidebarAction(RelationConfigurationButton())}
                {renderSidebarAction(RelationRolesButton())}
                {renderSidebarAction(IsaConfigurationButton())}
                {renderSidebarAction(RelationCardinalitiesButton())}

                {renderSidebarAction(DeleteMultipleSelectionButton())}
                {renderSidebarAction(DeleteEntityButton())}
                {renderSidebarAction(DeleteRelationButton())}
                {renderSidebarAction(DeleteAttributeButton())}
                {renderSidebarAction(DeleteIsaButton())}
            </SidebarSection>

            <SidebarSection title={t("sidebar.order")}>
                {renderSidebarAction(MoveBackAndFrontButtons())}
            </SidebarSection>
        </>
    );
}
