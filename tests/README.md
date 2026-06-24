# Tests

This folder contains the automated test suite for UBU E-R App.

The suite is split between unit tests, end-to-end tests, shared helpers and graph fixtures.

## Structure

```text
tests/
├── e2e/
├── graphs/
├── helpers/
└── unit/
```

## Unit tests

Unit tests are located in `tests/unit` and are executed with Vitest.

```text
tests/unit/
├── editor/
├── er/
├── relational/
├── sql/
└── validation/
```

Main areas:

* `editor/`: editor utility logic and selection behavior.
* `er/`: Entity-Relationship domain operations.
* `relational/`: transformation from E-R diagrams to relational structures.
* `sql/`: SQL generation.
* `validation/`: diagram validation rules.

Useful commands:

```bash
npm test
npm test -- tests/unit/sql
npm test -- tests/unit/validation
npm test -- tests/unit/relational
```

## End-to-end tests

End-to-end tests are located in `tests/e2e` and are executed with Playwright.

```text
tests/e2e/
├── attributes.spec.js
├── canvas.persistence.spec.js
├── canvas.spec.js
├── composite-attributes.spec.js
├── entities.spec.js
├── isa.spec.js
├── relations.spec.js
└── weak-entities.spec.js
```

Main areas:

* `canvas.spec.js`: general canvas workflows and generated structures.
* `canvas.persistence.spec.js`: persistence, JSON import/export, reset and visual export.
* `entities.spec.js`: basic entity workflows.
* `weak-entities.spec.js`: weak entities and identifying relationships.
* `attributes.spec.js`: basic and multivalued attributes.
* `composite-attributes.spec.js`: composite attributes and composite keys.
* `relations.spec.js`: binary, ternary and reflexive relations.
* `isa.spec.js`: initial ISA support.

Useful commands:

```bash
npm run test:e2e
npm run test:e2e -- tests/e2e/canvas.spec.js
npm run test:e2e -- tests/e2e/relations.spec.js
```

## Helpers

Shared helpers are located in `tests/helpers`.

```text
tests/helpers/
├── canvas.js
├── canvasGraph.js
├── diagramBuilders.js
├── diagramState.js
├── graphLoader.js
├── persistence.js
└── sqlAssertions.js
```

Purpose:

* `canvas.js`: high-level E2E actions over the editor canvas.
* `canvasGraph.js`: lower-level helpers that access mxGraph debug state.
* `diagramState.js`: helpers to read and assert the saved diagram state.
* `persistence.js`: helpers for import, export, reset and localStorage setup.
* `diagramBuilders.js`: builders for unit test diagrams.
* `graphLoader.js`: loader for JSON graph fixtures.
* `sqlAssertions.js`: SQL assertion helpers.

## Graph fixtures

`tests/graphs` contains JSON diagram fixtures used mainly by unit tests.

These fixtures should be treated as stable test data. Prefer clear names that describe the modeled scenario.
