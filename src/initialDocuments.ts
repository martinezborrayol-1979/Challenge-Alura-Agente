import { DocumentItem } from "./types";

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Factura_Servicios_Enero_2026.txt",
    category: "Financiero",
    status: "Deployed",
    createdAt: "2026-01-15T10:30:00Z",
    content: `NOVATECH SOLUTIONS S.A.
NIT: 901.432.887-5
Calle 93 # 12-45, Bogotá D.C., Colombia
Email: billing@novatech.co | Tel: +57 (601) 543-2100

FACTURA COMERCIAL DE VENTA N° NT-2026-0042
Fecha de Emisión: 15 de Enero, 2026
Fecha de Vencimiento: 14 de Febrero, 2026 (Neto 30 días)
Moneda: USD (Dólares Americanos)

CLIENTE:
Alpha Analytics Corp.
Tax ID: US-88432190-B
100 Pine Street, San Francisco, CA 94111, USA
Contacto: Adquisiciones - info@alpha-analytics.com

----------------------------------------------------------------------
DESCRIPCIÓN DE SERVICIOS / PRODUCTOS
----------------------------------------------------------------------
1. Model Fine-Tuning & Custom Weights (Gemini Flash v2.5)
   - Ajuste fino y entrenamiento especializado para análisis semántico.
   - Cantidad: 1 | Precio Unitario: $15,500.00 | Total: $15,500.00

2. Multi-tenant High-Availability Compute Cluster (Dedicated node)
   - Alojamiento en servidor en la nube con redundancia geográfica activa.
   - Cantidad: 1 mes | Precio Unitario: $12,000.00 | Total: $12,000.00

3. Vector Database Storage Hosting (Durable Enterprise Plan)
   - Base de datos vectorial indexada para 10 millones de documentos.
   - Cantidad: 1 mes | Precio Unitario: $8,000.00 | Total: $8,000.00

4. Advanced System Integration Support & LLM Guardrails Configuration
   - Horas de consultoría de ingeniería para despliegue de filtros de seguridad.
   - Cantidad: 35 horas | Precio Unitario: $200.00 | Total: $7,000.00

----------------------------------------------------------------------
RESUMEN DE CUENTA
----------------------------------------------------------------------
SUBTOTAL:             $42,500.00 USD
IVA / Impuestos (0%): $0.00 USD (Exportación de servicios exenta)
RETENCIONES:          $0.00 USD
TOTAL NETO A PAGAR:   $42,500.00 USD

MÉTODO DE PAGO:
Transferencia Bancaria ACH Internacional
Banco: Federal Reserve Bank of New York
Número de Ruta: 021000021
Número de Cuenta: 1009843210-99
Beneficiario: NovaTech Solutions S.A.

TÉRMINOS Y CONDICIONES:
Este documento constituye un acuerdo comercial de pago vinculante. La mora en el pago generará un interés penal del 1.5% mensual sobre el saldo insoluto a partir del día siguiente al vencimiento.`,
    analysis: {
      category: "Financiero",
      summary: "Factura comercial N° NT-2026-0042 emitida por NovaTech Solutions S.A. a Alpha Analytics Corp por un total de $42,500.00 USD. Los conceptos facturados incluyen el ajuste fino de un modelo Gemini, hosting de clúster redundante, almacenamiento vectorial y horas de soporte en ingeniería de LLMs.",
      language: "Español",
      metadata: [
        { key: "Emisor", value: "NovaTech Solutions S.A." },
        { key: "Receptor", value: "Alpha Analytics Corp" },
        { key: "Número de Factura", value: "NT-2026-0042" },
        { key: "Monto Total", value: "$42,500.00 USD" },
        { key: "Fecha de Emisión", value: "15 de Enero, 2026" },
        { key: "Fecha de Vencimiento", value: "14 de Febrero, 2026 (Neto 30)" },
        { key: "Banco de Pago", value: "Federal Reserve Bank of New York" }
      ],
      suggestedActions: [
        { key: "Procesar pago", value: "Programar transferencia bancaria ACH antes de la fecha límite del 14 de Febrero de 2026 para evitar recargos." },
        { key: "Validar soporte", value: "Verificar la planilla de 35 horas de consultoría técnica ejecutadas con el líder técnico." },
        { key: "Contabilizar", value: "Registrar como gasto operacional de TI del primer trimestre de 2026." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Bajo (Factura regular alineada con los contratos vigentes de computación en la nube)"
    }
  },
  {
    id: "doc-2",
    title: "Contrato_Servicios_Intel_DocuMind.txt",
    category: "Legal",
    status: "Deployed",
    createdAt: "2026-02-10T09:15:00Z",
    content: `CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS (MSA)

Este Contrato de Prestación de Servicios (en adelante, el "Contrato") se celebra con fecha de entrada en vigor 10 de Febrero de 2026 (la "Fecha de Entrada en Vigor") entre:

PARTE A: DOCUMIND CORPORATION, con domicilio social en One Market Plaza, San Francisco, California 94105 (en adelante, "Prestador").
PARTE B: BETA CAPITAL PARTNERS INC., con domicilio social en 245 Park Avenue, Nueva York, NY 10167 (en adelante, "Cliente").

Ambas partes acuerdan sujetarse a los siguientes Términos y Condiciones:

1. OBJETO DEL CONTRATO
El Prestador proveerá servicios avanzados de procesamiento cognitivo, análisis semántico automatizado, e indexación de documentos basados en inteligencia artificial a través del entorno seguro "DocuMind Enterprise Cloud".

2. PROPIEDAD INTELECTUAL
2.1 Todos los modelos de lenguaje, algoritmos, metodologías de entrenamiento, interfaces de software y desarrollos propietarios utilizados para prestar el servicio son propiedad exclusiva del Prestador.
2.2 El Cliente conservará la propiedad absoluta e ilimitada sobre todos los datos, documentos y archivos cargados en el sistema. El Prestador tiene prohibido usar dichos datos para entrenar modelos públicos o divulgarlos a terceros.

3. CONFIDENCIALIDAD Y SEGURIDAD
Ambas partes se obligan a mantener en estricto secreto la Información Confidencial recibida de la otra parte. El Prestador mantendrá las certificaciones de seguridad SOC 2 Tipo II e ISO 27001 vigentes durante todo el período contractual.

4. LIMITACIÓN DE RESPONSABILIDAD
Con el límite máximo permitido por la ley aplicable, la responsabilidad agregada de cualquiera de las partes por cualquier daño, perjuicio o reclamación derivada de este Contrato estará estrictamente limitada a las tarifas anuales totales efectivamente abonadas por el Cliente en los últimos doce (12) meses anteriores al hecho causante del daño. Ninguna parte será responsable por daños indirectos, lucro cesante o pérdidas de oportunidad comercial.

5. LEY APLICABLE Y JURISDICCIÓN
Este Contrato se regirá e interpretará conforme a las leyes del Estado de Delaware, Estados Unidos, sin tener en cuenta sus principios de conflicto de leyes. Cualquier disputa que surja se resolverá exclusivamente en los tribunales competentes de Wilmington, Delaware.

En prueba de conformidad, firman el acuerdo de forma digital mediante plataforma criptográfica validada.`,
    analysis: {
      category: "Legal",
      summary: "Contrato Marco de Prestación de Servicios (MSA) firmado el 10 de Febrero de 2026 entre DocuMind Corporation (como Prestador) y Beta Capital Partners Inc (como Cliente) para proveer análisis semántico de documentos con IA. Incluye cláusulas sobre propiedad intelectual, confidencialidad SOC 2 y una limitación de responsabilidad contractual.",
      language: "Español",
      metadata: [
        { key: "Tipo de Documento", value: "Contrato Marco de Servicios (MSA)" },
        { key: "Parte Emisora / Prestador", value: "DocuMind Corporation" },
        { key: "Parte Receptora / Cliente", value: "Beta Capital Partners Inc." },
        { key: "Fecha de Firma", value: "10 de Febrero de 2026" },
        { key: "Jurisdicción", value: "Wilmington, Delaware, EE. UU." },
        { key: "Límite de Responsabilidad", value: "Tarifas abonadas en los últimos 12 meses" },
        { key: "Estándar de Seguridad", value: "SOC 2 Tipo II & ISO 27001" }
      ],
      suggestedActions: [
        { key: "Seguimiento Legal", value: "Garantizar que el equipo técnico no comparta secretos industriales en inputs generales." },
        { key: "Auditoría Técnica", value: "Validar de forma anual que DocuMind Corporation provea el certificado de auditoría SOC 2 Tipo II vigente." },
        { key: "Control de Facturas", value: "Establecer la contabilidad de las facturas para consolidar el límite máximo de responsabilidad contractual acumulado." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Medio (La limitación de responsabilidad está acotada únicamente a las tarifas pagadas en los últimos 12 meses, lo que protege a ambas partes pero requiere cuidado si se procesan datos hiper-sensibles)"
    }
  },
  {
    id: "doc-3",
    title: "Especificacion_API_Integracion_v2.md",
    category: "Técnico",
    status: "Deployed",
    createdAt: "2026-03-01T14:00:00Z",
    content: `# ESPECIFICACIÓN TÉCNICA: DOCUMIND CORE INTEGRATION API V2.4

Este documento detalla los endpoints RESTful para la integración de aplicaciones externas con el motor semántico de DocuMind AI.

## 1. AUTENTICACIÓN
Todas las solicitudes HTTP deben incluir el encabezado de autorización portador con un token API válido.

\`\`\`http
Authorization: Bearer dm_live_prod_88fa7b2299de2340e
\`\`\`

## 2. ENDPOINTS PRINCIPALES

### 2.1 Extracción Semántica de Entidades
Permite analizar un bloque de texto para extraer variables y categorizar la información.

*   **URL:** \`/v2/documents/extract\`
*   **Método:** \`POST\`
*   **Encabezados:** \`Content-Type: application/json\`
*   **Estructura del Payload (Request Body):**

\`\`\`json
{
  "document_text": "El contrato de arrendamiento firmado el 5 de enero por un total de $3,500...",
  "extract_keys": ["Monto", "Fecha de Firma", "Arrendador"],
  "enable_confidence_score": true
}
\`\`\`

*   **Estructura de la Respuesta (Response Body):**

\`\`\`json
{
  "status": "success",
  "document_id": "doc_994328",
  "entities": {
    "Monto": "$3,500",
    "Fecha de Firma": "2026-01-05",
    "Arrendador": "Desconocido"
  },
  "confidence": 0.98,
  "execution_time_ms": 142
}
\`\`\`

### 2.2 Generación de Embeddings Vectoriales
Genera un vector matemático de 1536 dimensiones que representa el significado contextual del texto para búsquedas semánticas de alta velocidad.

*   **URL:** \`/v2/embeddings/generate\`
*   **Método:** \`POST\`
*   **Payload:**

\`\`\`json
{
  "text_chunk": "NovaTech Solutions S.A. es una empresa líder en servicios en la nube."
}
\`\`\`

## 3. LÍMITES DE USO (RATE LIMITS)
- **Plan Enterprise:** 5,000 solicitudes por minuto por Token.
- **Códigos de Error Comunes:**
  - \`401 Unauthorized\`: Token no válido o expirado.
  - \`429 Too Many Requests\`: Límite de tasa superado. El servidor responderá con el encabezado \`Retry-After\`.`,
    analysis: {
      category: "Técnico",
      summary: "Manual técnico que detalla la especificación de la API de Integración v2.4 de DocuMind AI. Describe los endpoints para la extracción de entidades semánticas y la generación de embeddings, detallando payloads JSON, esquemas de respuesta, autenticación Bearer y límites de tasa de 5,000 requests/min.",
      language: "Español",
      metadata: [
        { key: "Tecnología", value: "REST API JSON" },
        { key: "Versión de API", value: "v2.4" },
        { key: "Endpoint de Extracción", value: "/v2/documents/extract" },
        { key: "Endpoint de Embeddings", value: "/v2/embeddings/generate" },
        { key: "Límite de Tasa", value: "5,000 req/min (Plan Enterprise)" },
        { key: "Token de Autenticación", value: "Bearer dm_live_prod_*" }
      ],
      suggestedActions: [
        { key: "Implementar SDK", value: "Integrar el endpoint /v2/documents/extract en el microservicio de ingesta para automatizar flujos de facturas." },
        { key: "Configurar reintentos", value: "Implementar lógica de backoff exponencial en el cliente de API para manejar códigos HTTP 429." },
        { key: "Monitorear latencia", value: "Registrar métricas de velocidad esperando un promedio de 150ms por transacción." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Bajo (Documento técnico de integración estándar con altos límites de tráfico empresarial)"
    }
  },
  {
    id: "doc-4",
    title: "Politica_Trabajo_Hibrido_SaaS_2026.txt",
    category: "Recursos Humanos",
    status: "Deployed",
    createdAt: "2026-03-10T11:45:00Z",
    content: `POLÍTICA GLOBAL DE TRABAJO FLEXIBLE E HÍBRIDO - DOCUMIND INC.
Código de Documento: HR-POL-2026-003
Fecha de Emisión: 10 de Marzo de 2026
Alcance: Todos los empleados a nivel mundial

1. PROPÓSITO
El propósito de esta política es establecer los lineamientos para el esquema de trabajo híbrido y flexible de DocuMind Inc., buscando equilibrar el rendimiento operativo excepcional, la cohesión cultural de los equipos y la flexibilidad laboral.

2. ESQUEMA CO-PRESENCIAL (MARTES Y MIÉRCOLES)
2.1 Se establece un modelo obligatorio de asistencia presencial de dos (2) días a la semana: Martes y Miércoles. 
2.2 Durante estos dos días de colaboración centralizada, los equipos llevarán a cabo reuniones estratégicas, revisiones de diseño y actividades de integración.
2.3 El horario de colaboración presencial recomendado es de 10:00 AM a 4:00 PM EST. Los lunes, jueves y viernes serán días de libre elección remota para todos los colaboradores cuyos roles lo permitan.

3. ESTIPENDIO MENSUAL DE CONECTIVIDAD Y ERGONOMÍA
3.1 Para apoyar el entorno de trabajo remoto, DocuMind otorgará un subsidio mensual neto de $150.00 USD.
3.2 Este subsidio está destinado exclusivamente a cubrir costos de internet de alta velocidad (mínimo 100 Mbps) y mejoras ergonómicas en la oficina en casa.
3.3 No se requiere la presentación mensual de facturas de servicios, pero RRHH se reserva el derecho de auditar de forma aleatoria la velocidad de conectividad de los colaboradores.

4. EQUIPAMIENTO Y ACTIVO DE LA EMPRESA
4.1 Todo el hardware proporcionado por la empresa (laptops Apple MacBook Pro, monitores de alta resolución y accesorios) sigue siendo propiedad exclusiva de DocuMind.
4.2 En caso de desvinculación laboral, voluntaria o involuntaria, el colaborador está obligado a devolver la totalidad del equipamiento en un plazo máximo de cinco (5) días hábiles en las oficinas centrales o mediante servicio de mensajería pre-pagado por la compañía.

Cualquier duda o solicitud de excepción médica o geográfica debe canalizarse a través de la plataforma de RRHH en el portal interno de la empresa.`,
    analysis: {
      category: "Recursos Humanos",
      summary: "Política oficial de trabajo híbrido (HR-POL-2026-003) para los empleados de DocuMind Inc. Establece días de oficina obligatorios (Martes y Miércoles), horario clave de 10 AM a 4 PM, un estipendio de trabajo remoto de $150 USD mensuales y pautas para el retorno de equipos de cómputo en caso de baja.",
      language: "Español",
      metadata: [
        { key: "Código de Documento", value: "HR-POL-2026-003" },
        { key: "Emisor", value: "Departamento de RRHH - DocuMind" },
        { key: "Esquema Presencial", value: "Martes y Miércoles (Obligatorio)" },
        { key: "Horas Core", value: "10:00 AM a 4:00 PM EST" },
        { key: "Monto de Estipendio", value: "$150.00 USD mensuales" },
        { key: "Plazo de Retorno de Equipos", value: "5 días hábiles" }
      ],
      suggestedActions: [
        { key: "Programar oficina", value: "Reservar escritorios o salas de juntas para los martes y miércoles en la app de reservas." },
        { key: "Monitorear subsidio", value: "Verificar la correcta inclusión del bono de $150 USD en el sistema de nómina a partir de la próxima quincena." },
        { key: "Auditorías de red", value: "RRHH coordinará pruebas de velocidad aleatorias para asegurar fluidez en videollamadas críticas." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Bajo (Normas internas de operación corporativa estándar que promueven cultura híbrida)"
    }
  },
  {
    id: "doc-5",
    title: "Reporte_Ventas_Diciembre_2015.csv",
    category: "Financiero",
    status: "Deployed",
    createdAt: "2015-12-31T23:59:00Z",
    content: `ID_Transaccion,Fecha,Producto,Categoria,Cantidad,Precio_Unitario,Total_Venta,Canal
TX-2015-001,2015-12-01,Suscripcion Premium SaaS,Licencias,15,250.00,3750.00,Directo
TX-2015-002,2015-12-03,API Gateway Access Tier B,Infraestructura,8,120.00,960.00,Partner
TX-2015-003,2015-12-05,Soporte Corporativo On-Demand,Servicios,4,500.00,2000.00,Directo
TX-2015-004,2015-12-10,Suscripcion Premium SaaS,Licencias,20,250.00,5000.00,Online
TX-2015-005,2015-12-12,Servicio de Consultoria Especializada,Servicios,2,1500.00,3000.00,Directo
TX-2015-006,2015-12-15,API Gateway Access Tier B,Infraestructura,12,120.00,1440.00,Partner
TX-2015-007,2015-12-20,Suscripcion Premium SaaS,Licencias,35,250.00,8750.00,Online
TX-2015-008,2015-12-22,Hardware Token de Seguridad,Seguridad,50,45.00,2250.00,Directo
TX-2015-009,2015-12-24,Soporte Corporativo On-Demand,Servicios,5,500.00,2500.00,Directo
TX-2015-010,2015-12-28,API Gateway Access Tier B,Infraestructura,10,120.00,1200.00,Partner

=== RESUMEN DE VENTAS POR PRODUCTO EN DICIEMBRE 2015 ===
1. Suscripcion Premium SaaS: 70 unidades vendidas | Total Ventas: $17,500.00 USD (EL PRODUCTO MÁS VENDIDO)
2. Soporte Corporativo On-Demand: 9 unidades vendidas | Total Ventas: $4,500.00 USD
3. API Gateway Access Tier B: 30 unidades vendidas | Total Ventas: $3,600.00 USD
4. Servicio de Consultoria Especializada: 2 unidades vendidas | Total Ventas: $3,000.00 USD
5. Hardware Token de Seguridad: 50 unidades vendidas | Total Ventas: $2,250.00 USD
Total del período de Diciembre 2015: $30,850.00 USD`,
    analysis: {
      category: "Financiero",
      summary: "Reporte de ventas detallado en formato CSV para el mes de Diciembre de 2015. Muestra transacciones comerciales individuales y consolida las ventas totales en $30,850.00 USD. El producto más vendido en diciembre de 2015 fue la 'Suscripción Premium SaaS' con un total acumulado de 70 unidades y una facturación de $17,500.00 USD.",
      language: "Español",
      metadata: [
        { key: "Año de Reporte", value: "2015" },
        { key: "Mes de Reporte", value: "Diciembre" },
        { key: "Formato de Datos", value: "Comma-Separated Values (CSV)" },
        { key: "Ventas Totales del Mes", value: "$30,850.00 USD" },
        { key: "Producto Líder en Ventas", value: "Suscripción Premium SaaS" },
        { key: "Monto del Producto Líder", value: "$17,500.00 USD (70 unidades)" },
        { key: "Transacción Individual Mayor", value: "TX-2015-007 ($8,750.00 USD)" }
      ],
      suggestedActions: [
        { key: "Análisis de Margen", value: "Revisar los márgenes de ganancia de la Suscripción Premium SaaS para evaluar posibles descuentos por volumen en 2016." },
        { key: "Incentivo de Canal", value: "Premiar a los canales online que empujaron el volumen récord de suscripciones durante la temporada navideña." },
        { key: "Monitoreo de Inventario", value: "Evaluar el stock físico de Hardware Tokens de Seguridad considerando la tasa de rotación mensual alta." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Bajo (Documento contable de auditoría histórica estándar)"
    }
  },
  {
    id: "doc-6",
    title: "Arquitectura_Plataforma_Ventas_SaaS.txt",
    category: "Técnico",
    status: "Deployed",
    createdAt: "2026-03-12T15:00:00Z",
    content: `# ARQUITECTURA DE SOFTWARE: PLATAFORMA DE VENTAS ENTERPRISE SAAS
Última actualización: Marzo 2026
Estado del Sistema: En Producción (Migrado a Arquitectura de Microservicios)

## 1. DESCRIPCIÓN GENERAL
La plataforma de ventas enterprise de la compañía opera en una infraestructura multi-cloud (AWS + GCP) automatizada por Terraform y Kubernetes (EKS/GKE).

## 2. ARQUITECTURA DE TECNOLOGÍA DEL BACK-END (PARTE DEL SERVIDOR)
Los microservicios clave del servidor están divididos por dominios de negocio y se desarrollan principalmente bajo dos lenguajes de programación principales:

1.  **Node.js (escrito en TypeScript v5.3):**
    *   *Propósito:* Manejo de la capa de API Gateway principal, autenticación federada, enrutamiento, lógica de vistas dinámicas, e ingesta/carga inteligente de archivos.
    *   *Frameworks:* Express v5, NestJS, y Drizzle ORM para consultas ágiles.
    *   *Ubicación:* Servicio de Integración de API, Panel del Administrador, y Procesador de Documentos.

2.  **Go (Golang v1.21):**
    *   *Propósito:* Motor de procesamiento de alta velocidad, cálculo distribuido de transacciones de facturación, generación de PDF de alto rendimiento, y sincronización de datos con el almacén central.
    *   *Frameworks:* Gin Gonic, gRPC, y Go-routines optimizadas para paralelismo.
    *   *Ubicación:* Motor de Transacciones Core, Microservicio de Facturación, y Distribuidor de Colas de Mensajes.

3.  **Python (Python v3.11) - Capa de IA de Soporte:**
    *   *Propósito:* Pipeline de NLP, cálculo de embeddings vectoriales a gran escala, y llamadas asíncronas a los modelos Gemini Pro y Gemini Flash a través del SDK de Google GenAI.
    *   *Frameworks:* FastAPI, LangChain, y ChromaDB.
    *   *Ubicación:* Agente de Búsqueda Semántica y Procesamiento de Documentos.

## 3. PERSISTENCIA DE DATOS (BASES DE DATOS)
*   **Base de datos relacional principal:** PostgreSQL v16 (Amazon RDS) con réplica de lectura activa.
*   **Base de datos vectorial:** pgvector & ChromaDB para el almacenamiento de embeddings semánticos.
*   **Capa de caché y sesiones rápidas:** Redis Enterprise Cluster.`,
    analysis: {
      category: "Técnico",
      summary: "Manual de arquitectura técnica detallado para la Plataforma de Ventas Enterprise SaaS de la compañía. Explica la división de microservicios e identifica que el back-end (parte del servidor) está construido usando principalmente Node.js (con TypeScript), Go (Golang) para el procesamiento de transacciones rápidas, y Python para la tubería de IA y soporte de LLMs.",
      language: "Español",
      metadata: [
        { key: "Capa del Servidor (Back-end)", value: "Node.js (TypeScript), Go (Golang), Python" },
        { key: "Base de Datos Relacional", value: "PostgreSQL v16 (Amazon RDS)" },
        { key: "Base de Datos Vectorial", value: "pgvector & ChromaDB" },
        { key: "Capa de Caché", value: "Redis Enterprise" },
        { key: "Infraestructura Cloud", value: "Multi-cloud (AWS + GCP, Kubernetes)" }
      ],
      suggestedActions: [
        { key: "Optimizar gRPC", value: "Monitorear la latencia de red entre los servicios de Node.js (Gateway) y Go (Transacciones Core)." },
        { key: "Auditoría de Versiones", value: "Actualizar las dependencias de TypeScript a la última versión estable antes del cierre del Q2." },
        { key: "Escalamiento Postgres", value: "Configurar escalado automático de almacenamiento de lectura para PostgreSQL en AWS RDS." }
      ].map(x => `${x.key}: ${x.value}`),
      riskLevel: "Bajo (Excelente organización tecnológica con redundancias robustas y estándares modernos)"
    }
  }
];
