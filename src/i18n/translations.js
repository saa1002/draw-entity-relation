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
        "app.version": "Versión",
        "app.date": "Fecha",
        "app.commit": "Commit",
        "app.buildLabel":
            "Versión {{version}} · Fecha {{date}} · Commit {{commit}}",
        "app.name": "UBU E-R App",
        "app.institution": "Universidad de Burgos",
        "app.logoAlt": "Escudo de la Universidad de Burgos",

        "language.sectionTitle": "Idioma",
        "language.label": "Idioma",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",

        "sidebar.erElements": "Elementos E/R",
        "sidebar.selection": "Selección",
        "sidebar.order": "Orden",
        "sidebar.history": "Historial",
        "sidebar.diagram": "Diagrama",
        "sidebar.information": "Información",

        "selection.selectedEntity": "Entidad seleccionada",
        "selection.selectedRelation": "Relación seleccionada",
        "selection.selectedIsa": "ISA seleccionada",
        "selection.selectedAttribute": "Atributo seleccionado",
        "selection.emptyGuidance":
            "Selecciona una entidad, relación, atributo o ISA para ver sus acciones disponibles.",

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

        "help.button": "Ayuda",
        "help.title": "Ayuda",
        "help.intro":
            "UBU E-R App permite construir diagramas Entidad-Relación desde el navegador y trabajar con una representación visual e interna del modelo.",
        "help.createElements":
            "Para crear elementos, arrastra desde la paleta una entidad, una relación o una ISA al lienzo. Después puedes seleccionar cada elemento para editarlo mediante las acciones disponibles.",
        "help.contextualActions":
            "Las acciones contextuales aparecen al seleccionar entidades, atributos, relaciones o jerarquías ISA. Desde ellas se pueden añadir atributos, configurar relaciones, marcar entidades débiles, ajustar cardinalidades o eliminar elementos.",
        "help.validationAndSql":
            "Antes de exportar SQL, la aplicación valida el diagrama y muestra diagnósticos cuando detecta problemas estructurales o semánticos.",
        "help.persistence":
            "El diagrama puede guardarse y recuperarse mediante JSON. La importación permite reemplazar el diagrama actual o combinarlo con el existente.",
        "help.isaScope":
            "El soporte ISA es inicial y controlado: contempla una generalización, una o varias especializaciones y herencia de clave hacia las especializaciones.",

        "about.button": "Acerca de",
        "about.title": "Acerca de UBU E-R App",
        "about.description":
            "UBU E-R App es una aplicación web orientada al modelado de diagramas Entidad-Relación y a su transformación a una representación relacional en SQL.",
        "about.author": "Autor: Steven Paul Alba Alba.",
        "about.versionInfo":
            "Versión: {{version}}. Fecha: {{date}}. Commit: {{commit}}.",
        "about.currentWork":
            "Esta versión corresponde a un Trabajo Fin de Grado centrado en analizar, estabilizar y ampliar una aplicación heredada, manteniendo un alcance académico y controlado.",
        "about.previousWork":
            "El proyecto parte de una primera versión desarrollada por Rubén Maté Iturriaga. Se agradece y referencia esa base inicial:",
        "about.previousWorkLink": "repositorio original draw-entity-relation",
        "about.technologies":
            "Tecnologías principales: React, mxGraph, Material UI, Vitest y Playwright.",
        "about.license":
            "Licencia del proyecto: pendiente de formalización. Las dependencias mantienen sus respectivas licencias; mxGraph se distribuye bajo Apache License 2.0.",
        "about.mxGraphLicenseLink": "licencia de mxGraph",
        "about.ubuImage":
            "La imagen institucional se ha tomado de los recursos oficiales de imagen corporativa de la Universidad de Burgos.",
        "about.ubuImageLink": "imagen corporativa de la Universidad de Burgos",

        "diagram.validate": "Comprobar diagrama",
        "diagram.validateTitle": "Comprobar diagrama",
        "diagram.fitView": "Ajustar vista",
        "diagram.fitViewTitle": "Ajustar la vista al contenido del diagrama",
        "diagram.generateSql": "Generar SQL",
        "diagram.generateSqlTitle": "Generar script SQL",
        "diagram.exportJson": "Exportar JSON",
        "diagram.exportJsonTitle": "Exportar diagrama en JSON",
        "diagram.exportImage": "Exportar imagen",
        "diagram.exportImageTitle": "Exportar diagrama como imagen",
        "diagram.exportImageHelp":
            "Exporta la representación visual actual del diagrama en un formato de imagen. Esta acción no modifica el modelo interno ni el SQL generado.",
        "diagram.exportImageFormatLabel": "Formato",
        "diagram.exportImageFormatPng": "PNG",
        "diagram.exportImageFormatSvg": "SVG",
        "diagram.importJson": "Importar JSON",
        "diagram.importJsonTitle": "Importar diagrama desde JSON",
        "diagram.importJsonHelp":
            "Selecciona un archivo JSON exportado previamente y elige si quieres reemplazar el diagrama actual o combinarlo con él.",
        "diagramComposition.modeLabel": "Modo",
        "diagramComposition.replace": "Reemplazar el diagrama actual",
        "diagramComposition.merge": "Combinar con el diagrama actual",
        "diagram.reset": "Reiniciar",
        "diagram.resetTitle": "Reiniciar diagrama",
        "diagram.resetHelp":
            "Esta acción eliminará todos los elementos del diagrama actual. ¿Deseas reiniciarlo?",

        "generateStructure.button": "Generar estructura",
        "generateStructure.title": "Generar estructura básica",
        "generateStructure.selectorLabel": "Estructura",
        "generateStructure.help":
            "Selecciona una estructura E/R básica y elige si quieres reemplazar el diagrama actual o combinarla con él. La estructura podrá editarse después manualmente.",
        "generateStructure.continueQuestion": "¿Deseas generar la estructura?",
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

        "feedback.fileSaved": "Archivo guardado correctamente.",
        "feedback.fileSaveCancelled": "Guardado cancelado.",
        "feedback.fileSaveUnsupported":
            "Tu navegador no permite elegir dónde guardar el archivo.",
        "feedback.fileSaveFailed": "No se pudo guardar el archivo.",
        "feedback.diagramImageExportEmpty":
            "No se puede exportar una imagen de un diagrama vacío.",

        "feedback.attributeInserted": "Atributo insertado",
        "feedback.compositeAttributePrompt": "Nombre del atributo compuesto:",
        "feedback.selectSimpleAttributesSameEntity":
            "Selecciona al menos dos atributos simples de la misma entidad.",
        "feedback.compositeAttributeNeedsName":
            "El atributo compuesto necesita un nombre.",
        "feedback.attributeNameAlreadyExists":
            "Ya existe un atributo con ese nombre en la entidad.",
        "feedback.selectedAttributesNotFound":
            "No se pudieron localizar los atributos seleccionados.",
        "feedback.attributesCouldNotBeGrouped":
            "No se pudieron agrupar los atributos seleccionados.",
        "feedback.attributesGrouped":
            "Atributos agrupados en un atributo compuesto",
        "feedback.cannotConvertMultivaluedToComposite":
            "No se puede convertir directamente un atributo multivaluado simple en compuesto.",
        "feedback.siblingSubattributeInserted": "Subatributo hermano insertado",

        "feedback.keyCannotBeMultivalued":
            "Una clave no puede ser multivaluada.",
        "feedback.weakEntityCannotHavePrimaryKey":
            "Una entidad débil no puede tener clave primaria. Usa un atributo discriminante.",
        "feedback.isaSpecializationCannotHavePrimaryKey":
            "Una especialización ISA hereda la clave de la generalización y no puede tener clave primaria propia.",
        "feedback.attributeMarkedAsKey": "Atributo marcado como clave",
        "feedback.attributeKeyRemoved": "Clave eliminada del atributo",

        "feedback.entityMarkedWeak": "Entidad marcada como débil",
        "feedback.entityMarkedStrong": "Entidad marcada como fuerte",
        "feedback.onlyWeakEntitiesCanHaveDiscriminant":
            "Solo las entidades débiles pueden tener atributo discriminante.",
        "feedback.discriminantCannotBeMultivalued":
            "Un discriminante no puede ser multivaluado.",
        "feedback.attributeMarkedAsDiscriminant":
            "Atributo marcado como discriminante",
        "feedback.discriminantRemoved": "Discriminante eliminado",

        "feedback.configureBothRelationSidesFirst":
            "Configura primero los dos lados de la relación.",
        "feedback.identifyingRelationRequiresWeakAndOwner":
            "Una relación de dependencia por identificación debe conectar una entidad débil dependiente con una entidad propietaria distinta. Si ambas entidades son fuertes, solo se puede inferir una cascada cuando una de ellas ya actúa como propietaria de otra entidad débil.",
        "feedback.identifyingCardinalitiesFailed":
            "No se pudieron aplicar las cardinalidades de la relación de dependencia por identificación.",
        "feedback.relationMarkedIdentifying":
            "Relación marcada como dependencia por identificación",
        "feedback.identifyingRelationUnmarked":
            "Dependencia por identificación desmarcada",
        "feedback.identifyingRelationSidesNotResolved":
            "No se pudieron resolver los lados de la relación de dependencia por identificación.",

        "feedback.attributeMarkedMultivalued":
            "Atributo marcado como multivaluado",
        "feedback.attributeMultivaluedRemoved":
            "Multivaluado eliminado del atributo",

        "feedback.relationRolesUpdated": "Roles de relación actualizados",

        "feedback.isaGeneralizationCannotAlsoBeSpecialization":
            "La generalización no puede aparecer también como especialización.",
        "feedback.isaHierarchyConfigurationFailed":
            "No se pudo configurar la jerarquía ISA.",
        "feedback.isaHierarchyConfigured": "Jerarquía ISA configurada",
        "feedback.subattributesConvertedToSimple":
            "Subatributos convertidos en atributos simples",
        "feedback.subattributeConvertedToSimple":
            "Subatributo convertido en atributo simple",
        "feedback.diagramFitViewEmpty":
            "No hay elementos en el diagrama para ajustar la vista.",
        "feedback.diagramFitViewFailed":
            "No se pudo ajustar la vista del diagrama.",
        "feedback.diagramViewFitted": "Vista ajustada al diagrama.",
        "feedback.diagramImported": "Diagrama importado con éxito.",
        "feedback.diagramImportInvalid":
            "El diagrama no se ha podido importar porque no es válido.",
        "feedback.diagramImportInvalidJson":
            "No se ha podido importar el diagrama porque el archivo JSON no es válido.",
        "feedback.diagramImportFailed": "El diagrama no se ha podido importar.",

        "validation.context.diagram.errorHeader":
            "El diagrama no se ha podido comprobar por los siguientes errores:",
        "validation.context.sql.errorHeader":
            "No se ha podido generar el script SQL por los siguientes errores:",
        "validation.context.exportJson.errorHeader":
            "No se ha podido exportar el diagrama en formato JSON por los siguientes errores:",
        "validation.context.importJson.errorHeader":
            "No se ha podido importar el diagrama por los siguientes errores:",
        "validation.context.diagram.success": "El diagrama es válido.",
        "validation.context.sql.success":
            "El diagrama es válido. Se generará un archivo SQL con las tablas y restricciones derivadas del modelo E/R.",
        "validation.context.exportJson.success":
            "El diagrama es válido. Se exportará el diagrama actual en formato JSON para poder importarlo más adelante.",

        "validation.section.general": "General",
        "validation.section.entities": "Entidades y atributos",
        "validation.section.relations": "Relaciones",
        "validation.section.isa": "ISA",
        "validation.section.sql": "SQL",

        "validation.fallback.entityUnnamed": "Entidad sin nombre",
        "validation.fallback.relationUnnamed": "Relación sin nombre",
        "validation.fallback.attributeUnnamed": "Atributo sin nombre",
        "validation.fallback.entityMissing": "Entidad inexistente",

        "validation.message.notEmpty": "El diagrama está vacío.",
        "validation.message.noRepeatedNames.sql":
            "Hay entidades o relaciones con nombres repetidos.",
        "validation.message.noRepeatedNames.exportJson":
            "Hay entidades con nombres repetidos.",
        "validation.message.noRepeatedNames.importJson":
            "Hay entidades con nombres repetidos.",
        "validation.message.noRepeatedAttrNames":
            "Hay atributos repetidos en una entidad.",
        "validation.message.noEmptyCompositeAttributes":
            "Hay atributos compuestos sin subatributos.",
        "validation.message.noNestedCompositeAttributes":
            "Hay atributos compuestos con subatributos anidados.",
        "validation.message.noUnsupportedMultivaluedAttributes":
            "Solo se soportan atributos multivaluados top-level de entidad, simples o compuestos, sin clave ni discriminante.",
        "validation.message.noEntitiesWithoutAttributes":
            "Hay entidades sin atributos.",
        "validation.message.noEntitiesWithoutPK":
            "Hay entidades sin clave primaria.",
        "validation.message.noEntitiesWithMoreThanOnePK":
            "Hay entidades con más de una clave primaria.",
        "validation.message.noNMRelationsWithPK":
            "Hay relaciones N-M con clave primaria.",
        "validation.message.noWeakEntitiesWithPrimaryKey":
            "Hay entidades débiles con clave primaria normal.",
        "validation.message.noWeakEntitiesWithoutPartialKey":
            "Hay entidades débiles sin atributo discriminante.",
        "validation.message.noWeakEntitiesWithMoreThanOnePartialKey":
            "Hay entidades débiles con más de un atributo discriminante.",
        "validation.message.noStrongEntitiesWithPartialKey":
            "Hay entidades fuertes con atributo discriminante.",
        "validation.message.noWeakEntitiesWithoutIdentifyingRelation":
            "Hay entidades débiles sin relación de dependencia por identificación.",
        "validation.message.noInvalidIdentifyingRelations":
            "Hay relaciones de dependencia por identificación que no conectan una entidad débil dependiente con una entidad propietaria distinta.",
        "validation.message.noInvalidIdentifyingCardinalities":
            "Hay relaciones de dependencia por identificación con cardinalidades no válidas.",
        "validation.message.noInconsistentWeakEntityOwnership":
            "Hay entidades débiles cuya entidad propietaria es inconsistente.",
        "validation.message.noMultipleIdentifyingRelationsPerWeakEntity":
            "Hay entidades débiles con más de una relación de dependencia por identificación como entidad dependiente.",
        "validation.message.noAttributesInNonNMRelations":
            "Hay relaciones 1:1 o 1:N con atributos, lo cual no está soportado.",
        "validation.message.noUnconnectedRelations":
            "Hay relaciones desconectadas.",
        "validation.message.noSQLIdentifierCollisions":
            "Hay nombres que colisionan al normalizar identificadores SQL.",
        "validation.message.noBrokenRelationEntityReferences":
            "Hay relaciones que apuntan a entidades inexistentes.",
        "validation.message.noUnconnectedIsas":
            "Hay jerarquías ISA que no tienen una generalización y al menos una especialización conectadas.",
        "validation.message.noBrokenIsaEntityReferences":
            "Hay jerarquías ISA que apuntan a entidades inexistentes.",
        "validation.message.noIsaHierarchiesWithRepeatedSpecializations":
            "Hay jerarquías ISA con especializaciones repetidas.",
        "validation.message.noIsaHierarchiesWithGeneralizationAsSpecialization":
            "Hay jerarquías ISA en las que la generalización también aparece como especialización.",
        "validation.message.noIsaSpecializationsInMultipleHierarchies":
            "Hay entidades que aparecen como especialización en más de una jerarquía ISA; la herencia múltiple no está soportada.",
        "validation.message.noIsaSpecializationsWithPrimaryKey":
            "Hay especializaciones ISA con clave primaria propia; deben heredar la clave de la generalización.",
        "validation.message.noTernaryRelationsWithAmbiguousRepeatedParticipants":
            "Hay relaciones ternarias con entidades participantes repetidas sin roles distintos.",
        "validation.message.noIdentifyingTernaryRelations":
            "Las relaciones ternarias no pueden ser relaciones de dependencia por identificación.",
        "validation.message.noTernaryRelationsWithMandatoryCardinalities":
            "Hay relaciones ternarias con cardinalidades obligatorias.",
        "validation.message.noNotValidCardinalities":
            "Hay cardinalidades no válidas en las relaciones.",

        "validation.detail.attributeOwnerList": "{{owner}}: {{details}}.",
        "validation.detail.repeatedNames": "Nombres repetidos: {{names}}.",
        "validation.detail.repeatedAttributes":
            "atributos repetidos {{attributes}}",
        "validation.detail.emptyCompositeAttributes":
            "atributos compuestos sin subatributos {{attributes}}",
        "validation.detail.nestedCompositeAttributes":
            "atributos compuestos anidados {{attributes}}",
        "validation.detail.entityWithoutAttributes":
            "{{entity}}: no tiene atributos.",
        "validation.detail.entityWithoutPrimaryKey":
            "{{entity}}: no tiene clave primaria.",
        "validation.detail.entityWithMultiplePrimaryKeys":
            "{{entity}}: tiene varias claves primarias ({{keys}}).",
        "validation.detail.weakEntityWithPrimaryKey":
            "{{entity}}: es débil y tiene clave primaria normal.",
        "validation.detail.weakEntityWithoutPartialKey":
            "{{entity}}: es débil y no tiene discriminante.",
        "validation.detail.weakEntityWithMultiplePartialKeys":
            "{{entity}}: tiene varios discriminantes ({{keys}}).",
        "validation.detail.strongEntityWithPartialKey":
            "{{entity}}: es fuerte y tiene atributo discriminante.",
        "validation.detail.weakEntityWithoutIdentifyingRelation":
            "{{entity}}: no tiene relación identificadora asociada.",
        "validation.detail.unconnectedRelation":
            "{{relation}}: no tiene todos sus lados conectados.",
        "validation.detail.nonNmRelationWithAttributes":
            "{{relation}}: tiene atributos propios aunque su tipo no los soporta.",
        "validation.detail.nmRelationWithPrimaryKey":
            "{{relation}}: tiene atributos marcados como clave primaria.",
        "validation.detail.brokenRelationEntityReference":
            "{{relation}}: apunta a una entidad que ya no existe.",
        "validation.detail.ternaryRepeatedParticipantWithoutDistinctRoles":
            "{{relation}}: repite la entidad {{entity}} sin roles distintos.",
        "validation.detail.identifyingTernaryRelation":
            "{{relation}}: es ternaria y está marcada como identificadora.",
        "validation.detail.ternaryRelationWithMandatoryCardinality":
            "{{relation}}: tiene alguna cardinalidad mínima obligatoria.",
        "validation.detail.relationWithInvalidCardinalities":
            "{{relation}}: contiene cardinalidades no válidas.",
        "validation.detail.unconnectedIsa":
            "{{isa}}: debe tener una generalización y al menos una especialización conectadas.",
        "validation.detail.brokenIsaEntityReference":
            "{{isa}}: apunta a una entidad que ya no existe.",
        "validation.detail.isaWithRepeatedSpecializations":
            "{{isa}}: contiene especializaciones repetidas.",
        "validation.detail.isaGeneralizationAsSpecialization":
            "{{isa}}: {{entity}} aparece como generalización y especialización.",
        "validation.detail.specializationInMultipleIsas":
            "{{entity}}: aparece como especialización en más de una ISA.",
        "validation.detail.isaSpecializationWithPrimaryKey":
            "{{entity}}: es especialización ISA y tiene clave primaria propia.",
        "validation.detail.sqlIdentifierCollisionHint":
            "Revisa nombres que solo se diferencien por mayúsculas, acentos, espacios o caracteres especiales.",
    },
    en: {
        "app.version": "Version",
        "app.date": "Date",
        "app.commit": "Commit",
        "app.buildLabel":
            "Version {{version}} · Date {{date}} · Commit {{commit}}",
        "app.name": "UBU E-R App",
        "app.institution": "University of Burgos",
        "app.logoAlt": "University of Burgos coat of arms",

        "language.sectionTitle": "Language",
        "language.label": "Language",
        "language.optionSpanish": "Español",
        "language.optionEnglish": "English",

        "sidebar.erElements": "ER elements",
        "sidebar.selection": "Selection",
        "sidebar.order": "Order",
        "sidebar.history": "History",
        "sidebar.diagram": "Diagram",
        "sidebar.information": "Information",

        "selection.selectedEntity": "Selected entity",
        "selection.selectedRelation": "Selected relation",
        "selection.selectedIsa": "Selected ISA",
        "selection.selectedAttribute": "Selected attribute",
        "selection.emptyGuidance":
            "Select an entity, relationship, attribute or ISA element to see available actions.",

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

        "help.button": "Help",
        "help.title": "Help",
        "help.intro":
            "UBU E-R App lets users build Entity-Relationship diagrams in the browser and work with both a visual and an internal representation of the model.",
        "help.createElements":
            "To create elements, drag an entity, relationship or ISA element from the palette onto the canvas. Then select each element to edit it through the available actions.",
        "help.contextualActions":
            "Contextual actions appear when selecting entities, attributes, relationships or ISA hierarchies. They allow adding attributes, configuring relationships, marking weak entities, adjusting cardinalities or deleting elements.",
        "help.validationAndSql":
            "Before exporting SQL, the application validates the diagram and shows diagnostics when structural or semantic problems are detected.",
        "help.persistence":
            "The diagram can be saved and restored using JSON. Importing allows replacing the current diagram or merging it with the existing one.",
        "help.isaScope":
            "ISA support is initial and controlled: it covers one generalization, one or more specializations and key inheritance towards the specializations.",

        "about.button": "About",
        "about.title": "About UBU E-R App",
        "about.description":
            "UBU E-R App is a web application for modelling Entity-Relationship diagrams and transforming them into a relational SQL representation.",
        "about.author": "Author: Steven Paul Alba Alba.",
        "about.versionInfo":
            "Version: {{version}}. Date: {{date}}. Commit: {{commit}}.",
        "about.currentWork":
            "This version belongs to a Bachelor's Thesis focused on analysing, stabilising and extending a legacy application while keeping an academic and controlled scope.",
        "about.previousWork":
            "The project builds on a first version developed by Rubén Maté Iturriaga. That initial work is acknowledged and referenced here:",
        "about.previousWorkLink": "original draw-entity-relation repository",
        "about.technologies":
            "Main technologies: React, mxGraph, Material UI, Vitest and Playwright.",
        "about.license":
            "Project license: pending formalisation. Dependencies keep their respective licenses; mxGraph is distributed under the Apache License 2.0.",
        "about.mxGraphLicenseLink": "mxGraph license",
        "about.ubuImage":
            "The institutional image has been taken from the official corporate image resources of the University of Burgos.",
        "about.ubuImageLink": "University of Burgos corporate image",

        "diagram.validate": "Validate diagram",
        "diagram.validateTitle": "Validate diagram",
        "diagram.fitView": "Fit to diagram",
        "diagram.fitViewTitle": "Fit the view to the diagram content",
        "diagram.generateSql": "Generate SQL",
        "diagram.generateSqlTitle": "Generate SQL script",
        "diagram.exportJson": "Export JSON",
        "diagram.exportJsonTitle": "Export diagram as JSON",
        "diagram.exportImage": "Export image",
        "diagram.exportImageTitle": "Export diagram as image",
        "diagram.exportImageHelp":
            "Exports the current visual representation of the diagram as an image. This action does not modify the internal model or the generated SQL.",
        "diagram.exportImageFormatLabel": "Format",
        "diagram.exportImageFormatPng": "PNG",
        "diagram.exportImageFormatSvg": "SVG",
        "diagram.importJson": "Import JSON",
        "diagram.importJsonTitle": "Import diagram from JSON",
        "diagram.importJsonHelp":
            "Select a previously exported JSON file and choose whether to replace the current diagram or merge it with it.",
        "diagramComposition.modeLabel": "Mode",
        "diagramComposition.replace": "Replace current diagram",
        "diagramComposition.merge": "Merge with current diagram",
        "diagram.reset": "Reset",
        "diagram.resetTitle": "Reset diagram",
        "diagram.resetHelp":
            "This action will remove all elements from the current diagram. Do you want to reset it?",

        "generateStructure.button": "Generate structure",
        "generateStructure.title": "Generate basic structure",
        "generateStructure.selectorLabel": "Structure",
        "generateStructure.help":
            "Select a basic E/R structure and choose whether to replace the current diagram or merge it with it. The structure can be edited manually afterwards.",
        "generateStructure.continueQuestion":
            "Do you want to generate the structure?",
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

        "feedback.fileSaved": "File saved successfully.",
        "feedback.fileSaveCancelled": "Save cancelled.",
        "feedback.fileSaveUnsupported":
            "Your browser does not allow choosing where to save the file.",
        "feedback.fileSaveFailed": "The file could not be saved.",
        "feedback.diagramImageExportEmpty":
            "An empty diagram cannot be exported as an image.",

        "feedback.attributeInserted": "Attribute inserted",
        "feedback.compositeAttributePrompt": "Composite attribute name:",
        "feedback.selectSimpleAttributesSameEntity":
            "Select at least two simple attributes from the same entity.",
        "feedback.compositeAttributeNeedsName":
            "The composite attribute needs a name.",
        "feedback.attributeNameAlreadyExists":
            "An attribute with that name already exists in the entity.",
        "feedback.selectedAttributesNotFound":
            "The selected attributes could not be located.",
        "feedback.attributesCouldNotBeGrouped":
            "The selected attributes could not be grouped.",
        "feedback.attributesGrouped":
            "Attributes grouped into a composite attribute",
        "feedback.cannotConvertMultivaluedToComposite":
            "A simple multivalued attribute cannot be converted directly into a composite attribute.",
        "feedback.siblingSubattributeInserted": "Sibling subattribute inserted",

        "feedback.keyCannotBeMultivalued": "A key cannot be multivalued.",
        "feedback.weakEntityCannotHavePrimaryKey":
            "A weak entity cannot have a primary key. Use a discriminant attribute.",
        "feedback.isaSpecializationCannotHavePrimaryKey":
            "An ISA specialization inherits the key from the generalization and cannot have its own primary key.",
        "feedback.attributeMarkedAsKey": "Attribute marked as key",
        "feedback.attributeKeyRemoved": "Key removed from attribute",

        "feedback.entityMarkedWeak": "Entity marked as weak",
        "feedback.entityMarkedStrong": "Entity marked as strong",
        "feedback.onlyWeakEntitiesCanHaveDiscriminant":
            "Only weak entities can have a discriminant attribute.",
        "feedback.discriminantCannotBeMultivalued":
            "A discriminant cannot be multivalued.",
        "feedback.attributeMarkedAsDiscriminant":
            "Attribute marked as discriminant",
        "feedback.discriminantRemoved": "Discriminant removed",

        "feedback.configureBothRelationSidesFirst":
            "Configure both sides of the relationship first.",
        "feedback.identifyingRelationRequiresWeakAndOwner":
            "An identifying dependency relationship must connect a dependent weak entity with a different owner entity. If both entities are strong, a cascade can only be inferred when one of them already acts as the owner of another weak entity.",
        "feedback.identifyingCardinalitiesFailed":
            "The cardinalities of the identifying dependency relationship could not be applied.",
        "feedback.relationMarkedIdentifying":
            "Relationship marked as identifying dependency",
        "feedback.identifyingRelationUnmarked":
            "Identifying dependency unmarked",
        "feedback.identifyingRelationSidesNotResolved":
            "The sides of the identifying dependency relationship could not be resolved.",

        "feedback.attributeMarkedMultivalued":
            "Attribute marked as multivalued",
        "feedback.attributeMultivaluedRemoved":
            "Multivalued removed from attribute",

        "feedback.relationRolesUpdated": "Relationship roles updated",

        "feedback.isaGeneralizationCannotAlsoBeSpecialization":
            "The generalization cannot also appear as a specialization.",
        "feedback.isaHierarchyConfigurationFailed":
            "The ISA hierarchy could not be configured.",
        "feedback.isaHierarchyConfigured": "ISA hierarchy configured",
        "feedback.subattributesConvertedToSimple":
            "Subattributes converted into simple attributes",
        "feedback.subattributeConvertedToSimple":
            "Subattribute converted into simple attribute",
        "feedback.diagramFitViewEmpty":
            "There are no diagram elements to fit the view.",
        "feedback.diagramFitViewFailed":
            "The diagram view could not be fitted.",
        "feedback.diagramViewFitted": "View fitted to diagram.",
        "feedback.diagramImported": "Diagram imported successfully.",
        "feedback.diagramImportInvalid":
            "The diagram could not be imported because it is not valid.",
        "feedback.diagramImportInvalidJson":
            "The diagram could not be imported because the JSON file is not valid.",
        "feedback.diagramImportFailed": "The diagram could not be imported.",

        "validation.context.diagram.errorHeader":
            "The diagram could not be validated because of the following errors:",
        "validation.context.sql.errorHeader":
            "The SQL script could not be generated because of the following errors:",
        "validation.context.exportJson.errorHeader":
            "The diagram could not be exported as JSON because of the following errors:",
        "validation.context.importJson.errorHeader":
            "The diagram could not be imported because of the following errors:",
        "validation.context.diagram.success": "The diagram is valid.",
        "validation.context.sql.success":
            "The diagram is valid. An SQL file will be generated with the tables and constraints derived from the E/R model.",
        "validation.context.exportJson.success":
            "The diagram is valid. The current diagram will be exported as a JSON file so it can be imported later.",

        "validation.section.general": "General",
        "validation.section.entities": "Entities and attributes",
        "validation.section.relations": "Relationships",
        "validation.section.isa": "ISA",
        "validation.section.sql": "SQL",

        "validation.fallback.entityUnnamed": "Unnamed entity",
        "validation.fallback.relationUnnamed": "Unnamed relationship",
        "validation.fallback.attributeUnnamed": "Unnamed attribute",
        "validation.fallback.entityMissing": "Missing entity",

        "validation.message.notEmpty": "The diagram is empty.",
        "validation.message.noRepeatedNames.sql":
            "There are entities or relationships with repeated names.",
        "validation.message.noRepeatedNames.exportJson":
            "There are entities with repeated names.",
        "validation.message.noRepeatedNames.importJson":
            "There are entities with repeated names.",
        "validation.message.noRepeatedAttrNames":
            "There are repeated attributes in an entity.",
        "validation.message.noEmptyCompositeAttributes":
            "There are composite attributes without subattributes.",
        "validation.message.noNestedCompositeAttributes":
            "There are composite attributes with nested subattributes.",
        "validation.message.noUnsupportedMultivaluedAttributes":
            "Only top-level entity multivalued attributes are supported, either simple or composite, without key or discriminant.",
        "validation.message.noEntitiesWithoutAttributes":
            "There are entities without attributes.",
        "validation.message.noEntitiesWithoutPK":
            "There are entities without a primary key.",
        "validation.message.noEntitiesWithMoreThanOnePK":
            "There are entities with more than one primary key.",
        "validation.message.noNMRelationsWithPK":
            "There are N-M relationships with a primary key.",
        "validation.message.noWeakEntitiesWithPrimaryKey":
            "There are weak entities with a normal primary key.",
        "validation.message.noWeakEntitiesWithoutPartialKey":
            "There are weak entities without a discriminant attribute.",
        "validation.message.noWeakEntitiesWithMoreThanOnePartialKey":
            "There are weak entities with more than one discriminant attribute.",
        "validation.message.noStrongEntitiesWithPartialKey":
            "There are strong entities with a discriminant attribute.",
        "validation.message.noWeakEntitiesWithoutIdentifyingRelation":
            "There are weak entities without an identifying dependency relationship.",
        "validation.message.noInvalidIdentifyingRelations":
            "There are identifying dependency relationships that do not connect a dependent weak entity with a different owner entity.",
        "validation.message.noInvalidIdentifyingCardinalities":
            "There are identifying dependency relationships with invalid cardinalities.",
        "validation.message.noInconsistentWeakEntityOwnership":
            "There are weak entities with inconsistent owner entities.",
        "validation.message.noMultipleIdentifyingRelationsPerWeakEntity":
            "There are weak entities with more than one identifying dependency relationship as dependent entity.",
        "validation.message.noAttributesInNonNMRelations":
            "There are 1:1 or 1:N relationships with attributes, which is not supported.",
        "validation.message.noUnconnectedRelations":
            "There are disconnected relationships.",
        "validation.message.noSQLIdentifierCollisions":
            "There are names that collide when SQL identifiers are normalized.",
        "validation.message.noBrokenRelationEntityReferences":
            "There are relationships pointing to missing entities.",
        "validation.message.noUnconnectedIsas":
            "There are ISA hierarchies without a connected generalization and at least one connected specialization.",
        "validation.message.noBrokenIsaEntityReferences":
            "There are ISA hierarchies pointing to missing entities.",
        "validation.message.noIsaHierarchiesWithRepeatedSpecializations":
            "There are ISA hierarchies with repeated specializations.",
        "validation.message.noIsaHierarchiesWithGeneralizationAsSpecialization":
            "There are ISA hierarchies where the generalization also appears as a specialization.",
        "validation.message.noIsaSpecializationsInMultipleHierarchies":
            "There are entities that appear as a specialization in more than one ISA hierarchy; multiple inheritance is not supported.",
        "validation.message.noIsaSpecializationsWithPrimaryKey":
            "There are ISA specializations with their own primary key; they must inherit the key from the generalization.",
        "validation.message.noTernaryRelationsWithAmbiguousRepeatedParticipants":
            "There are ternary relationships with repeated participant entities without distinct roles.",
        "validation.message.noIdentifyingTernaryRelations":
            "Ternary relationships cannot be identifying dependency relationships.",
        "validation.message.noTernaryRelationsWithMandatoryCardinalities":
            "There are ternary relationships with mandatory cardinalities.",
        "validation.message.noNotValidCardinalities":
            "There are invalid cardinalities in the relationships.",

        "validation.detail.attributeOwnerList": "{{owner}}: {{details}}.",
        "validation.detail.repeatedNames": "Repeated names: {{names}}.",
        "validation.detail.repeatedAttributes":
            "repeated attributes {{attributes}}",
        "validation.detail.emptyCompositeAttributes":
            "composite attributes without subattributes {{attributes}}",
        "validation.detail.nestedCompositeAttributes":
            "nested composite attributes {{attributes}}",
        "validation.detail.entityWithoutAttributes":
            "{{entity}}: has no attributes.",
        "validation.detail.entityWithoutPrimaryKey":
            "{{entity}}: has no primary key.",
        "validation.detail.entityWithMultiplePrimaryKeys":
            "{{entity}}: has several primary keys ({{keys}}).",
        "validation.detail.weakEntityWithPrimaryKey":
            "{{entity}}: is weak and has a normal primary key.",
        "validation.detail.weakEntityWithoutPartialKey":
            "{{entity}}: is weak and has no discriminant.",
        "validation.detail.weakEntityWithMultiplePartialKeys":
            "{{entity}}: has several discriminants ({{keys}}).",
        "validation.detail.strongEntityWithPartialKey":
            "{{entity}}: is strong and has a discriminant attribute.",
        "validation.detail.weakEntityWithoutIdentifyingRelation":
            "{{entity}}: has no associated identifying relationship.",
        "validation.detail.unconnectedRelation":
            "{{relation}}: does not have all its sides connected.",
        "validation.detail.nonNmRelationWithAttributes":
            "{{relation}}: has own attributes even though its type does not support them.",
        "validation.detail.nmRelationWithPrimaryKey":
            "{{relation}}: has attributes marked as primary key.",
        "validation.detail.brokenRelationEntityReference":
            "{{relation}}: points to an entity that no longer exists.",
        "validation.detail.ternaryRepeatedParticipantWithoutDistinctRoles":
            "{{relation}}: repeats entity {{entity}} without distinct roles.",
        "validation.detail.identifyingTernaryRelation":
            "{{relation}}: is ternary and is marked as identifying.",
        "validation.detail.ternaryRelationWithMandatoryCardinality":
            "{{relation}}: has at least one mandatory minimum cardinality.",
        "validation.detail.relationWithInvalidCardinalities":
            "{{relation}}: contains invalid cardinalities.",
        "validation.detail.unconnectedIsa":
            "{{isa}}: must have one generalization and at least one connected specialization.",
        "validation.detail.brokenIsaEntityReference":
            "{{isa}}: points to an entity that no longer exists.",
        "validation.detail.isaWithRepeatedSpecializations":
            "{{isa}}: contains repeated specializations.",
        "validation.detail.isaGeneralizationAsSpecialization":
            "{{isa}}: {{entity}} appears as both generalization and specialization.",
        "validation.detail.specializationInMultipleIsas":
            "{{entity}}: appears as a specialization in more than one ISA.",
        "validation.detail.isaSpecializationWithPrimaryKey":
            "{{entity}}: is an ISA specialization and has its own primary key.",
        "validation.detail.sqlIdentifierCollisionHint":
            "Check names that only differ by uppercase/lowercase letters, accents, spaces or special characters.",
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
