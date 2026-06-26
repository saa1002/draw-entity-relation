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
    const toolbar = new mxToolbar(tbContainer);
    toolbar.enabled = false;

    if (mxClient.IS_QUIRKS) {
        document.body.style.overflow = "hidden";
        new mxDivResizer(tbContainer);
    }

    graph.setConnectable(true);
    graph.setMultigraph(false);

    const addVertex = (
        icon,
        w,
        h,
        style,
        value = null,
        addEntityToDiagram = false,
        addRelationToDiagram = false,
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
        true,
        false,
        false,
        "Arrastra para añadir una entidad al diagrama",
    );
    addVertex(
        "images/rhombus.png",
        relationDims.width,
        relationDims.height,
        getRelationStyleString(),
        "Relación",
        false,
        true,
        false,
        "Arrastra para añadir una relación al diagrama",
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
        "Arrastra para añadir una ISA al diagrama",
    );
}
