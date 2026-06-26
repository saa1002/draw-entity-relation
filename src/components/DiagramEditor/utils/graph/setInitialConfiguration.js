import { default as MxGraph } from "mxgraph";
import initToolbar from "../toolbar/initToolbar";

const { mxClient, mxEdgeHandler, mxRubberband, mxUtils } = MxGraph();

export default function setInitialConfiguration(graph, diagramRef, toolbarRef) {
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error("Browser is not supported!", 200, false);
        return;
    }

    initToolbar(graph, diagramRef, toolbarRef.current);

    new mxRubberband(graph);

    graph.setPanning(true);
    graph.setTooltips(false);

    // Connections are managed internally, so users cannot create manual edges.
    graph.setConnectable(false);

    graph.setEnabled(true);
    graph.setEdgeLabelsMovable(false);
    graph.setVertexLabelsMovable(false);
    graph.setGridEnabled(true);
    graph.setAllowDanglingEdges(false);

    mxEdgeHandler.prototype.addEnabled = true;
}
