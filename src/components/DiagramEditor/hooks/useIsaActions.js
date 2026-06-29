import toast from "react-hot-toast";
import {
    clearPrimaryKeyAttributesInTree,
    createEmptyIsaLink,
    findEntityById,
    findIsaById,
    isIsaConfigured,
} from "../../../domain/er";
import {
    connectIsaGraphLinks,
    getConfiguredIsaGraphCells,
    removeExistingGraphCells,
} from "../utils/graph/graphCanvas";

// ISA actions configure the limited generalization/specialization support and
// keep inherited-key semantics synchronized with the visual hierarchy.

export function useIsaActions({
    graph,
    selected,
    diagramRef,
    accessCell,
    t,
    syncAttributeVisualRepresentation,
    syncAndPersistDiagramData,
}) {
    const getSelectedIsaData = () =>
        findIsaById(diagramRef.current, selected?.id) ?? null;

    // Removes only the configured ISA links. The ISA vertex remains available for
    // reconfiguration.
    const removeIsaConfiguration = (isa) => {
        if (!isa) return;

        removeExistingGraphCells(
            graph,
            getConfiguredIsaGraphCells({
                isa,
                accessCell,
            }),
        );

        isa.generalization = createEmptyIsaLink();
        isa.specializations = [];
    };

    // Configures one generalization and one or more specializations. Specialization
    // primary-key markers are cleared because the key is inherited.
    const configureIsaHierarchy = ({ generalizationId, specializationIds }) => {
        const isa = getSelectedIsaData();

        if (!isa || !generalizationId || specializationIds.length === 0) {
            return false;
        }

        if (specializationIds.includes(generalizationId)) {
            toast.error(
                t("feedback.isaGeneralizationCannotAlsoBeSpecialization"),
            );
            return false;
        }

        if (isIsaConfigured(isa)) {
            removeExistingGraphCells(
                graph,
                getConfiguredIsaGraphCells({
                    isa,
                    accessCell,
                }),
            );
        }

        isa.generalization = createEmptyIsaLink({
            entityId: generalizationId,
        });

        isa.specializations = specializationIds.map((entityId) =>
            createEmptyIsaLink({
                entityId,
            }),
        );

        // Specializations must not keep their own primary key under the implemented ISA
        // strategy.
        specializationIds.forEach((entityId) => {
            const specializationEntity = findEntityById(
                diagramRef.current,
                entityId,
            );

            const changedAttributes = clearPrimaryKeyAttributesInTree(
                specializationEntity?.attributes,
            );

            changedAttributes.forEach(syncAttributeVisualRepresentation);
        });

        const connectedEdges = connectIsaGraphLinks({
            graph,
            isaCell: selected,
            isa,
            generalizationEntityCell: accessCell(generalizationId),
            specializationEntityCells: specializationIds.map((entityId) =>
                accessCell(entityId),
            ),
        });

        if (!connectedEdges) {
            toast.error(t("feedback.isaHierarchyConfigurationFailed"));
            return false;
        }

        syncAndPersistDiagramData();
        toast.success(t("feedback.isaHierarchyConfigured"));

        return true;
    };

    return {
        getSelectedIsaData,
        removeIsaConfiguration,
        configureIsaHierarchy,
    };
}
