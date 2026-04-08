# Test Execution

## Triggering a Run

Open a suite from the **Test Suites** list. In the editor header, click the **Run Suite** button to start execution.

> **Note:** The Run Suite button is disabled until the suite has a fixture. A fixture (model + tuples) is always required — it defines the ephemeral store against which every test case is executed. If the button is disabled, switch to the **Fixture** tab and define or import a fixture first.

## Execution Phases

Each run goes through four phases shown in a timeline:

![Test Execution — Running](../assets/screenshots/test-execution-running.png)

| Phase | Description |
|-------|-------------|
| **Provisioning** | An ephemeral OpenFGA store is created for this run |
| **Loading fixtures** | The suite's fixture (model + tuples) is loaded into the ephemeral store |
| **Running checks** | Each test case is executed as a `Check` call against the ephemeral store |
| **Cleanup** | The ephemeral store is deleted, regardless of pass/fail outcome |

The viewer polls for run updates every 2 seconds. If polling encounters 5 consecutive errors, it stops automatically and shows a **Retry** button.

## Reading Results

When the run completes:

![Test Execution — Results](../assets/screenshots/test-execution-results.png)

The header shows a summary: **total**, **passed**, **failed**, and **errored** counts, plus the total duration.

Below the summary, each test case shows:

| Column | Description |
|--------|-------------|
| Status | ✅ Pass, ❌ Fail, ⚠️ Error |
| Description | The test case label |
| User / Relation / Object | The check parameters |
| Expected | `allowed` or `denied` |
| Actual | The result returned by OpenFGA |
| Duration | Time for this individual check |

**Failed test cases** — where actual ≠ expected — are highlighted in red. These indicate that the authorization model or the fixture data does not match the intended access rules.

**Errored test cases** — where the check itself failed (e.g. network error, invalid tuple) — are shown with a warning icon and an error message.

## Distinction: Test Failure vs Execution Error

- **Test failure**: The check ran successfully but the result differs from expected. This means your authorization policy is incorrect.
- **Execution error**: The check could not be performed (OpenFGA unreachable, fixture failed to load, invalid model). These do not reflect your policy — fix the infrastructure issue first.

## Run History

Each completed run is saved. Open a suite and go to the **Runs** tab to see all past runs with their timestamps and summary results.

The most recent run result is also shown on the suite card in the suite list.
