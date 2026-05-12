import {
    getAttributeDimensions,
    getEntityDimensions,
    getRelationDimensions,
} from "../mxStyles/diagramStyles";

export const installGraphLabelEditingHandler = ({
    graph,
    getDiagram,
    accessCell,
    isWeakEntity,
    isIdentifyingRelation,
    isWeakEntityDecoratorCell,
    isIdentifyingRelationDecoratorCell,
    findEntityById,
    findRelationById,
    getAttributeDataById,
    syncDiscriminantUnderline,
    syncMultivaluedAttributeDecorator,
    syncWeakEntityDecorator,
    syncIdentifyingRelationDecorator,
    syncIdentifyingRelationEdgeDecorator,
    updateDiagramData,
}) => {
    if (!graph) {
        return () => {};
    }

    const resizeCellGeometry = ({ graph, cell, width, height }) => {
        if (!cell?.geometry) return;

        const geometry = cell.geometry.clone();

        geometry.width = width;
        geometry.height = height;

        graph.getModel().setGeometry(cell, geometry);
    };

    const originalCellLabelChanged = graph.cellLabelChanged;

    graph.cellLabelChanged = function (cell, newValue, autoSize) {
        originalCellLabelChanged.call(this, cell, newValue, autoSize);

        if (!cell?.style) return;

        const identifyingRelationEdgesToSync = [];

        const diagram = getDiagram();

        this.getModel().beginUpdate();

        try {
            if (cell.style.includes("shape=ellipse")) {
                const { width, height } = getAttributeDimensions(newValue);

                resizeCellGeometry({
                    graph,
                    cell,
                    width,
                    height,
                });

                const attributeData = getAttributeDataById(cell.id);

                if (attributeData?.multivalued) {
                    syncMultivaluedAttributeDecorator(cell);
                }

                if (attributeData?.partialKey) {
                    syncDiscriminantUnderline(cell);
                }
            } else if (
                cell.style.includes("shape=rectangle") &&
                !isWeakEntityDecoratorCell(cell)
            ) {
                const { width, height } = getEntityDimensions(newValue);

                resizeCellGeometry({
                    graph,
                    cell,
                    width,
                    height,
                });

                const entityData = findEntityById(diagram, cell.id);

                if (isWeakEntity(entityData)) {
                    syncWeakEntityDecorator(cell);
                }

                if (entityData?.identifyingRelationId) {
                    const relationData = findRelationById(
                        diagram,
                        entityData.identifyingRelationId,
                    );
                    const relationCell = accessCell(relationData?.idMx);

                    if (relationData && relationCell) {
                        identifyingRelationEdgesToSync.push({
                            relationCell,
                            relationData,
                        });
                    }
                }
            } else if (
                cell.style.includes("shape=rhombus") &&
                !isIdentifyingRelationDecoratorCell(cell)
            ) {
                const { width, height } = getRelationDimensions(newValue);

                resizeCellGeometry({
                    graph,
                    cell,
                    width,
                    height,
                });

                const relationData = findRelationById(diagram, cell.id);

                if (isIdentifyingRelation(relationData)) {
                    syncIdentifyingRelationDecorator(cell);
                    identifyingRelationEdgesToSync.push({
                        relationCell: cell,
                        relationData,
                    });
                }
            }
        } finally {
            this.getModel().endUpdate();
        }

        graph.view.invalidate(cell, false, true);
        graph.view.validate();

        this.refresh(cell);

        identifyingRelationEdgesToSync.forEach(
            ({ relationCell, relationData }) => {
                graph.view.invalidate(relationCell, false, true);
                graph.view.validate();

                syncIdentifyingRelationEdgeDecorator(
                    relationCell,
                    relationData,
                );
            },
        );

        updateDiagramData();
    };

    return () => {
        graph.cellLabelChanged = originalCellLabelChanged;
    };
};
