# Análisis del Sistema Heredado

## Visión General del Sistema

La aplicación web permite la creación y edición de diagramas Entidad-Relación (ER). Utiliza **React** como marco de trabajo, con **mxGraph** como motor gráfico para renderizar las entidades y relaciones. Los diagramas se representan internamente en formato **JSON** y se sincronizan bidireccionalmente con la vista gráfica, asegurando que los cambios en el gráfico actualicen el modelo de datos y viceversa.

### Estructura General

La estructura del proyecto está organizada principalmente en componentes React, donde **App.js** actúa como el punto de entrada principal, y **DiagramEditor.js** gestiona la lógica de edición del diagrama.

---

## Componente Raíz: `App.js`

El componente **App.js** es el contenedor principal de la aplicación. Su rol se limita a establecer la estructura base de la interfaz y a montar el componente **DiagramEditor**, encargado de gestionar el editor de diagramas.

### Funciones Principales:
- **Contenedor de componentes**: No contiene lógica de negocio ni interacción con el modelo ER, solo organiza la interfaz.
- **Integración de DiagramEditor**: Inicia y monta el editor, que se gestiona de manera independiente.

Este enfoque permite que el análisis se concentre en los componentes que implementan directamente el comportamiento del editor, sin complicar el estudio con la estructura básica de la interfaz.

---

## Componente Principal: `DiagramEditor.js`

El componente **DiagramEditor** gestiona la creación, modificación y visualización de los diagramas ER. Concentra la lógica principal de la aplicación, desde la inicialización del entorno gráfico hasta la gestión de interacciones y eventos.

### Funciones Principales:
- **Inicialización del entorno gráfico**: Utiliza **mxGraph** para crear el canvas gráfico donde se renderizan los diagramas.
- **Modelo Interno**: Mantiene un modelo interno del diagrama (en formato JSON) con entidades, relaciones y atributos. Cada entidad o relación tiene un identificador gráfico asociado (idMx) y referencias a las celdas gráficas.
- **Sincronización bidireccional**: Los cambios en el gráfico actualizan el modelo, y al cargar un diagrama guardado, el gráfico se reconstruye a partir del modelo.
- **Gestión de eventos**: Los cambios en la posición de los elementos del diagrama son gestionados mediante listeners que actualizan el modelo y la representación gráfica de forma eficiente, sin necesidad de comprobaciones constantes.

---

## Funcionalidades Clave

### Actualización del Modelo basada en Eventos
La sincronización entre el modelo interno y la vista gráfica es impulsada por eventos de interacción con el grafo. Los listeners capturan cambios como el movimiento de celdas y actualizan el modelo interno basándose en los nuevos valores y posiciones.

### Gestión del Movimiento de Elementos
- **Entidades y relaciones**: Al mover elementos, los atributos asociados se reposicionan utilizando offsets relativos, manteniendo la coherencia visual.
- **Relaciones reflexivas**: Se recalculan los puntos intermedios de las aristas para evitar solapamientos.
- **Atributos independientes**: Los movimientos de atributos se gestionan mediante actualizaciones en sus offsets relativos.

### Inicialización y Configuración del Editor
- **setInitialConfiguration**: Se configura el entorno gráfico, se crean los estilos y se construye la barra de herramientas.
- **Restauración desde `localStorage`**: Al cargar el editor, el diagrama previamente guardado se reconstruye a partir del modelo interno, restaurando las celdas gráficas.

---

## Nuevas Funciones y Archivos Revisados

### **Barra de Herramientas**

Una de las funcionalidades claves del sistema heredado es la **barra de herramientas**. Se han identificado las siguientes clases que gestionan su comportamiento:

1. **`initToolbar.js`**: Este archivo es responsable de crear y configurar la barra de herramientas, donde se añaden los íconos para las entidades y relaciones. Permite al usuario arrastrar y soltar elementos en el diagrama. Además, se configura el gráfico para permitir nuevas conexiones entre los elementos.
   - **Funciones Principales**:
     - Configuración inicial de la barra de herramientas.
     - Añadir elementos de la barra de herramientas mediante la función **`addVertex`**.
     - Gestionar la visibilidad y habilitación de los íconos de la barra de herramientas según el estado de la selección.

2. **`addToolbarItem.js`**: Define cómo se agrega un ícono a la barra de herramientas y gestiona la creación de nuevos elementos en el diagrama (entidades o relaciones).
   - **Funciones Principales**:
     - Generación de un nuevo **vértice** en el gráfico (entidad o relación) cuando un ícono es arrastrado y soltado sobre el canvas.
     - Asignación de un nombre único a cada nuevo elemento utilizando la función **`generateUniqueName`**.
     - Actualización del modelo de datos (**`diagramRef`**) con los nuevos elementos creados.

3. **`configureToolbar.js`**: Aunque está vacío en el código actual, se espera que se utilice para configurar la disposición o los comportamientos adicionales de los elementos dentro de la barra de herramientas.

### **Manejo de Estilos**

Los estilos gráficos de los elementos en el diagrama se gestionan a través de las siguientes funciones:

1. **`getStyleByKey.js`**: Permite extraer el valor de una propiedad específica de una cadena de estilos.
   - **Funciones Principales**:
     - Convierte una cadena de estilos en un objeto clave-valor.
     - Extrae dinámicamente valores de estilo a partir de una clave especificada.

2. **`getStyleStringByObj.js`**: Convierte un objeto de estilos (clave-valor) en una cadena de texto en formato CSS.
   - **Funciones Principales**:
     - Convierte un objeto de estilos en un formato adecuado para **mxGraph**.
     - Omite propiedades como `"perimeter"`, que no son necesarias en la representación del estilo de los elementos.

---

### **Estructura Modular y Organización del Código**

La estructura modular del sistema proporciona claridad en la separación de responsabilidades. La lógica relacionada con la barra de herramientas, la configuración del entorno gráfico, y la gestión de estilos están organizadas en módulos separados, lo que facilita tanto el mantenimiento como la futura extensión del sistema.

---

Este enfoque modular también permite que, al analizar el código heredado, se pueda identificar fácilmente qué funcionalidades y comportamientos están siendo gestionados en cada archivo, sin necesidad de profundizar demasiado en detalles no relevantes para la extensión futura del proyecto.

