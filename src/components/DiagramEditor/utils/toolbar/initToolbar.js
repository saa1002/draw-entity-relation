import { default as MxGraph } from "mxgraph";
import { ISA_CELL_LABEL } from "../../../../domain/er/isa";
import {
    getEntityDimensions,
    getEntityStyleString,
    getIsaDimensions,
    getIsaStyleString,
    getRelationDimensions,
    getRelationStyleString,
} from "../mxStyles/diagramStyles";
import addToolbarItem from "./addToolbarItem";

const {
    mxEvent,
    mxUtils,
    mxToolbar,
    mxClient,
    mxDivResizer,
    mxGeometry,
    mxCell,
} = MxGraph();

export default function initToolbar(graph, diagramRef, tbContainer) {
    // Creates new toolbar without event processing
    const toolbar = new mxToolbar(tbContainer);
    toolbar.enabled = false;

    // Workaround for Internet Explorer ignoring certain styles
    if (mxClient.IS_QUIRKS) {
        document.body.style.overflow = "hidden";
        new mxDivResizer(tbContainer);
    }

    // Enables new connections in the graph
    graph.setConnectable(true);

    // Allow multiple edges between two vertices
    graph.setMultigraph(false);

    const addVertex = (
        icon,
        w,
        h,
        style,
        value = null,
        addEntityToDiagram = null,
        addRelationToDiagram = null,
        addIsaToDiagram = false,
        tooltip = "",
    ) => {
        const vertex = new mxCell(null, new mxGeometry(0, 0, w, h), style);
        if (value) {
            vertex.value = value;
        }
        vertex.setVertex(true);

        const img = addToolbarItem(
            graph,
            toolbar,
            vertex,
            icon,
            diagramRef,
            addEntityToDiagram,
            addRelationToDiagram,
            addIsaToDiagram,
            tooltip,
        );
        img.enabled = true;

        graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
            const tmp = graph.isSelectionEmpty();
            mxUtils.setOpacity(img, tmp ? 100 : 20);
            img.enabled = tmp;
        });
    };

    const entityDims = getEntityDimensions("Entidad");
    const relationDims = getRelationDimensions("Relación");
    const isaDims = getIsaDimensions();

    addVertex(
        "images/rectangle.png",
        entityDims.width,
        entityDims.height,
        getEntityStyleString(),
        "Entidad",
        true, //addEntityToDiagram
        false, //addRelationToDiagram
        false,
        "Arrastra para añadir una entidad al diagrama", //tooltip
    );
    addVertex(
        "images/rhombus.png",
        relationDims.width,
        relationDims.height,
        getRelationStyleString({ isIdentifying: false }),
        "Relación",
        false, //addEntityToDiagram
        true, //addRelationToDiagram
        false,
        "Arrastra para añadir una relación al diagrama", //tooltip
    );
    addVertex(
        "images/triangle.png",
        isaDims.width,
        isaDims.height,
        getIsaStyleString(),
        ISA_CELL_LABEL,
        false,
        false,
        true,
        "Arrastra para añadir una ISA al diagrama", //tooltip
    );
}
