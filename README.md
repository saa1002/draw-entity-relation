# UBU E-R App

![Demo](assets/demo.gif)

UBU E-R App is a web application for modelling Entity-Relationship diagrams in the browser. The application allows users to create and edit E-R diagrams, validate their structure, transform them into a relational representation and generate SQL scripts from the resulting schema.

The project is developed with React and mxGraph. It is based on the original Draw Entity-Relation App and has been extended and stabilised as part of a Bachelor's Thesis at the University of Burgos.

## Main features

* Interactive creation and editing of Entity-Relationship diagrams.
* Support for strong entities, weak entities, attributes, binary relationships, ternary relationships and multivalued or composite attributes.
* Initial and controlled support for ISA/generalisation-specialisation structures.
* Diagram validation before generating relational structures or SQL scripts.
* Transformation from the conceptual E-R model to a relational representation.
* SQL generation compatible with PostgreSQL-oriented syntax.
* Export and import of diagrams in JSON format, with replace and merge modes.
* Visual export of the canvas as PNG or SVG.
* View adjustment tools to improve navigation in the canvas.
* Contextual actions depending on the selected element.
* Visible multi-selection support for moving or deleting several elements at once.
* Help and About sections with project information and credits.
* Spanish and English interface texts.

## Technologies

* React
* mxGraph
* Material UI
* Vitest
* Playwright
* GitHub Actions
* Vercel

## Installation and local execution

Install the project dependencies with:

```bash
npm install
```

Start the development server with:

```bash
npm start
```

Create a production build with:

```bash
npm run build
```

## Verification and evaluation

The application can be evaluated in two ways:

1. **Deployed version**: the final version is available through the Vercel deployment listed in the Deployment section.
2. **Local execution**: the project can be installed and executed locally using the commands described above.

For a complete local verification, the following project scripts are available:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

At the time of submission, the final version was checked with these scripts for static analysis, unit tests, end-to-end tests and production build.

The application does not require a backend server, external database or additional local services. All editing, validation, transformation, SQL generation and JSON import/export operations are executed in the browser.

## Current scope and limitations

The application focuses on the creation, validation and transformation of E-R diagrams into relational structures and SQL scripts.

The support for ISA structures is initial and controlled. It covers a generalisation with one or more specialisations, inherited primary keys and the generation of one table for the generalisation and one table for each specialisation.

Some advanced E-R concepts remain outside the current scope, including aggregation support, full ISA constraints such as total/partial or overlapping/disjoint specialisations, discriminants for ISA hierarchies and full multiple inheritance support.

## Deployment

The application is deployed on Vercel:

* Production: https://draw-entity-relation-opal.vercel.app/

## Credits

This project is based on the original Draw Entity-Relation App developed by Rubén Maté Iturriaga.

The current version extends and stabilises that application as part of a Bachelor's Thesis at the University of Burgos.

## License

This project is distributed under the MIT License.

Third-party dependencies keep their respective licenses.
