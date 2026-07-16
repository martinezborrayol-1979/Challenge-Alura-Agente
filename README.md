# DocuMind AI - Agente de Inteligencia Documental Empresarial 🚀

DocuMind AI es una plataforma full-stack de inteligencia documental empresarial diseñada específicamente para fintechs, consultoras o startups que manejan grandes volúmenes de documentos internos (manuales, informes, políticas corporativas, facturas y hojas de cálculo). 

El sistema actúa como un **Agente de IA cognitivo** que permite a las personas colaboradoras interactuar con la información interna de la compañía mediante lenguaje natural, reduciendo drásticamente el tiempo de búsqueda sin necesidad de abrir ni leer manualmente ningún archivo.

---

## 🏗️ Arquitectura de la Solución

DocuMind AI ha sido diseñado bajo un enfoque full-stack que garantiza robustez, alto rendimiento y total seguridad para los secretos de la empresa:

```
┌────────────────────────────────────────────────────────┐
│               FRONT-END: React (Vite)                  │
│  - Interfaz Bento Grid Moderna y Ultra Estilizada      │
│  - Animaciones de Transición con Framer Motion        │
│  - Visualización del Documento e Insights AI Directos  │
└───────────────────────────┬────────────────────────────┘
                            │ (Peticiones Seguras /api/*)
                            ▼
┌────────────────────────────────────────────────────────┐
│               BACK-END: Express (NodeJS)               │
│  - Servidor de Entrada Seguro en Puerto 3000           │
│  - Manejo Centralizado de Claves (GEMINI_API_KEY)      │
│  - Middleware de Producción / Empaquetador esbuild     │
└───────────────────────────┬────────────────────────────┘
                            │ (SDK @google/genai)
                            ▼
┌────────────────────────────────────────────────────────┐
│             NÚCLEO COGNITIVO: Gemini AI                │
│  - Extracción Estructurada con esquemas JSON estrictos │
│  - Grounding Semántico y Filtrado de Respuestas        │
│  - Análisis Comparativo Cruzado de Documentos          │
└────────────────────────────────────────────────────────┘
```

### Tecnologías Clave Utilizadas:
1. **Frontend (Capa de Cliente):**
   - **React 18 & Vite:** Construcción ágil con arquitectura de componentes modularizados.
   - **Tailwind CSS:** Diseño visual responsivo bajo una paleta premium de tonos oscuros y acentos índigo/esmeralda.
   - **Framer Motion & Lucide Icons:** Interacción fluida, micro-animaciones dinámicas y componentes altamente icónicos.

2. **Backend (Capa de Servidor):**
   - **Express con TypeScript:** Enrutamiento modularizado y robustez de tipado.
   - **esbuild integration:** Compilación automatizada de la lógica de servidor en un único archivo autónomo CommonJS (`dist/server.cjs`), evitando fricciones de resolución de módulos y permitiendo arranques en frío ultra veloces en contenedores.

3. **Capa de Inteligencia Artificial (AI Engine):**
   - **SDK Oficial `@google/genai` (TypeScript):** Uso del moderno kit de Google para interactuar con **Gemini 3.5 Flash** de forma nativa.
   - **JSON Schema Validation (`responseSchema`):** Extracción automatizada de metadatos asegurando que el modelo siempre responda en un formato JSON exacto que el frontend pueda procesar sin errores.
   - **Grounding Restringido:** Algoritmos de prompts con directivas estrictas para evitar alucinaciones, asegurando que las respuestas del chat se basen únicamente en la verdad contenida en los documentos provistos.

---

## 💡 Ejemplos de Preguntas y Respuestas Soportadas (Casos de Uso)

Gracias a la ingesta pre-cargada de datos empresariales reales en nuestra bóveda local, el agente resuelve inmediatamente consultas complejas sobre la operación:

### Caso 1: Consulta de Datos Financieros e Indicadores en CSV
*   **Pregunta del Colaborador:** *"¿Cuál fue el producto más vendido en diciembre de 2015?"*
*   **Respuesta del Agente:** 
    > Basado en el documento `Reporte_Ventas_Diciembre_2015.csv`, el producto más vendido en diciembre de 2015 fue la **Suscripción Premium SaaS** con un total acumulado de **70 unidades** vendidas y una facturación neta de **$17,500.00 USD**, representando más del 56% del total facturado en el período ($30,850.00 USD).

### Caso 2: Auditoría de Infraestructura y Lenguajes de Servidor
*   **Pregunta del Colaborador:** *"¿Qué lenguajes de programación se usan en el back-end (parte del servidor) de la plataforma de ventas de la empresa?"*
*   **Respuesta del Agente:**
    > De acuerdo con la `Arquitectura_Plataforma_Ventas_SaaS.txt`, el back-end de la plataforma utiliza principalmente tres lenguajes:
    > 1. **Node.js (escrito en TypeScript v5.3)** para la capa de API Gateway principal, enrutamiento, lógica de vistas y autenticación federada.
    > 2. **Go (Golang v1.21)** para el motor core de transacciones de alta velocidad, facturación y colas de mensajes.
    > 3. **Python v3.11** como soporte para la capa de Inteligencia Artificial, pipeline de procesamiento de lenguaje natural (NLP) y cálculo de embeddings.

### Caso 3: Evaluación de Riesgos y Políticas Internas de RRHH
*   **Pregunta del Colaborador:** *"¿De cuánto es el subsidio mensual para trabajo remoto y qué días debemos ir a la oficina?"*
*   **Respuesta del Agente:**
    > Según el documento `Politica_Trabajo_Hibrido_SaaS_2026.txt`, la compañía otorga un subsidio mensual neto de **$150.00 USD** para cubrir costos de internet de alta velocidad (mínimo 100 Mbps) y mejoras ergonómicas. El esquema de trabajo requiere asistencia presencial obligatoria dos días a la semana: **Martes y Miércoles**, en un horario sugerido de **10:00 AM a 4:00 PM EST**.

---

## 🛠️ Instrucciones para la Ejecución Local

Sigue estos sencillos pasos para clonar, configurar y ejecutar DocuMind AI en tu entorno de desarrollo local:

### Requisitos Previos:
- **Node.js:** Versión 18 o superior recomendada.
- **NPM** (gestor de paquetes de Node).

### Paso 1: Instalación de Dependencias
Ejecuta el siguiente comando en la raíz del proyecto para instalar todas las librerías necesarias del cliente y del servidor:
```bash
npm install
```

### Paso 2: Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en el archivo de ejemplo provisto. Recuerda que la clave secreta de Gemini **nunca** se comparte ni se expone al cliente del navegador web:
```bash
cp .env.example .env
```
Edita tu archivo `.env` y añade tu clave personal de la API de Google AI Studio:
```env
GEMINI_API_KEY=tu_api_key_secreta_aqui
```

### Paso 3: Lanzar el Servidor de Desarrollo
Para iniciar la aplicación en modo desarrollo (con recarga rápida e integración de Vite en el servidor Express), ejecuta:
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

### Paso 4: Construir para Producción
Si deseas empaquetar el proyecto de manera optimizada tal como corre en el entorno de despliegue en la nube, realiza el proceso de build de cliente y servidor:
```bash
npm run build
```
Este comando generará:
- Los recursos estáticos HTML/JS/CSS optimizados en el directorio `dist/`.
- El archivo del servidor Express empaquetado en `dist/server.cjs`.

Para arrancar el servidor en modo producción autónomo, ejecuta:
```bash
npm start
```

---

## 🚀 Despliegue en la Nube y Verificación Visual

La aplicación ha sido desplegada con éxito en la plataforma de Cloud Containers de Google AI Studio. 

- **Enlace del Despliegue de Producción (Iframe de Vista Previa):**
  [https://ais-dev-r3fnvtbpqv5idlhzk2vmoa-530960277487.us-west2.run.app](https://ais-dev-r3fnvtbpqv5idlhzk2vmoa-530960277487.us-west2.run.app)

### Funcionalidades Disponibles en la Demo:
1. **Visualizador & Editor:** Navega por los documentos y edítalos en tiempo real. Al editar el texto, puedes volver a solicitar un análisis semántico para regenerar dinámicamente los resúmenes y metadatos.
2. **Asistente Contextual con Sugerencias Inteligentes:** Haz clic en cualquiera de las preguntas predefinidas o escribe tus propias consultas. El agente responderá en milisegundos gracias al rendimiento de Gemini.
3. **Ingesta de Documentos por Drag & Drop:** Sube archivos de texto (.txt, .md, .csv) o documentos PDF (.pdf). La plataforma extraerá su texto de forma segura del lado del cliente y Gemini analizará el contenido categorizando e indexando sus datos.
4. **Comparador de Bóveda (Análisis Cruzado):** Selecciona dos o más documentos y genera matrices de comparación complejas en segundos, resaltando discrepancias de montos o conflictos legales en formato Markdown.

---
*DocuMind AI — Hecho con excelencia técnica y diseño visual avanzado para resolver los desafíos de productividad del mañana.*
