# Source code structure

This folder contains the React source code of UBU E-R App.

The application is organized around a visual Entity-Relationship editor built with React and mxGraph. The current structure separates the editor orchestration, user interface panels, graph integration utilities, E-R domain rules, relational transformation logic, SQL generation and internationalization.

## Structure

```text
src/
├── components/
│   └── DiagramEditor/
├── domain/
│   ├── er/
│   └── relational/
├── i18n/
├── services/
├── App.js
├── buildInfo.js
├── index.js
└── styles.css
```

## Main entry points

* `index.js`: React application entry point.
* `App.js`: top-level application component.
* `buildInfo.js`: build metadata used by the application.
* `styles.css`: global styles shared by the application.

## Diagram editor

The main editor is located in `components/DiagramEditor`.

```text
components/DiagramEditor/
├── DiagramEditor.js
├── hooks/
├── panels/
├── styles/
└── utils/
```

Main responsibilities:

* `DiagramEditor.js`: main editor orchestrator. It keeps the central editor state, initializes mxGraph, composes hooks and panels, and coordinates the interaction between the visual graph and the internal E-R model.
* `hooks/`: editor actions and services extracted from the main component.
* `panels/`: sidebar and global action panels used by the editor interface.
* `styles/`: styles specific to the diagram editor.
* `utils/`: mxGraph integration, rendering, synchronization, persistence and toolbar helpers.

### Hooks

```text
hooks/
├── useAttributeActions.js
├── useDeletionActions.js
├── useDiagramHistory.js
├── useDiagramPersistence.js
├── useIsaActions.js
└── useRelationActions.js
```

These hooks group editor behavior by responsibility:

* `useDiagramHistory.js`: undo/redo history management.
* `useDiagramPersistence.js`: local persistence and diagram loading/saving actions.
* `useAttributeActions.js`: attribute creation and update actions.
* `useRelationActions.js`: relation creation and update actions.
* `useIsaActions.js`: ISA hierarchy actions.
* `useDeletionActions.js`: deletion logic for selected diagram elements.

### Panels

```text
panels/
├── DiagramEditorGlobalActions.js
├── DiagramEditorPanelControls.js
└── DiagramEditorSidebar.js
```

Panel responsibilities:

* `DiagramEditorGlobalActions.js`: global editor actions such as E-R element creation, history, diagram operations and information actions.
* `DiagramEditorSidebar.js`: contextual controls related to the current selection.
* `DiagramEditorPanelControls.js`: shared panel controls used to avoid repeated UI code.

### Editor utilities

```text
utils/
├── graph/
├── mxStyles/
├── persistence/
├── rendering/
├── selection/
├── sync/
├── toolbar/
└── validation/
```

Utility responsibilities:

* `graph/`: mxGraph setup and interaction helpers.
* `mxStyles/`: visual style definitions for mxGraph cells.
* `persistence/`: file import/export helpers.
* `rendering/`: visual rendering of entities, relations, attributes and decorators.
* `selection/`: selection-related helpers.
* `sync/`: synchronization and reconstruction between the internal E-R model and the mxGraph canvas.
* `toolbar/`: toolbar initialization and item creation.
* `validation/`: editor-facing validation messages.

## E-R domain logic

The E-R domain model is located in `domain/er`.

```text
domain/er/
├── attributes.js
├── diagramComposition.js
├── diagramNormalization.js
├── entities.js
├── examples.js
├── index.js
├── isa.js
├── relations.js
└── validation/
```

This folder contains logic that is independent from the React interface and from mxGraph whenever possible.

Main responsibilities:

* `entities.js`: entity-related helpers.
* `relations.js`: relation-related helpers.
* `attributes.js`: attribute-related helpers.
* `isa.js`: ISA hierarchy helpers.
* `diagramComposition.js`: helpers for combining diagram structures.
* `diagramNormalization.js`: normalization helpers for imported or generated diagrams.
* `examples.js`: predefined E-R structures used by the editor.
* `validation/`: E-R validation rules and diagnostics.

### Validation

```text
domain/er/validation/
├── diagnostics.js
├── helpers.js
├── index.js
├── rules/
└── validationRules.js
```

The validation layer checks the consistency of the E-R diagram before transformation or SQL generation. The rules are grouped by topic inside `rules/`, including entities, attributes, relations, weak entities, ISA and SQL identifier constraints.

## Relational transformation

The transformation from the E-R model to relational structures is located in `domain/relational`.

```text
domain/relational/
├── attributeProjection.js
├── entityKeyColumns.js
├── erToRelationalModel.js
└── naming.js
```

Main responsibilities:

* `erToRelationalModel.js`: main transformation from E-R diagrams to relational structures.
* `attributeProjection.js`: projection of E-R attributes into relational columns.
* `entityKeyColumns.js`: key column helpers for entities and related structures.
* `naming.js`: naming helpers used during relational transformation.

## Services

```text
services/
├── sql.js
└── sqlRenderer.js
```

Service responsibilities:

* `sql.js`: SQL generation service.
* `sqlRenderer.js`: SQL rendering helpers.

## Internationalization

```text
i18n/
├── LanguageContext.js
└── translations.js
```

This folder contains the language context and the translation strings used by the application.

## Maintenance notes

`DiagramEditor.js` intentionally remains the main orchestration component. Some responsibilities have been extracted into hooks, panels and utilities, but the mxGraph initialization and the most coupled editor lifecycle logic are kept in the main component to avoid unnecessary risk.

When extending the application, prefer small and focused changes:

* place E-R domain rules in `domain/er`;
* place relational transformation logic in `domain/relational`;
* place SQL generation or rendering changes in `services`;
* place mxGraph-specific logic in `components/DiagramEditor/utils`;
* place editor actions in `components/DiagramEditor/hooks`;
* place contextual or global editor UI in `components/DiagramEditor/panels`.

Avoid moving mxGraph initialization or synchronization logic unless there is a clear reason and the change can be validated carefully.
