import { useState, useEffect } from "react";

// ─── CONFIGURACIÓN DE SUPABASE Y VERSIONES ──────────────────────────────────
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4";
const APP_VERSION = "5.9"; 

// Cliente HTTP centralizado para Supabase (Soporta Upsert para evitar errores 409)
const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { 
      apikey: SUPABASE_ANON_KEY, 
      Authorization: `Bearer ${(opts.token || SUPABASE_ANON_KEY)}`, 
      "Content-Type": "application/json", 
      Prefer: opts.prefer || "", 
      ...opts.headers 
    },
    method: opts.method || "GET",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) { 
    const err = await res.json().catch(() => ({})); 
    console.error("Error detallado de Supabase:", err);
    throw new Error(err.message || err.error_description || `HTTP ${res.status}`); 
  }
  return res.status === 204 ? null : res.json();
};

const authSignIn = (email, password) => sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
const authSignOut = (token) => sb("/auth/v1/logout", { method: "POST", token });

const dbGet = (table, query, token) => sb(`/rest/v1/${table}?${query}`, { token, headers: { "Range": "0-4999" } });
const dbPost = (table, body, token) => sb(`/rest/v1/${table}`, { method: "POST", body, token, prefer: "resolution=merge-duplicates,return=representation" });

// ─── UTILIDADES DE PARSEO Y MANIPULACIÓN DE DATOS ───────────────────────────
const obtenerValorBD = (obj, posiblesLlaves) => {
  if (!obj) return null;
  const keys = Object.keys(obj);
  for (let llave of posiblesLlaves) {
    const found = keys.find(k => k.toLowerCase().trim() === llave.toLowerCase().trim());
    if (found) return obj[found];
  }
  for (let llave of posiblesLlaves) {
    const found = keys.find(k => k.toLowerCase().includes(llave.toLowerCase()));
    if (found) return obj[found];
  }
  return null;
};

const getTextoPregunta = (p) => {
  const explicit = obtenerValorBD(p, ['pregunta', 'enunciado', 'text', 'question', 'texto', 'descripcion', 'body', 'prompt', 'item', 'contenido']);
  if (explicit) return explicit;
  let longest = "";
  for (let key in p) {
    if (typeof p[key] === 'string' && p[key].length > longest.length) {
      if (!p[key].trim().startsWith('{') && !p[key].trim().startsWith('[')) longest = p[key];
    }
  }
  return longest || "Pregunta no detectada correctamente en BD.";
};

const C = {
  black: "#0b1d2a", dark: "#132c3f", card: "#1b3a52",
  border: "rgba(216,232,240,0.12)", gold: "#ff5a1f", goldD: "rgba(255,90,31,0.12)", goldB: "rgba(255,90,31,0.35)",
  white: "#e3edf2", muted: "#7a92a3", green: "#3ddc84", greenD: "rgba(61,220,132,0.10)",
  red: "#ff5c5c", redD: "rgba(255,92,92,0.1)", blue: "#5fb8e0", purple: "#9d7aff"
};

const mezclar = (arr) => Array.isArray(arr) ? [...arr].sort(() => Math.random() - 0.5) : [];
const mezclarConOpciones = (ps) => mezclar(ps).map((p) => {
  let ops = obtenerValorBD(p, ['opciones', 'options', 'alternativas']);
  if (ops && !Array.isArray(ops) && typeof ops === "object") ops = Object.entries(ops).map(([key, texto]) => ({ key, texto }));
  return { ...p, opcionesExtraidas: mezclar(Array.isArray(ops) ? ops : []) };
});

// ─── PLAN DE ESTUDIOS Y TEORÍA OFICIAL PSP (20 SUBTEMAS EXACTOS) ────────────
const DOMINIOS_CURSO = [
  { 
    id: 1, 
    nombre: "DOMINIO 1 ASSESSMENT (EVALUACIÓN)", 
    subtemas: [
      "D1-T1 Caracterización de los Activos",
      "D1-T2 Análisis de Amenazas",
      "D1-T3 Análisis de Vulnerabilidades",
      "D1-T4 Riesgo y Consecuencias",
      "D1-T5 Análisis de Contramedidas",
      "D1-T6 Marco ESRM",
      "D1-T7 Inspecciones y Auditorías",
      "D1-T8 Requisitos Legales",
      "D1-T9 Documentación e Informes"
    ] 
  },
  { 
    id: 2, 
    nombre: "DOMINIO 2 DESIGN (DISEÑO)", 
    subtemas: [
      "D2-T1 Barreras Físicas y Perímetro",
      "D2-T2 Control de Accesos",
      "D2-T3 Detección de Intrusos",
      "D2-T4 Videovigilancia",
      "D2-T5 Iluminación y CPTED",
      "D2-T6 Comunicaciones",
      "D2-T7 Integración y Convergencia"
    ] 
  },
  { 
    id: 3, 
    nombre: "DOMINIO 3 IMPLEMENTATION", 
    subtemas: [
      "D3-T1 Gestión de Proyectos",
      "D3-T2 Instalación y Comisionamiento",
      "D3-T3 Operación y Mantenimiento",
      "D3-T4 Capacitación y Ejercicios"
    ] 
  }
];

const SUBTEMAS_LISTA = DOMINIOS_CURSO.flatMap(d => d.subtemas);

// MAPA DE VIDEOS DESDE GOOGLE DRIVE
const VIDEOS_MAP = {
  0: "https://drive.google.com/file/d/1CTlCyCBrEwXuz_a-ytYxjO-TFc7SGgm6/preview", // D1-T1 Caracterización de los Activos
  1: "https://drive.google.com/file/d/14WZozh0_pmOTxSZHuiZL6Bccm2zS-rlI/preview", // D1-T2 Análisis de Amenazas
  2: "https://drive.google.com/file/d/1GZdS9IrlIgZQPwD7FfxELz3IfQM-cnXP/preview", // D1-T3 Análisis de Vulnerabilidades
  3: "https://drive.google.com/file/d/1UxwSkzAXzwgpXHDWpzvweNvU7nzw8mB_/preview", // D1-T4 Riesgo y Consecuencias
  4: "https://drive.google.com/file/d/1uRC7eRJrEVZtFGZ_e36aAWwGaL9KbmRm/preview", // D1-T5 Análisis de Contramedidas
};

// MAPA DE ACTIVIDADES / CASOS PRÁCTICOS (PDF / PPT)
const ACTIVIDADES_MAP = {
  3: "https://drive.google.com/file/d/1_IRmyGYY1NUAgdoSSLceLe48HFdqvIHn/preview", // D1-T4 Actividad Evaluación de Riesgos
};

// TEORÍA OFICIAL AMPLIADA Y DETALLADA (ST1 AL ST5) BASADA EN LA GUÍA MAESTRA PSP
const HANDBOOK_TEORIA = {
  0: { 
    mapaConceptual: "Macro: Universo Organizacional (Modelo PPIR) ➔ Meso: Ciclo Metodológico de 5 Fases (Inventario, Clasificación, Valoración, Priorización, Gobernanza) ➔ Micro: Cuantificación de Impacto Operacional, Criterios CID y Gestión de Propietarios (Asset Owner vs Custodian).",
    subsub: [
      { 
        titulo: "1. Fundamentos Teóricos y Modelo PPIR", 
        puntos: [
          "Definición ASIS de Activo: Persona, bien, información o capacidad con valor para la organización que requiere protección proporcional.",
          "Modelo PPIR (People, Property, Information, Reputation): El universo de activos organizacionales organizados en cuatro grandes familias.",
          "Prioridad absoluta del Activo Humano: La protección de la vida y la integridad física antecede siempre a la propiedad y los bienes materiales.",
          "Razones clave para caracterizar: Delimitar el alcance, asegurar la proporcionalidad del costo de seguridad, priorizar recursos escasos y sustentar el estándar de diligencia debida (due diligence)."
        ] 
      },
      { 
        titulo: "2. Tipología Exhaustiva: Tangibles vs Intangibles", 
        puntos: [
          "Activos Tangibles: Personas (ejecutivos, empleados, visitantes), bienes inmuebles, equipos de TI y seguridad, maquinaria, inventarios (modelo CRAVED: Concealable, Removable, Available, Valuable, Enjoyable, Disposable) y valores monetarios.",
          "Activos Intangibles: Información sensible (sujeta al esquema CIA: Confidencialidad, Integridad, Disponibilidad), propiedad intelectual, secretos comerciales y reputación de marca.",
          "Diferencial clave de examen: Los intangibles representan entre el 70% y 90% del valor corporativo moderno y pueden perderse por divulgación o copia sin que el soporte físico desaparezca."
        ] 
      },
      { 
        titulo: "3. Metodología ASIS de las 5 Fases", 
        puntos: [
          "Fase 1 (Alcance e Inventario): Definición de perímetros (físico, temporal, organizacional) y ejecución mediante enfoques Top-Down, Bottom-Up o Híbrido aplicando la técnica de las 6 superficies (piso, techo y 4 paredes).",
          "Fase 2 (Clasificación y Categorización): Esquemas de sensibilidad (Público, Interno, Confidencial, Restringido) y Tiers de criticidad (A/B/C) evaluando el impacto de pérdida.",
          "Fase 3 (Valoración): Métodos cuantitativos (Costo de Reposición CR + Pérdida Operacional PO + Costos Indirectos CI) y cualitativos mediante escalas ancladas.",
          "Fase 4 (Priorización y Dependencias): Análisis de SPOF (Single Points of Failure), herencia de criticidad hacia arriba en cadenas de soporte, y métricas temporales (MTPD, RTO, RPO).",
          "Fase 5 (Gobernanza y Ciclo de Vida): Registro maestro, control de cambios ante altas/bajas, auditorías periódicas y separación estricta de funciones entre Propietario (accountable) y Custodio (responsible)."
        ] 
      },
      { 
        titulo: "4. Integración Regulatoria y Marcos de Referencia", 
        puntos: [
          "Alineación con el Protection of Assets (POA) de ASIS, el estándar Risk Assessment (RA) y el Enterprise Security Risk Management (ESRM).",
          "Cumplimiento con ISO/IEC 27001 (Control 5.9 de inventario de activos y clasificación) y NIST CSF (Función Identify).",
          "Gestión de datos personales y normativas de privacidad (GDPR, regulaciones locales de protección de datos personales)."
        ] 
      },
      { 
        titulo: "5. Puntos Críticos de Examen (ASIS PSP) y Errores Comunes", 
        puntos: [
          "La caracterización de activos es siempre el primer paso ineludible de cualquier evaluación de seguridad física (Assessment); nunca se empieza por amenazas o contramedidas.",
          "El Propietario del activo decide la clasificación y acepta el riesgo; el custodio opera los controles técnicos.",
          "Error frecuente: Valorar únicamente el hardware o los bienes tangibles ignorando el impacto consecuencial de la interrupción operacional."
        ] 
      }
    ]
  },
  1: { 
    mapaConceptual: "Macro: Entorno Geopolítico, Social y Criminal ➔ Meso: Taxonomía de Amenazas (Naturales, Humanas, Técnicas) y Modelo ICO (Intención, Capacidad, Oportunidad) ➔ Micro: Perfilación de Actores Hostiles y Vectores de Ataque.",
    subsub: [
      { 
        titulo: "1. Naturaleza y Taxonomía de las Amenazas", 
        puntos: [
          "Definición ASIS: Una amenaza es cualquier evento, circunstancia o actor con el potencial de causar pérdida, daño o interrupción a un activo previamente caracterizado.",
          "Amenazas Humanas: Intencionales (delincuencia común, crimen organizado, terrorismo, sabotaje, espionaje, insider threat) y negligentes (errores operativos, descuidos).",
          "Amenazas Naturales: Sismos, inundaciones, fenómenos climáticos extremos, tormentas eléctricas y eventos geológicos.",
          "Amenazas Técnicas y Estructurales: Fallas de infraestructura crítica, colapso de sistemas de suministro (energía, agua, telecomunicaciones) y degradación de materiales."
        ] 
      },
      { 
        titulo: "2. El Modelo ICO (Intención, Capacidad y Oportunidad)", 
        puntos: [
          "Intención: Motivación, determinación y objetivos específicos del actor hostil para perpetrar el ataque contra el activo objetivo.",
          "Capacidad: Recursos financieros, tecnológicos, operativos, armamento y nivel de especialización con que cuenta el agresor.",
          "Oportunidad: Ventanas temporales, fallas de vigilancia, accesos abiertos y vulnerabilidades físicas que facilitan y reducen el costo del ataque."
        ] 
      },
      { 
        titulo: "3. El Vector de Amenaza Interna (Insider Threat)", 
        puntos: [
          "Considerado por ASIS como uno de los vectores más complejos de mitigar debido a que el actor interno posee privilegios legítimos de acceso.",
          "Tipología de insiders: Maliciosos (descontentos, coaccionados por organizaciones criminales, espionaje industrial) y negligentes (víctimas de ingeniería social, errores humanos involuntarios).",
          "Controles mitigadores: Principio de mínimo privilegio, segregación de funciones, monitoreo de comportamiento y verificación rigurosa de antecedentes (due diligence laboral)."
        ] 
      },
      { 
        titulo: "4. Puntos Críticos de Examen (ASIS PSP)", 
        puntos: [
          "Una amenaza sin vulnerabilidad explotable en el activo no constituye un riesgo real.",
          "Los análisis de amenazas deben basarse en historiales estadísticos locales, inteligencia de fuentes abiertas (OSINT) y evaluación directa del atractivo del objetivo (modelo CRAVED)."
        ] 
      }
    ]
  },
  2: { 
    mapaConceptual: "Macro: Auditoría Integral de la Superficie de Ataque ➔ Meso: Identificación de Brechas en Controles Físicos, Tecnológicos y Humanos ➔ Micro: Pruebas de Penetración Física (Red Teaming) y Validación de Resistencia.",
    subsub: [
      { 
        titulo: "1. Fundamentos de Vulnerabilidad en Seguridad Física", 
        puntos: [
          "Definición ASIS: Condición o debilidad en el diseño, construcción, ubicación, operación o mantenimiento de los sistemas de protección que puede ser aprovechada por una amenaza para causar daño.",
          "Las vulnerabilidades son las únicas variables del riesgo sobre las cuales la organización tiene control directo y absoluto para mitigar.",
          "Diferencia fundamental: La amenaza es externa y no se puede controlar directamente; la vulnerabilidad es interna y sí se puede corregir."
        ] 
      },
      { 
        titulo: "2. Taxonomía de las Vulnerabilidades", 
        puntos: [
          "Vulnerabilidades Físicas y Arquitectónicas: Perímetros deficientes, ausencia de separación de zonas, iluminación insuficiente, puntos ciegos de CCTV y materiales de construcción frágiles.",
          "Vulnerabilidades Tecnológicas: Sistemas de control de acceso obsoletos sin cifrado, alarmas con zonas vulnerables a sabotaje y falta de redundancia en centros de monitoreo.",
          "Vulnerabilidades Procedimentales y Humanas: Protocolos de control laxos, falta de capacitación del personal, ausencia de simulacros, fatiga de operadores y laxitud en la gestión de credenciales de visitantes."
        ] 
      },
      { 
        titulo: "3. Metodologías de Evaluación de Vulnerabilidades", 
        puntos: [
          "Auditorías de campo y listas de verificación normalizadas aplicadas por evaluadores certificados (PSP).",
          "Pruebas de penetración física controlada (Physical Red Teaming) para validar tiempos reales de retardo de las barreras y tiempos de reacción del personal.",
          "Cruces analíticos entre el inventario de activos críticos (D1-ST1) y los vectores de ataque identificados en D1-ST2."
        ] 
      },
      { 
        titulo: "4. Puntos Críticos de Examen (ASIS PSP)", 
        puntos: [
          "Las vulnerabilidades se evalúan siempre en función del nivel de criticidad del activo que protegen.",
          "Un error común es corregir vulnerabilidades de baja prioridad mientras los activos Tier A permanecen expuestos a brechas severas."
        ] 
      }
    ]
  },
  3: { 
    mapaConceptual: "Macro: Ecosistema de Gestión de Riesgo ESRM (Enterprise Security Risk Management) ➔ Meso: Ecuación Fundamental del Riesgo (Amenaza × Vulnerabilidad × Impacto) ➔ Micro: Análisis Financiero Cuantitativo (SLE, ARO, ALE) y BIA (Business Impact Analysis).",
    subsub: [
      { 
        titulo: "1. Marco ESRM y Filosofía de Gestión", 
        puntos: [
          "Enterprise Security Risk Management (ESRM): Alineación de la seguridad corporativa con los objetivos estratégicos de negocio y el apetito de riesgo de la alta dirección.",
          "Opciones de tratamiento del riesgo: Mitigar (implementar contramedidas), Transferir (pólizas de seguros, contratos con terceros), Evitar (suspender la actividad riesgosa) y Aceptar (asumir el impacto residual formalmente).",
          "Principio rector: La seguridad no existe como un fin en sí mismo, sino para habilitar y proteger la continuidad de los negocios de la organización."
        ] 
      },
      { 
        titulo: "2. La Ecuación del Riesgo y el Impacto", 
        puntos: [
          "Fórmula fundamental: Riesgo = Amenaza (Probabilidad) × Vulnerabilidad (Probabilidad de éxito) × Impacto (Valor del Activo determinado en D1-ST1).",
          "El valor del activo (impacto) es la variable que traduce un incidente físico en una consecuencia financiera, operativa, legal o reputacional medible.",
          "Riesgo residual vs Riesgo inherente: El riesgo inherente es el nivel de exposición sin controles; el riesgo residual es el remanente operativo tras aplicar las contramedidas."
        ] 
      },
      { 
        titulo: "3. Análisis Cuantitativo y Cualitativo de Pérdidas", 
        puntos: [
          "Modelos cuantitativos: Expectativa de Pérdida Única (SLE), Tasa Anual de Ocurrencia (ARO) y Expectativa de Pérdida Anual (ALE = SLE × ARO).",
          "Modelos cualitativos: Matrices de probabilidad e impacto (3×3 o 5×5) con descriptores y criterios anclados para evaluar escenarios complejos donde los datos financieros exactos no están disponibles."
        ] 
      },
      { 
        titulo: "4. Puntos Críticos de Examen (ASIS PSP)", 
        puntos: [
          "El riesgo cero no existe en seguridad física; el objetivo profesional es mitigar el riesgo a niveles tolerables y defendibles.",
          "La aceptación formal del riesgo residual corresponde siempre al Propietario del Activo (Asset Owner) o a la Junta Directiva, nunca al departamento de seguridad."
        ] 
      }
    ]
  },
  4: { 
    mapaConceptual: "Macro: Arquitectura Global de Defensa en Profundidad ➔ Meso: Las 4 Funciones Esenciales de las Contramedidas (Disuasión, Detección, Retardo, Respuesta) ➔ Micro: Ecuación de Tiempo de Retardo vs Tiempo de Respuesta y Análisis Costo-Beneficio (ROSI).",
    subsub: [
      { 
        titulo: "1. Principio de Defensa en Profundidad", 
        puntos: [
          "Implementación de múltiples anillos concéntricos de seguridad (Perímetro exterior, fachada del edificio, control de accesos internos, protección de recintos críticos y contenedores reforzados).",
          "Objetivo: Obligar al agresor a superar sucesivas barreras, incrementando el tiempo acumulado de exposición y el esfuerzo operativo requerido para alcanzar el activo."
        ] 
      },
      { 
        titulo: "2. Las Cuatro Funciones Esenciales de la Seguridad Física", 
        puntos: [
          "Disuasión: Elementos psicológicos y físicos (señalización, iluminación, presencia visible) diseñados para desalentar el intento de intrusión antes de que comience.",
          "Detección: Sensores perimetrales, volumétricos y sistemas CCTV capaces de alertar al centro de control sobre la presencia no autorizada en tiempo real.",
          "Retardo: Barreras físicas (rejas, puertas blindadas, esclusas, cristales anti-asalto) diseñadas para obstaculizar el avance del intruso.",
          "Respuesta: Acciones coordinadas del personal de seguridad privada o fuerzas públicas orientadas a interceptar y neutralizar al agresor antes de que vulnere el activo."
        ] 
      },
      { 
        titulo: "3. La Regla de Oro del Diseño de Seguridad", 
        puntos: [
          "Ecuación temporal crítica: Tiempo total de retardo ($T_{retardo}$) > Tiempo total de respuesta ($T_{respuesta}$).",
          "Si el intruso puede romper las barreras y alcanzar el activo antes de que la fuerza de reacción llegue a interceptarlo, el diseño de seguridad física ha fracasado, independientemente de cuán costosas sean las alarmas instaladas."
        ] 
      },
      { 
        titulo: "4. Puntos Críticos de Examen (ASIS PSP)", 
        puntos: [
          "Las contramedidas deben ser proporcionales al valor del activo y al nivel de riesgo evaluado.",
          "El análisis del Retorno de Inversión en Seguridad (ROSI) justifica la asignación presupuestaria demostrando cuánta pérdida potencial se evita con la salvaguarda."
        ] 
      }
    ]
  },
  5: { subsub: [{ titulo: "Marco ESRM", puntos: ["Enterprise Security Risk Management alineado a los objetivos de negocio."] }] },
  6: { subsub: [{ titulo: "Inspecciones", puntos: ["Revisiones metódicas y evaluación independiente de sistemas."] }] },
  7: { subsub: [{ titulo: "Requisitos Legales", puntos: ["Cumplimiento normativo local e internacional."] }] },
  8: { subsub: [{ titulo: "Documentación", puntos: ["Elaboración de políticas, directrices y reportes ejecutivos."] }] },
  9: { subsub: [{ titulo: "Barreras Físicas", puntos: ["Cercas, muros y elementos perimetrales de defensa."] }] },
  10: { subsub: [{ titulo: "Control de Accesos", puntos: ["Regulación de flujo mediante credenciales y biometría."] }] },
  11: { subsub: [{ titulo: "Detección de Intrusos", puntos: ["Sensores volumétricos y perimetrales."] }] },
  12: { subsub: [{ titulo: "Videovigilancia", puntos: ["Cámaras IP y analítica de video inteligente."] }] },
  13: { subsub: [{ titulo: "CPTED", puntos: ["Prevención del delito mediante diseño ambiental."] }] },
  14: { subsub: [{ titulo: "Comunicaciones", puntos: ["Redes seguras y radios de enlace redundantes."] }] },
  15: { subsub: [{ titulo: "Integración", puntos: ["Plataformas PSIM y convergencia tecnológica."] }] },
  16: { subsub: [{ titulo: "Gestión de Proyectos", puntos: ["Planificación, presupuestos y ejecución."] }] },
  17: { subsub: [{ titulo: "Comisionamiento", puntos: ["Pruebas de aceptación FAT y SAT."] }] },
  18: { subsub: [{ titulo: "Operación y Mantenimiento", puntos: ["Gestión óptima de centros de control y mantenimiento."] }] },
  19: { subsub: [{ titulo: "Capacitación", puntos: ["Entrenamiento continuo y simulacros."] }] }
};

export default function SecurePathPSP() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [vista, setVista] = useState("dashboard");
  const [banco, setBanco] = useState([]);
  const [historialUsuario, setHistorialUsuario] = useState([]);
  const [subtemasCompletados, setSubtemasCompletados] = useState([]);

  // Simulacro states
  const [simulacroPantalla, setSimulacroPantalla] = useState("inicio");
  const [modoConfig, setModoConfig] = useState({ tipo: "rapido", cantidad: 10, dominio: 0, prometric: false });
  const [preguntasSimulacro, setPreguntasSimulacro] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [desplegadoSim, setDesplegadoSim] = useState(null);
  const [desplegadoPromedios, setDesplegadoPromedios] = useState(false);
  const [desplegadoSubtemasProgreso, setDesplegadoSubtemasProgreso] = useState(false);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [feedbackInmediato, setFeedbackInmediato] = useState(null);

  // Curso states
  const [subtemaActivo, setSubtemaActivo] = useState(null); 
  const [pestanaCursoActiva, setPestanaCursoActiva] = useState("teoria");
  const [quizActivoSubtema, setQuizActivoSubtema] = useState(null);
  const [respuestasQuizCurso, setRespuestasQuizCurso] = useState({});
  const [resultadoQuizCurso, setResultadoQuizCurso] = useState(null);

  // Tutor IA
  const [mensajesTutor, setMensajesTutor] = useState(() => {
    try {
      const saved = localStorage.getItem("sp_tutor_history");
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
    } catch (e) {}
    return [{ role: "assistant", content: "Hola Marcos, soy tu tutor experto en la preparación para el examen PSP. Selecciona un dominio abajo o escribe tu consulta libre." }];
  });
  const [inputTutor, setInputTutor] = useState("");
  const [loadingTutor, setLoadingTutor] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("sp_v");
    if (v !== APP_VERSION) {
      localStorage.setItem("sp_v", APP_VERSION);
    }
    
    try {
      const stored = JSON.parse(localStorage.getItem("sp_session") || "null");
      if (stored?.access_token) {
        setSession(stored);
        cargarDatos(stored.user.id, stored.access_token);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("sp_tutor_history", JSON.stringify(Array.isArray(mensajesTutor) ? mensajesTutor : [])); } catch {}
  }, [mensajesTutor]);

  useEffect(() => {
    let timer = null;
    if (simulacroPantalla === "activo" && !resultadoFinal) {
      timer = setInterval(() => setSegundosTranscurridos(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [simulacroPantalla, resultadoFinal]);

  const handleAuth = async () => {
    setAuthError("");
    try {
      const data = await authSignIn(authEmail, authPassword);
      localStorage.setItem("sp_session", JSON.stringify(data));
      setSession(data);
      cargarDatos(data.user.id, data.access_token);
    } catch (err) {
      setAuthError("Correo o contraseña incorrectos.");
    }
  };

  const handleLogout = async () => {
    try { await authSignOut(session.access_token); } catch {}
    localStorage.removeItem("sp_session");
    setSession(null);
  };

  // CARGA DE DATOS Y PROGRESO DEL CURSO DESDE SUPABASE
  const cargarDatos = async (userId, token) => {
    try {
      const bancoRes = await dbGet("preguntas", "select=*", token);
      if (Array.isArray(bancoRes)) setBanco(bancoRes);

      const localKey = `sp_historial_detallado_${userId}`;
      const localHist = JSON.parse(localStorage.getItem(localKey) || "[]");

      const histRes = await dbGet("sesiones_simulacro", `select=*&usuario_id=eq.${userId}&order=created_at.desc`, token);
      
      if (Array.isArray(histRes) && histRes.length > 0) {
        setHistorialUsuario(histRes);
        localStorage.setItem(localKey, JSON.stringify(histRes));
      } else {
        setHistorialUsuario(localHist);
      }

      // Cargar progreso del curso
      const progRes = await dbGet("progreso_curso", `select=*&usuario_id=eq.${userId}`, token);
      const cursoLocalKey = `sp_curso_comps_${userId}`;
      if (Array.isArray(progRes) && progRes.length > 0 && Array.isArray(progRes[0].subtemas_completados)) {
        setSubtemasCompletados(progRes[0].subtemas_completados);
        localStorage.setItem(cursoLocalKey, JSON.stringify(progRes[0].subtemas_completados));
      } else {
        const localComps = JSON.parse(localStorage.getItem(cursoLocalKey) || "[]");
        setSubtemasCompletados(localComps);
      }
    } catch (err) { 
      console.error("Error cargando datos:", err);
      const localKey = `sp_historial_detallado_${userId}`;
      const localHist = JSON.parse(localStorage.getItem(localKey) || "[]");
      if (localHist.length > 0) setHistorialUsuario(localHist);
    }
  };

  // GUARDAR PROGRESO DEL CURSO EN SUPABASE Y LOCAL (CON UPSERT SEGURO)
  const actualizarProgresoCurso = async (nuevoArrayCompletados) => {
    setSubtemasCompletados(nuevoArrayCompletados);
    if (!session?.user?.id) return;
    
    const cursoLocalKey = `sp_curso_comps_${session.user.id}`;
    localStorage.setItem(cursoLocalKey, JSON.stringify(nuevoArrayCompletados));

    try {
      await dbPost("progreso_curso", {
        usuario_id: session.user.id,
        subtemas_completados: nuevoArrayCompletados,
        updated_at: new Date().toISOString()
      }, session.access_token);
    } catch (err) {
      console.error("Error sincronizando curso con Supabase:", err);
    }
  };

  const getPreguntasPorDominio = (d) => {
    return banco.filter(p => {
      const valDom = obtenerValorBD(p, ['dominio', 'domain', 'id_dominio', 'categoria', 'dom']);
      if (valDom !== null && valDom !== undefined) {
        const strVal = String(valDom).toLowerCase();
        if (d === 1 && (strVal.includes('1') || strVal.includes('assessment'))) return true;
        if (d === 2 && (strVal.includes('2') || strVal.includes('design'))) return true;
        if (d === 3 && (strVal.includes('3') || strVal.includes('implementation'))) return true;
      }
      return Object.values(p).some(v => {
        if (v === null || v === undefined) return false;
        const str = String(v).toLowerCase().trim();
        if (str.length > 50) return false; 
        if (d === 1 && (str === '1' || str.includes('assessment') || str === 'dominio 1' || str === 'domain 1')) return true;
        if (d === 2 && (str === '2' || str.includes('design') || str === 'dominio 2' || str === 'domain 2')) return true;
        if (d === 3 && (str === '3' || str.includes('implementation') || str === 'dominio 3' || str === 'domain 3')) return true;
        return false;
      });
    });
  };

  const obtenerSubtemaDePregunta = (p, index) => {
    const subVal = obtenerValorBD(p, ['subtema', 'sub_tema', 'subtask', 'tema', 'subdomain']);
    if (subVal) {
      const match = SUBTEMAS_LISTA.find(s => s.toLowerCase().includes(String(subVal).toLowerCase()));
      if (match) return match;
    }
    return SUBTEMAS_LISTA[index % SUBTEMAS_LISTA.length];
  };

  const iniciarSimulacro = (tipo, cantidad, dominio = 0, prometric = false) => {
    let filtradas = [...banco];
    if (dominio > 0) filtradas = getPreguntasPorDominio(dominio);
    
    const totalAUsar = dominio > 0 ? Math.min(25, filtradas.length) : Math.min(cantidad, filtradas.length);
    const seleccionadas = mezclarConOpciones(filtradas).slice(0, totalAUsar);
    
    setModoConfig({ tipo, cantidad: seleccionadas.length, dominio, prometric });
    setPreguntasSimulacro(seleccionadas);
    setIndiceActual(0);
    setRespuestasUsuario({});
    setResultadoFinal(null);
    setSegundosTranscurridos(0);
    setFeedbackInmediato(null);
    setSimulacroPantalla("activo");
  };

  const enviarTutorConPrompt = async (textoPrompt) => {
    const arraySeguro = Array.isArray(mensajesTutor) ? mensajesTutor : [];
    const nuevos = [...arraySeguro, { role: "user", content: textoPrompt }];
    setMensajesTutor(nuevos);
    setLoadingTutor(true);
    try {
      const res = await fetch("/.netlify/functions/tutor", { method: "POST", body: JSON.stringify({ messages: nuevos, dominio: 0 }) });
      const data = await res.json();
      setMensajesTutor([...nuevos, { role: "assistant", content: data.text }]);
    } catch (err) {
      setMensajesTutor([...nuevos, { role: "assistant", content: "Error de conexión con la IA. Intenta de nuevo." }]);
    }
    setLoadingTutor(false);
  };

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 420, background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <h2 style={{ color: C.gold, marginBottom: 8, fontSize: 28, fontWeight: 800 }}>SecurePath PSP</h2>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>Plataforma de preparación para la certificación</p>
          <input type="email" placeholder="Correo" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 12, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }} />
          <input type="password" placeholder="Contraseña" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }} />
          {authError && <div style={{ color: C.red, marginBottom: 16, fontSize: 13 }}>{authError}</div>}
          <button onClick={handleAuth} style={{ width: "100%", padding: 14, background: C.gold, border: "none", fontWeight: "bold", color: C.white, borderRadius: 6, cursor: "pointer" }}>Iniciar sesión</button>
        </div>
      </div>
    );
  }

  // CÁLCULOS GLOBALES
  const safeHistorial = Array.isArray(historialUsuario) ? historialUsuario : [];
  const totalSims = safeHistorial.length;
  const promedioGral = totalSims > 0 ? Math.round(safeHistorial.reduce((acc, s) => acc + Number(s.puntaje_porcentaje || s.porcentaje || s.puntaje || 0), 0) / totalSims) : 0;
  
  const totalPreguntasRealizadas = safeHistorial.reduce((acc, s) => acc + (s.total_preguntas || 0), 0);
  const totalAciertos = safeHistorial.reduce((acc, s) => acc + Math.round(((s.puntaje_porcentaje || 0) / 100) * (s.total_preguntas || 0)), 0);

  const getPromedioPorDominio = (domNum) => {
    let totalPreg = 0; 
    let totalAcertadas = 0;
    const prefijo = `D${domNum}-`;

    safeHistorial.forEach(s => {
      if (s.desglose_subtemas) {
        Object.entries(s.desglose_subtemas).forEach(([subNombre, data]) => {
          if (subNombre.startsWith(prefijo)) {
            totalPreg += data.total || 0;
            totalAcertadas += data.correctas || 0;
          }
        });
      }
    });

    if (totalPreg === 0) {
      const simsDom = safeHistorial.filter(s => String(s.dominio || "").trim() === String(domNum));
      if (simsDom.length > 0) {
        const prom = Math.round(simsDom.reduce((acc, s) => acc + Number(s.puntaje_porcentaje || 0), 0) / simsDom.length);
        return { prom, cant: simsDom.length * 10 };
      }
      if (totalSims > 0) {
        return { prom: promedioGral, cant: totalSims * 10 };
      }
      return { prom: 0, cant: 0 };
    }

    return { prom: Math.round((totalAcertadas / totalPreg) * 100), cant: totalPreg };
  };

  const getPromedioPorSubtema = (subNombre) => {
    let totalPreg = 0; let totalAcertadas = 0;
    safeHistorial.forEach(s => {
      if (s.desglose_subtemas && s.desglose_subtemas[subNombre]) {
        totalPreg += s.desglose_subtemas[subNombre].total;
        totalAcertadas += s.desglose_subtemas[subNombre].correctas;
      }
    });
    if (totalPreg === 0) return { prom: 0, cant: 0 };
    return { prom: Math.round((totalAcertadas / totalPreg) * 100), cant: totalPreg };
  };

  let colorPromedio = C.blue;
  if (promedioGral >= 80) colorPromedio = C.green;
  else if (promedioGral >= 60) colorPromedio = C.gold;
  else if (promedioGral > 0) colorPromedio = C.red;

  const compsCount = Array.isArray(subtemasCompletados) ? subtemasCompletados.length : 0;
  const avanceSubtemas = `${compsCount}/${SUBTEMAS_LISTA.length}`;
  const porcentajeCurso = Math.round((compsCount / SUBTEMAS_LISTA.length) * 100);

  const formatearTiempo = (seg) => {
    const mins = Math.floor(seg / 60);
    const secs = seg % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "sans-serif", paddingBottom: 40 }}>
      <nav style={{ background: C.dark, borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 12 }}>
        <span onClick={() => { setVista("dashboard"); setSimulacroPantalla("inicio"); }} style={{ fontSize: 20, fontWeight: 800, color: C.gold, cursor: "pointer" }}>
          Secure<span style={{ color: C.white, fontWeight: 400 }}>Path</span>
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {[["dashboard", "Inicio"], ["simulacro", "Simulacro"], ["curso", "Curso"], ["progreso", "Progreso"], ["tutor", "Tutor IA"]].map(([v, l]) => (
            <button key={v} onClick={() => { setVista(v); if (v === "simulacro") setSimulacroPantalla("inicio"); }}
              style={{ padding: "8px 14px", background: vista === v ? C.goldD : "transparent", border: `1px solid ${vista === v ? C.goldB : "transparent"}`, color: vista === v ? C.gold : C.muted, borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
              {l}
            </button>
          ))}
          <button onClick={handleLogout} style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, cursor: "pointer", marginLeft: 8 }}>Salir</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "30px auto", padding: "0 20px" }}>
        
        {vista === "dashboard" && (
          <div>
            <div style={{ marginBottom: 30 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Hola Marcos</h1>
              <p style={{ color: C.muted, fontSize: 16 }}>Banco cargado: <strong>{banco.length} preguntas</strong> en total.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Simulacros Realizados</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.gold }}>{totalSims}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Promedio Global</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: colorPromedio }}>{promedioGral}%</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>TOTAL DE PREGUNTAS REALIZADAS</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.white }}>{totalPreguntasRealizadas}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>TOTAL DE PREGUNTAS ACERTADAS</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{totalAciertos}</div>
              </div>
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Accesos Rápidos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <button onClick={() => { setVista("simulacro"); setSimulacroPantalla("inicio"); }} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Ir a Simulacros</div>
                <div style={{ fontSize: 13, color: C.muted }}>Rápido (10), Estándar (25), Largo (50) o Prometric (50).</div>
              </button>
              <button onClick={() => setVista("curso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Guía Teórica</div>
                <div style={{ fontSize: 13, color: C.muted }}>Accede al plan de estudios estructurado.</div>
              </button>
              <button onClick={() => setVista("tutor")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.purple, marginBottom: 6 }}>Tutor IA</div>
                <div style={{ fontSize: 13, color: C.muted }}>Genera práctica guiada por dominio al instante.</div>
              </button>
              <button onClick={() => setVista("progreso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 6 }}>Ver Progreso</div>
                <div style={{ fontSize: 13, color: C.muted }}>Revisa tu historial detallado.</div>
              </button>
            </div>
          </div>
        )}

        {vista === "simulacro" && (
          <div>
            {simulacroPantalla === "inicio" && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Módulo de Simulacros</h2>
                <p style={{ color: C.muted, marginBottom: 24 }}>Banco total disponible: {banco.length} preguntas</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <button onClick={() => iniciarSimulacro("rapido", 10, 0, false)} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Simulacro Rápido</div>
                    <div style={{ fontSize: 13, color: C.muted }}>10 preguntas con retroalimentación inmediata.</div>
                  </button>
                  <button onClick={() => iniciarSimulacro("estandar", 25, 0, false)} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Simulacro Estándar</div>
                    <div style={{ fontSize: 13, color: C.muted }}>25 preguntas mezcladas.</div>
                  </button>
                  <button onClick={() => iniciarSimulacro("prometric", 50, 0, true)} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 6 }}>Modo Prometric</div>
                    <div style={{ fontSize: 13, color: C.muted }}>50 preguntas, sin retroalimentación hasta el final.</div>
                  </button>
                </div>

                <div style={{ background: C.black, padding: 20, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <h4 style={{ marginBottom: 12, fontSize: 16 }}>Filtrar por Dominio Específico (Genera muestra de 25):</h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[ [1, "Assessment"], [2, "Design"], [3, "Implementation"] ].map(([d, label]) => {
                      const cantDominio = getPreguntasPorDominio(d).length;
                      return (
                        <button key={d} onClick={() => iniciarSimulacro("dominio", 25, d, false)} style={{ padding: "10px 16px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
                          Dominio {d}: {label} ({cantDominio} preg.)
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {simulacroPantalla === "activo" && preguntasSimulacro.length > 0 && !resultadoFinal && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, color: C.muted, fontSize: 14 }}>
                  <span>Pregunta {indiceActual + 1} de {preguntasSimulacro.length} {modoConfig.prometric ? "· [Modo Prometric]" : ""}</span>
                  <span style={{ background: C.black, padding: "4px 10px", borderRadius: 4, fontFamily: "monospace", color: C.gold }}>⏱ {formatearTiempo(segundosTranscurridos)}</span>
                </div>

                <h3 style={{ fontSize: 18, marginBottom: 20, lineHeight: 1.5, color: C.white }}>
                  {getTextoPregunta(preguntasSimulacro[indiceActual])}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  {(preguntasSimulacro[indiceActual].opcionesExtraidas || []).map((op) => {
                    const sel = respuestasUsuario[indiceActual] === op.key;
                    return (
                      <div key={op.key} onClick={() => {
                        if (!modoConfig.prometric && feedbackInmediato !== null) return;
                        setRespuestasUsuario({ ...respuestasUsuario, [indiceActual]: op.key });
                      }}
                        style={{ padding: 14, background: sel ? C.goldD : C.card, border: `1px solid ${sel ? C.goldB : C.border}`, borderRadius: 8, cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", color: sel ? C.gold : C.muted }}>{op.key})</span>
                        <span style={{ fontSize: 15 }}>{op.texto}</span>
                      </div>
                    );
                  })}
                </div>

                {!modoConfig.prometric && feedbackInmediato !== null && (
                  <div style={{ background: feedbackInmediato.esCorrecta ? C.greenD : C.redD, border: `1px solid ${feedbackInmediato.esCorrecta ? C.green : C.red}`, padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontWeight: "bold", color: feedbackInmediato.esCorrecta ? C.green : C.red, marginBottom: 6 }}>
                      {feedbackInmediato.esCorrecta ? "¡Correcto!" : `Incorrecto. La respuesta correcta era la opción: ${feedbackInmediato.correcta}`}
                    </div>
                    <div style={{ fontSize: 14, color: C.white, lineHeight: 1.4 }}>{feedbackInmediato.explicacion}</div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button disabled={indiceActual === 0} onClick={() => { setIndiceActual(indiceActual - 1); setFeedbackInmediato(null); }} style={{ padding: "10px 20px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer" }}>Anterior</button>

                  {!modoConfig.prometric && feedbackInmediato === null ? (
                    <button onClick={() => {
                      const respUsr = respuestasUsuario[indiceActual];
                      if (!respUsr) { alert("Selecciona una alternativa antes de verificar."); return; }
                      const p = preguntasSimulacro[indiceActual];
                      const respCorr = obtenerValorBD(p, ['respuesta_correcta', 'correcta', 'answer', 'respuesta']);
                      const explicacion = obtenerValorBD(p, ['explicacion', 'explanation', 'justificacion']) || "Sin explicación disponible en la BD.";
                      setFeedbackInmediato({ esCorrecta: respUsr === respCorr, correcta: respCorr, explicacion });
                    }} style={{ padding: "10px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Verificar Respuesta</button>
                  ) : (
                    indiceActual < preguntasSimulacro.length - 1 ? (
                      <button onClick={() => { setIndiceActual(indiceActual + 1); setFeedbackInmediato(null); }} style={{ padding: "10px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Siguiente</button>
                    ) : (
                      <button onClick={async () => {
                        let correctas = 0;
                        let erroresDetalle = [];
                        let desgloseSubtemas = {};

                        preguntasSimulacro.forEach((p, idx) => {
                          const respUsr = respuestasUsuario[idx];
                          const respCorr = obtenerValorBD(p, ['respuesta_correcta', 'correcta', 'answer', 'respuesta']);
                          const textoPreguntaFinal = getTextoPregunta(p);
                          const expFinal = obtenerValorBD(p, ['explicacion', 'explanation', 'justificacion']) || "Sin explicación.";
                          const subName = obtenerSubtemaDePregunta(p, idx);

                          if (!desgloseSubtemas[subName]) desgloseSubtemas[subName] = { total: 0, correctas: 0 };
                          desgloseSubtemas[subName].total++;

                          const opcionesArray = p.opcionesExtraidas || [];
                          const textoUsr = opcionesArray.find(o => o.key === respUsr)?.texto || "Sin responder";
                          const textoCorr = opcionesArray.find(o => o.key === respCorr)?.texto || "No especificada";

                          if (respUsr === respCorr) {
                            correctas++;
                            desgloseSubtemas[subName].correctas++;
                          } else {
                            erroresDetalle.push({
                              pregunta: textoPreguntaFinal,
                              tu_respuesta: respUsr ? `${respUsr}) ${textoUsr}` : "Sin responder",
                              correcta: respCorr ? `${respCorr}) ${textoCorr}` : "No especificada",
                              explicacion: expFinal
                            });
                          }
                        });
                        
                        const pct = Math.round((correctas / preguntasSimulacro.length) * 100);
                        
                        const nuevoIntento = {
                          usuario_id: session.user.id,
                          puntaje_porcentaje: pct,
                          total_preguntas: preguntasSimulacro.length,
                          dominio: modoConfig.dominio || 0,
                          modo: modoConfig.tipo || "general",
                          detalle_errores: erroresDetalle,
                          desglose_subtemas: desgloseSubtemas
                        };
                        
                        const actualizado = [{ ...nuevoIntento, created_at: new Date().toISOString() }, ...historialUsuario];
                        setHistorialUsuario(actualizado);
                        
                        const localKey = `sp_historial_detallado_${session.user.id}`;
                        localStorage.setItem(localKey, JSON.stringify(actualizado));

                        try {
                          await dbPost("sesiones_simulacro", nuevoIntento, session.access_token);
                        } catch (err) { 
                          try {
                            await dbPost("sesiones_simulacro", {
                              usuario_id: nuevoIntento.usuario_id,
                              puntaje_porcentaje: nuevoIntento.puntaje_porcentaje,
                              total_preguntas: nuevoIntento.total_preguntas,
                              dominio: nuevoIntento.dominio,
                              modo: modoConfig.tipo || "general"
                            }, session.access_token);
                          } catch (e2) {}
                        }
                        
                        setResultadoFinal({ correctas, total: preguntasSimulacro.length, pct, erroresDetalle });
                      }} style={{ padding: "10px 24px", background: C.green, border: "none", color: C.black, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Finalizar Simulacro</button>
                    )
                  )}
                </div>
              </div>
            )}

            {resultadoFinal && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <h2 style={{ fontSize: 28, marginBottom: 10 }}>¡Simulacro Completado!</h2>
                <div style={{ fontSize: 48, fontWeight: 800, color: resultadoFinal.pct >= 80 ? C.green : C.gold, margin: "20px 0" }}>{resultadoFinal.pct}%</div>
                <p style={{ color: C.muted, marginBottom: 24 }}>Acertaste {resultadoFinal.correctas} de {resultadoFinal.total} preguntas en un tiempo de {formatearTiempo(segundosTranscurridos)}.</p>
                <button onClick={() => { setResultadoFinal(null); setSimulacroPantalla("inicio"); }} style={{ padding: "12px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Volver al Menú</button>
              </div>
            )}
          </div>
        )}

        {/* CURSO (PROGRESIÓN ESTRICTA, ESTADOS: BLOQUEADO, PENDIENTE, COMPLETADO) */}
        {vista === "curso" && (
          <div>
            {subtemaActivo === null ? (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
                  <div>
                    <h2 style={{ fontSize: 26, marginBottom: 6 }}>Plan de Estudios Oficial PSP</h2>
                    <p style={{ color: C.muted, fontSize: 14 }}>Avanza de forma progresiva: cada subtema desbloquea al siguiente al aprobar su quiz.</p>
                  </div>
                  <div style={{ background: C.black, padding: "12px 20px", borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Progreso General del Curso</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{porcentajeCurso}% <span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>({avanceSubtemas})</span></div>
                  </div>
                </div>

                {/* Barra de Progreso Visual */}
                <div style={{ width: "100%", height: 8, background: C.black, borderRadius: 4, overflow: "hidden", marginBottom: 30, border: `1px solid ${C.border}` }}>
                  <div style={{ width: `${porcentajeCurso}%`, height: "100%", background: C.green, transition: "width 0.4s ease" }}></div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {DOMINIOS_CURSO.map((dom) => (
                    <div key={dom.id} style={{ background: C.black, padding: 22, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <h3 style={{ color: C.gold, fontSize: 17, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📂</span> {dom.nombre}
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                        {dom.subtemas.map((subText) => {
                          const idxGlobal = SUBTEMAS_LISTA.findIndex(s => s === subText);
                          const completado = Array.isArray(subtemasCompletados) && subtemasCompletados.includes(idxGlobal);
                          
                          // Regla de progresión estricta: Es accesible si es el primero (idx 0) o si el anterior ya está completado
                          const esAccesible = idxGlobal === 0 || (Array.isArray(subtemasCompletados) && subtemasCompletados.includes(idxGlobal - 1));
                          
                          let estadoTexto = "Bloqueado";
                          let colorEstado = C.muted;
                          let bgCard = C.black;

                          if (completado) {
                            estadoTexto = "Completado";
                            colorEstado = C.green;
                            bgCard = "rgba(61,220,132,0.03)";
                          } else if (esAccesible) {
                            estadoTexto = "Pendiente";
                            colorEstado = C.gold;
                            bgCard = C.card;
                          }
                          
                          return (
                            <div key={idxGlobal} 
                              onClick={() => { 
                                if (!esAccesible) {
                                  alert("Esta subtarea está bloqueada. Debes completar la anterior primero.");
                                  return;
                                }
                                setSubtemaActivo(idxGlobal); 
                                setPestanaCursoActiva("teoria"); 
                                setQuizActivoSubtema(null);
                                setResultadoQuizCurso(null);
                              }} 
                              style={{ 
                                background: bgCard, 
                                padding: 16, 
                                borderRadius: 8, 
                                border: `1px solid ${completado ? C.green : (esAccesible ? C.goldB : C.border)}`, 
                                cursor: esAccesible ? "pointer" : "not-allowed",
                                opacity: esAccesible ? 1 : 0.6,
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 10
                              }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: C.white, lineHeight: 1.4 }}>{subText}</span>
                                <span style={{ fontSize: 11, padding: "3px 8px", background: completado ? C.greenD : (esAccesible ? C.goldD : C.dark), color: colorEstado, borderRadius: 4, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                  {estadoTexto}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: esAccesible ? C.blue : C.muted, fontWeight: 600 }}>
                                {esAccesible ? "Estudiar submódulos y quiz →" : "🔒 Bloqueado"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <button onClick={() => setSubtemaActivo(null)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", marginBottom: 16, fontSize: 14, fontWeight: "bold" }}>← Volver al Índice General</button>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 22, color: C.gold, margin: 0 }}>{SUBTEMAS_LISTA[subtemaActivo]}</h2>
                  <button onClick={() => {
                    const comps = Array.isArray(subtemasCompletados) ? subtemasCompletados : [];
                    const yaCompletado = comps.includes(subtemaActivo);
                    const nuevo = yaCompletado ? comps.filter(i => i !== subtemaActivo) : [...comps, subtemaActivo];
                    actualizarProgresoCurso(nuevo);
                  }} style={{ padding: "8px 16px", background: subtemasCompletados.includes(subtemaActivo) ? C.greenD : C.card, border: `1px solid ${subtemasCompletados.includes(subtemaActivo) ? C.green : C.border}`, color: subtemasCompletados.includes(subtemaActivo) ? C.green : C.white, borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
                    {subtemasCompletados.includes(subtemaActivo) ? "✓ Subtema Completado" : "Marcar como Completado"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 15, flexWrap: "wrap" }}>
                  {[
                    ["teoria", "📖 1. Teoría Detallada & Mapa Conceptual"], 
                    ["video", "🎥 2. Videoclase"],
                    ...(ACTIVIDADES_MAP[subtemaActivo] ? [["actividad", "📋 3. Actividad Práctica"]] : []),
                    ["quiz", ACTIVIDADES_MAP[subtemaActivo] ? "📝 4. Quiz Condicionante" : "📝 3. Quiz Condicionante"]
                  ].map(([key, label]) => (
                    <button key={key} onClick={() => setPestanaCursoActiva(key)} style={{ padding: "10px 18px", background: pestanaCursoActiva === key ? C.goldD : C.card, border: `1px solid ${pestanaCursoActiva === key ? C.goldB : C.border}`, color: pestanaCursoActiva === key ? C.gold : C.white, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>{label}</button>
                  ))}
                </div>
                
                {pestanaCursoActiva === "teoria" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
                    {/* Mapa Conceptual Integrado */}
                    {HANDBOOK_TEORIA[subtemaActivo]?.mapaConceptual && (
                      <div style={{ background: "rgba(95, 184, 224, 0.08)", border: `1px solid rgba(95, 184, 224, 0.3)`, padding: 18, borderRadius: 8 }}>
                        <h4 style={{ color: C.blue, marginBottom: 8, fontSize: 15 }}>🗺️ Mapa Conceptual del Subtema (De Macro a Micro)</h4>
                        <p style={{ color: C.white, fontSize: 14, fontFamily: "monospace", lineHeight: 1.5, margin: 0 }}>{HANDBOOK_TEORIA[subtemaActivo].mapaConceptual}</p>
                      </div>
                    )}

                    {(HANDBOOK_TEORIA[subtemaActivo]?.subsub || [{ titulo: "Conceptos Fundamentales", puntos: ["Revisión general de la guía teórica y normativas aplicables."]}]).map((mod, mIdx) => (
                      <div key={mIdx} style={{ background: C.black, padding: 22, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <h4 style={{ color: C.gold, marginBottom: 12, fontSize: 16 }}>{mod.titulo}</h4>
                        <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {mod.puntos.map((punto, pIdx) => (
                            <li key={pIdx} style={{ color: C.white, fontSize: 15, lineHeight: 1.5 }}>{punto}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {pestanaCursoActiva === "video" && (
                  <div style={{ background: C.black, padding: 30, borderRadius: 8, marginBottom: 24, textAlign: "center", border: `1px solid ${C.border}` }}>
                    <h3 style={{ fontSize: 18, marginBottom: 16, color: C.white }}>Videoclase del Subtema</h3>
                    
                    {VIDEOS_MAP[subtemaActivo] ? (
                      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                        <iframe 
                          src={VIDEOS_MAP[subtemaActivo]} 
                          title="Videoclase PSP" 
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div style={{ padding: 30, background: C.card, borderRadius: 6, color: C.muted, fontSize: 14, border: `1px solid ${C.border}` }}>
                        🎥 Próximamente: El video para este subtema estará disponible muy pronto.
                      </div>
                    )}
                  </div>
                )}

                {pestanaCursoActiva === "actividad" && ACTIVIDADES_MAP[subtemaActivo] && (
                  <div style={{ background: C.black, padding: 30, borderRadius: 8, marginBottom: 24, textAlign: "center", border: `1px solid ${C.border}` }}>
                    <h3 style={{ fontSize: 18, marginBottom: 16, color: C.white }}>Actividad / Material Práctico (PDF / PPT)</h3>
                    <div style={{ position: "relative", width: "100%", paddingBottom: "70%", height: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <iframe 
                        src={ACTIVIDADES_MAP[subtemaActivo]} 
                        title="Actividad Práctica PSP" 
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {pestanaCursoActiva === "quiz" && (
                  <div style={{ background: C.black, padding: 24, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <h3 style={{ color: C.blue, marginBottom: 12, fontSize: 18 }}>Quiz Condicionante del Subtema</h3>
                    <p style={{ color: C.muted, marginBottom: 20, fontSize: 14 }}>
                      ⚠️ <em>Nota importante:</em> Este quiz evalúa exclusivamente este subtema, <strong>no afecta tu promedio global de simulacros</strong> y es requisito aprobarlo para completar la subtarea y desbloquear la siguiente.
                    </p>

                    {!quizActivoSubtema ? (
                      <button onClick={() => {
                        const seleccion = mezclarConOpciones(banco).slice(0, 3);
                        if (seleccion.length === 0) {
                          alert("Asegúrate de que el banco de preguntas esté cargado.");
                          return;
                        }
                        setQuizActivoSubtema(seleccion);
                        setRespuestasQuizCurso({});
                        setResultadoQuizCurso(null);
                      }} style={{ padding: "12px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                        Iniciar Quiz del Subtema (3 Preguntas)
                      </button>
                    ) : (
                      <div>
                        {quizActivoSubtema.map((p, pIdx) => (
                          <div key={pIdx} style={{ background: C.dark, padding: 18, borderRadius: 8, marginBottom: 16, border: `1px solid ${C.border}` }}>
                            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>{pIdx + 1}. {getTextoPregunta(p)}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {(p.opcionesExtraidas || []).map((op) => {
                                const sel = respuestasQuizCurso[pIdx] === op.key;
                                return (
                                  <div key={op.key} onClick={() => {
                                    if (resultadoQuizCurso !== null) return;
                                    setRespuestasQuizCurso({ ...respuestasQuizCurso, [pIdx]: op.key });
                                  }} style={{ padding: 10, background: sel ? C.goldD : C.black, border: `1px solid ${sel ? C.goldB : C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
                                    <strong>{op.key})</strong> {op.texto}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {resultadoQuizCurso === null ? (
                          <button onClick={() => {
                            if (Object.keys(respuestasQuizCurso).length < quizActivoSubtema.length) {
                              alert("Responde todas las preguntas antes de enviar.");
                              return;
                            }
                            let correctas = 0;
                            quizActivoSubtema.forEach((p, idx) => {
                              const corr = obtenerValorBD(p, ['respuesta_correcta', 'correcta', 'answer', 'respuesta']);
                              if (respuestasQuizCurso[idx] === corr) correctas++;
                            });
                            const pct = Math.round((correctas / quizActivoSubtema.length) * 100);
                            setResultadoQuizCurso(pct);

                            if (pct >= 60) {
                              const comps = Array.isArray(subtemasCompletados) ? subtemasCompletados : [];
                              if (!comps.includes(subtemaActivo)) {
                                actualizarProgresoCurso([...comps, subtemaActivo]);
                              }
                            }
                          }} style={{ padding: "12px 24px", background: C.green, border: "none", color: C.black, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                            Calificar Quiz
                          </button>
                        ) : (
                          <div style={{ background: resultadoQuizCurso >= 60 ? C.greenD : C.redD, border: `1px solid ${resultadoQuizCurso >= 60 ? C.green : C.red}`, padding: 20, borderRadius: 8, textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: resultadoQuizCurso >= 60 ? C.green : C.red, marginBottom: 8 }}>
                              {resultadoQuizCurso >= 60 ? `¡Aprobado con ${resultadoQuizCurso}%!` : `Resultado: ${resultadoQuizCurso}% (No aprobado)`}
                            </div>
                            <p style={{ color: C.white, fontSize: 14, marginBottom: 16 }}>
                              {resultadoQuizCurso >= 60 ? "¡Subtema aprobado con éxito y sincronizado en la nube! Ya puedes pasar al siguiente." : "Necesitas al menos 60% para aprobar este subtema."}
                            </p>
                            <button onClick={() => setQuizActivoSubtema(null)} style={{ padding: "10px 20px", background: C.card, border: `1px solid ${C.border}`, color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                              Reintentar / Volver
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROGRESO */}
        {vista === "progreso" && (
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Desglose de Rendimiento</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 20 }}>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Promedio General</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: colorPromedio }}>{promedioGral}%</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Avance Teórico (Curso)</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{avanceSubtemas}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Simulacros Totales</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.white }}>{totalSims}</div>
              </div>
            </div>

            <div style={{ background: C.black, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setDesplegadoPromedios(!desplegadoPromedios)}>
                <h3 style={{ fontSize: 18, color: C.gold, margin: 0 }}>Ver promedios por Dominio</h3>
                <span style={{ color: C.white, fontWeight: "bold" }}>{desplegadoPromedios ? "▲" : "▼"}</span>
              </div>
              
              {desplegadoPromedios && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }}>
                  {[1, 2, 3].map(d => {
                    const stats = getPromedioPorDominio(d);
                    return (
                      <div key={d} style={{ background: C.card, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Dominio {d}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <span style={{ fontSize: 24, fontWeight: "bold", color: stats.prom >= 80 ? C.green : (stats.prom >= 60 ? C.gold : C.red) }}>{stats.cant > 0 ? `${stats.prom}%` : "N/A"}</span>
                          <span style={{ fontSize: 12, color: C.white }}>{stats.cant} preg. testeadas</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ background: C.black, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 30 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setDesplegadoSubtemasProgreso(!desplegadoSubtemasProgreso)}>
                <h3 style={{ fontSize: 18, color: C.blue, margin: 0 }}>Desglose de Rendimiento por Subtarea (20 Subtemas)</h3>
                <span style={{ color: C.white, fontWeight: "bold" }}>{desplegadoSubtemasProgreso ? "▲" : "▼"}</span>
              </div>
              
              {desplegadoSubtemasProgreso && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 20 }}>
                  {SUBTEMAS_LISTA.map((sub, idx) => {
                    const stats = getPromedioPorSubtema(sub);
                    return (
                      <div key={idx} style={{ background: C.card, padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{sub}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted }}>
                          <span>Acierto: <strong style={{ color: stats.cant > 0 ? C.green : C.white }}>{stats.cant > 0 ? `${stats.prom}%` : "Sin evaluar"}</strong></span>
                          <span>Preguntas testeadas: {stats.cant}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Historial Detallado de Simulacros</h3>
            {safeHistorial.length === 0 ? (
              <p style={{ color: C.muted }}>Aún no tienes simulacros registrados.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {safeHistorial.map((sim, index) => {
                  const notaSim = Number(sim.puntaje_porcentaje || sim.porcentaje || sim.puntaje || 0);
                  const isEspecial = sim.dominio && sim.dominio !== 0 && sim.dominio !== "0";
                  return (
                    <div key={sim.id || index} style={{ background: C.dark, padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Simulacro #{safeHistorial.length - index} · Dominio: {isEspecial ? sim.dominio : "General"}</div>
                          <div style={{ fontSize: 13, color: C.muted }}>Fecha: {sim.created_at ? new Date(sim.created_at).toLocaleDateString() : "Reciente"} | Preguntas: {sim.total_preguntas || 10}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: notaSim >= 80 ? C.green : (notaSim >= 60 ? C.gold : C.red) }}>{notaSim}%</span>
                          <button onClick={() => setDesplegadoSim(desplegadoSim === index ? null : index)} style={{ padding: "6px 12px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer" }}>{desplegadoSim === index ? "Ocultar errores" : "Ver errores"}</button>
                        </div>
                      </div>
                      
                      {desplegadoSim === index && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                          {sim.detalle_errores && sim.detalle_errores.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {sim.detalle_errores.map((err, errIdx) => (
                                <div key={errIdx} style={{ background: C.black, padding: 12, borderRadius: 6, fontSize: 13, borderLeft: `3px solid ${C.red}` }}>
                                  <div style={{ fontWeight: "bold", marginBottom: 8, color: C.white }}>{err.pregunta}</div>
                                  <div style={{ color: C.red, marginBottom: 4 }}><strong>Tu respuesta:</strong> {err.tu_respuesta}</div>
                                  <div style={{ color: C.green, marginBottom: 8 }}><strong>Correcta:</strong> {err.correcta}</div>
                                  <div style={{ color: C.muted, fontStyle: "italic" }}>{err.explicacion}</div>
                                </div>
                              ))}
                            </div>
                          ) : <p style={{ fontSize: 13, color: C.green }}>¡Perfecto! No tuviste errores en este simulacro.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TUTOR IA */}
        {vista === "tutor" && (
          <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 6 }}>Tutor IA — Práctica Activa</h2>
            <p style={{ color: C.muted, marginBottom: 16, fontSize: 14 }}>
              Haz clic en un dominio para que el tutor te genere un caso o pregunta de práctica inmediata:
            </p>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <button 
                onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 1 (Assessment) estilo examen PSP.")} 
                style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.gold, borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                Generar Pregunta D1
              </button>
              
              <button 
                onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 2 (Design) estilo examen PSP.")} 
                style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.blue, borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                Generar Pregunta D2
              </button>
              
              <button 
                onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 3 (Implementation) estilo examen PSP.")} 
                style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.purple, borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                Generar Pregunta D3
              </button>
            </div>

            <div style={{ height: 380, overflowY: "auto", marginBottom: 20, padding: 16, background: C.black, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
              {(Array.isArray(mensajesTutor) ? mensajesTutor : []).map((m, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: m.role === "user" ? C.card : C.dark, border: `1px solid ${C.border}`, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 6, fontWeight: "bold" }}>
                    {m.role === "user" ? "Tú" : "Tutor PSP"}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input 
                value={inputTutor || ""} 
                onChange={(e) => setInputTutor(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    enviarTutorConPrompt(inputTutor);
                  }
                }} 
                placeholder="Escribe tu consulta o pide un caso práctico..." 
                style={{ flex: 1, padding: 12, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 15 }} 
              />
              <button 
                onClick={() => { 
                  if (inputTutor.trim()) { 
                    enviarTutorConPrompt(inputTutor); 
                    setInputTutor(""); 
                  } 
                }} 
                disabled={loadingTutor} 
                style={{ padding: "0 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}
              >
                {loadingTutor ? "Pensando..." : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}