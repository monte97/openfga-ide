# Model, Tuples, and Queries

These three views are the core of openfga-viewer's exploration capabilities. They map directly to the three fundamental concepts in OpenFGA: the authorization model, the relationship tuples, and the permission queries.

## Model Viewer

Navigate to **Model Viewer** in the sidebar.

### DSL View

The DSL view shows the active store's authorization model in OpenFGA's domain-specific language.

![Model Viewer — DSL](../assets/screenshots/model-viewer-dsl.png)

Syntax highlighting makes it easy to read type definitions, relations, and computed usersets. The DSL is read-only in this view.

In the demo model, you'll see four types: `user`, `group`, `folder`, and `document`. The `document` type inherits viewer/editor access from its parent `folder` via `tupleToUserset`.

### Graph View

Click the **Graph** tab to see the model as an interactive node diagram.

![Model Viewer — Graph](../assets/screenshots/model-viewer-graph.png)

Each type is a node. Edges represent relations and their derivation rules (direct, computed userset, tuple-to-userset). Click any node to highlight its connections. Scroll or pinch to zoom; drag to pan.

---

## Tuple Manager

Navigate to **Tuple Manager** to browse and edit relationship tuples.

![Tuple Manager](../assets/screenshots/tuples.png)

### Browsing Tuples

Tuples are displayed in a paginated table with three columns: **User**, **Relation**, **Object**. Use the filter inputs at the top to search by any field.

### Adding a Tuple

1. Click **Add Tuple**
2. Fill in the **User**, **Relation**, and **Object** fields (with autocomplete from the active model)
3. Click **Save**

Example: `user:frank` — `viewer` — `document:architecture`

### Deleting a Tuple

Click the **delete** icon on any row. A confirmation dialog prevents accidental deletion.

> **Tip:** Deleting a tuple removes it from the OpenFGA store immediately. This affects live permission checks.

---

## Query Console

Navigate to **Query Console** to run OpenFGA permission queries against the active store.

### Check

The **Check** tab answers: *"Does this user have this relation on this object?"*

![Query Console — Check](../assets/screenshots/query-check.png)

| Field | Example |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Object | `document:roadmap` |

The result is shown as a large green **Allowed** or red **Denied** indicator. Click **Why?** to expand the authorization tree that explains how the result was derived.

### List Objects

The **List Objects** tab answers: *"Which objects of this type does this user have this relation on?"*

![Query Console — List Objects](../assets/screenshots/query-list.png)

| Field | Example |
|-------|---------|
| User | `user:alice` |
| Relation | `viewer` |
| Type | `document` |

Result: a list of all matching objects (e.g. `document:roadmap`, `document:architecture`, `document:onboarding`).

### List Users

The **List Users** tab answers: *"Which users have this relation on this object?"*

| Field | Example |
|-------|---------|
| Relation | `editor` |
| Object | `document:roadmap` |

Result: a list of all users with the specified relation on the object, including those derived through groups.

### Expand

The **Expand** tab shows the full authorization tree for a relation on an object.

![Query Console — Expand](../assets/screenshots/query-expand.png)

| Field | Example |
|-------|---------|
| Relation | `viewer` |
| Object | `document:roadmap` |

Result: a collapsible tree showing every user or group that has `viewer` access, and through which rule (direct, computed userset, or tuple-to-userset).
