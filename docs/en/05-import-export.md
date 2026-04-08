# Import and Export

Navigate to **Import / Export** in the sidebar.

![Import and Export](../assets/screenshots/import-export.png)

The import/export feature lets you save and restore the complete state of an OpenFGA store (model + tuples) as a single JSON file. This is useful for backups, migrating data between instances, and sharing demo datasets.

## Export

Exports the authorization model and all tuples from the active store as a JSON file.

1. Click **Export store**
2. The browser downloads a file named `<store-name>-<date>.json`

The exported file has this structure:

```json
{
  "storeName": "My Store",
  "exportedAt": "2026-04-08T12:00:00.000Z",
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

This format is identical to the demo fixture in `demo/demo-document-sharing.json`.

## Import

Imports a model and tuples from a JSON file into the active store. The import adds data — it does not delete existing tuples or replace the model unless the model has changed.

**Import from file:**
1. Click **Import** (or drag and drop a file onto the import area)
2. A validation preview shows the model types and tuple count found in the file
3. Review the preview, then click **Confirm import**

**Validation errors** are shown if the file is malformed or the JSON does not match the expected schema. Fix the file and re-import.

> **Warning:** Importing a model that conflicts with existing tuples may cause those tuples to become invalid in OpenFGA. Review the model changes carefully before importing.

## Backup and Restore Workflow

To back up and restore a store:

1. **Export** from the source store
2. Connect to the target instance and select (or create) the target store
3. **Import** the exported file into the target store

This workflow works across OpenFGA instances and versions, as long as the model schema version is compatible.
