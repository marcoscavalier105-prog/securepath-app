import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4; // ← pega tu anon public key

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${(opts.token || SUPABASE_ANON_KEY)}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
      ...opts.headers,
    },
    method: opts.method || "GET",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error_description || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
};

// Auth helpers
const authSignUp = (email, password) =>
  sb("/auth/v1/signup", { method: "POST", body: { email, password } });
const authSignIn = (email, password) =>
  sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
const authSignOut = (token) =>
  sb("/auth/v1/logout", { method: "POST", token });

// DB helpers
const dbGet = (table, query, token) =>
  sb(`/rest/v1/${table}?${query}`, { token });
const dbPost = (table, body, token) =>
  sb(`/rest/v1/${table}`, { method: "POST", body, token, prefer: "return=representation" });

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  black: "#0a0a0a", dark: "#111318", card: "#16191f",
  border: "rgba(255,255,255,0.07)", gold: "#d4a843", gold2: "#f0c96a",
  goldD: "rgba(212,168,67,0.12)", goldB: "rgba(212,168,67,0.25)",
  white: "#f2f0eb", muted: "#6b7280", green: "#22c55e",
  greenD: "rgba(34,197,94,0.10)", greenB: "rgba(34,197,94,0.25)",
  red: "#ef4444", redD: "rgba(239,68,68,0.08)", redB: "rgba(239,68,68,0.30)",
  blue: "#3b82f6", blueD: "rgba(59,130,246,0.08)", blueB: "rgba(59,130,246,0.25)",
  purple: "#a855f7",
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
const mezclar = (arr) => [...arr].sort(() => Math.random() - 0.5);
const mezclarConOpciones = (ps) => mezclar(ps).map((p) => ({ ...p, opciones: mezclar(p.opciones) }));
const fmtTiempo = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const colorDominio = (d) => [C.gold, C.blue, C.purple][d - 1] || C.gold;
const nombreDominio = (d) => ["Physical Security Assessment", "Application & Design", "Implementation"][d - 1] || "";

const MENSAJES_DIA = [
  "Cada pregunta que respondes hoy es una menos que puede sorprenderte el día del examen.",
  "El PSP no se memoriza — se entiende. Estudia los principios, no las respuestas.",
  "Los candidatos que pasan el PSP estudian en promedio 150 horas. ¿Cuántas llevas tú?",
  "ASIS mide tu capacidad de aplicar criterio profesional, no de recitar definiciones.",
  "Estudiar con banco de 400 preguntas es 4x más efectivo que con 100. Aprovéchalo.",
  "El dominio más difícil es el que menos has practicado. Entra a la guía teórica hoy.",
  "Cada explicación que lees después de un error vale más que 10 preguntas contestadas al azar.",
];

// ─── GUÍA TEÓRICA ─────────────────────────────────────────────────────────────
const GUIA = [
  { codigo:"D1-ST1", dominio:1, titulo:"Caracterización de Activos", resumen:"El Asset Characterization es el primer paso obligatorio de cualquier evaluación de riesgos según ASIS. Sin saber qué se protege, no se puede evaluar ninguna amenaza ni vulnerabilidad.", conceptos:[{term:"Activo",def:"Todo recurso de valor para la organización: personas, información, instalaciones, equipos, procesos y reputación."},{term:"Criticidad del activo",def:"Determinada por su valor, la consecuencia de su pérdida y la dificultad de reposición. Alta criticidad = impacto irreversible."},{term:"Asset Characterization",def:"Proceso de inventariar, describir y priorizar los activos antes de cualquier análisis de amenazas o vulnerabilidades."},{term:"Interdependencias",def:"Activos que dependen entre sí. La falla de uno puede comprometer a otros. Deben mapearse durante la caracterización."},{term:"Propietario del activo",def:"Área de negocio responsable del activo. En ESRM, es quien toma decisiones de tratamiento del riesgo."}], reglas:["Asset Characterization es SIEMPRE el paso 1 del proceso ASIS.","Un activo sin propietario definido no puede tener riesgo gestionado.","El valor del activo incluye valor operacional, estratégico y reputacional — no solo monetario."], referencia:"ASIS Risk Assessment Standard, Section 4.2" },
  { codigo:"D1-ST2", dominio:1, titulo:"Análisis de Amenazas", resumen:"El Threat Analysis identifica y evalúa las amenazas que pueden afectar los activos. Una amenaza adversarial requiere capacidad E intención para ser real.", conceptos:[{term:"Amenaza",def:"Cualquier evento o agente con potencial de causar daño a un activo. Incluye adversarios humanos, errores, fallas y desastres naturales."},{term:"Capacidad + Intención",def:"Los dos factores que determinan la probabilidad de una amenaza adversarial. Sin ambos, la amenaza es teórica."},{term:"Threat History",def:"Historial de incidentes similares en la instalación, sector o región. Informa la probabilidad con datos reales."},{term:"Insider Threat",def:"Amenaza originada en personal con acceso legítimo. Frecuentemente la más subestimada y con mayor capacidad de daño."},{term:"Escalas cualitativas",def:"ASIS usa Bajo/Medio/Alto en lugar de probabilidades numéricas porque rara vez existen datos estadísticos suficientes."}], reglas:["Baja probabilidad + consecuencia catastrófica = riesgo ALTO. No ignorar.","El threat analysis debe revisarse ante cambios en el entorno operacional.","Una amenaza con alta capacidad pero sin intención (o viceversa) es teórica, no crítica."], referencia:"ASIS Risk Assessment Standard, Section 4.3" },
  { codigo:"D1-ST3", dominio:1, titulo:"Análisis de Vulnerabilidades", resumen:"Una vulnerabilidad es una debilidad explotable. El VA identifica y prioriza debilidades físicas, operacionales y tecnológicas en las medidas de protección.", conceptos:[{term:"Vulnerabilidad",def:"Debilidad en diseño, implementación, procedimientos o controles que puede ser explotada por una amenaza."},{term:"Vulnerabilidad física",def:"Debilidades en barreras, accesos, iluminación, perímetro u otras contramedidas físicas."},{term:"Vulnerabilidad operacional",def:"Gaps en procedimientos, capacitación, supervisión o cumplimiento. La más frecuente y peligrosa."},{term:"Gap de implementación",def:"El control existe documentado pero no se aplica en la práctica. Crea falsa sensación de seguridad."},{term:"Vulnerabilidad residual",def:"La vulnerabilidad que permanece después de implementar contramedidas. Ningún sistema es 100% seguro."}], reglas:["Vulnerabilidad ≠ Amenaza ≠ Riesgo. Conceptos distintos con roles distintos en la metodología.","El VA usa: recorrido físico + entrevistas + revisión documental + pruebas funcionales.","Un sistema que solo tiene documentación pero no la aplica tiene vulnerabilidades operacionales críticas."], referencia:"ASIS Risk Assessment Standard, Section 4.4" },
  { codigo:"D1-ST4", dominio:1, titulo:"Análisis de Riesgo y Consecuencias", resumen:"Riesgo = Probabilidad × Vulnerabilidad × Consecuencia. El Consequence Analysis evalúa el impacto multidimensional si la amenaza se materializa.", conceptos:[{term:"Fórmula del riesgo ASIS",def:"Riesgo = Probabilidad × Vulnerabilidad × Consecuencia. Las tres variables son necesarias."},{term:"Consecuencia catastrófica",def:"Impacto irreversible: pérdida de vidas, quiebra organizacional o daño permanente. Genera riesgo ALTO incluso con baja probabilidad."},{term:"Riesgo inherente vs residual",def:"Inherente: sin contramedidas. Residual: después de contramedidas. El objetivo es reducir el inherente a un residual aceptable."},{term:"5 dimensiones de consecuencia",def:"Financiero + Operacional + Reputacional + Regulatorio/Legal + Seguridad de personas."},{term:"Opciones de tratamiento",def:"Evitar, Mitigar, Transferir (seguros) y Aceptar. La gerencia decide — no el PSP."}], reglas:["La tolerancia al riesgo (risk appetite) es una decisión de la gerencia, no del PSP.","La aceptación de riesgos por la gerencia debe documentarse formalmente.","El risk register es dinámico — se actualiza ante cambios en amenazas, activos u operaciones."], referencia:"ASIS Risk Assessment Standard, Section 4.5" },
  { codigo:"D1-ST5", dominio:1, titulo:"Análisis de Contramedidas", resumen:"Las contramedidas reducen el riesgo a niveles aceptables. Deben ser proporcionales al riesgo y cubrir las 5 funciones del modelo Deter-Detect-Delay-Respond-Recover.", conceptos:[{term:"Proporcionalidad",def:"Las contramedidas deben ser proporcionales al nivel de riesgo identificado. Ni más ni menos."},{term:"Preventiva / Detectiva / Correctiva",def:"Preventiva: antes del incidente. Detectiva: durante. Correctiva: después para restaurar."},{term:"D-D-D-R-R",def:"Deter → Detect → Delay → Respond → Recover. El conjunto de contramedidas debe cubrir las 5 funciones."},{term:"Layered security",def:"Capas concéntricas de contramedidas. Si una falla, las siguientes compensan. Ninguna capa es infalible aislada."},{term:"Contramedida compensatoria",def:"Medida alternativa cuando la contramedida ideal no puede implementarse. Debe documentarse su equivalencia."}], reglas:["Life safety SIEMPRE tiene precedencia sobre la seguridad de activos.","Las contramedidas rechazadas por la gerencia deben documentarse con el riesgo residual resultante.","El Countermeasure Analysis concluye con la entrega del informe — la implementación es una fase posterior."], referencia:"ASIS Risk Assessment Standard, Section 5" },
  { codigo:"D1-ST6", dominio:1, titulo:"Marco ESRM", resumen:"ESRM alinea la seguridad con los objetivos del negocio. El Security Manager deja de ser 'jefe de guardias' para ser 'asesor estratégico de riesgos de negocio'.", conceptos:[{term:"ESRM",def:"Marco que posiciona la seguridad como función de gestión de riesgos empresariales, no como función técnica aislada."},{term:"Propietario del riesgo",def:"El responsable del área de negocio. Conoce mejor el valor de sus activos y toma las decisiones de tratamiento."},{term:"Ciclo ESRM",def:"Identificar y priorizar → Mitigar → Responder e investigar → Aprender y mejorar. Proceso continuo."},{term:"Security as business enabler",def:"La seguridad protege las condiciones que permiten operar, crecer y competir. No es costo — es habilitador."},{term:"Métricas ESRM",def:"Mide éxito en: riesgo reducido, valor protegido, riesgo residual gestionado — no en número de incidentes."}], reglas:["El PSP presenta opciones con costo-beneficio. La gerencia decide.","El primer paso para implementar ESRM es obtener el respaldo de la alta dirección y cambiar el lenguaje a 'negocio'.","ESRM y ISO 31000 son complementarios — el ESRM aplica los principios del ISO 31000 al dominio de seguridad."], referencia:"ASIS ESRM Guideline" },
  { codigo:"D1-ST7", dominio:1, titulo:"Inspecciones y Auditorías", resumen:"Survey (¿qué existe?) ≠ Assessment (¿cuál es el riesgo?) ≠ Audit (¿se cumple lo establecido?). Son herramientas distintas para propósitos distintos.", conceptos:[{term:"Security Audit",def:"Revisión sistemática e independiente que verifica conformidad con políticas, estándares y objetivos."},{term:"Madurez del programa",def:"Documentado → Implementado → Medido → Gestionado → Optimizado. Un programa puede tener tecnología avanzada pero baja madurez."},{term:"No conformidad mayor",def:"Brecha entre lo documentado y lo practicado en controles críticos. Requiere acción correctiva con causa raíz."},{term:"Causa raíz",def:"El origen real del problema. Las acciones correctivas que atacan solo el síntoma generan recurrencia."},{term:"Tipos de auditoría",def:"1ra parte (interna) / 2da parte (cliente/contratante) / 3ra parte (organismo externo independiente)."}], reglas:["La independencia del auditor es esencial. No puede reportar al área auditada.","Los criterios de evaluación se definen ANTES de ejecutar la auditoría — no durante.","Una auditoría sin plan de seguimiento (follow-up) es un ejercicio incompleto."], referencia:"ASIS Security Audit Standard" },
  { codigo:"D1-ST8", dominio:1, titulo:"Requisitos Legales y Normativos", resumen:"El PSP en Perú opera bajo múltiples normas simultáneas. La ley establece el piso mínimo; los estándares ASIS son las mejores prácticas. Ambos aplican a la vez.", conceptos:[{term:"Ley 28879",def:"Ley de Servicios de Seguridad Privada. Regula habilitaciones, funciones permitidas y prohibidas."},{term:"DS 003-2011-IN",def:"Reglamento de la Ley 28879. Personal armado requiere Licencia SUCAMEC. Responsabilidad solidaria del contratante."},{term:"Ley 29783",def:"Seguridad y Salud en el Trabajo. Identificar peligros, evaluar riesgos, adoptar controles proporcionales."},{term:"Ley 29733",def:"Protección de Datos Personales. Las imágenes de CCTV son datos personales. Requieren aviso visible y retención limitada."},{term:"Responsabilidad solidaria",def:"La empresa contratante responde junto a la empresa de seguridad privada. Terciarizar no exime de responsabilidad."}], reglas:["Seguridad privada NO puede detener, investigar criminalmente ni ejercer funciones de inteligencia del Estado.","El uso de la fuerza: proporcional + subsidiario + limitado a lo necesario para neutralizar la amenaza.","CCTV en baños, vestuarios y salas de lactancia: PROHIBIDO absolutamente."], referencia:"Ley 28879, DS 003-2011-IN, Ley 29783, Ley 29733" },
  { codigo:"D1-ST9", dominio:1, titulo:"Documentación e Informes", resumen:"Los informes de evaluación son documentos altamente sensibles que revelan vulnerabilidades. Deben ser objetivos, específicos y accionables.", conceptos:[{term:"Estructura del informe",def:"Portada → Resumen ejecutivo → Alcance y metodología → Hallazgos → Recomendaciones priorizadas → Anexos."},{term:"Resumen ejecutivo",def:"En lenguaje de negocio para la alta gerencia. Sin jerga técnica. Impacto en objetivos, opciones, inversiones."},{term:"Chain of custody",def:"Registro de quién tuvo acceso a una evidencia desde su recolección. Hash criptográfico + registro de accesos."},{term:"Risk register",def:"Documento dinámico: riesgo + nivel + tratamiento + responsable + estado + riesgo residual actual."},{term:"Gap analysis",def:"Comparación estado actual vs. estado deseado del programa para identificar brechas a cerrar."}], reglas:["Hallazgo = descriptivo (qué existe). Recomendación = prescriptivo (qué hacer). No confundirlos.","El PSP no puede omitir hallazgos a pedido del cliente. La solución es clasificación correcta, no alteración.","Retención recomendada de informes: 5-7 años mínimo."], referencia:"ASIS Risk Assessment Standard - Documentation" },
  { codigo:"D2-ST1", dominio:2, titulo:"Barreras Físicas y Perímetro", resumen:"Las barreras físicas cumplen la función DELAY. No eliminan la intrusión — compran tiempo para que llegue la respuesta.", conceptos:[{term:"Función DELAY",def:"El propósito principal de las barreras: retrasar al intruso el tiempo necesario para que la respuesta llegue antes de que alcance el activo."},{term:"Zonas concéntricas",def:"Perímetro exterior → Perímetro del edificio → Área protegida interior. Cada zona tiene sus propios controles."},{term:"Clear zone",def:"Espacio despejado a ambos lados de la cerca. Elimina ocultamiento, permite visibilidad y patrulla vehicular."},{term:"Standoff distance",def:"Distancia entre el perímetro y la estructura. Crítica en protección anti-VBIED: la onda de presión se disipa con la distancia."},{term:"CPTED",def:"4 principios: Vigilancia natural + Control natural de accesos + Refuerzo territorial + Mantenimiento."}], reglas:["Cerca eslabón de cadena: mínimo 1.8m con extensión superior inclinada hacia afuera.","Gap inferior de cerca: máximo 5 cm del suelo.","Ramas de árboles sobre la cerca = vulnerabilidad documentada."], referencia:"ASIS Physical Security Standard - Perimeter" },
  { codigo:"D2-ST2", dominio:2, titulo:"Sistemas de Control de Acceso", resumen:"El ACS gestiona quién accede a qué y cuándo. El principio need-to-go (mínimo privilegio) es el fundamento de todo diseño.", conceptos:[{term:"Tres factores de autenticación",def:"TIENES (tarjeta) + SABES (PIN) + ERES (biometría). MFA combina dos o más factores."},{term:"Need-to-go",def:"Mínimo privilegio: cada persona accede solo a las áreas estrictamente necesarias para su función."},{term:"Anti-passback",def:"Impide usar una credencial para ingresar si no registró salida previa. Previene el tailgating de credencial."},{term:"Fail-safe vs fail-secure",def:"Fail-safe: al fallar queda abierta (prioriza evacuación). Fail-secure: queda cerrada (prioriza el activo)."},{term:"Credential lifecycle",def:"Onboarding → Cambios de rol → Offboarding inmediato. La falla en offboarding genera credenciales activas de exempleados."}], reglas:["Salidas de emergencia: SIEMPRE fail-safe. Life safety no se negocia.","Credenciales de exempleados activas = no conformidad crítica.","El duress code activa alarma silenciosa cuando el usuario es coaccionado."], referencia:"ASIS Physical Security Standard - ACS" },
  { codigo:"D2-ST3", dominio:2, titulo:"Sistemas de Detección de Intrusos", resumen:"El IDS cumple la función DETECT. Debe detectar la intrusión dentro del tiempo de demora que las barreras ofrecen para que la respuesta llegue a tiempo.", conceptos:[{term:"Time-to-detect (TTD)",def:"Tiempo entre el inicio de la intrusión y la generación de la alerta. Debe ser menor que el tiempo de demora de las barreras."},{term:"Sensor dual-tech",def:"PIR + microondas. Solo alarma si ambos detectan simultáneamente. Reduce drásticamente las falsas alarmas."},{term:"Tamper detection",def:"Alerta cuando el sensor es manipulado. Un adversario sofisticado neutraliza sensores antes de ingresar."},{term:"Supervisión de línea",def:"Monitorea el circuito de comunicación. Si el cable es cortado, genera alarma inmediata."},{term:"Alarm fatigue",def:"Exceso de falsas alarmas → operadores ignoran todas las alarmas → las reales también se ignoran. Mayor riesgo operacional."}], reglas:["Tasa de falsas alarmas aceptable: < 10%. Mayor requiere investigación de causa raíz.","IDS perimetral + IDS interior = detección en capas concéntricas.","Pruebas periódicas del IDS son mantenimiento preventivo obligatorio."], referencia:"ASIS Physical Security Standard - IDS" },
  { codigo:"D2-ST4", dominio:2, titulo:"Videovigilancia (CCTV)", resumen:"El CCTV cumple funciones proactiva (prevención en tiempo real) y reactiva (investigación forense). Un buen diseño sirve para ambas.", conceptos:[{term:"Detección / Reconocimiento / Identificación",def:"Tres niveles de calidad de imagen. Identificación requiere mayor resolución (~50-100 píxeles por metro de sujeto)."},{term:"Frame rate",def:"Mínimo 15 fps para uso forense. A menor fps se pierden movimientos rápidos."},{term:"WDR",def:"Wide Dynamic Range. Necesario cuando hay zonas muy brillantes y muy oscuras en el mismo encuadre (ej: entradas con sol)."},{term:"Video analytics",def:"Detecta eventos automáticamente. Reduce la dependencia del monitoreo humano continuo. Transforma el CCTV de reactivo a proactivo."},{term:"VMS",def:"Video Management System. Gestiona grabación, reproducción, búsqueda, usuarios e integración de todas las cámaras IP."}], reglas:["CCTV en baños, vestuarios y salas de lactancia: PROHIBIDO.","Aviso de videovigilancia visible: obligatorio (Ley 29733 Perú).","La cadena de custodia de grabaciones incluye hash criptográfico + registro de cada acceso posterior."], referencia:"ASIS Physical Security Standard - CCTV" },
  { codigo:"D2-ST5", dominio:2, titulo:"Iluminación y CPTED", resumen:"La iluminación de seguridad tiene estándares mínimos, requiere respaldo energético y mantenimiento programado. No es solo operacional — es parte del sistema de protección.", conceptos:[{term:"Foot-candle (fc)",def:"Unidad de iluminancia. Peatonal exterior: ≥ 0.5 fc. Entradas: ≥ 2 fc. Inspección vehicular: ≥ 5 fc. Clear zone: ≥ 0.5 fc."},{term:"Uniformidad",def:"Relación máximo/mínimo de iluminación. Alta uniformidad evita zonas de sombra que sirven de ocultamiento."},{term:"Glare (deslumbramiento)",def:"Fuente brillante que deslumbra a guardias o cámaras. Puede ser usado intencionalmente por un atacante."},{term:"Orientación hacia afuera",def:"La iluminación perimetral apunta afuera: ilumina al intruso, deja al guardia en penumbra (ve sin ser visto)."},{term:"CPTED - 4 principios",def:"Vigilancia natural + Control natural de accesos + Refuerzo territorial + Mantenimiento."}], reglas:["Luminarias de seguridad deben tener respaldo energético: los cortes eléctricos ocurren en emergencias.","La vegetación sin mantenimiento crea puntos de ocultamiento — vulnerabilidad de seguridad documentada.","Light trespass: la luz de seguridad no debe derramarse sobre propiedades vecinas."], referencia:"ASIS Physical Security Standard - Lighting" },
  { codigo:"D2-ST6", dominio:2, titulo:"Sistemas de Comunicación", resumen:"Los sistemas de comunicación son el sistema nervioso de la seguridad. Deben ser redundantes porque tienden a fallar exactamente durante las emergencias.", conceptos:[{term:"Redundancia real",def:"Múltiples canales INDEPENDIENTES (radio + teléfono + celular + satelital). Dos radios del mismo sistema NO es redundancia."},{term:"Duress alarm",def:"Botón de pánico SILENCIOSO. Alerta al CCS sin que el atacante lo sepa. Silencioso para no provocar escalada."},{term:"Sistema PA de emergencia",def:"Transmite instrucciones a toda la instalación simultáneamente. Cobertura total + respaldo energético obligatorios."},{term:"Comunicación degradada",def:"Plan cuando los sistemas primarios fallan: canales alternativos, procedimientos simplificados, puntos de encuentro."},{term:"Protocolo de notificación",def:"Información temprana incompleta es mejor que información tardía completa. Primer mensaje: qué, dónde, cuándo, estado."}], reglas:["El CCS debe tener protocolos predefinidos y probados con PNP, bomberos y emergencias médicas.","Todas las comunicaciones del CCS durante un incidente deben grabarse.","La latencia de comunicación consume el tiempo de demora que las barreras proporcionan."], referencia:"ASIS Physical Security Standard - Communications" },
  { codigo:"D2-ST7", dominio:2, titulo:"Integración y Convergencia", resumen:"La integración permite que los sistemas respondan coordinadamente. La convergencia física-cibernética reconoce que las amenazas modernas cruzan ambos dominios.", conceptos:[{term:"Integración ACS-CCTV",def:"Un evento en el ACS activa automáticamente la cámara correcta. Acelera la verificación y el forense."},{term:"PSIM",def:"Physical Security Information Management. Integra todos los sistemas, correlaciona eventos, guía al operador."},{term:"ONVIF / OSDP",def:"Protocolos abiertos. ONVIF: cámaras IP. OSDP: lectores de acceso. Evitan el vendor lock-in."},{term:"Convergencia física-cibernética",def:"Ataque físico con objetivo cibernético (insertar dispositivo en red) y viceversa (hackear ACS para abrir puertas)."},{term:"Ciberseguridad de sistemas físicos",def:"Cambiar contraseñas por defecto + firmware actualizado + VLAN separada. Las cámaras IP son activos cibernéticos."}], reglas:["Testing de integración verifica los flujos entre sistemas, no solo el funcionamiento individual de cada uno.","Protocolos propietarios = vendor lock-in. Mayor costo de expansión, dependencia total del proveedor.","El SOC es el punto único de falla del sistema integrado. Debe tener redundancia."], referencia:"ASIS Physical Security Standard - Integration" },
  { codigo:"D3-ST1", dominio:3, titulo:"Gestión de Proyectos y Adquisiciones", resumen:"Los proyectos de seguridad siguen el ciclo PMI. La triple restricción (Alcance-Tiempo-Costo) aplica siempre. El scope creep es el riesgo más frecuente y costoso.", conceptos:[{term:"Triple restricción",def:"Alcance + Tiempo + Costo. Cambiar uno impacta a los demás. La calidad sufre si se ignora el balance."},{term:"Scope creep",def:"Expansión no controlada del alcance por cambios informales. Se controla con proceso formal de control de cambios."},{term:"WBS",def:"Work Breakdown Structure. Descomposición jerárquica del proyecto. Base del cronograma y el presupuesto."},{term:"CAPEX vs OPEX",def:"CAPEX: inversión en activos (instalación). OPEX: costos recurrentes de operación y mantenimiento."},{term:"Especificación de desempeño",def:"Define QUÉ debe lograr el sistema, no qué instalar. Garantiza competencia real, evita especificaciones propietarias."}], reglas:["Los milestones son puntos de verificación de entregables — vinculados típicamente a pagos.","La gestión de stakeholders es crítica: RRHH, TI, Operaciones. Ignorarlos genera resistencia que bloquea el proyecto.","Contingencia (10-15%) se usa solo para riesgos identificados materializados — no para compensar errores."], referencia:"ASIS Physical Security Standard - Project Management" },
  { codigo:"D3-ST2", dominio:3, titulo:"Instalación y Comisionamiento", resumen:"Instalación ≠ Comisionamiento. Un sistema instalado pero no comisionado puede no cumplir los requerimientos. El comisionamiento es la verificación formal del funcionamiento.", conceptos:[{term:"Comisionamiento",def:"Verificación sistemática de que el sistema completo funciona según los requerimientos del propietario."},{term:"Planos as-built",def:"Documentan cómo quedó realmente instalado (con todos los cambios). Indispensables para mantenimiento futuro."},{term:"FAT vs SAT",def:"FAT: verifica en fábrica antes del envío. SAT: verifica en el sitio real con condiciones e integraciones reales."},{term:"Aceptación provisional",def:"Sistema funciona con deficiencias menores pendientes de corrección. Las garantías corren desde aquí."},{term:"Protocolo de pruebas",def:"Define qué se probará, cómo, criterio de éxito/fallo, y quién aprueba. Se acuerda ANTES de ejecutar."}], reglas:["Planos as-built: entregable obligatorio del dossier de cierre.","El comisionamiento finaliza con la aceptación firmada del cliente, no con el pago final.","Etiquetado debe coincidir entre etiqueta física, planos y software del sistema."], referencia:"ASIS Physical Security Standard - Commissioning" },
  { codigo:"D3-ST3", dominio:3, titulo:"Operaciones y Mantenimiento", resumen:"Un sistema sin mantenimiento se degrada silenciosamente hasta fallar en el momento más crítico. El mantenimiento preventivo es inversión — no gasto.", conceptos:[{term:"Mantenimiento preventivo",def:"Acciones planificadas para mantener el sistema funcionando y prevenir fallas antes de que ocurran."},{term:"MTBF",def:"Mean Time Between Failures. Tiempo promedio entre fallas. Usado para planificar reemplazos preventivos."},{term:"MTTR",def:"Mean Time To Repair. Tiempo promedio de reparación. Indicador clave del SLA del proveedor de mantenimiento."},{term:"SMA",def:"Service & Maintenance Agreement. Debe definir: SLA de respuesta, alcance, actualizaciones incluidas, repuestos cubiertos."},{term:"Ciclo de vida tecnológico",def:"Planificar el reemplazo antes de que el costo de mantenimiento supere el costo del reemplazo o el soporte termine."}], reglas:["El log de mantenimiento es la memoria del sistema. Sin él el conocimiento se pierde cuando cambia el técnico.","Las actualizaciones de firmware se planifican, prueban y documentan — no se aplican automáticamente en producción.","Contratistas de mantenimiento: credenciales temporales + acceso limitado + supervisión activa."], referencia:"ASIS Physical Security Standard - O&M" },
  { codigo:"D3-ST4", dominio:3, titulo:"Capacitación y Ejercicios", resumen:"La capacitación convierte procedimientos en competencias. Los ejercicios convierten competencias en respuestas entrenadas bajo presión. Ambos son necesarios.", conceptos:[{term:"Evaluación de competencias",def:"Verifica que el personal adquirió las competencias requeridas, no solo que asistió. Mide resultado, no asistencia."},{term:"Tabletop exercise",def:"Simulación verbal de escenarios de emergencia. Identifica brechas sin el costo de un ejercicio en campo."},{term:"Conciencia de seguridad",def:"Para todos los empleados: no sostener puertas, reportar credenciales perdidas, identificar comportamientos sospechosos."},{term:"Formación vs educación",def:"Formación: habilidades para ejecutar tareas específicas. Educación: comprensión conceptual para adaptar a nuevos escenarios."},{term:"Post-incident review",def:"Después de cada incidente: ¿las brechas de capacitación contribuyeron? Si sí, actualizar el programa."}], reglas:["La efectividad se mide por resultados (reducción de errores) — no por horas de capacitación impartidas.","La capacitación en nuevos sistemas debe ocurrir ANTES de que entren en operación.","Los simulacros son más efectivos con debriefing estructurado que identifica brechas reales."], referencia:"ASIS Physical Security Standard - Training" },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SecurePathPSP() {
  // Auth state
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // App navigation
  const [vista, setVista] = useState("dashboard"); // "dashboard" | "simulacro" | "guia" | "progreso"

  // Banco de preguntas
  const [banco, setBanco] = useState([]);
  const [cargandoBanco, setCargandoBanco] = useState(false);
  const [totalPorDominio, setTotalPorDominio] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });

  // Progreso del usuario
  const [historialUsuario, setHistorialUsuario] = useState([]);

  // Simulacro state
  const [filtroDominio, setFiltroDominio] = useState(0);
  const [preguntas, setPreguntas] = useState([]);
  const [idx, setIdx] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [mostrarExp, setMostrarExp] = useState(false);
  const [respuestas, setRespuestas] = useState([]);
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaMax, setRachaMax] = useState(0);
  const [modoRevision, setModoRevision] = useState(false);
  const [idxRevision, setIdxRevision] = useState(0);
  const [simulacroPantalla, setSimulacroPantalla] = useState("inicio"); // "inicio" | "simulacro" | "resultado"
  const tiemposPorPregunta = useRef([]);
  const tiempoInicioP = useRef(Date.now());

  // Guía teórica state
  const [subtemaSeleccionado, setSubtemaSeleccionado] = useState(null);

  // Cargar sesión de localStorage al montar
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp_session") || "null");
      if (stored?.access_token) {
        setSession(stored);
        cargarBanco(stored.access_token);
        cargarHistorial(stored.user.id, stored.access_token);
      }
    } catch {}
  }, []);

  // Cronómetro simulacro
  useEffect(() => {
    if (simulacroPantalla !== "simulacro" || pausado) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [simulacroPantalla, pausado]);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      let data;
      if (authMode === "login") {
        data = await authSignIn(authEmail, authPassword);
      } else {
        data = await authSignUp(authEmail, authPassword);
        if (!data.access_token) {
          setAuthError("Registro exitoso. Revisa tu correo para confirmar tu cuenta.");
          setAuthLoading(false);
          return;
        }
      }
      localStorage.setItem("sp_session", JSON.stringify(data));
      setSession(data);
      await cargarBanco(data.access_token);
      await cargarHistorial(data.user.id, data.access_token);
    } catch (err) {
      setAuthError(err.message || "Error de autenticación. Verifica tus credenciales.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await authSignOut(session.access_token); } catch {}
    localStorage.removeItem("sp_session");
    setSession(null);
    setBanco([]);
    setHistorialUsuario([]);
  };

  // ── BANCO SUPABASE ────────────────────────────────────────────────────────
  const cargarBanco = async (token) => {
    setCargandoBanco(true);
    try {
      const data = await dbGet(
        "preguntas",
        "select=id,dominio_id,texto,opciones,correcta,explicacion&activa=eq.true&order=dominio_id",
        token
      );
      const norm = data.map((p) => ({
        id: p.id, dominio: p.dominio_id, texto: p.texto,
        opciones: p.opciones, correcta: p.correcta, explicacion: p.explicacion,
      }));
      setBanco(norm);
      const t = { 0: norm.length };
      [1, 2, 3].forEach((d) => { t[d] = norm.filter((p) => p.dominio === d).length; });
      setTotalPorDominio(t);
    } catch (err) {
      console.error("Error cargando banco:", err);
    } finally {
      setCargandoBanco(false);
    }
  };

  // ── HISTORIAL SUPABASE ────────────────────────────────────────────────────
  const cargarHistorial = async (userId, token) => {
    try {
      const data = await dbGet(
        "sesiones_simulacro",
        `select=*&usuario_id=eq.${userId}&order=created_at.desc&limit=20`,
        token
      );
      setHistorialUsuario(data || []);
    } catch {}
  };

  const guardarSesion = async (todasRespuestas) => {
    if (!session) return;
    try {
      const correctas = todasRespuestas.filter((r) => r.correcta).length;
      const pct = Math.round((correctas / todasRespuestas.length) * 100);
      const sesion = {
        usuario_id: session.user.id,
        dominio_filtro: filtroDominio,
        total_preguntas: todasRespuestas.length,
        correctas,
        porcentaje: pct,
        tiempo_segundos: segundos,
        completada: true,
      };
      await dbPost("sesiones_simulacro", sesion, session.access_token);
      await cargarHistorial(session.user.id, session.access_token);
    } catch (err) {
      console.error("Error guardando sesión:", err);
    }
  };

  // ── SIMULACRO LOGIC ───────────────────────────────────────────────────────
  const iniciarSimulacro = (cantidad) => {
    const pool = filtroDominio === 0 ? banco : banco.filter((p) => p.dominio === filtroDominio);
    const mezcladas = mezclarConOpciones(pool).slice(0, Math.min(cantidad, pool.length));
    setPreguntas(mezcladas);
    setIdx(0); setSeleccion(null); setMostrarExp(false);
    setRespuestas([]); setSegundos(0); setPausado(false);
    setRachaActual(0); setRachaMax(0);
    tiemposPorPregunta.current = [];
    tiempoInicioP.current = Date.now();
    setSimulacroPantalla("simulacro");
  };

  const responder = (key) => {
    if (seleccion) return;
    setSeleccion(key);
    setMostrarExp(true);
    const esCorrecta = key === preguntas[idx].correcta;
    const nuevaRacha = esCorrecta ? rachaActual + 1 : 0;
    setRachaActual(nuevaRacha);
    setRachaMax((prev) => Math.max(prev, nuevaRacha));
  };

  const siguiente = () => {
    const p = preguntas[idx];
    const tiempoP = Math.round((Date.now() - tiempoInicioP.current) / 1000);
    tiemposPorPregunta.current.push(tiempoP);
    tiempoInicioP.current = Date.now();
    const nuevaResp = {
      preguntaId: p.id, dominio: p.dominio, textoP: p.texto,
      opcionElegida: seleccion, opcionCorrecta: p.correcta,
      correcta: seleccion === p.correcta, explicacion: p.explicacion, opciones: p.opciones,
    };
    const todasRespuestas = [...respuestas, nuevaResp];
    setRespuestas(todasRespuestas);
    if (idx + 1 < preguntas.length) {
      setIdx((i) => i + 1); setSeleccion(null); setMostrarExp(false);
    } else {
      guardarSesion(todasRespuestas);
      setSimulacroPantalla("resultado");
    }
  };

  const calcResultados = () => {
    const dominios = [1, 2, 3].map((d) => {
      const deD = respuestas.filter((r) => r.dominio === d);
      const correctas = deD.filter((r) => r.correcta).length;
      return { dominio: d, total: deD.length, correctas, pct: deD.length ? Math.round((correctas / deD.length) * 100) : null };
    });
    const totalCorrectas = respuestas.filter((r) => r.correcta).length;
    const pctTotal = Math.round((totalCorrectas / respuestas.length) * 100);
    const tiempoPromedio = tiemposPorPregunta.current.length
      ? Math.round(tiemposPorPregunta.current.reduce((a, b) => a + b, 0) / tiemposPorPregunta.current.length)
      : 0;
    return { dominios, totalCorrectas, total: respuestas.length, pctTotal, tiempoPromedio };
  };

  // ── PROGRESO CALCULADO ────────────────────────────────────────────────────
  const calcProgreso = () => {
    if (!historialUsuario.length) return { global: 0, sesiones: 0, mejor: 0, ultimo: null };
    const sesiones = historialUsuario.length;
    const mejor = Math.max(...historialUsuario.map((s) => s.porcentaje || 0));
    const ultimo = historialUsuario[0];
    const global = Math.round(historialUsuario.reduce((a, s) => a + (s.porcentaje || 0), 0) / sesiones);
    return { global, sesiones, mejor, ultimo };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PANTALLA: LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, color: C.gold }}>
              Secure<span style={{ color: C.white, fontWeight: 400 }}>Path</span>
              <span style={{ color: C.muted, fontSize: 14, fontWeight: 400, marginLeft: 8 }}>PSP</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.25em", marginTop: 6 }}>
              PLATAFORMA DE PREPARACIÓN PSP®
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
            {[["login", "Iniciar sesión"], ["register", "Crear cuenta"]].map(([m, l]) => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }}
                style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${authMode === m ? C.gold : "transparent"}`, color: authMode === m ? C.gold : C.muted, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>CORREO ELECTRÓNICO</div>
              <input
                type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                placeholder="tu@correo.com"
                style={{ width: "100%", padding: "12px 14px", background: C.dark, border: `1px solid ${C.border}`, color: C.white, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>CONTRASEÑA</div>
              <input
                type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 14px", background: C.dark, border: `1px solid ${C.border}`, color: C.white, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {authError && (
              <div style={{ padding: "10px 14px", background: C.redD, border: `1px solid ${C.redB}`, fontSize: 12, color: "#fca5a5", fontFamily: "monospace" }}>
                {authError}
              </div>
            )}

            <button onClick={handleAuth} disabled={authLoading || !authEmail || !authPassword}
              style={{ padding: "14px", background: authLoading ? C.goldD : C.gold, border: "none", color: C.black, fontFamily: "Syne, Inter, sans-serif", fontSize: 14, fontWeight: 700, cursor: authLoading ? "not-allowed" : "pointer", opacity: (!authEmail || !authPassword) ? 0.5 : 1, transition: "all 0.2s" }}>
              {authLoading ? "Cargando..." : authMode === "login" ? "Entrar →" : "Crear cuenta →"}
            </button>
          </div>

          <div style={{ marginTop: 28, padding: "14px", background: C.goldD, borderLeft: `3px solid ${C.gold}`, fontSize: 11, color: "#d1d5db", lineHeight: 1.7 }}>
            <strong style={{ color: C.gold }}>400 preguntas</strong> cubren los 3 dominios del examen PSP® con explicaciones completas y referencias ASIS.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NAV HEADER (visible en todas las vistas autenticadas)
  // ─────────────────────────────────────────────────────────────────────────
  const NavHeader = () => (
    <div style={{ background: C.dark, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
      <button onClick={() => { setVista("dashboard"); setSimulacroPantalla("inicio"); }}
        style={{ background: "none", border: "none", fontFamily: "Syne, Inter, sans-serif", fontSize: 16, fontWeight: 800, color: C.gold, cursor: "pointer" }}>
        Secure<span style={{ color: C.white, fontWeight: 400 }}>Path</span>
      </button>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {[["dashboard", "Inicio"], ["simulacro", "Simulacro"], ["guia", "Guía"], ["progreso", "Progreso"]].map(([v, l]) => (
          <button key={v} onClick={() => { setVista(v); if (v === "simulacro") setSimulacroPantalla("inicio"); }}
            style={{ padding: "6px 12px", background: vista === v ? C.goldD : "none", border: `1px solid ${vista === v ? C.goldB : "transparent"}`, color: vista === v ? C.gold : C.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer", letterSpacing: "0.08em" }}>
            {l}
          </button>
        ))}
        <button onClick={handleLogout}
          style={{ padding: "6px 12px", background: "none", border: `1px solid ${C.border}`, color: C.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer", marginLeft: 8 }}>
          Salir
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA: DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  if (vista === "dashboard") {
    const prog = calcProgreso();
    const email = session.user?.email || "";
    const msgIdx = new Date().getDay();
    const diasEstudio = new Set(historialUsuario.map((s) => s.created_at?.slice(0, 10))).size;

    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
        <NavHeader />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
          {/* Saludo */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.2em", marginBottom: 8 }}>BIENVENIDO</div>
            <h1 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: 800, marginBottom: 10, lineHeight: 1.15 }}>
              {email.split("@")[0]}
            </h1>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, maxWidth: 500, padding: "12px 16px", background: C.goldD, borderLeft: `3px solid ${C.gold}` }}>
              {MENSAJES_DIA[msgIdx]}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, marginBottom: 28 }}>
            {[
              [cargandoBanco ? "..." : totalPorDominio[0], "Preguntas"],
              [prog.sesiones, "Simulacros"],
              [diasEstudio, "Días estudio"],
              [prog.mejor ? `${prog.mejor}%` : "--", "Mejor nota"],
            ].map(([n, l]) => (
              <div key={l} style={{ background: C.dark, padding: "16px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 24, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Progreso por dominio */}
          {prog.sesiones > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 14 }}>PROMEDIO GLOBAL</div>
              <div style={{ background: C.dark, border: `1px solid ${C.border}`, padding: "20px", textAlign: "center" }}>
                <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 52, fontWeight: 800, color: prog.global >= 75 ? C.green : prog.global >= 55 ? C.gold : C.red, lineHeight: 1 }}>{prog.global}%</div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginTop: 6 }}>sobre {prog.sesiones} simulacros completados</div>
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              ["Simulacro", "Practica con preguntas del banco real", "simulacro", C.gold],
              ["Guía Teórica", "Repasa los 20 subtemas del PSP", "guia", C.blue],
              ["Mi Progreso", "Historial y tendencias de estudio", "progreso", C.purple],
            ].map(([titulo, desc, v, color]) => (
              <button key={v} onClick={() => { setVista(v); if (v === "simulacro") setSimulacroPantalla("inicio"); }}
                style={{ padding: "20px", background: C.dark, border: `1px solid ${C.border}`, color: C.white, textAlign: "left", cursor: "pointer", transition: "border-color 0.2s", gridColumn: titulo === "Mi Progreso" ? "1 / -1" : "auto" }}>
                <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 15, fontWeight: 700, color, marginBottom: 4 }}>{titulo}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>

          {/* Último simulacro */}
          {prog.ultimo && (
            <div style={{ padding: "14px 18px", background: C.card, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted }}>ÚLTIMO SIMULACRO</div>
                <div style={{ fontSize: 12, color: C.white, marginTop: 2 }}>{prog.ultimo.total_preguntas} preguntas · {fmtTiempo(prog.ultimo.tiempo_segundos || 0)}</div>
              </div>
              <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, color: (prog.ultimo.porcentaje || 0) >= 75 ? C.green : (prog.ultimo.porcentaje || 0) >= 55 ? C.gold : C.red }}>
                {prog.ultimo.porcentaje}%
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA: SIMULACRO
  // ─────────────────────────────────────────────────────────────────────────
  if (vista === "simulacro") {

    // ── PANTALLA INICIO SIMULACRO ─────────────────────────────────────────
    if (simulacroPantalla === "inicio") {
      return (
        <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
          <NavHeader />
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.2em", marginBottom: 12 }}>SIMULACRO PSP®</div>
            <h2 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 24, lineHeight: 1.1 }}>
              Elige tu sesión de hoy
            </h2>

            {cargandoBanco && (
              <div style={{ padding: "10px 14px", background: C.goldD, border: `1px solid ${C.goldB}`, fontSize: 11, color: C.gold, fontFamily: "monospace", marginBottom: 16 }}>
                ⟳ Cargando banco de preguntas...
              </div>
            )}

            {/* Filtro dominio */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.15em", marginBottom: 10 }}>FILTRAR POR DOMINIO</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[[0, "Todos", C.gold], [1, "D1 · Assessment", C.gold], [2, "D2 · Design", C.blue], [3, "D3 · Implementation", C.purple]].map(([d, label, color]) => (
                  <button key={d} onClick={() => setFiltroDominio(d)}
                    style={{ padding: "6px 14px", background: filtroDominio === d ? `${color}20` : "transparent", border: `1px solid ${filtroDominio === d ? color : C.border}`, color: filtroDominio === d ? color : C.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>
                    {label}
                    {!cargandoBanco && <span style={{ marginLeft: 6, opacity: 0.5 }}>({totalPorDominio[d]})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de sesión */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[[10, "Sesión rápida", "10 preguntas · ~12 minutos", false],
                [25, "Simulacro estándar", "25 preguntas · ~30 minutos", true],
                [50, "Simulacro extendido", "50 preguntas · ~60 minutos", false],
              ].map(([n, titulo, desc, principal]) => {
                const disponible = totalPorDominio[filtroDominio] || 0;
                const disabled = cargandoBanco || n > disponible;
                return (
                  <button key={n} onClick={() => !disabled && iniciarSimulacro(n)} disabled={disabled}
                    style={{ padding: "16px 20px", background: disabled ? "transparent" : principal ? C.gold : C.goldD, border: `1px solid ${disabled ? C.border : principal ? C.gold : C.goldB}`, color: disabled ? C.muted : principal ? C.black : C.gold, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
                    <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 14, fontWeight: 700 }}>{titulo}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Historial reciente */}
            {historialUsuario.length > 0 && (
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.15em", marginBottom: 10 }}>SESIONES RECIENTES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {historialUsuario.slice(0, 5).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.dark, border: `1px solid ${C.border}`, fontSize: 12 }}>
                      <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 10 }}>{h.created_at?.slice(0, 10)}</span>
                      <span style={{ color: C.muted }}>{h.total_preguntas}q · {fmtTiempo(h.tiempo_segundos || 0)}</span>
                      <span style={{ fontFamily: "Syne, Inter, sans-serif", fontWeight: 700, color: (h.porcentaje || 0) >= 75 ? C.green : (h.porcentaje || 0) >= 55 ? C.gold : C.red }}>
                        {h.porcentaje}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── PANTALLA SIMULACRO ACTIVO ─────────────────────────────────────────
    if (simulacroPantalla === "simulacro") {
      const p = preguntas[idx];
      const progreso = Math.round((idx / preguntas.length) * 100);
      return (
        <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 15, fontWeight: 800, color: C.gold, flexShrink: 0 }}>
              Secure<span style={{ color: C.white, fontWeight: 400 }}>Path</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 9, color: C.muted, marginBottom: 3 }}>
                <span style={{ color: C.white }}>{idx + 1}/{preguntas.length}</span>
                <span style={{ color: colorDominio(p.dominio) }}>D{p.dominio} · {nombreDominio(p.dominio)}</span>
              </div>
              <div style={{ height: 3, background: C.border }}>
                <div style={{ height: "100%", width: `${progreso}%`, background: C.gold, transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {rachaActual >= 3 && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.gold }}>{rachaActual} 🔥</span>}
              <span style={{ fontFamily: "monospace", fontSize: 13, color: C.muted }}>{fmtTiempo(segundos)}</span>
            </div>
          </div>

          <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: colorDominio(p.dominio), letterSpacing: "0.2em", marginBottom: 16 }}>PREGUNTA {idx + 1}</div>
            <h2 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: "clamp(15px,2.5vw,19px)", fontWeight: 700, lineHeight: 1.45, marginBottom: 28, color: C.white }}>
              {p.texto}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {p.opciones.map((op) => {
                const esElegida = seleccion === op.key;
                const esCorrecta = op.key === p.correcta;
                const mostrar = seleccion !== null;
                let bg = "transparent", border = C.border, color = C.white;
                if (mostrar && esCorrecta) { bg = C.greenD; border = C.green; color = C.green; }
                else if (mostrar && esElegida && !esCorrecta) { bg = C.redD; border = C.red; color = C.red; }
                else if (esElegida) { bg = C.goldD; border = C.gold; color = C.gold; }
                return (
                  <button key={op.key} onClick={() => responder(op.key)} disabled={!!seleccion}
                    style={{ padding: "14px 18px", background: bg, border: `1px solid ${border}`, borderLeft: mostrar && (esCorrecta || esElegida) ? `3px solid ${border}` : `1px solid ${border}`, color, textAlign: "left", cursor: seleccion ? "default" : "pointer", display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.6, flexShrink: 0, marginTop: 1 }}>{op.key}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55 }}>{op.texto}</span>
                  </button>
                );
              })}
            </div>
            {mostrarExp && (
              <div style={{ marginTop: 20, padding: "16px 18px", background: seleccion === p.correcta ? C.greenD : C.redD, border: `1px solid ${seleccion === p.correcta ? C.greenB : C.redB}`, borderLeft: `3px solid ${seleccion === p.correcta ? C.green : C.red}` }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: seleccion === p.correcta ? C.green : C.red, letterSpacing: "0.1em", marginBottom: 8 }}>
                  {seleccion === p.correcta ? "✓ CORRECTO" : `✗ INCORRECTO — LA CORRECTA ERA ${p.correcta}`}
                </div>
                <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.7, margin: 0 }}>{p.explicacion}</p>
              </div>
            )}
            {seleccion && (
              <button onClick={siguiente}
                style={{ marginTop: 20, width: "100%", padding: "14px", background: C.gold, border: "none", color: C.black, fontFamily: "Syne, Inter, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {idx + 1 < preguntas.length ? "Siguiente pregunta →" : "Ver resultados →"}
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── PANTALLA RESULTADO ────────────────────────────────────────────────
    if (simulacroPantalla === "resultado") {
      if (modoRevision) {
        const resp = respuestas[idxRevision];
        return (
          <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
            <NavHeader />
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted }}>REVISIÓN {idxRevision + 1}/{respuestas.length}</div>
                <button onClick={() => setModoRevision(false)}
                  style={{ padding: "6px 14px", background: "none", border: `1px solid ${C.border}`, color: C.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>
                  ← Resultado
                </button>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: colorDominio(resp.dominio), letterSpacing: "0.2em", marginBottom: 12 }}>D{resp.dominio}</div>
              <h3 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 16, fontWeight: 700, lineHeight: 1.45, marginBottom: 20 }}>{resp.textoP}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {resp.opciones.map((op) => {
                  const esCorrecta = op.key === resp.opcionCorrecta;
                  const esElegida = op.key === resp.opcionElegida;
                  let bg = "transparent", border = C.border, color = C.muted;
                  if (esCorrecta) { bg = C.greenD; border = C.green; color = C.green; }
                  else if (esElegida) { bg = C.redD; border = C.red; color = C.red; }
                  return (
                    <div key={op.key} style={{ padding: "12px 16px", background: bg, border: `1px solid ${border}`, color, display: "flex", gap: 10 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>{op.key}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{op.texto}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "14px 18px", background: resp.correcta ? C.greenD : C.redD, border: `1px solid ${resp.correcta ? C.greenB : C.redB}`, borderLeft: `3px solid ${resp.correcta ? C.green : C.red}`, fontSize: 13, color: "#d1d5db", lineHeight: 1.7 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: resp.correcta ? C.green : C.red, marginBottom: 8 }}>
                  {resp.correcta ? "✓ CORRECTO" : `✗ RESPONDISTE ${resp.opcionElegida} — CORRECTA ERA ${resp.opcionCorrecta}`}
                </div>
                {resp.explicacion}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setIdxRevision((i) => Math.max(0, i - 1))} disabled={idxRevision === 0}
                  style={{ padding: "11px 20px", background: C.goldD, border: `1px solid ${C.goldB}`, color: idxRevision === 0 ? C.muted : C.gold, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: idxRevision === 0 ? "not-allowed" : "pointer", opacity: idxRevision === 0 ? 0.4 : 1 }}>
                  ← Anterior
                </button>
                <button onClick={() => setIdxRevision((i) => Math.min(respuestas.length - 1, i + 1))} disabled={idxRevision === respuestas.length - 1}
                  style={{ padding: "11px 20px", background: C.goldD, border: `1px solid ${C.goldB}`, color: idxRevision === respuestas.length - 1 ? C.muted : C.gold, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: idxRevision === respuestas.length - 1 ? "not-allowed" : "pointer", opacity: idxRevision === respuestas.length - 1 ? 0.4 : 1 }}>
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        );
      }

      const r = calcResultados();
      const nivel = r.pctTotal >= 75 ? { color: C.green, label: "APROBADO", msg: "Nivel PSP alcanzado. Mantén esta consistencia." }
        : r.pctTotal >= 55 ? { color: C.gold, label: "EN PROCESO", msg: "Vas por buen camino. Refuerza los dominios débiles." }
        : { color: C.red, label: "REFORZAR", msg: "Revisa la guía teórica de los dominios con menor puntaje." };

      return (
        <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
          <NavHeader />
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 80px" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.25em", marginBottom: 12 }}>RESULTADO</div>
              <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: "clamp(56px,12vw,88px)", fontWeight: 800, color: nivel.color, lineHeight: 1 }}>{r.pctTotal}%</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, marginBottom: 12 }}>{r.totalCorrectas} correctas de {r.total} · Racha máx: {rachaMax} 🔥</div>
              <div style={{ display: "inline-block", padding: "5px 18px", background: `${nivel.color}15`, border: `1px solid ${nivel.color}40`, fontFamily: "monospace", fontSize: 10, color: nivel.color, letterSpacing: "0.15em", marginBottom: 10 }}>{nivel.label}</div>
              <p style={{ fontSize: 13, color: C.muted, maxWidth: 380, margin: "0 auto", lineHeight: 1.65 }}>{nivel.msg}</p>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 14 }}>POR DOMINIO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {r.dominios.filter((d) => d.total > 0).map((d) => (
                  <div key={d.dominio} style={{ background: C.dark, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700 }}>D{d.dominio} — {nombreDominio(d.dominio)}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginTop: 2 }}>{d.correctas}/{d.total} correctas</div>
                      </div>
                      <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 26, fontWeight: 800, color: colorDominio(d.dominio) }}>{d.pct}%</div>
                    </div>
                    <div style={{ height: 5, background: C.border }}>
                      <div style={{ height: "100%", width: `${d.pct}%`, background: colorDominio(d.dominio), transition: "width 0.6s" }} />
                    </div>
                    {d.pct < 60 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
                        → Dominio débil.{" "}
                        <button onClick={() => { setVista("guia"); }} style={{ background: "none", border: "none", color: colorDominio(d.dominio), cursor: "pointer", fontFamily: "monospace", fontSize: 11, textDecoration: "underline" }}>
                          Ver guía teórica →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => { setModoRevision(false); setSimulacroPantalla("inicio"); }}
                style={{ padding: "13px 24px", background: C.gold, border: "none", color: C.black, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Nuevo simulacro →
              </button>
              <button onClick={() => { setIdxRevision(0); setModoRevision(true); }}
                style={{ padding: "13px 24px", background: C.blueD, border: `1px solid ${C.blueB}`, color: C.blue, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Revisar respuestas
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA: GUÍA TEÓRICA
  // ─────────────────────────────────────────────────────────────────────────
  if (vista === "guia") {
    // Calcular subtemas practicados por el usuario
    const subtemasPracticados = new Set(
      historialUsuario.flatMap((s) => []) // extensible en el futuro con respuestas_sesion
    );

    if (subtemaSeleccionado) {
      const g = subtemaSeleccionado;
      return (
        <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
          <NavHeader />
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>
            <button onClick={() => setSubtemaSeleccionado(null)}
              style={{ background: "none", border: "none", color: C.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer", marginBottom: 20, letterSpacing: "0.1em" }}>
              ← VOLVER A LA GUÍA
            </button>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: colorDominio(g.dominio), letterSpacing: "0.2em", marginBottom: 8 }}>{g.codigo}</div>
            <h2 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: "clamp(20px,4vw,30px)", fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>{g.titulo}</h2>
            <p style={{ fontSize: 14, color: "#c9c7c0", lineHeight: 1.75, marginBottom: 28, padding: "14px 18px", background: C.goldD, borderLeft: `3px solid ${C.gold}` }}>{g.resumen}</p>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 16 }}>CONCEPTOS CLAVE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {g.conceptos.map((c) => (
                  <div key={c.term} style={{ padding: "14px 18px", background: C.dark, border: `1px solid ${C.border}`, borderLeft: `3px solid ${colorDominio(g.dominio)}` }}>
                    <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>{c.term}</div>
                    <div style={{ fontSize: 13, color: "#a0a0a0", lineHeight: 1.6 }}>{c.def}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 14 }}>REGLAS QUE DEBES DOMINAR</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.reglas.map((r, i) => (
                  <div key={i} style={{ padding: "12px 16px", background: C.card, border: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, flexShrink: 0, marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 13, color: "#c9c7c0", lineHeight: 1.6 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 16px", background: C.dark, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
              REF: {g.referencia}
            </div>

            <button onClick={() => { setVista("simulacro"); setFiltroDominio(g.dominio); setSimulacroPantalla("inicio"); }}
              style={{ marginTop: 24, width: "100%", padding: "13px", background: C.goldD, border: `1px solid ${C.goldB}`, color: C.gold, fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Practicar preguntas del D{g.dominio} →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
        <NavHeader />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.2em", marginBottom: 12 }}>GUÍA TEÓRICA</div>
          <h2 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>20 Subtemas PSP®</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
            Conceptos clave, reglas y referencias ASIS para cada subtema del examen.
          </p>

          {[1, 2, 3].map((d) => (
            <div key={d} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 3, height: 20, background: colorDominio(d) }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: colorDominio(d), letterSpacing: "0.2em" }}>DOMINIO {d}</div>
                  <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 14, fontWeight: 700, color: C.white }}>{nombreDominio(d)}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {GUIA.filter((g) => g.dominio === d).map((g) => (
                  <button key={g.codigo} onClick={() => setSubtemaSeleccionado(g)}
                    style={{ padding: "14px 18px", background: C.dark, border: `1px solid ${C.border}`, color: C.white, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.2s" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 9, color: colorDominio(d), letterSpacing: "0.15em", marginBottom: 4 }}>{g.codigo}</div>
                      <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 13, fontWeight: 700 }}>{g.titulo}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{g.conceptos.length} conceptos · {g.reglas.length} reglas</div>
                    </div>
                    <span style={{ color: C.muted, fontSize: 18 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA: PROGRESO
  // ─────────────────────────────────────────────────────────────────────────
  if (vista === "progreso") {
    const prog = calcProgreso();
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "Inter, sans-serif" }}>
        <NavHeader />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, letterSpacing: "0.2em", marginBottom: 12 }}>MI PROGRESO</div>
          <h2 style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Historial de estudio</h2>

          {/* Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, marginBottom: 28 }}>
            {[
              [prog.sesiones, "Simulacros"],
              [prog.global ? `${prog.global}%` : "--", "Promedio"],
              [prog.mejor ? `${prog.mejor}%` : "--", "Mejor nota"],
            ].map(([n, l]) => (
              <div key={l} style={{ background: C.dark, padding: "16px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 28, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Historial completo */}
          {historialUsuario.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: C.muted, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
              <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Sin simulacros todavía</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>Completa tu primer simulacro para ver tu progreso aquí.</div>
              <button onClick={() => { setVista("simulacro"); setSimulacroPantalla("inicio"); }}
                style={{ marginTop: 16, padding: "10px 20px", background: C.goldD, border: `1px solid ${C.goldB}`, color: C.gold, fontFamily: "Syne, Inter, sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Ir al simulacro →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 14 }}>TODAS LAS SESIONES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {historialUsuario.map((h, i) => (
                  <div key={i} style={{ padding: "14px 18px", background: C.dark, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted }}>{h.created_at?.slice(0, 10)} · D{h.dominio_filtro === 0 ? "1+2+3" : h.dominio_filtro}</div>
                      <div style={{ fontSize: 12, color: C.white, marginTop: 3 }}>{h.total_preguntas} preguntas · {fmtTiempo(h.tiempo_segundos || 0)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "Syne, Inter, sans-serif", fontSize: 22, fontWeight: 800, color: (h.porcentaje || 0) >= 75 ? C.green : (h.porcentaje || 0) >= 55 ? C.gold : C.red }}>
                        {h.porcentaje}%
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted }}>{h.correctas}/{h.total_preguntas}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tendencia visual simple */}
              {historialUsuario.length >= 3 && (
                <div style={{ marginTop: 24, padding: "16px 18px", background: C.dark, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 12 }}>TENDENCIA (últimas {Math.min(10, historialUsuario.length)} sesiones)</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                    {historialUsuario.slice(0, 10).reverse().map((h, i) => {
                      const pct = h.porcentaje || 0;
                      const color = pct >= 75 ? C.green : pct >= 55 ? C.gold : C.red;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontFamily: "monospace", fontSize: 8, color }}>
                            {pct}
                          </div>
                          <div style={{ width: "100%", background: color, height: `${Math.max(4, pct * 0.48)}px`, opacity: 0.8 }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: C.muted, marginTop: 8 }}>
                    {(() => {
                      const recent = historialUsuario.slice(0, 5);
                      const older = historialUsuario.slice(5, 10);
                      if (older.length === 0) return "Sigue practicando para ver tu tendencia.";
                      const avgRecent = recent.reduce((a, s) => a + (s.porcentaje || 0), 0) / recent.length;
                      const avgOlder = older.reduce((a, s) => a + (s.porcentaje || 0), 0) / older.length;
                      const diff = Math.round(avgRecent - avgOlder);
                      return diff > 0 ? `📈 Mejoraste ${diff} puntos en tus últimas 5 sesiones.` : diff < 0 ? `📉 Bajaste ${Math.abs(diff)} puntos. Revisa la guía teórica.` : "Rendimiento estable. Apunta al 75% para aprobar.";
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
