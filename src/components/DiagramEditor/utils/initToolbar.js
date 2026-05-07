import { default as MxGraph } from "mxgraph";
import { addToolbarItem } from "./";
import {
    getEntityDimensions,
    getEntityStyleString,
    getRelationDimensions,
    getRelationStyleString,
} from "./diagramStyles";

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

    addVertex(
        "images/rectangle.png",
        entityDims.width,
        entityDims.height,
        getEntityStyleString(),
        "Entidad",
        true, //addEntityToDiagram
        false, //addRelationToDiagram
    );
    addVertex(
        "images/rhombus.png",
        relationDims.width,
        relationDims.height,
        getRelationStyleString({ isIdentifying: false }),
        "Relación",
        false, //addEntityToDiagram
        true, //addRelationToDiagram
    );
}
