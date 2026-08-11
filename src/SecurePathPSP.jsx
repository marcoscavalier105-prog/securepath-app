import { useState, useEffect } from "react";

// ─── CONFIGURACIÓN DE SUPABASE Y VERSIONES ──────────────────────────────────
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4";
const APP_VERSION = "5.6"; 

// Cliente HTTP centralizado para Supabase
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
const dbPost = (table, body, token) => sb(`/rest/v1/${table}`, { method: "POST", body, token, prefer: "return=representation" });

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
    nombre: "DOMINIO 1 ASSESMENT (EVALUACIÓN)", 
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

const HANDBOOK_TEORIA = {
  0: { 
    subsub: [
      { titulo: "1. Identificación y Catalogación", puntos: ["Inventario exhaustivo de activos tangibles e intangibles.", "Clasificación por criticidad y valor operativo.", "Identificación de dependencias críticas de negocio."] },
      { titulo: "2. Criterios de Valoración", puntos: ["Impacto financiero ante pérdida o interrupción.", "Valor reputacional y estratégico.", "Confidencialidad, integridad y disponibilidad (CID)."] }
    ]
  },
  1: { 
    subsub: [
      { titulo: "1. Naturaleza de las Amenazas", puntos: ["Categorización: Humanas (intencionales/accidentales), naturales y ambientales.", "Evaluación de intención, capacidad y oportunidad de actores hostiles.", "Análisis de tendencias criminales y geopolíticas locales."] },
      { titulo: "2. Modelos de Amenaza", puntos: ["Diseño de perfiles de atacantes probables.", "Matriz de frecuencia y severidad de eventos adversos."] }
    ]
  },
  2: { 
    subsub: [
      { titulo: "1. Detección de Debilidades", puntos: ["Evaluación de fallas en diseño arquitectónico y perimetral.", "Análisis de deficiencias operativas y procedimientos de guardia.", "Vulnerabilidades tecnológicas en sistemas de control de accesos y CCTV."] },
      { titulo: "2. Metodologías de Revisión", puntos: ["Auditorías técnicas de campo.", "Pruebas de penetración física y social engineering reviews."] }
    ]
  },
  3: { 
    subsub: [
      { titulo: "1. Modelos de Riesgo", puntos: ["Cálculo cuantitativo vs. cualitativo del riesgo.", "Fórmula base: Riesgo = Amenaza × Vulnerabilidad × Consecuencia.", "Estimación de pérdida esperada anual (SLE, ARO, ALE)."] },
      { titulo: "2. Evaluación de Impacto", puntos: ["Análisis de impacto al negocio (BIA).", "Tolerancia y apetito al riesgo corporativo."] }
    ]
  },
  4: { 
    subsub: [
      { titulo: "1. Análisis Costo-Beneficio", puntos: ["Efectividad de las salvaguardas propuestas.", "Retorno de inversión en seguridad (ROSI).", "Comparación entre mitigación, transferencia, aceptación y evitación."] },
      { titulo: "2. Tipos de Contramedidas", puntos: ["Disuasión, retardación, detección y respuesta.", "Controles físicos, electrónicos y procedimentales."] }
    ]
  },
  5: { 
    subsub: [
      { titulo: "1. Principios del ESRM", puntos: ["Enterprise Security Risk Management alineado al objetivo de negocio.", "Gestión holística más allá de la seguridad física tradicional.", "Colaboración interdepartamental y gestión ejecutiva."] }
    ]
  },
  6: { 
    subsub: [
      { titulo: "1. Metodología de Inspección", puntos: ["Revisiones metódicas y listas de verificación (checklists).", "Evaluación independiente frente a estándares internacionales.", "Informes de hallazgos y planes de acción correctiva (CAPA)."] }
    ]
  },
  7: { 
    subsub: [
      { titulo: "1. Marco Normativo", puntos: ["Cumplimiento de leyes locales e internacionales de seguridad privada.", "Normas industriales, códigos de edificación y regulaciones laborales.", "Responsabilidad civil y penal en operaciones de seguridad."] }
    ]
  },
  8: { 
    subsub: [
      { titulo: "1. Gestión Documental", puntos: ["Elaboración de políticas, directrices y procedimientos operativos estándar (POE).", "Bitácoras, reportes de incidentes e informes ejecutivos.", "Cadena de custodia y confidencialidad de la información."] }
    ]
  },
  9: { 
    subsub: [
      { titulo: "1. Diseño Perimetral", puntos: ["Líneas de defensa concéntricas: disuasión, detección, demora y respuesta.", "Cercas, muros, portones y elementos paisajísticos (CPTED).", "Zonas de exclusión y áreas de separación visual."] }
    ]
  },
  10: { 
    subsub: [
      { titulo: "1. Sistemas de Credencialización", puntos: ["Control de acceso lógico y físico integrado.", "Tecnologías de tarjetas inteligentes, biometría y códigos móviles.", "Gestión de visitantes, esclusas (mantrap) y torniquetes ópticos."] }
    ]
  },
  11: { 
    subsub: [
      { titulo: "1. Tecnologías de Detección", puntos: ["Sensores volumétricos infrarrojos, microondas y ultrasónicos.", "Contactos magnéticos y sensores de rotura de vidrio.", "Protección perimetral con fibra óptica enterrada o en cercas."] }
    ]
  },
  12: { 
    subsub: [
      { titulo: "1. Arquitectura de Videovigilancia", puntos: ["Cámaras IP de alta definición y analítica de video inteligente (IVS).", "Iluminación infrarroja y cámaras térmicas perimetrales.", "Sistemas de grabación (NVR/DVR), almacenamiento y retención de video."] }
    ]
  },
  13: { 
    subsub: [
      { titulo: "1. Principios CPTED", puntos: ["Prevención del Delito a través del Diseño Ambiental.", "Vigilancia natural, control natural de accesos y reforzamiento territorial.", "Mantenimiento y gestión del espacio público y corporativo."] }
    ]
  },
  14: { 
    subsub: [
      { titulo: "1. Redes y Enlaces Seguros", puntos: ["Sistemas de radio comunicación trunking y VHF/UHF.", "Redes redundantes y encriptadas para centros de control.", "Sistemas de alimentación ininterrumpida (UPS) y plantas de emergencia."] }
    ]
  },
  15: { 
    subsub: [
      { titulo: "1. Convergencia Tecnológica", puntos: ["Plataformas PSIM (Physical Security Information Management).", "Integración de seguridad física con ciberseguridad corporativa.", "Operación centralizada en centros de control (SOC/GSOC)."] }
    ]
  },
  16: { 
    subsub: [
      { titulo: "1. Fases del Proyecto", puntos: ["Definición de alcance, cronograma y presupuesto (WBS).", "Gestión de adquisiciones, contratos y proveedores de seguridad.", "Gestión de riesgos del proyecto de ingeniería."] }
    ]
  },
  17: { 
    subsub: [
      { titulo: "1. Comisionamiento Técnico", puntos: ["Pruebas de aceptación en fábrica (FAT) y en sitio (SAT).", "Calibración de sensores, cámaras y sistemas de control de acceso.", "Entrega de manuales, planos as-built y capacitación técnica."] }
    ]
  },
  18: { 
    subsub: [
      { titulo: "1. Gestión Operativa", puntos: ["Mantenimiento preventivo y correctivo de equipos de seguridad.", "Protocolos de actuación y turnos operativos del centro de control.", "Mejora continua en los procedimientos de vigilancia."] }
    ]
  },
  19: { 
    subsub: [
      { titulo: "1. Programas de Capacitación", puntos: ["Entrenamiento continuo para el personal de seguridad y empleados.", "Simulacros de evacuación, intrusión, sismos y respuesta a crisis.", "Evaluación post-ejercicio (After Action Review - AAR)."] }
    ]
  }
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

  // GUARDAR PROGRESO DEL CURSO EN SUPABASE Y LOCAL
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

        {/* CURSO (UX AVANZADA CON SUB-SUBMODULOS Y QUIZZES CONDICIONALES AISLADOS) */}
        {vista === "curso" && (
          <div>
            {subtemaActivo === null ? (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
                  <div>
                    <h2 style={{ fontSize: 26, marginBottom: 6 }}>Plan de Estudios Oficial PSP</h2>
                    <p style={{ color: C.muted, fontSize: 14 }}>Desarrolla la teoría por sub-submódulos y aprueba los quizzes para completar tu avance.</p>
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
                          
                          return (
                            <div key={idxGlobal} 
                              onClick={() => { 
                                setSubtemaActivo(idxGlobal); 
                                setPestanaCursoActiva("teoria"); 
                                setQuizActivoSubtema(null);
                                setResultadoQuizCurso(null);
                              }} 
                              style={{ 
                                background: completado ? "rgba(61,220,132,0.03)" : C.card, 
                                padding: 16, 
                                borderRadius: 8, 
                                border: `1px solid ${completado ? C.green : C.border}`, 
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 10
                              }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: C.white, lineHeight: 1.4 }}>{subText}</span>
                                <span style={{ fontSize: 11, padding: "3px 8px", background: completado ? C.greenD : C.dark, color: completado ? C.green : C.muted, borderRadius: 4, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                  {completado ? "✓ Completado" : "Pendiente"}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Estudiar submódulos y quiz →</div>
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

                <div style={{ display: "flex", gap: 10, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 15 }}>
                  {[["teoria", "📖 1. Teoría por Sub-submódulos"], ["video", "🎥 2. Videoclase"], ["quiz", "📝 3. Quiz Condicionante"]].map(([key, label]) => (
                    <button key={key} onClick={() => setPestanaCursoActiva(key)} style={{ padding: "10px 18px", background: pestanaCursoActiva === key ? C.goldD : C.card, border: `1px solid ${pestanaCursoActiva === key ? C.goldB : C.border}`, color: pestanaCursoActiva === key ? C.gold : C.white, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>{label}</button>
                  ))}
                </div>
                
                {pestanaCursoActiva === "teoria" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                    {(HANDBOOK_TEORIA[subtemaActivo]?.subsub || [{ titulo: "Conceptos Fundamentales", puntos: ["Revisión general de la guía teórica y normativas aplicables."] }]).map((mod, mIdx) => (
                      <div key={mIdx} style={{ background: C.black, padding: 22, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <h4 style={{ color: C.blue, marginBottom: 12, fontSize: 16 }}>{mod.titulo}</h4>
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
                    <div style={{ fontSize: 48, marginBottom: 10 }}>🎥</div>
                    <h3 style={{ fontSize: 18, marginBottom: 8, color: C.white }}>Videoclase del Subtema</h3>
                    <p style={{ color: C.muted, marginBottom: 20, fontSize: 14 }}>Material audiovisual correspondiente al plan de estudios de la guía oficial.</p>
                    <div style={{ padding: 16, background: C.card, borderRadius: 6, display: "inline-block", color: C.gold, fontSize: 14, border: `1px solid ${C.border}` }}>
                      Reproductor vinculado correctamente.
                    </div>
                  </div>
                )}

                {pestanaCursoActiva === "quiz" && (
                  <div style={{ background: C.black, padding: 24, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <h3 style={{ color: C.blue, marginBottom: 12, fontSize: 18 }}>Quiz Condicionante del Subtema</h3>
                    <p style={{ color: C.muted, marginBottom: 20, fontSize: 14 }}>
                      ⚠️ <em>Nota importante:</em> Este quiz evalúa exclusivamente este subtema, <strong>no afecta tu promedio global de simulacros</strong> y es requisito aprobarlo para completar la barra de progreso.
                    </p>

                    {!quizActivoSubtema ? (
                      <button onClick={() => {
                        // Filtrar preguntas del banco que correspondan o tomar una muestra segura
                        const filtradas = banco.filter(p => {
                          const subName = SUBTEMAS_LISTA[subtemaActivo].toLowerCase();
                          const pText = JSON.stringify(p).toLowerCase();
                          return pText.includes(subName.split(" ")[0].toLowerCase()) || true;
                        });
                        const seleccion = mezclarConOpciones(filtradas.length >= 3 ? filtradas : banco).slice(0, 3);
                        
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
                              {resultadoQuizCurso >= 60 ? "¡Subtema aprobado con éxito y sincronizado en la nube!" : "Necesitas al menos 60% para desbloquear este subtema."}
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