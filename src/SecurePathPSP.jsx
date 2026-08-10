import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4";

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

const authSignIn = (email, password) =>
  sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
const authSignOut = (token) =>
  sb("/auth/v1/logout", { method: "POST", token });

const dbGet = (table, query, token) =>
  sb(`/rest/v1/${table}?${query}`, { token });
const dbPost = (table, body, token) =>
  sb(`/rest/v1/${table}`, { method: "POST", body, token, prefer: "return=representation" });

// ─── UTILS: BUSCADOR DE COLUMNAS A PRUEBA DE FALLOS ─────────────────────────
const obtenerValorBD = (obj, posiblesLlaves) => {
  if (!obj) return null;
  const keys = Object.keys(obj);
  // 1. Búsqueda exacta ignorando mayúsculas/minúsculas
  for (let llave of posiblesLlaves) {
    const found = keys.find(k => k.toLowerCase().trim() === llave.toLowerCase().trim());
    if (found) return obj[found];
  }
  // 2. Búsqueda parcial (ej. si la columna se llama "id_dominio" y buscamos "dominio")
  for (let llave of posiblesLlaves) {
    const found = keys.find(k => k.toLowerCase().includes(llave.toLowerCase()));
    if (found) return obj[found];
  }
  return null;
};

// ─── PALETA Y ESTILOS ────────────────────────────────────────────────────────
const C = {
  black: "#0b1d2a", dark: "#132c3f", card: "#1b3a52",
  border: "rgba(216,232,240,0.12)", gold: "#ff5a1f", goldD: "rgba(255,90,31,0.12)", goldB: "rgba(255,90,31,0.35)",
  white: "#e3edf2", muted: "#7a92a3", green: "#3ddc84", greenD: "rgba(61,220,132,0.10)",
  red: "#ff5c5c", redD: "rgba(255,92,92,0.1)", blue: "#5fb8e0", purple: "#9d7aff"
};

const mezclar = (arr) => Array.isArray(arr) ? [...arr].sort(() => Math.random() - 0.5) : [];
const mezclarConOpciones = (ps) => mezclar(ps).map((p) => {
  let ops = obtenerValorBD(p, ['opciones', 'options', 'alternativas']);
  if (ops && !Array.isArray(ops) && typeof ops === "object") {
    ops = Object.entries(ops).map(([key, texto]) => ({ key, texto }));
  }
  return { ...p, opcionesExtraidas: mezclar(Array.isArray(ops) ? ops : []) };
});

// ─── DOMINIOS Y SUBTEMAS ESTRUCTURADOS (ESTILO UDEMY) ──────────────────────────
const DOMINIOS_CURSO = [
  {
    id: 1, nombre: "Dominio 1: Physical Security Assessment",
    subtemas: ["1. Fundamentos de Gestión de Riesgos", "2. Análisis y Evaluación de Activos", "3. Identificación y Análisis de Amenazas", "4. Análisis de Vulnerabilidades", "5. Metodologías de Cuantificación de Riesgos"]
  },
  {
    id: 2, nombre: "Dominio 2: Physical Security Design",
    subtemas: ["6. Principios de Diseño de Seguridad Física", "7. Contramedidas Perimetrales y Barreras", "8. Sistemas de Control de Acceso (PACS)", "9. Sistemas de Detección de Intrusos y Alarmas", "10. Videovigilancia (CCTV) y Analítica", "11. Iluminación y Criterios Visuales", "12. Seguridad de la Información y Ciberseguridad Física", "13. Protección de Ejecutivos y Personal"]
  },
  {
    id: 3, nombre: "Dominio 3: Physical Security Implementation",
    subtemas: ["14. Gestión de Crisis y Continuidad de Negocio", "15. Planificación de Respuesta a Emergencias", "16. Investigaciones Corporativas y Entrevistas", "17. Gestión de Contratistas y Proveedores", "18. Auditoría y Cumplimiento Normativo", "19. Arquitectura de Seguridad Integrada", "20. Liderazgo y Gestión de Operaciones de Seguridad"]
  }
];

const SUBTEMAS_LISTA = DOMINIOS_CURSO.flatMap(d => d.subtemas);

export default function SecurePathPSP() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [vista, setVista] = useState("dashboard");
  const [banco, setBanco] = useState([]);
  const [historialUsuario, setHistorialUsuario] = useState([]);

  // Simulacro states
  const [simulacroPantalla, setSimulacroPantalla] = useState("inicio");
  const [modoConfig, setModoConfig] = useState({ tipo: "rapido", cantidad: 10, dominio: 0, prometric: false });
  const [preguntasSimulacro, setPreguntasSimulacro] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [desplegadoSim, setDesplegadoSim] = useState(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [feedbackInmediato, setFeedbackInmediato] = useState(null);

  // Curso states
  const [subtemaActivo, setSubtemaActivo] = useState(null); 
  const [subtemasCompletados, setSubtemasCompletados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sp_subtemas") || "[]"); } catch { return []; }
  });
  const [pestanaCursoActiva, setPestanaCursoActiva] = useState("teoria");

  // Tutor IA (Blindado contra crashes)
  const [mensajesTutor, setMensajesTutor] = useState(() => {
    try {
      const saved = localStorage.getItem("sp_tutor_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [{ role: "assistant", content: "Hola Marcos, soy tu tutor experto en la preparación para el examen PSP. Selecciona un dominio abajo o escribe tu consulta libre." }];
  });
  const [inputTutor, setInputTutor] = useState("");
  const [loadingTutor, setLoadingTutor] = useState(false);

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

  useEffect(() => {
    try { localStorage.setItem("sp_tutor_history", JSON.stringify(mensajesTutor)); } catch {}
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
      cargarBanco(data.access_token);
      cargarHistorial(data.user.id, data.access_token);
    } catch (err) {
      setAuthError("Correo o contraseña incorrectos.");
    }
  };

  const handleLogout = async () => {
    try { await authSignOut(session.access_token); } catch {}
    localStorage.removeItem("sp_session");
    setSession(null);
  };

  const cargarBanco = async (token) => {
    try {
      const data = await dbGet("preguntas", "select=*", token);
      setBanco(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error cargando banco:", err); }
  };

  const cargarHistorial = async (userId, token) => {
    try {
      const data = await dbGet("sesiones_simulacro", `select=*&usuario_id=eq.${userId}&order=created_at.desc`, token);
      setHistorialUsuario(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error cargando historial:", err); }
  };

  // Motor de filtrado agresivo para dominios
  const getPreguntasPorDominio = (d) => {
    return banco.filter(p => {
      // 1. Busca en columnas habituales
      const valDom = obtenerValorBD(p, ['dominio', 'domain', 'id_dominio', 'categoria', 'dom']);
      if (valDom !== null && valDom !== undefined) {
        return String(valDom).includes(String(d));
      }
      // 2. Si no encuentra columna, busca el número de dominio en toda la fila (Fallback)
      return Object.values(p).some(v => typeof v === 'string' && (v.includes(`Dominio ${d}`) || v === String(d)));
    });
  };

  const iniciarSimulacro = (tipo, cantidad, dominio = 0, prometric = false) => {
    let filtradas = [...banco];
    if (dominio > 0) {
      filtradas = getPreguntasPorDominio(dominio);
    }
    
    if (filtradas.length === 0) {
      // Si a pesar del filtro agresivo no hay preguntas, tomamos todo el banco para no bloquear al usuario
      alert(`No se detectó un formato claro para el Dominio ${dominio}. Se iniciará con preguntas generales.`);
      filtradas = [...banco];
    }

    const totalAUsar = Math.min(cantidad, filtradas.length);
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
      setMensajesTutor([...nuevos, { role: "assistant", content: "Error de conexión con la IA." }]);
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

  // Cálculos robustos para Progreso y Dashboard basados en estado actualizado
  const totalSims = Array.isArray(historialUsuario) ? historialUsuario.length : 0;
  const promedioGral = totalSims > 0 ? Math.round(historialUsuario.reduce((acc, s) => acc + Number(s.puntaje_porcentaje || s.porcentaje || s.puntaje || 0), 0) / totalSims) : 0;
  
  let colorPromedio = C.blue;
  if (promedioGral >= 80) colorPromedio = C.green;
  else if (promedioGral >= 60) colorPromedio = C.gold;
  else if (promedioGral > 0) colorPromedio = C.red;

  const avanceSubtemas = `${subtemasCompletados.length}/${SUBTEMAS_LISTA.length}`;

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
              <p style={{ color: C.muted, fontSize: 16 }}>Resumen de rendimiento y accesos rápidos para tu preparación.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 40 }}>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Simulacros Realizados</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.gold }}>{totalSims}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Promedio Global</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: colorPromedio }}>{promedioGral}%</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Avance de Subtareas</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{avanceSubtemas}</div>
              </div>
            </div>
          </div>
        )}

        {vista === "simulacro" && (
          <div>
            {simulacroPantalla === "inicio" && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Módulo de Simulacros</h2>
                <p style={{ color: C.muted, marginBottom: 24 }}>Banco total: {banco.length} preguntas</p>
                
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
                  <h4 style={{ marginBottom: 12, fontSize: 16 }}>Filtrar por Dominio Específico:</h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[ [1, "Assessment"], [2, "Design"], [3, "Implementation"] ].map(([d, label]) => {
                      const cantDominio = getPreguntasPorDominio(d).length;
                      return (
                        <button key={d} onClick={() => iniciarSimulacro("dominio", cantDominio || 50, d, false)} style={{ padding: "10px 16px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
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
                  {obtenerValorBD(preguntasSimulacro[indiceActual], ['pregunta', 'enunciado', 'text', 'question', 'texto', 'descripcion', 'body']) || "[Error: Pregunta no encontrada en la BD]"}
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
                        preguntasSimulacro.forEach((p, idx) => {
                          const respUsr = respuestasUsuario[idx];
                          const respCorr = obtenerValorBD(p, ['respuesta_correcta', 'correcta', 'answer', 'respuesta']);
                          const textoPreguntaFinal = obtenerValorBD(p, ['pregunta', 'enunciado', 'text', 'question', 'descripcion']) || "Pregunta sin texto";
                          const expFinal = obtenerValorBD(p, ['explicacion', 'explanation', 'justificacion']) || "Sin explicación.";

                          const opcionesArray = p.opcionesExtraidas || [];
                          const textoUsr = opcionesArray.find(o => o.key === respUsr)?.texto || "Sin responder";
                          const textoCorr = opcionesArray.find(o => o.key === respCorr)?.texto || "No especificada";

                          if (respUsr === respCorr) {
                            correctas++;
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
                          detalle_errores: erroresDetalle,
                        };
                        
                        try {
                          await dbPost("sesiones_simulacro", nuevoIntento, session.access_token);
                          // Forzar recarga desde BD para asegurar sincronización en Dashboard
                          await cargarHistorial(session.user.id, session.access_token);
                        } catch (err) { 
                          console.error("Aviso: Fallo guardando en remoto.", err); 
                          // Fallback local por si la DB falla
                          setHistorialUsuario(prev => [{...nuevoIntento, created_at: new Date().toISOString(), id: Date.now()}, ...prev]);
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

        {/* 3. GUÍA TEÓRICA ESTRUCTURADA */}
        {vista === "curso" && (
          <div>
            {subtemaActivo === null ? (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Guía Teórica Estructurada</h2>
                <p style={{ color: C.muted, marginBottom: 24 }}>Organizado por dominios oficiales.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                  {DOMINIOS_CURSO.map((dom) => (
                    <div key={dom.id} style={{ background: C.black, padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <h3 style={{ color: C.gold, fontSize: 18, marginBottom: 16 }}>{dom.nombre}</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                        {dom.subtemas.map((subText) => {
                          const idxGlobal = SUBTEMAS_LISTA.findIndex(s => s === subText);
                          const completado = Array.isArray(subtemasCompletados) && subtemasCompletados.includes(idxGlobal);
                          return (
                            <div key={idxGlobal} onClick={() => { setSubtemaActivo(idxGlobal); setPestanaCursoActiva("teoria"); }} style={{ background: C.card, padding: 16, borderRadius: 8, border: `1px solid ${completado ? C.green : C.border}`, cursor: "pointer" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{subText}</span>
                                <span style={{ fontSize: 11, padding: "2px 6px", background: completado ? C.greenD : C.dark, color: completado ? C.green : C.muted, borderRadius: 4 }}>{completado ? "Completado" : "Pendiente"}</span>
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
                <button onClick={() => setSubtemaActivo(null)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", marginBottom: 16 }}>← Volver</button>
                <h2 style={{ fontSize: 22, marginBottom: 16, color: C.gold }}>{SUBTEMAS_LISTA[subtemaActivo]}</h2>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {[["teoria", "Leer Teoría"], ["quiz", "Quiz & Actividad"]].map(([key, label]) => (
                    <button key={key} onClick={() => setPestanaCursoActiva(key)} style={{ padding: "8px 16px", background: pestanaCursoActiva === key ? C.goldD : C.card, border: `1px solid ${pestanaCursoActiva === key ? C.goldB : C.border}`, color: pestanaCursoActiva === key ? C.gold : C.white, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>{label}</button>
                  ))}
                </div>
                {pestanaCursoActiva === "teoria" && (
                  <div style={{ background: C.black, padding: 24, borderRadius: 8, marginBottom: 24 }}>
                    <p style={{ whiteSpace: "pre-wrap" }}>Información reservada para este módulo.</p>
                  </div>
                )}
                {pestanaCursoActiva === "quiz" && (
                  <div style={{ background: C.black, padding: 24, borderRadius: 8 }}>
                    <button onClick={() => {
                      if (Array.isArray(subtemasCompletados) && !subtemasCompletados.includes(subtemaActivo)) {
                        const nuevo = [...subtemasCompletados, subtemaActivo];
                        setSubtemasCompletados(nuevo);
                        localStorage.setItem("sp_subtemas", JSON.stringify(nuevo));
                      }
                      alert("¡Subtema completado!");
                    }} style={{ padding: "12px 24px", background: C.green, border: "none", color: C.black, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Completar Subtema ✓</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. PROGRESO E HISTORIAL */}
        {vista === "progreso" && (
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Historial y Desglose de Rendimiento</h2>
            {historialUsuario.length === 0 ? (
              <p style={{ color: C.muted }}>Aún no tienes simulacros registrados.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {historialUsuario.map((sim, index) => {
                  const notaSim = Number(sim.puntaje_porcentaje || sim.porcentaje || sim.puntaje || 0);
                  return (
                    <div key={sim.id || index} style={{ background: C.dark, padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Simulacro #{historialUsuario.length - index} · Dominio: {sim.dominio || "General"}</div>
                          <div style={{ fontSize: 13, color: C.muted }}>Fecha: {new Date(sim.created_at).toLocaleDateString()} | Preguntas: {sim.total_preguntas || 10}</div>
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

        {/* 5. TUTOR IA */}
        {vista === "tutor" && (
          <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 6 }}>Tutor IA — Práctica Activa</h2>
            <p style={{ color: C.muted, marginBottom: 16, fontSize: 14 }}>Haz clic en un dominio para que el tutor te genere un caso o pregunta de práctica inmediata:</p>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 1 (Assessment) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.gold, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Generar Pregunta D1</button>
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 2 (Design) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.blue, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Generar Pregunta D2</button>
              <button onClick={() => enviarTutorConPrompt("Genérame una pregunta de opción múltiple del Dominio 3 (Implementation) estilo examen PSP.")} style={{ padding: "8px 14px", background: C.card, border: `1px solid ${C.border}`, color: C.purple, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Generar Pregunta D3</button>
            </div>

            <div style={{ height: 380, overflowY: "auto", marginBottom: 20, padding: 16, background: C.black, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
              {(Array.isArray(mensajesTutor) ? mensajesTutor : []).map((m, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: m.role === "user" ? C.card : C.dark, border: `1px solid ${C.border}`, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 6, fontWeight: "bold" }}>{m.role === "user" ? "Tú" : "Tutor PSP"}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={inputTutor || ""} onChange={(e) => setInputTutor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarTutorConPrompt(inputTutor)} placeholder="Escribe tu consulta o pide un caso práctico..." style={{ flex: 1, padding: 12, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 15 }} />
              <button onClick={() => { if (inputTutor.trim()) { enviarTutorConPrompt(inputTutor); setInputTutor(""); } }} disabled={loadingTutor} style={{ padding: "0 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                {loadingTutor ? "Pensando..." : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}