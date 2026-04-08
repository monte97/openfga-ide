# Test Suites

Navigate to **Test Suites** in the sidebar.

Test suites let you define, save, and run automated permission checks against your OpenFGA model. Each suite is a named collection of test cases that verify expected access rules.

## What Is a Test Suite?

A test suite contains:

- **Metadata** — name, description, tags
- **Groups** — logical sections that group related test cases
- **Test cases** — individual permission checks, each specifying user, relation, object, and expected result (`allowed` or `denied`)
- **Fixture** — optional model and tuple overrides loaded into an ephemeral store before each run

Suites are stored in the viewer's PostgreSQL database and are independent of the connected OpenFGA instance. The same suite can be run against different instances.

## Suite List

![Test Suites — List](../assets/screenshots/test-suites-list.png)

The suite list shows all saved suites. Each suite card displays:

- Suite name and description
- Tags
- Last run status (✅ passed, ❌ failed, or — if never run)
- The number of groups and test cases

Click a suite card to open it in the **Editor** tab.

## Creating a Suite

1. Click **New Suite** (or **Create your first suite** if the list is empty)
2. Enter a **Name** (required) and optional **Description** and **Tags**
3. Click **Create**

The suite is created with an empty definition and opens immediately in the Editor tab.

## Deleting a Suite

1. Click the **⋯** menu on the suite card
2. Click **Delete**
3. Confirm the dialog — deletion is permanent

Deleting a suite removes it from the database. Completed run results associated with the suite are also deleted.

## Last Run Status

The suite card shows the result of the most recent run:

| Badge | Meaning |
|-------|---------|
| ✅ All passed | Every test case passed in the last run |
| ❌ N failed | One or more test cases failed or errored |
| — | Suite has never been run |

Click a suite card and go to the **Runs** tab to see the full run history.
