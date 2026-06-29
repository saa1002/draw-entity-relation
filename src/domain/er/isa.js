// Domain helpers for the initial ISA support. The current model stores one
// generalization link and one or more specialization links, but it does not model
// total/partial constraints, disjoint/overlapping constraints, ISA discriminants
// or real multiple inheritance.
const getIsas = (diagram) => (Array.isArray(diagram?.isas) ? diagram.isas : []);

export const ISA_CELL_LABEL = "ISA";

export const createEmptyIsaLink = ({ entityId = "", edgeId = "" } = {}) => ({
    edgeId,
    entity: { idMx: entityId },
});

export const createIsaData = ({
    idMx = "",
    position = { x: 0, y: 0 },
    generalization = createEmptyIsaLink(),
    specializations = [],
} = {}) => ({
    idMx,
    position,
    generalization,
    specializations: Array.isArray(specializations) ? specializations : [],
});

export const findIsaById = (diagram, isaId) =>
    getIsas(diagram).find((isa) => isa.idMx === isaId) ?? null;

export const findIsaIndexById = (diagram, isaId) =>
    getIsas(diagram).findIndex((isa) => isa.idMx === isaId);

export const getIsaGeneralizationEntityId = (isa) =>
    isa?.generalization?.entity?.idMx ?? "";

export const getIsaSpecializationEntityIds = (isa) =>
    (Array.isArray(isa?.specializations) ? isa.specializations : [])
        .map((specialization) => specialization?.entity?.idMx ?? "")
        .filter(Boolean);

export const isEntityIsaSpecialization = (diagram, entityId) =>
    !!entityId &&
    getIsas(diagram).some((isa) =>
        getIsaSpecializationEntityIds(isa).includes(entityId),
    );

export const getIsaEntityIds = (isa) =>
    [
        getIsaGeneralizationEntityId(isa),
        ...getIsaSpecializationEntityIds(isa),
    ].filter(Boolean);

export const isaInvolvesEntity = (isa, entityId) =>
    !!entityId && getIsaEntityIds(isa).includes(entityId);

export const isaHasGeneralization = (isa) =>
    !!getIsaGeneralizationEntityId(isa);

export const isaHasSpecializations = (isa) =>
    getIsaSpecializationEntityIds(isa).length > 0;

// A configured ISA requires a generalization entity, at least one specialization
// entity and the mxGraph edge identifiers needed to reconstruct the hierarchy.
export const isIsaConfigured = (isa) =>
    isaHasGeneralization(isa) &&
    isaHasSpecializations(isa) &&
    !!isa?.generalization?.edgeId &&
    (isa.specializations ?? []).every(
        (specialization) =>
            !!specialization?.entity?.idMx && !!specialization?.edgeId,
    );
