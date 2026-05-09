export const clearGraphCanvas = (graph) => {
    if (!graph?.model?.cells) return;

    const cellsToRemove = Object.keys(graph.model.cells)
        .filter((key) => key !== "0" && key !== "1")
        .map((key) => graph.model.cells[key])
        .filter(Boolean);

    if (cellsToRemove.length === 0) return;

    graph.removeCells(cellsToRemove);
};
