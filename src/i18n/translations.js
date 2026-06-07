export const DEFAULT_LANGUAGE = "es";

export const LANGUAGE_STORAGE_KEY = "draw-er-language";

export const SUPPORTED_LANGUAGES = [
    {
        code: "es",
        labelKey: "language.optionSpanish",
    },
    {
        code: "en",
        labelKey: "language.optionEnglish",
    },
];

export const TRANSLATIONS = {
    es: {
        "app.buildLabel": "Compilacion: {{date}}",

        "language.sectionTitle": "Idioma",
        "language.label": "Idioma",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",

        "sidebar.erElements": "Elementos E/R",
        "sidebar.selection": "Selección",
        "sidebar.order": "Orden",
        "sidebar.history": "Historial",
        "sidebar.diagram": "Diagrama",

        "selection.selectedEntity": "Entidad seleccionada",
        "selection.selectedRelation": "Relación seleccionada",
        "selection.selectedIsa": "ISA seleccionada",
        "selection.selectedAttribute": "Atributo seleccionado",

        "action.addAttribute": "Añadir atributo",
        "action.groupCompositeAttribute": "Agrupar en atributo compuesto",
        "action.addSiblingSubattribute": "Añadir subatributo hermano",
        "action.convertToSimpleAttribute": "Convertir en atributo simple",
        "action.hideAttributes": "Ocultar atributos",
        "action.showAttributes": "Mostrar atributos",
        "action.removeKey": "Quitar clave",
        "action.convertToKey": "Convertir en clave",
        "action.removeDiscriminant": "Quitar discriminante",
        "action.convertToDiscriminant": "Convertir en discriminante",
        "action.removeCompositeMultivalued":
            "Quitar multivaluado del compuesto",
        "action.markCompositeMultivalued": "Marcar compuesto como multivaluado",
        "action.removeMultivalued": "Quitar multivaluado",
        "action.markMultivalued": "Marcar multivaluado",
        "action.removeWeakEntity": "Quitar entidad débil",
        "action.markWeakEntity": "Marcar como entidad débil",
        "action.unmarkIdentifyingRelation":
            "Desmarcar como dependencia por identificación",
        "action.markIdentifyingRelation":
            "Marcar como dependencia por identificación",
        "action.sendToBack": "Enviar al fondo",
        "action.bringToFront": "Traer al frente",
        "action.undo": "Deshacer",
        "action.redo": "Rehacer",
        "action.configureRelation": "Configurar relación",
        "action.editRoles": "Editar roles",
        "action.configureIsa": "Configurar ISA",
        "action.configureCardinalities": "Configurar cardinalidades",
        "action.delete": "Borrar",

        "common.cancel": "Cancelar",
        "common.accept": "Aceptar",
        "common.close": "Cerrar",

        "diagram.generateSql": "Generar SQL",
        "diagram.generateSqlTitle": "Generar script SQL",
        "diagram.exportJson": "Exportar JSON",
        "diagram.exportJsonTitle": "Exportar diagrama en JSON",
        "diagram.importJson": "Importar JSON",
        "diagram.importJsonTitle": "Importar diagrama desde JSON",
        "diagram.importJsonHelp":
            "Selecciona un archivo JSON exportado previamente. Si el archivo es válido, reemplazará el diagrama actual.",
        "diagram.reset": "Reiniciar",
        "diagram.resetTitle": "Reiniciar diagrama",
        "diagram.resetHelp":
            "Esta acción eliminará todos los elementos del diagrama actual. ¿Deseas reiniciarlo?",

        "generateStructure.button": "Generar estructura",
        "generateStructure.title": "Generar estructura básica",
        "generateStructure.selectorLabel": "Estructura",
        "generateStructure.help":
            "Selecciona una estructura E/R básica para generarla con los nombres por defecto de la aplicación. La estructura reemplazará el diagrama actual y podrá editarse después manualmente.",
        "generateStructure.continueQuestion": "¿Deseas continuar?",
        "generateStructure.success": "Estructura generada: {{name}}.",

        "generateStructure.templates.many-to-many.name": "Relación N:M básica",
        "generateStructure.templates.many-to-many.description":
            "Crea dos entidades con atributos, una relación N:M entre ellas y un atributo propio de la relación.",
        "generateStructure.templates.one-to-many.name": "Relación 1:N básica",
        "generateStructure.templates.one-to-many.description":
            "Crea dos entidades con atributos y una relación 1:N entre ellas.",
        "generateStructure.templates.one-to-one.name": "Relación 1:1 básica",
        "generateStructure.templates.one-to-one.description":
            "Crea dos entidades con atributos y una relación 1:1 entre ellas.",
        "generateStructure.templates.ternary.name": "Relación ternaria básica",
        "generateStructure.templates.ternary.description":
            "Crea tres entidades con clave primaria y una relación ternaria N:M:P con atributo propio.",
        "generateStructure.templates.weak-entity.name": "Entidad débil básica",
        "generateStructure.templates.weak-entity.description":
            "Crea una entidad fuerte, una entidad débil con discriminante y una relación identificadora.",
        "generateStructure.templates.isa.name": "ISA básica",
        "generateStructure.templates.isa.description":
            "Crea una generalización, dos especializaciones y una jerarquía ISA válida.",

        "emptyCanvas.title": "Añade una entidad para comenzar",
        "emptyCanvas.text":
            "También puedes importar un diagrama JSON existente.",

        "relation.dialogTitle": "Configurar relación",
        "relation.dialogHelp":
            "Selecciona el tipo de relación y las entidades que participan en cada lado.",
        "relation.ternaryHelp":
            "En una relación ternaria participan tres lados. Si una misma entidad aparece en más de un lado, asigna roles diferentes para distinguir cada participación.",
        "relation.arityLabel": "Tipo de relación",
        "relation.binary": "Binaria",
        "relation.ternary": "Ternaria",
        "relation.side1": "Lado 1",
        "relation.side2": "Lado 2",
        "relation.side3": "Lado 3",
        "relation.sideRole": "Rol lado {{side}}",

        "roles.dialogTitle": "Editar roles",
        "roles.dialogHelp":
            "Los roles sirven para distinguir varias participaciones de una misma entidad dentro de una relación ternaria. Usa nombres breves y distintos, por ejemplo origen y destino.",
        "roles.sideLabelWithEntity": "Rol lado {{side}} ({{entity}})",
        "roles.sideLabel": "Rol lado {{side}}",

        "isa.dialogTitle": "Configurar ISA",
        "isa.dialogHelp":
            "Selecciona una única generalización y una o varias especializaciones. Las especializaciones heredan la clave de la generalización y no deben tener clave propia.",
        "isa.generalization": "Generalización",
        "isa.specializations": "Especializaciones",

        "cardinalities.dialogTitle": "Configurar cardinalidades",
        "cardinalities.dialogHelp":
            "Selecciona la cardinalidad de cada lado de la relación.",
        "cardinalities.identifyingHelp":
            "En una relación de dependencia por identificación, el lado de la entidad propietaria mantiene cardinalidad 1:1.",
    },
    en: {
        "app.buildLabel": "Build: {{date}}",

        "language.sectionTitle": "Language",
        "language.label": "Language",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",

        "sidebar.erElements": "ER elements",
        "sidebar.selection": "Selection",
        "sidebar.order": "Order",
        "sidebar.history": "History",
        "sidebar.diagram": "Diagram",

        "selection.selectedEntity": "Selected entity",
        "selection.selectedRelation": "Selected relation",
        "selection.selectedIsa": "Selected ISA",
        "selection.selectedAttribute": "Selected attribute",

        "action.addAttribute": "Add attribute",
        "action.groupCompositeAttribute": "Group as composite attribute",
        "action.addSiblingSubattribute": "Add sibling subattribute",
        "action.convertToSimpleAttribute": "Convert to simple attribute",
        "action.hideAttributes": "Hide attributes",
        "action.showAttributes": "Show attributes",
        "action.removeKey": "Remove key",
        "action.convertToKey": "Convert to key",
        "action.removeDiscriminant": "Remove discriminant",
        "action.convertToDiscriminant": "Convert to discriminant",
        "action.removeCompositeMultivalued":
            "Remove multivalued from composite",
        "action.markCompositeMultivalued": "Mark composite as multivalued",
        "action.removeMultivalued": "Remove multivalued",
        "action.markMultivalued": "Mark multivalued",
        "action.removeWeakEntity": "Remove weak entity",
        "action.markWeakEntity": "Mark as weak entity",
        "action.unmarkIdentifyingRelation": "Unmark as identifying dependency",
        "action.markIdentifyingRelation": "Mark as identifying dependency",
        "action.sendToBack": "Send to back",
        "action.bringToFront": "Bring to front",
        "action.undo": "Undo",
        "action.redo": "Redo",
        "action.configureRelation": "Configure relationship",
        "action.editRoles": "Edit roles",
        "action.configureIsa": "Configure ISA",
        "action.configureCardinalities": "Configure cardinalities",
        "action.delete": "Delete",

        "common.cancel": "Cancel",
        "common.accept": "Accept",
        "common.close": "Close",

        "diagram.generateSql": "Generate SQL",
        "diagram.generateSqlTitle": "Generate SQL script",
        "diagram.exportJson": "Export JSON",
        "diagram.exportJsonTitle": "Export diagram as JSON",
        "diagram.importJson": "Import JSON",
        "diagram.importJsonTitle": "Import diagram from JSON",
        "diagram.importJsonHelp":
            "Select a previously exported JSON file. If the file is valid, it will replace the current diagram.",
        "diagram.reset": "Reset",
        "diagram.resetTitle": "Reset diagram",
        "diagram.resetHelp":
            "This action will remove all elements from the current diagram. Do you want to reset it?",

        "generateStructure.button": "Generate structure",
        "generateStructure.title": "Generate basic structure",
        "generateStructure.selectorLabel": "Structure",
        "generateStructure.help":
            "Select a basic E/R structure to generate it with the application's default names. The structure will replace the current diagram and can be edited manually afterwards.",
        "generateStructure.continueQuestion": "Do you want to continue?",
        "generateStructure.success": "Generated structure: {{name}}.",

        "generateStructure.templates.many-to-many.name":
            "Basic N:M relationship",
        "generateStructure.templates.many-to-many.description":
            "Creates two entities with attributes, an N:M relationship between them and one relationship attribute.",
        "generateStructure.templates.one-to-many.name":
            "Basic 1:N relationship",
        "generateStructure.templates.one-to-many.description":
            "Creates two entities with attributes and a 1:N relationship between them.",
        "generateStructure.templates.one-to-one.name": "Basic 1:1 relationship",
        "generateStructure.templates.one-to-one.description":
            "Creates two entities with attributes and a 1:1 relationship between them.",
        "generateStructure.templates.ternary.name":
            "Basic ternary relationship",
        "generateStructure.templates.ternary.description":
            "Creates three entities with primary keys and a ternary N:M:P relationship with one relationship attribute.",
        "generateStructure.templates.weak-entity.name": "Basic weak entity",
        "generateStructure.templates.weak-entity.description":
            "Creates a strong entity, a weak entity with a discriminant and an identifying relationship.",
        "generateStructure.templates.isa.name": "Basic ISA",
        "generateStructure.templates.isa.description":
            "Creates one generalization, two specializations and a valid ISA hierarchy.",

        "emptyCanvas.title": "Add an entity to get started",
        "emptyCanvas.text": "You can also import an existing JSON diagram.",

        "relation.dialogTitle": "Configure relationship",
        "relation.dialogHelp":
            "Select the relationship type and the entities that participate on each side.",
        "relation.ternaryHelp":
            "A ternary relationship has three sides. If the same entity appears on more than one side, assign different roles to distinguish each participation.",
        "relation.arityLabel": "Relationship type",
        "relation.binary": "Binary",
        "relation.ternary": "Ternary",
        "relation.side1": "Side 1",
        "relation.side2": "Side 2",
        "relation.side3": "Side 3",
        "relation.sideRole": "Side {{side}} role",

        "roles.dialogTitle": "Edit roles",
        "roles.dialogHelp":
            "Roles are used to distinguish several participations of the same entity within a ternary relationship. Use short and different names, for example origin and destination.",
        "roles.sideLabelWithEntity": "Side {{side}} role ({{entity}})",
        "roles.sideLabel": "Side {{side}} role",

        "isa.dialogTitle": "Configure ISA",
        "isa.dialogHelp":
            "Select one generalization and one or more specializations. Specializations inherit the key from the generalization and must not have their own key.",
        "isa.generalization": "Generalization",
        "isa.specializations": "Specializations",

        "cardinalities.dialogTitle": "Configure cardinalities",
        "cardinalities.dialogHelp":
            "Select the cardinality for each side of the relationship.",
        "cardinalities.identifyingHelp":
            "In an identifying dependency relationship, the owner entity side keeps cardinality 1:1.",
    },
};

export const isSupportedLanguage = (language) =>
    SUPPORTED_LANGUAGES.some(
        (supportedLanguage) => supportedLanguage.code === language,
    );

const interpolate = (text, values = {}) =>
    Object.entries(values).reduce(
        (result, [key, value]) =>
            result.split(`{{${key}}}`).join(String(value)),
        text,
    );

export const translate = (language, key, values = {}) => {
    const selectedLanguage = isSupportedLanguage(language)
        ? language
        : DEFAULT_LANGUAGE;

    const translatedText =
        TRANSLATIONS[selectedLanguage]?.[key] ??
        TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ??
        key;

    return interpolate(translatedText, values);
};
