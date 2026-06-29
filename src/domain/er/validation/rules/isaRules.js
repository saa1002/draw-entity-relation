import { hasPrimaryKeyAttributeInTree } from "../../attributes";
import { findEntityById } from "../../entities";
import {
    getIsaGeneralizationEntityId,
    getIsaSpecializationEntityIds,
    isIsaConfigured,
} from "../../isa";

// ISA validation rules for the limited inheritance strategy implemented by the
// editor: one generalization, one or more specializations and inherited keys.
const getIsas = (graph) => (Array.isArray(graph?.isas) ? graph.isas : []);

export function isaHierarchiesUnconnected(graph) {
    return getIsas(graph).some((isa) => !isIsaConfigured(isa));
}

export function brokenIsaEntityReferences(graph) {
    for (const isa of getIsas(graph)) {
        const entityIds = [
            getIsaGeneralizationEntityId(isa),
            ...getIsaSpecializationEntityIds(isa),
        ];

        if (entityIds.some((entityId) => !entityId)) {
            continue;
        }

        if (
            entityIds.some(
                (entityId) => findEntityById(graph, entityId) === null,
            )
        ) {
            return true;
        }
    }

    return false;
}

export function isaHierarchiesWithRepeatedSpecializations(graph) {
    for (const isa of getIsas(graph)) {
        const specializationIds = getIsaSpecializationEntityIds(isa);

        if (new Set(specializationIds).size !== specializationIds.length) {
            return true;
        }
    }

    return false;
}

export function isaHierarchiesWithGeneralizationAsSpecialization(graph) {
    for (const isa of getIsas(graph)) {
        const generalizationId = getIsaGeneralizationEntityId(isa);

        if (
            generalizationId &&
            getIsaSpecializationEntityIds(isa).includes(generalizationId)
        ) {
            return true;
        }
    }

    return false;
}

// Real multiple inheritance is outside the implemented scope, so an entity cannot
// be a specialization in more than one configured ISA hierarchy.
export function isaSpecializationsInMultipleHierarchies(graph) {
    const specializationIdsInConfiguredHierarchies = new Set();

    for (const isa of getIsas(graph)) {
        if (!isIsaConfigured(isa)) {
            continue;
        }

        const generalizationId = getIsaGeneralizationEntityId(isa);

        if (findEntityById(graph, generalizationId) === null) {
            continue;
        }

        const specializationIds = new Set(getIsaSpecializationEntityIds(isa));

        for (const specializationId of specializationIds) {
            if (findEntityById(graph, specializationId) === null) {
                continue;
            }

            if (
                specializationIdsInConfiguredHierarchies.has(specializationId)
            ) {
                return true;
            }

            specializationIdsInConfiguredHierarchies.add(specializationId);
        }
    }

    return false;
}

// Specializations inherit the generalization primary key and therefore must not
// keep an independent primary-key marker.
export function isaSpecializationsWithPrimaryKey(graph) {
    const specializationIds = new Set(
        getIsas(graph).flatMap(getIsaSpecializationEntityIds),
    );

    for (const entityId of specializationIds) {
        const entity = findEntityById(graph, entityId);

        if (!entity) {
            continue;
        }

        if (hasPrimaryKeyAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    return false;
}
