import { useState, useEffect } from "react";

// ─── CONFIGURACIÓN DE SUPABASE Y VERSIONES ──────────────────────────────────
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4";
const APP_VERSION = "6.1"; 

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

// ─── BANCO MAESTRO DE RESPALDO PSP ──────────────────────────────────────────
const BANCO_MAESTRO_FALLBACK = [
  {
    id: 1,
    dominio: 1,
    subtema: "D1-T1 Caracterización de los Activos",
    pregunta: "Según los estándares de ASIS International, ¿cuál es el primer paso ineludible en cualquier evaluación de seguridad física (Assessment)?",
    opciones: [
      { key: "A", texto: "La instalación de sistemas electrónicos de detección y cámaras." },
      { key: "B", texto: "La caracterización e inventario de los activos organizacionales." },
      { key: "C", texto: "El análisis financiero del presupuesto anual de seguridad." },
      { key: "D", texto: "La contratación de guardias de seguridad privada." }
    ],
    respuesta_correcta: "B",
    explicacion: "La caracterización e inventario de activos (modelo PPIR) es siempre el punto de partida fundamental para determinar qué se protege y con qué nivel de prioridad."
  },
  {
    id: 2,
    dominio: 1,
    subtema: "D1-T2 Análisis de Amenazas",
    pregunta: "En el análisis de amenazas de seguridad física, ¿qué evalúa el modelo ICO?",
    opciones: [
      { key: "A", texto: "Impacto, Costo y Oportunidad." },
      { key: "B", texto: "Intención, Capacidad y Oportunidad." },
      { key: "C", texto: "Infraestructura, Conectividad y Operación." },
      { key: "D", texto: "Inspección, Control y Organización." }
    ],
    respuesta_correcta: "B",
    explicacion: "El modelo ICO evalúa la Intención (motivación del atacante), la Capacidad (recursos y medios) y la Oportunidad (ventanas vulnerables)."
  },
  {
    id: 3,
    dominio: 1,
    subtema: "D1-T3 Análisis de Vulnerabilidades",
    pregunta: "¿Cuál de las siguientes afirmaciones describe correctamente la relación entre amenaza y vulnerabilidad?",
    opciones: [
      { key: "A", texto: "La organización puede controlar directamente las amenazas externas." },
      { key: "B", texto: "La vulnerabilidad es una debilidad interna susceptible de ser aprovechada por una amenaza." },
      { key: "C", texto: "Una amenaza sin vulnerabilidad genera un riesgo crítico inmediato." },
      { key: "D", texto: "Las vulnerabilidades son siempre de carácter tecnológico y nunca procedimentales." }
    ],
    respuesta_correcta: "B",
    explicacion: "Las vulnerabilidades son debilidades internas bajo control de la organización que pueden ser explotadas por amenazas externas o internas."
  },
  {
    id: 4,
    dominio: 1,
    subtema: "D1-T4 Riesgo y Consecuencias",
    pregunta: "En la gestión cuantitativa de riesgos, ¿cómo se define la Expectativa de Pérdida Anual (ALE)?",
    opciones: [
      { key: "A", texto: "SLE multiplicado por ARO." },
      { key: "B", texto: "Costo de reposición menos depreciación." },
      { key: "C", texto: "Probabilidad de amenaza dividida por vulnerabilidad." },
      { key: "D", texto: "Impacto total más costo de contramedidas." }
    ],
    respuesta_correcta: "A",
    explicacion: "ALE (Annualized Loss Expectancy) se calcula multiplicando la Expectativa de Pérdida Única (SLE) por la Tasa Anual de Ocurrencia (ARO)."
  },
  {
    id: 5,
    dominio: 1,
    subtema: "D1-T5 Análisis de Contramedidas",
    pregunta: "En el diseño de seguridad física, ¿cuál es la regla temporal fundamental que debe cumplirse para garantizar una protección efectiva?",
    opciones: [
      { key: "A", texto: "Tiempo de respuesta mayor que el tiempo de detección." },
      { key: "B", texto: "Tiempo total de retardo mayor que el tiempo total de respuesta." },
      { key: "C", texto: "Tiempo de disuasión igual al tiempo de videovigilancia." },
      { key: "D", texto: "Tiempo de comisionamiento menor a 24 horas." }
    ],
    respuesta_correcta: "B",
    explicacion: "La regla de oro exige que el Tiempo de Retardo (T_retardo) supere al Tiempo de Respuesta (T_respuesta) para interceptar al intruso antes de que alcance el activo."
  },
  {
    id: 6,
    dominio: 2,
    subtema: "D2-T1 Barreras Físicas y Perímetro",
    pregunta: "¿Cuál es el propósito principal de la primera línea de defensa perimetral?",
    opciones: [
      { key: "A", texto: "Eliminar por completo la necesidad de guardias de seguridad." },
      { key: "B", texto: "Disuadir, demorar y detectar intentos de intrusión no autorizados." },
      { key: "C", texto: "Garantizar el aislamiento acústico de la instalación." },
      { key: "D", texto: "Reducir los impuestos prediales de la corporación." }
    ],
    respuesta_correcta: "B",
    explicacion: "Las barreras perimetrales buscan la disuasión visual, la detección temprana y el retardo físico del acceso no autorizado."
  }
];

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

// MAPA DE VIDEOS (GOOGLE DRIVE RESTAURADO PARA D1-T1)
const VIDEOS_MAP = {
  0: "https://drive.google.com/file/d/1CTlCyCBrEwXuz_a-ytYxjO-TFc7SGgm6/preview", 
  1: "https://drive.google.com/file/d/14WZozh0_pmOTxSZHuiZL6Bccm2zS-rlI/preview", 
  2: "https://drive.google.com/file/d/1GZdS9IrlIgZQPwD7FfxELz3IfQM-cnXP/preview", 
  3: "https://drive.google.com/file/d/1UxwSkzAXzwgpXHDWpzvweNvU7nzw8mB_/preview", 
  4: "https://drive.google.com/file/d/1uRC7eRJrEVZtFGZ_e36aAWwGaL9KbmRm/preview", 
};

const ACTIVIDADES_MAP = {
  3: "https://drive.google.com/file/d/1_IRmyGYY1NUAgdoSSLceLe48HFdqvIHn/preview", 
};

const VIDEOS_VIEW_MAP = {
  0: "https://drive.google.com/file/d/1CTlCyCBrEwXuz_a-ytYxjO-TFc7SGgm6/view?usp=sharing",
  1: "https://drive.google.com/file/d/14WZozh0_pmOTxSZHuiZL6Bccm2zS-rlI/view?usp=sharing",
  2: "https://drive.google.com/file/d/1GZdS9IrlIgZQPwD7FfxELz3IfQM-cnXP/view?usp=sharing",
  3: "https://drive.google.com/file/d/1UxwSkzAXzwgpXHDWpzvweNvU7nzw8mB_/view?usp=sharing",
  4: "https://drive.google.com/file/d/1uRC7eRJrEVZtFGZ_e36aAWwGaL9KbmRm/view?usp=sharing",
};

const ACTIVIDADES_VIEW_MAP = {
  3: "https://drive.google.com/file/d/1_IRmyGYY1NUAgdoSSLceLe48HFdqvIHn/view?usp=sharing",
};

// ─── TEORÍA OFICIAL ASIS PSP AMPLIADA, PROFUNDA Y ESTRUCTURADA ────────────────
const HANDBOOK_TEORIA = {
  0: { 
    mapaConceptual: "Macro: Universo Organizacional (Modelo PPIR) ➔ Meso: Ciclo Metodológico de 5 Fases (Inventario, Clasificación, Valoración, Priorización, Gobernanza) ➔ Micro: Cuantificación de Impacto Operacional y Criterios CID.",
    subsub: [
      { 
        titulo: "1. Fundamentos Teóricos y Filosofía de Protección", 
        puntos: [
          "Definición ASIS de Activo: Cualquier persona, bien tangible, información o capacidad intangible con valor para la organización que requiere un nivel de protección proporcional a su criticidad.",
          "Modelo PPIR (People, Property, Information, Reputation): Marco fundamental de ASIS para clasificar todo el universo de activos corporativos.",
          "Prioridad Absoluta del Activo Humano: La protección de la vida, la salud y la integridad física de empleados, contratistas y visitantes antecede siempre a cualquier bien material o propiedad intelectual.",
          "Estándar de Diligencia Debida (Due Diligence): Obligación legal y ética corporativa de implementar salvaguardas razonables y probadas para mitigar exposiciones previsibles.",
          "Proporcionalidad de la Seguridad: Los costos y restricciones de las contramedidas nunca deben superar el valor potencial de pérdida del activo protegido."
        ] 
      },
      { 
        titulo: "2. Tipología Exhaustiva: Tangibles e Intangibles", 
        puntos: [
          "Activos Tangibles Humanos: Personal ejecutivo, fuerza laboral general, personal de seguridad, visitantes y contratistas recurrentes.",
          "Activos Tangibles Físicos: Inmuebles, plantas de producción, centros de datos, maquinaria crítica, inventarios y valores monetarios.",
          "El Modelo CRAVED para Activos Físicos: Criterios que evalúan por qué un activo es blanco de robo (Concealable, Removable, Available, Valuable, Enjoyable, Disposable).",
          "Activos Intangibles: Información corporativa confidencial, propiedad intelectual, secretos industriales, patentes, software propietario y reputación de marca.",
          "Peso Económico Moderno: En las organizaciones actuales, los activos intangibles representan entre el 70% y el 90% del valor corporativo total."
        ] 
      },
      { 
        titulo: "3. Metodología ASIS de las 5 Fases (Inventario y Alcance)", 
        puntos: [
          "Fase 1 (Alcance e Inventario): Definición rigurosa de perímetros físicos, lógicos y temporales. Aplicación de la técnica de las 6 superficies (piso, techo y 4 paredes de un recinto).",
          "Enfoques Metodológicos: Top-Down (desde la dirección estratégica hacia las operaciones) y Bottom-Up (desde las instalaciones hacia el corporativo).",
          "Fase 2 (Clasificación por Sensibilidad): Niveles normalizados como Público, Interno, Confidencial y Restringido / Secret.",
          "Fase 3 y 4 (Valoración y Priorización): Jerarquización mediante Tiers (A, B, C) y análisis de dependencias críticas o Puntos Únicos de Falla (SPOF).",
          "Fase 5 (Gobernanza del Activo): Establecimiento formal de registros maestros, auditorías de inventario y separación estricta entre Propietario (Accountable) y Custodio (Responsible)."
        ] 
      },
      { 
        titulo: "4. Integración Regulatoria y Marcos de Referencia", 
        puntos: [
          "Alineación con el Protection of Assets (POA) manual de referencia global de ASIS International.",
          "Sincronización con marcos internacionales como ISO/IEC 27001 (Control de Activos) y el NIST Cybersecurity Framework (Función Identify).",
          "Cumplimiento mandatorio con normativas de protección de datos personales y regulaciones locales de seguridad industrial."
        ] 
      },
      { 
        titulo: "5. Puntos Críticos de Examen (ASIS PSP) y Casuística", 
        puntos: [
          "Pregunta clásica de examen: La caracterización de activos es siempre el paso inicial ineludible de un Assessment; jamás se inicia diseñando contramedidas o evaluando amenazas aisladas.",
          "El Propietario del Activo es el único con autoridad para definir su nivel de clasificación y aceptar el riesgo residual.",
          "Error común de diseño: Proteger elementos secundarios (hardware de bajo costo) ignorando el impacto consecuencial en la interrupción de procesos primarios."
        ] 
      }
    ]
  },
  1: { 
    mapaConceptual: "Macro: Entorno Geopolítico, Social y Criminal ➔ Meso: Taxonomía de Amenazas (Naturales, Humanas, Técnicas) y Modelo ICO ➔ Micro: Perfilación de Actores Hostiles.",
    subsub: [
      { 
        titulo: "1. Naturaleza y Taxonomía de las Amenazas", 
        puntos: [
          "Definición ASIS: Una amenaza es cualquier evento, circunstancia, condición o actor hostil con el potencial de causar pérdida, daño, lesión o interrupción a un activo.",
          "Amenazas Humanas Intencionales: Delincuencia común, crimen organizado, terrorismo, sabotaje industrial, espionaje corporativo y activismo radical.",
          "Amenazas Humanas Negligentes: Errores operativos involuntarios, fallas de juicio y descuidos del personal interno.",
          "Amenazas Naturales y Ambientales: Sismos, inundaciones, eventos climáticos extremos, tormentas eléctricas y deslizamientos geológicos.",
          "Amenazas Técnicas y Estructurales: Colapsos de suministros críticos (energía eléctrica, agua, telecomunicaciones) y fallas de materiales de construcción."
        ] 
      },
      { 
        titulo: "2. El Modelo ICO (Intención, Capacidad y Oportunidad)", 
        puntos: [
          "Intención (Intent): Motivación psicológica, ideológica, financiera o geopolítica que impulsa al actor hostil a perpetrar un ataque.",
          "Capacidad (Capability): Recursos financieros, equipamiento táctico, armamento, especialización técnica y redes de apoyo con que cuenta el agresor.",
          "Oportunidad (Opportunity): Ventanas temporales, fallas de supervisión, deficiencias perimetrales y condiciones que reducen el costo operativo del ataque.",
          "Ecuación del Amenazante: Un actor con alta intención y alta capacidad pero sin oportunidad operativa no puede concretar exitosamente el evento hostil."
        ] 
      },
      { 
        titulo: "3. El Vector Crítico de la Amenaza Interna (Insider Threat)", 
        puntos: [
          "Complejidad de Mitigación: Considerado por ASIS como uno de los riesgos más desafiantes debido a que el actor interno posee privilegios legítimos de acceso.",
          "Tipología de Insiders: Maliciosos (empleados descontentos, coaccionados por carteles o reclutados para espionaje) y Negligentes (víctimas de phishing, errores humanos).",
          "Indicadores de Comportamiento (Red Flags): Cambios drásticos en el estilo de vida, interés inusual en áreas fuera de su competencia y violaciones recurrentes de protocolos."
        ] 
      },
      { 
        titulo: "4. Inteligencia de Amenazas y Fuentes de Información", 
        puntos: [
          "Uso de análisis estadístico criminal local, reportes de inteligencia de fuentes abiertas (OSINT) y evaluación de tendencias sectoriales.",
          "Mapeo de riesgos geográficos y zonificación de criminalidad en los entornos operativos de la organización."
        ] 
      },
      { 
        titulo: "5. Puntos Clave para el Examen PSP", 
        puntos: [
          "Recuerde: Las amenazas son externas a los controles de seguridad directos y no se pueden eliminar, solo se pueden mitigar sus efectos mediante barreras adecuadas.",
          "El análisis de amenazas debe actualizarse de manera dinámica ante cambios geopolíticos o reestructuraciones del negocio."
        ] 
      }
    ]
  },
  2: { 
    mapaConceptual: "Macro: Auditoría de Superficie de Ataque ➔ Meso: Brechas Físicas, Tecnológicas y Procedimentales ➔ Micro: Pruebas de Penetración Física (Red Teaming).",
    subsub: [
      { 
        titulo: "1. Fundamentos de Vulnerabilidad en Seguridad Física", 
        puntos: [
          "Definición ASIS: Condición, deficiencia o debilidad en el diseño, construcción, ubicación, operación o mantenimiento de un sistema de protección que puede ser aprovechada por una amenaza.",
          "Control Absoluto: Las vulnerabilidades son las únicas variables de la ecuación de riesgo sobre las cuales la organización tiene control directo, total y absoluto.",
          "Diferencia Conceptual: La amenaza es el peligro potencial incontrolable; la vulnerabilidad es la puerta de entrada interna corregible."
        ] 
      },
      { 
        titulo: "2. Taxonomía Detallada de Vulnerabilidades", 
        puntos: [
          "Vulnerabilidades Físicas y Arquitectónicas: Perímetros frágiles, ausencia de zonas de exclusas, iluminación deficiente y materiales constructivos vulnerables al reventón.",
          "Vulnerabilidades Tecnológicas: Sistemas de control de acceso obsoletos con tarjetas clonables, cámaras CCTV con puntos ciegos y alarmas sin supervisión de línea.",
          "Vulnerabilidades Procedimentales: Protocolos de registro de visitantes en papel sin verificación, falta de simulacros de emergencia y fatiga extrema en turnos de operadores."
        ] 
      },
      { 
        titulo: "3. Metodologías de Detección de Brechas", 
        puntos: [
          "Listas de verificación normalizadas basadas en estándares de auditoría de seguridad física de ASIS.",
          "Pruebas de Penetración Física Controlada (Physical Red Teaming): Simulación ética de ataques para medir la resistencia real de barreras y tiempos de reacción humana.",
          "Cruces analíticos estrictos entre los activos Tier A (D1-T1) y los vectores de ataque (D1-T2)."
        ] 
      },
      { 
        titulo: "4. Puntos Críticos de Examen PSP", 
        puntos: [
          "Una vulnerabilidad solo adquiere relevancia crítica si protege un activo de alto valor estratégico.",
          "Priorizar la corrección de brechas en activos Tier A antes de invertir recursos en áreas de bajo impacto."
        ] 
      }
    ]
  },
  3: { 
    mapaConceptual: "Macro: Ecuación del Riesgo ➔ Meso: Valoración de Impacto y Consecuencias ➔ Micro: Análisis Cuantitativo (SLE, ARO, ALE) y BIA.",
    subsub: [
      { 
        titulo: "1. La Ecuación Fundamental del Riesgo en Seguridad", 
        puntos: [
          "Fórmula Oficial ASIS: Riesgo = Amenaza (Probabilidad de ocurrencia) × Vulnerabilidad (Probabilidad de éxito del ataque) × Impacto (Valor del Activo afectado).",
          "Rol del Impacto: El valor monetario, operativo o reputacional del activo es el factor que traduce un incidente físico en una consecuencia corporativa crítica.",
          "Riesgo Inherente vs Residual: El riesgo inherente es la exposición neta sin salvaguardas; el riesgo residual es el remanente operativo tras aplicar las contramedidas."
        ] 
      },
      { 
        titulo: "2. Modelos Cuantitativos y Cualitativos de Pérdida", 
        puntos: [
          "Expectativa de Pérdida Única (SLE - Single Loss Expectancy): Costo financiero directo de un único evento disruptivo.",
          "Tasa Anual de Ocurrencia (ARO - Annualized Rate of Occurrence): Estimación estadística de cuántas veces ocurre el evento en un año.",
          "Expectativa de Pérdida Anual (ALE = SLE × ARO): Métrica financiera clave para justificar presupuestos ante el directorio.",
          "Matrices Cualitativas (3x3 o 5x5): Herramientas basadas en escalas ancladas para evaluar escenarios complejos donde no existen datos estadísticos históricos."
        ] 
      },
      { 
        titulo: "3. Análisis de Impacto al Negocio (BIA)", 
        puntos: [
          "Business Impact Analysis: Metodología para evaluar los efectos operativos y financieros de la interrupción de procesos críticos.",
          "Métricas Temporales Clave: MTPD (Maximum Tolerable Period of Disruption), RTO (Recovery Time Objective) y RPO (Recovery Point Objective)."
        ] 
      },
      { 
        titulo: "4. Criterios de Aceptación del Riesgo", 
        puntos: [
          "Opciones de Tratamiento: Mitigar (controles), Transferir (seguros/contratos), Evitar (suspender actividad) o Aceptar formalmente.",
          "La aceptación formal del riesgo residual corresponde exclusivamente al Propietario del Activo o Junta Directiva, nunca al gerente de seguridad."
        ] 
      }
    ]
  },
  4: { 
    mapaConceptual: "Macro: Defensa en Profundidad ➔ Meso: Las 4 Funciones (Disuasión, Detección, Retardo, Respuesta) ➔ Micro: Ecuación de Retardo vs Respuesta y ROSI.",
    subsub: [
      { 
        titulo: "1. Arquitectura de Defensa en Profundidad", 
        puntos: [
          "Concepto de Anillos Concéntricos: Implementación de múltiples barreras perimetrales y zonificadas (perímetro exterior, fachada, controles internos y gabinetes blindados).",
          "Objetivo Táctico: Obligar al agresor a superar sucesivas capas defensivas, incrementando el esfuerzo operativo y el tiempo acumulado de exposición."
        ] 
      },
      { 
        titulo: "2. Las Cuatro Funciones Esenciales de la Seguridad Física", 
        puntos: [
          "Disuasión (Deterrence): Elementos psicológicos, cartelería e iluminación para desalentar el ataque antes de su inicio.",
          "Detección (Detection): Sensores perimetrales y sistemas CCTV para alertar al centro de control sobre la intrusión en tiempo real.",
          "Retardo (Delay): Barreras físicas, rejas, puertas reforzadas y esclusas diseñadas para frenar físicamente el avance del intruso.",
          "Respuesta (Response): Acciones coordinadas de la fuerza de reacción para interceptar al agresor antes de que vulnere el activo."
        ] 
      },
      { 
        titulo: "3. La Regla de Oro Temporal del Diseño PSP", 
        puntos: [
          "Ecuación Crítica: Tiempo total de Retardo ($T_{retardo}$) > Tiempo total de Respuesta ($T_{respuesta}$).",
          "Si el intruso puede romper las defensas antes de la llegada de la fuerza de reacción, el diseño físico habrá fracasado sin importar el costo de la tecnología instalada."
        ] 
      },
      { 
        titulo: "4. Análisis de Retorno de Inversión (ROSI)", 
        puntos: [
          "Return on Security Investment: Metodología para justificar el costo de las contramedidas en función de la reducción calculada en la ALE."
        ] 
      }
    ]
  },
  5: { subsub: [{ titulo: "Marco ESRM", puntos: ["Enterprise Security Risk Management alineado a objetivos de negocio."] }] },
  6: { subsub: [{ titulo: "Inspecciones", puntos: ["Revisiones metódicas y auditorías independientes."] }] },
  7: { subsub: [{ titulo: "Requisitos Legales", puntos: ["Cumplimiento normativo local e internacional."] }] },
  8: { subsub: [{ titulo: "Documentación", puntos: ["Políticas, directrices y reportes ejecutivos."] }] },
  9: { subsub: [{ titulo: "Barreras Físicas", puntos: ["Cercas, muros y elementos perimetrales."] }] },
  10: { subsub: [{ titulo: "Control de Accesos", puntos: ["Credenciales, biometría y exclusas."] }] },
  11: { subsub: [{ titulo: "Detección de Intrusos", puntos: ["Sensores volumétricos y perimetrales."] }] },
  12: { subsub: [{ titulo: "Videovigilancia", puntos: ["Cámaras IP y analítica inteligente."] }] },
  13: { subsub: [{ titulo: "CPTED", puntos: ["Prevención del delito mediante diseño ambiental."] }] },
  14: { subsub: [{ titulo: "Comunicaciones", puntos: ["Redes seguras y radios redundantes."] }] },
  15: { subsub: [{ titulo: "Integración", puntos: ["Plataformas PSIM y convergencia."] }] },
  16: { subsub: [{ titulo: "Gestión de Proyectos", puntos: ["Planificación y presupuestos."] }] },
  17: { subsub: [{ titulo: "Comisionamiento", puntos: ["Pruebas FAT y SAT."] }] },
  18: { subsub: [{ titulo: "Operación y Mantenimiento", puntos: ["Gestión óptima de centros de control."] }] },
  19: { subsub: [{ titulo: "Capacitación", puntos: ["Entrenamiento continuo y simulacros."] }] }
};

export default function SecurePathPSP() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [vista, setVista] = useState("dashboard");
  const [banco, setBanco] = useState(BANCO_MAESTRO_FALLBACK);
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
  const [indiceTeoriaPaso, setIndiceTeoriaPaso] = useState(0);
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
    if (v !== APP_VERSION) localStorage.setItem("sp_v", APP_VERSION);
    
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

  const cargarDatos = async (userId, token) => {
    try {
      const bancoRes = await dbGet("preguntas", "select=*", token);
      if (Array.isArray(bancoRes) && bancoRes.length > 0) setBanco(bancoRes);

      const localKey = `sp_historial_detallado_${userId}`;
      const localHist = JSON.parse(localStorage.getItem(localKey) || "[]");

      const histRes = await dbGet("sesiones_simulacro", `select=*&usuario_id=eq.${userId}&order=created_at.desc`, token);
      
      if (Array.isArray(histRes) && histRes.length > 0) {
        setHistorialUsuario(histRes);
        localStorage.setItem(localKey, JSON.stringify(histRes));
      } else {
        setHistorialUsuario(localHist);
      }

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
    const fuenteBanco = banco.length > 0 ? banco : BANCO_MAESTRO_FALLBACK;
    return fuenteBanco.filter(p => {
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
    let filtradas = banco.length > 0 ? [...banco] : [...BANCO_MAESTRO_FALLBACK];
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
              <p style={{ color: C.muted, fontSize: 16 }}>Banco cargado: <strong>{banco.length > 0 ? banco.length : BANCO_MAESTRO_FALLBACK.length} preguntas</strong> en total.</p>
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
                <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Curso</div>
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
                <p style={{ color: C.muted, marginBottom: 24 }}>Banco total disponible: {banco.length > 0 ? banco.length : BANCO_MAESTRO_FALLBACK.length} preguntas</p>
                
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

        {/* CURSO */}
        {vista === "curso" && (
          <div>
            {subtemaActivo === null ? (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
                  <div>
                    <h2 style={{ fontSize: 26, marginBottom: 6 }}>Curso Oficial PSP</h2>
                    <p style={{ color: C.muted, fontSize: 14 }}>Avanza de forma progresiva: cada subtema desbloquea al siguiente al aprobar su quiz.</p>
                  </div>
                  <div style={{ background: C.black, padding: "12px 20px", borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Progreso General del Curso</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{porcentajeCurso}% <span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>({avanceSubtemas})</span></div>
                  </div>
                </div>

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
                                setIndiceTeoriaPaso(0);
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
                    ["teoria", "📖 1. Teoría & Carrusel Conceptual"], 
                    ["video", "🎥 2. Videoclase"],
                    ...(ACTIVIDADES_MAP[subtemaActivo] ? [["actividad", "📋 3. Actividad Práctica"]] : []),
                    ["quiz", ACTIVIDADES_MAP[subtemaActivo] ? "📝 4. Quiz Condicionante" : "📝 3. Quiz Condicionante"]
                  ].map(([key, label]) => (
                    <button key={key} onClick={() => setPestanaCursoActiva(key)} style={{ padding: "10px 18px", background: pestanaCursoActiva === key ? C.goldD : C.card, border: `1px solid ${pestanaCursoActiva === key ? C.goldB : C.border}`, color: pestanaCursoActiva === key ? C.gold : C.white, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>{label}</button>
                  ))}
                </div>
                
                {/* TEORÍA EN CARRUSEL / PESTAÑAS INTERACTIVAS */}
                {pestanaCursoActiva === "teoria" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
                    {HANDBOOK_TEORIA[subtemaActivo]?.mapaConceptual && (
                      <div style={{ background: "rgba(95, 184, 224, 0.08)", border: `1px solid rgba(95, 184, 224, 0.3)`, padding: 16, borderRadius: 8 }}>
                        <h4 style={{ color: C.blue, marginBottom: 6, fontSize: 14 }}>🗺️ Mapa Conceptual de Ruta</h4>
                        <p style={{ color: C.white, fontSize: 13, fontFamily: "monospace", lineHeight: 1.4, margin: 0 }}>{HANDBOOK_TEORIA[subtemaActivo].mapaConceptual}</p>
                      </div>
                    )}

                    {(() => {
                      const modulosTeoria = HANDBOOK_TEORIA[subtemaActivo]?.subsub || [{ titulo: "Conceptos Fundamentales", puntos: ["Revisión general de la guía teórica y normativas aplicables."] }];
                      const maxPaso = modulosTeoria.length - 1;
                      const moduloActual = modulosTeoria[indiceTeoriaPaso] || modulosTeoria[0];
                      const esUltimoBloque = indiceTeoriaPaso === maxPaso;

                      return (
                        <div style={{ background: C.black, padding: 26, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                            <h4 style={{ color: C.gold, margin: 0, fontSize: 17 }}>{moduloActual.titulo}</h4>
                            <span style={{ fontSize: 13, color: C.muted, background: C.dark, padding: "4px 10px", borderRadius: 4 }}>
                              Módulo {indiceTeoriaPaso + 1} de {modulosTeoria.length}
                            </span>
                          </div>

                          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10, minHeight: 140 }}>
                            {moduloActual.puntos.map((punto, pIdx) => (
                              <li key={pIdx} style={{ color: C.white, fontSize: 15, lineHeight: 1.6 }}>{punto}</li>
                            ))}
                          </ul>

                          {/* LLAMADO A LA ACCIÓN EN EL ÚLTIMO BLOQUE */}
                          {esUltimoBloque && (
                            <div style={{ background: C.greenD, border: `1px solid ${C.green}`, padding: 16, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                              <div>
                                <div style={{ fontWeight: "bold", color: C.green, fontSize: 14, marginBottom: 2 }}>🎉 ¡Has finalizado la lectura de este subtema!</div>
                                <div style={{ fontSize: 13, color: C.white }}>Continúa con la videoclase o realiza el quiz correspondiente.</div>
                              </div>
                              <button onClick={() => setPestanaCursoActiva("video")} style={{ padding: "10px 20px", background: C.green, color: C.black, border: "none", fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                                Ir a Videoclase 🎥 →
                              </button>
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                            <button 
                              disabled={indiceTeoriaPaso === 0}
                              onClick={() => setIndiceTeoriaPaso(p => Math.max(0, p - 1))}
                              style={{ padding: "8px 18px", background: indiceTeoriaPaso === 0 ? C.dark : C.card, border: `1px solid ${C.border}`, color: indiceTeoriaPaso === 0 ? C.muted : C.white, borderRadius: 6, cursor: indiceTeoriaPaso === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                              ← Anterior Bloque
                            </button>

                            <div style={{ display: "flex", gap: 6 }}>
                              {modulosTeoria.map((_, dotIdx) => (
                                <span key={dotIdx} onClick={() => setIndiceTeoriaPaso(dotIdx)} style={{ width: 10, height: 10, borderRadius: "50%", background: indiceTeoriaPaso === dotIdx ? C.gold : C.muted, cursor: "pointer", display: "inline-block" }}></span>
                              ))}
                            </div>

                            <button 
                              disabled={indiceTeoriaPaso === maxPaso}
                              onClick={() => setIndiceTeoriaPaso(p => Math.min(maxPaso, p + 1))}
                              style={{ padding: "8px 18px", background: indiceTeoriaPaso === maxPaso ? C.dark : C.gold, border: `1px solid ${C.border}`, color: indiceTeoriaPaso === maxPaso ? C.muted : C.white, borderRadius: 6, cursor: indiceTeoriaPaso === maxPaso ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                              Siguiente Bloque →
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {pestanaCursoActiva === "video" && (
                  <div style={{ background: C.black, padding: 30, borderRadius: 8, marginBottom: 24, textAlign: "center", border: `1px solid ${C.border}` }}>
                    <h3 style={{ fontSize: 18, marginBottom: 16, color: C.white }}>Videoclase del Subtema</h3>
                    
                    {VIDEOS_MAP[subtemaActivo] ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                          <iframe 
                            src={VIDEOS_MAP[subtemaActivo]} 
                            title="Videoclase PSP" 
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          />
                        </div>
                        {VIDEOS_VIEW_MAP[subtemaActivo] && (
                          <a href={VIDEOS_VIEW_MAP[subtemaActivo]} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "12px 24px", background: C.gold, color: C.white, borderRadius: 6, fontWeight: "bold", textDecoration: "none" }}>
                            🔗 Abrir video directamente ↗
                          </a>
                        )}
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                      <div style={{ position: "relative", width: "100%", paddingBottom: "60%", height: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                        <iframe 
                          src={ACTIVIDADES_MAP[subtemaActivo]} 
                          title="Actividad Práctica PSP" 
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                          allowFullScreen
                        />
                      </div>
                      {ACTIVIDADES_VIEW_MAP[subtemaActivo] && (
                        <a href={ACTIVIDADES_VIEW_MAP[subtemaActivo]} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "12px 24px", background: C.gold, color: C.white, borderRadius: 6, fontWeight: "bold", textDecoration: "none" }}>
                          🔗 Abrir Actividad / Presentación en Google Drive ↗
                        </a>
                      )}
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
                        const fuenteBanco = banco.length > 0 ? banco : BANCO_MAESTRO_FALLBACK;
                        const seleccion = mezclarConOpciones(fuenteBanco).slice(0, 3);
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
                          <span style={{ fontSize: 24, fontWeight: "bold", color: stats.prom >= 80 ? C.green : (stats.prom >= 60 ? C.gold : C.red) }}>{stats.cant > 0 ? `${stats.prom}%` : "0%"}</span>
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
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 1 (Assessment) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.gold, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                Generar Pregunta D1
              </button>
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 2 (Design) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.blue, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                Generar Pregunta D2
              </button>
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 3 (Implementation) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.purple, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
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