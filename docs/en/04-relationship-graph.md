# Relationship Graph

The Relationship Graph provides an interactive visual canvas of all relationship tuples in the active store. Unlike the Model Viewer's graph (which shows the authorization schema), this canvas shows **actual data** — who is connected to what.

Navigate to **Relationship Graph** in the sidebar.

![Relationship Graph](../assets/screenshots/relationship-graph.png)

## Navigating the Canvas

| Action | How |
|--------|-----|
| Pan | Click and drag on empty canvas area |
| Zoom in/out | Scroll wheel or pinch gesture |
| Fit all nodes | Click the **Fit** button in the toolbar |
| Select a node | Single click |

## Filtering

Use the filter panel on the left to narrow the visible nodes:

- **Type filter:** Show only nodes of specific types (e.g. only `document` and `user`)
- **Relation filter:** Show only edges for specific relations (e.g. only `owner` edges)

Filters update the graph in real time. Reset them to show the full graph again.

## Node Inspector

Click any node to open the **Inspector Panel** on the right. The panel shows:

- The node's type and identifier
- All **outgoing** relations (tuples where this entity is the user)
- All **incoming** relations (tuples where this entity is the object)

For example, clicking `folder:engineering` shows that `user:alice` is its `owner` and `group:backend-team#member` is its `editor`.

The inspector panel helps trace access chains without running individual queries.

## Performance Note

The graph loads all tuples in the active store. For stores with thousands of tuples, the initial render may take a few seconds. The graph remains interactive during progressive loading.
