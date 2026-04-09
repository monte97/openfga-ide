# Changelog

## [0.2.0](https://github.com/monte97/openfga-ide/compare/v0.1.0...v0.2.0) (2026-04-09)


### Features

* add Playwright E2E smoke tests ([9930b9c](https://github.com/monte97/openfga-ide/commit/9930b9c191ff5dbe6d010384c10a8de608942f38))
* **docs:** add Playwright screenshot capture script ([7e34399](https://github.com/monte97/openfga-ide/commit/7e34399d5b1f519e0562d1b73f18a5be37061598))
* E2E functional tests and infrastructure rework ([da0db19](https://github.com/monte97/openfga-ide/commit/da0db1932d31c853ac09637afda7dfbbb8006a47))
* Epic 11 — async safety, state reset, and connection store UX polish ([e5003a5](https://github.com/monte97/openfga-ide/commit/e5003a54b2d8b5bb9bf8b543a6cdce5a5a025a03))
* Epic 2 — Visualize Authorization Models (Stories 2.1, 2.2, 2.3) ([cceb16f](https://github.com/monte97/openfga-ide/commit/cceb16f3363caac200a212f013991470cb6cf60f))
* Epic 3 — Manage Tuples (Stories 3.1, 3.2, 3.3) ([02a1b0a](https://github.com/monte97/openfga-ide/commit/02a1b0aa433111698e86cf94cbc48829e6ae6352))
* Epics 4-6 — Query Permissions, Relationship Graph, Import/Export ([dbb9442](https://github.com/monte97/openfga-ide/commit/dbb94422af947571f9c78cf6b768790bddc5f96e))
* Epics 7-10 — Authorization Test Suite Management ([fb5b062](https://github.com/monte97/openfga-ide/commit/fb5b0621f474a501c2c76844b8b09a4a8fa0dfa4))
* initial implementation — Sprint 1 stories 1.1-1.6 ([d689f6a](https://github.com/monte97/openfga-ide/commit/d689f6aa00f8dd99f1d570049ed4a12e8d7b6700))
* merge feature/test-suite-management into master ([ec7f66b](https://github.com/monte97/openfga-ide/commit/ec7f66b839823dd669a3027ee2b9d41e1b469382))
* show real group/test counts in SuiteCard ([1dae6d0](https://github.com/monte97/openfga-ide/commit/1dae6d0767c2a0f1aa444dec88ae2ddc67b98069))


### Bug Fixes

* add openfga healthcheck and backend service_healthy dependency ([5760723](https://github.com/monte97/openfga-ide/commit/576072395549019cadc7ff1fb340709fb3d2a828))
* add router.onError() handler for failed lazy-loaded route imports ([e0bafc9](https://github.com/monte97/openfga-ide/commit/e0bafc9f478ea8b2d96148e3fc818a9555e9303e))
* AppTabs falls back to index 0 when modelValue has no matching tab ([acac84d](https://github.com/monte97/openfga-ide/commit/acac84da0a731a9d0c97923f10e5cb2eebd59224))
* build errors, Docker proxy, layout height, and store persistence ([554b4f4](https://github.com/monte97/openfga-ide/commit/554b4f46f70b8d7536232daed60caafa8fce95c6))
* clear stale fixture validation banner when returning to Fixture tab ([9df1503](https://github.com/monte97/openfga-ide/commit/9df1503c229ec20af3c9500ccbab095498997e1e))
* compute counts from definition in mapRowToSuite; add SuiteCard count tests ([33f8724](https://github.com/monte97/openfga-ide/commit/33f8724b0782b8efad4cab36c947c55189c616ad))
* Epic 3 code review patches ([ba60d57](https://github.com/monte97/openfga-ide/commit/ba60d5786b695a756ccb6c1a5d940d41d4d20377))
* prevent loadingSuite flicker when rapid suite switches abort in-flight fetch ([4e353f5](https://github.com/monte97/openfga-ide/commit/4e353f5c0bf837b8a8ffee6f91d8150111cc2e88))
* propagate Zod-transformed values for params and query in validate middleware ([10d2a74](https://github.com/monte97/openfga-ide/commit/10d2a74924ceaf5667ba0229a494e37fcbe5df96))
* reject whitespace-only strings in Zod validators ([dbaa339](https://github.com/monte97/openfga-ide/commit/dbaa339760a433460dd2b96b085c59965c68a709))
* remove redundant isReady() call in router redirect test ([143aa59](https://github.com/monte97/openfga-ide/commit/143aa5950b5b76d24b718dabfd434aca10b17862))
* replace hasNavigatedThisSession flag with route-aware redirect in selectStore ([73bd6cd](https://github.com/monte97/openfga-ide/commit/73bd6cd04de27a1791b7eea241e4aabbee55b3cf))
* reset _initPromise in closePool and exclude dist/ from vitest ([72831b4](https://github.com/monte97/openfga-ide/commit/72831b4125942cddfb4d3ea3ccdcb91a3aebe7d4))
* reset editorMode on mount and auto-dismiss error toasts after 8s ([a511221](https://github.com/monte97/openfga-ide/commit/a51122166c62da188dda9edbd0e61f14293a4d5a))
* resolve all lint errors surfaced by CI quality job ([c7e142a](https://github.com/monte97/openfga-ide/commit/c7e142ad2214c888ceef1a5c5f26be3dd9fb9908))
* resolve all type-check errors surfaced by CI + audit scope ([82f5ccc](https://github.com/monte97/openfga-ide/commit/82f5ccc8431172340af182c7ebc86c4d1faf8246))
* robustness and validation improvements ([7413826](https://github.com/monte97/openfga-ide/commit/74138264f6a6e5f9a5d7a22801ce5c1d4201edbd))
* rollback activeSuite definition to last server-confirmed state on save failure ([5c2389d](https://github.com/monte97/openfga-ide/commit/5c2389d706ffc9e3f83a75faf679a8f2b57ff28f))
* suppress toast in testConnection via silent option in useApi ([1acf556](https://github.com/monte97/openfga-ide/commit/1acf55683e0d40721203e852288c28dbc6455384))
* type suiteId route handlers to resolve string|string[] TS error ([69132d4](https://github.com/monte97/openfga-ide/commit/69132d48b98f38accc2f076f522ba8c4057bb32f))
* type-check passes for __tests__/ + CI audit level ([a44978c](https://github.com/monte97/openfga-ide/commit/a44978c9febd2f27c785cf54367b3fa545109fdc))
* use aria-live assertive for error toasts ([2dfd9d6](https://github.com/monte97/openfga-ide/commit/2dfd9d6bc697f06cf29baf223a5344a6ca58ac4c))
