import { default as MxGraph } from "mxgraph";
import initToolbar from "../toolbar/initToolbar";

const { mxClient, mxEdgeHandler, mxRubberband, mxUtils } = MxGraph();

export default function setInitialConfiguration(graph, diagramRef, toolbarRef) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error("Browser is not supported!", 200, false);
    } else {
        initToolbar(graph, diagramRef, toolbarRef.current);

        // Enables rubberband selection
        new mxRubberband(graph);

        // Enables new connections and panning
        graph.setPanning(true);
        graph.setTooltips(false);
        graph.setConnectable(false); // The connections will be managed internally so no manual connections for the user
        graph.setEnabled(true);
        graph.setEdgeLabelsMovable(false);
        graph.setVertexLabelsMovable(false);
        graph.setGridEnabled(true);
        graph.setAllowDanglingEdges(false);

        mxEdgeHandler.prototype.addEnabled = true;
    }
}
