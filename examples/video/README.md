# Video example diagrams

This directory contains example diagrams and generated SQL outputs used as auxiliary material for the demonstration and guide videos of the Bachelor's Thesis.

The JSON files were exported from UBU E-R App and can be imported into the application to reproduce representative modelling scenarios. The SQL files are reference outputs generated from those diagrams.

## Structure

- `json/`: diagrams exported from UBU E-R App.
- `sql/`: SQL scripts generated from the corresponding JSON examples.

## Included examples

- `01-demo-oficial`: main example for the official functional demonstration video.
- `02-guia-basica-final`: basic example with 1:N, 1:1 and N:M relationships.
- `03-debiles-final`: weak entities in cascade and identifying relationships.
- `04-atributos-avanzados-final`: composite and multivalued attributes.
- `05-reflexiva-final`: binary reflexive relationship.
- `06-ternaria-final`: ternary relationship with a relationship attribute.
- `07-tenis-ternaria-reflexiva`: ternary relationship with a repeated participant and roles.
- `08-isa-final`: two-level ISA/generalisation-specialisation hierarchy.
- `09-estructuras-final`: example based on predefined structures generated from the application.

## Usage

To reproduce an example:

1. Open UBU E-R App.
2. Select the JSON import option.
3. Choose one of the files from `json/`.
4. Import it using replace or merge mode.
5. Run the diagram validation.
6. Generate the relational representation or SQL script.
7. Compare the generated SQL with the corresponding file in `sql/` if needed.

These examples are intended as reproducible demonstration material and as support for manual review. The generated SQL should be understood as an academic and simplified translation compatible with PostgreSQL-oriented syntax.