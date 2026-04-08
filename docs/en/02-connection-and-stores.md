# Connection and Stores

openfga-viewer connects to one OpenFGA instance at a time. Within that instance, you can switch between multiple stores. Your connection settings and selected store are saved in the browser and restored on next visit.

## Connection Configuration

Click the **connection indicator** in the top-right header (the colored badge) to open the connection popover. The popover first shows the current URL and a status badge.

Click **Edit Connection** to edit. You'll see:

![Connection panel](../assets/screenshots/connection.png)

| Field | Description |
|-------|-------------|
| **URL** | The base URL of your OpenFGA HTTP API (e.g. `http://localhost:8080`) |

Click **Test** to verify that the URL is reachable. A green check mark appears below the field on success. Once the test succeeds, the **Save** button becomes enabled — click it to persist the URL.

A green dot in the header confirms an active connection. A red dot means the URL is unreachable.

## Selecting a Store

The **store selector** is the dropdown in the header. It lists all stores in the connected OpenFGA instance. Type to filter by name.

- Click any store to make it the active store
- The active store is used for all model, tuple, query, and test suite operations
- If no matching stores are found, the dropdown shows "No stores found"

## Store Admin

Navigate to **Store Admin** in the sidebar to create and delete stores.

**Create a store:**
1. Click **New Store**
2. Enter a name
3. Click **Create** — the new store appears in the list and is automatically selected

**Delete a store:**
1. Find the store in the list
2. Click the **⋯** menu → **Delete**
3. Confirm the dialog — deletion is permanent and cannot be undone

> **Note:** Deleting a store removes all its model and tuple data from OpenFGA. Test suites are stored separately in the viewer's database and are not deleted.

## Connection Status

The header shows a real-time connection status:

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Connected to OpenFGA, store selected |
| 🟡 Yellow | Connected, but no store selected |
| 🔴 Red | Cannot reach the OpenFGA URL |
