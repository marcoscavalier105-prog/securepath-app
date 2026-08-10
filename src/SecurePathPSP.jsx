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

// ─── ESTILOS Y PALETA ────────────────────────────────────────────────────────
const C = {
  black: "#0b1d2a", dark: "#132c3f", card: "#1b3a52",
  border: "rgba(216,232,240,0.12)", gold: "#ff5a1f", goldD: "rgba(255,90,31,0.12)", goldB: "rgba(255,90,31,0.35)",
  white: "#e3edf2", muted: "#7a92a3", green: "#3ddc84", greenD: "rgba(61,220,132,0.10)",
  red: "#ff5c5c", blue: "#5fb8e0", purple: "#9d7aff"
};

const mezclar = (arr) => Array.isArray(arr) ? [...arr].sort(() => Math.random() - 0.5) : [];
const mezclarConOpciones = (ps) => mezclar(ps).map((p) => {
  let ops = p.opciones;
  if (ops && !Array.isArray(ops) && typeof ops === "object") {
    ops = Object.entries(ops).map(([key, texto]) => ({ key, texto }));
  }
  return { ...p, opciones: mezclar(Array.isArray(ops) ? ops : []) };
});

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
  const [modoConfig, setModoConfig] = useState({ tipo: "rapido", cantidad: 10, dominio: 0 });
  const [preguntasSimulacro, setPreguntasSimulacro] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState({});
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [desplegadoSim, setDesplegadoSim] = useState(null);

  // Tutor IA states
  const [mensajesTutor, setMensajesTutor] = useState([
    { role: "assistant", content: "Hola, soy tu tutor experto en la certificación PSP de ASIS International. Selecciona un dominio abajo o escribe tu consulta libre." }
  ]);
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
      setBanco(data || []);
    } catch (err) {
      console.error("Error cargando banco:", err);
    }
  };

  const cargarHistorial = async (userId, token) => {
    try {
      const data = await dbGet("sesiones_simulacro", `select=*&usuario_id=eq.${userId}&order=created_at.desc`, token);
      setHistorialUsuario(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Iniciar Simulacro con verificación robusta
  const iniciarSimulacro = (tipo, cantidad, dominio = 0) => {
    let filtradas = [...banco];
    if (dominio > 0) {
      filtradas = filtradas.filter(p => Number(p.dominio) === Number(dominio));
    }
    // Si el banco cargó vacío, intentamos usar un respaldo o avisar
    if (filtradas.length === 0) {
      filtradas = [...banco]; // fallback a todo el banco si el filtro no devuelve nada
    }
    const seleccionadas = mezclarConOpciones(filtradas).slice(0, cantidad);
    if (seleccionadas.length === 0) {
      alert("No hay preguntas disponibles en la base de datos para iniciar el simulacro.");
      return;
    }
    setModoConfig({ tipo, cantidad, dominio });
    setPreguntasSimulacro(seleccionadas);
    setIndiceActual(0);
    setRespuestasUsuario({});
    setResultadoFinal(null);
    setSimulacroPantalla("activo");
  };

  const enviarTutorConPrompt = async (textoPrompt) => {
    const nuevos = [...mensajesTutor, { role: "user", content: textoPrompt }];
    setMensajesTutor(nuevos);
    setLoadingTutor(true);
    try {
      const res = await fetch("/.netlify/functions/tutor", {
        method: "POST",
        body: JSON.stringify({ messages: nuevos, dominio: 0 }),
      });
      const data = await res.json();
      setMensajesTutor([...nuevos, { role: "assistant", content: data.text }]);
    } catch (err) {
      setMensajesTutor([...nuevos, { role: "assistant", content: "Error de conexión con el tutor." }]);
    }
    setLoadingTutor(false);
  };

  const enviarTutor = async () => {
    if (!inputTutor.trim()) return;
    const txt = inputTutor;
    setInputTutor("");
    await enviarTutorConPrompt(txt);
  };

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 420, background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <h2 style={{ color: C.gold, marginBottom: 8, fontSize: 28, fontWeight: 800 }}>SecurePath <span style={{ color: C.white, fontWeight: 400 }}>PSP</span></h2>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>Plataforma de preparación oficial</p>
          <input type="email" placeholder="Correo electrónico" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 12, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 15 }} />
          <input type="password" placeholder="Contraseña" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 15 }} />
          {authError && <div style={{ color: C.red, marginBottom: 16, fontSize: 13 }}>{authError}</div>}
          <button onClick={handleAuth} style={{ width: "100%", padding: 14, background: C.gold, border: "none", fontWeight: "bold", color: C.white, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>Iniciar sesión</button>
        </div>
      </div>
    );
  }

  const totalSims = historialUsuario.length;
  const promedioGral = totalSims > 0 ? Math.round(historialUsuario.reduce((acc, s) => acc + (s.puntaje_porcentaje || 0), 0) / totalSims) : 0;
  const mejorNota = totalSims > 0 ? Math.max(...historialUsuario.map(s => s.puntaje_porcentaje || 0)) : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "sans-serif", paddingBottom: 40 }}>
      {/* ── NAV HEADER RESPONSIVE ── */}
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
          <button onClick={handleLogout} style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, cursor: "pointer", marginLeft: 8 }}>
            Salir
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "30px auto", padding: "0 20px" }}>
        
        {/* 1. DASHBOARD INICIO */}
        {vista === "dashboard" && (
          <div>
            <div style={{ marginBottom: 30 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Panel Ejecutivo de Preparación</h1>
              <p style={{ color: C.muted, fontSize: 16 }}>Resumen de rendimiento y accesos rápidos para tu certificación PSP®.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 40 }}>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Simulacros Realizados</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.gold }}>{totalSims}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Promedio Global</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.blue }}>{promedioGral}%</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Mejor Nota</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{mejorNota}%</div>
              </div>
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Accesos Rápidos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <button onClick={() => { setVista("simulacro"); setSimulacroPantalla("inicio"); }} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Ir a Simulacros</div>
                <div style={{ fontSize: 13, color: C.muted }}>Práctica rápida (10), estándar (25) o por dominio.</div>
              </button>
              <button onClick={() => setVista("curso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Guía Teórica</div>
                <div style={{ fontSize: 13, color: C.muted }}>Accede a los 20 subtemas oficiales estructurados.</div>
              </button>
              <button onClick={() => setVista("tutor")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.purple, marginBottom: 6 }}>Tutor IA</div>
                <div style={{ fontSize: 13, color: C.muted }}>Genera preguntas guiadas por dominio al instante.</div>
              </button>
              <button onClick={() => setVista("progreso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 6 }}>Ver Progreso</div>
                <div style={{ fontSize: 13, color: C.muted }}>Revisa historial completo y desglose por subtemas.</div>
              </button>
            </div>
          </div>
        )}

        {/* 2. MÓDULO DE SIMULACROS COMPLETO */}
        {vista === "simulacro" && (
          <div>
            {simulacroPantalla === "inicio" && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Módulo de Simulacros</h2>
                <p style={{ color: C.muted, marginBottom: 24 }}>Selecciona el formato de tu práctica para evaluar tus conocimientos bajo estándares ASIS. (Preguntas cargadas: {banco.length})</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <button onClick={() => iniciarSimulacro("rapido", 10, 0)} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Simulacro Rápido</div>
                    <div style={{ fontSize: 13, color: C.muted }}>10 preguntas aleatorias ideales para repasos cortos diarios.</div>
                  </button>
                  <button onClick={() => iniciarSimulacro("estandar", 25, 0)} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Simulacro Estándar</div>
                    <div style={{ fontSize: 13, color: C.muted }}>25 preguntas mezcladas de todos los dominios.</div>
                  </button>
                </div>

                <div style={{ background: C.black, padding: 20, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <h4 style={{ marginBottom: 12, fontSize: 16 }}>Filtrar por Dominio Específico:</h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[[1, "Dominio 1: Assessment"], [2, "Dominio 2: Design"], [3, "Dominio 3: Implementation"]].map(([d, label]) => (
                      <button key={d} onClick={() => iniciarSimulacro("dominio", 15, d)} style={{ padding: "10px 16px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                        {label} (15 preg.)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {simulacroPantalla === "activo" && preguntasSimulacro.length > 0 && !resultadoFinal && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, color: C.muted, fontSize: 14 }}>
                  <span>Pregunta {indiceActual + 1} de {preguntasSimulacro.length}</span>
                  <button onClick={() => setSimulacroPantalla("inicio")} style={{ background: "none", border: "none", color: C.red, cursor: "pointer" }}>Abandonar</button>
                </div>

                <h3 style={{ fontSize: 18, marginBottom: 20, lineHeight: 1.5 }}>{preguntasSimulacro[indiceActual].pregunta}</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  {preguntasSimulacro[indiceActual].opciones.map((op) => {
                    const sel = respuestasUsuario[indiceActual] === op.key;
                    return (
                      <div key={op.key} onClick={() => setRespuestasUsuario({ ...respuestasUsuario, [indiceActual]: op.key })}
                        style={{ padding: 14, background: sel ? C.goldD : C.card, border: `1px solid ${sel ? C.goldB : C.border}`, borderRadius: 8, cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", color: sel ? C.gold : C.muted }}>{op.key})</span>
                        <span style={{ fontSize: 15 }}>{op.texto}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button disabled={indiceActual === 0} onClick={() => setIndiceActual(indiceActual - 1)} style={{ padding: "10px 20px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer" }}>Anterior</button>
                  {indiceActual < preguntasSimulacro.length - 1 ? (
                    <button onClick={() => setIndiceActual(indiceActual + 1)} style={{ padding: "10px 20px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Siguiente</button>
                  ) : (
                    <button onClick={async () => {
                      let correctas = 0;
                      preguntasSimulacro.forEach((p, idx) => {
                        if (respuestasUsuario[idx] === p.respuesta_correcta) correctas++;
                      });
                      const pct = Math.round((correctas / preguntasSimulacro.length) * 100);
                      const payload = { usuario_id: session.user.id, puntaje_porcentaje: pct, total_preguntas: preguntasSimulacro.length, dominio: modoConfig.dominio || 0 };
                      try {
                        await dbPost("sesiones_simulacro", payload, session.access_token);
                        cargarHistorial(session.user.id, session.access_token);
                      } catch {}
                      setResultadoFinal({ correctas, total: preguntasSimulacro.length, pct });
                    }} style={{ padding: "10px 24px", background: C.green, border: "none", color: C.black, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Finalizar y Ver Resultado</button>
                  )}
                </div>
              </div>
            )}

            {resultadoFinal && (
              <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <h2 style={{ fontSize: 28, marginBottom: 10 }}>¡Simulacro Completado!</h2>
                <div style={{ fontSize: 48, fontWeight: 800, color: resultadoFinal.pct >= 80 ? C.green : C.gold, margin: "20px 0" }}>{resultadoFinal.pct}%</div>
                <p style={{ color: C.muted, marginBottom: 24 }}>Acertaste {resultadoFinal.correctas} de {resultadoFinal.total} preguntas.</p>
                <button onClick={() => setSimulacroPantalla("inicio")} style={{ padding: "12px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Volver al Menú de Simulacros</button>
              </div>
            )}
          </div>
        )}

        {/* 3. GUÍA TEÓRICA DE 20 SUBTEMAS */}
        {vista === "curso" && (
          <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Guía Teórica de 20 Subtemas</h2>
            <p style={{ color: C.muted, marginBottom: 24 }}>Bloques autocontenidos diseñados bajo la teoría de carga cognitiva (chunking) para tu preparación.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {[
                "1. Fundamentos de Gestión de Riesgos", "2. Análisis y Evaluación de Activos", "3. Identificación y Análisis de Amenazas", 
                "4. Análisis de Vulnerabilidades", "5. Metodologías de Cuantificación de Riesgos", "6. Principios de Diseño de Seguridad Física", 
                "7. Contramedidas Perimetrales y Barreras", "8. Sistemas de Control de Acceso (PACS)", "9. Sistemas de Detección de Intrusos y Alarmas", 
                "10. Videovigilancia (CCTV) y Analítica", "11. Iluminación y Criterios Visuales", "12. Seguridad de la Información y Ciberseguridad Física",
                "13. Protección de Ejecutivos y Personal", "14. Gestión de Crisis y Continuidad de Negocio", "15. Planificación de Respuesta a Emergencias",
                "16. Investigaciones Corporativas y Entrevistas", "17. Gestión de Contratistas y Proveedores", "18. Auditoría y Cumplimiento Normativo",
                "19. Arquitectura de Seguridad Integrada", "20. Liderazgo y Gestión de Operaciones de Seguridad"
              ].map((subtema, idx) => (
                <div key={idx} style={{ background: C.card, padding: 18, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: C.gold }}>{subtema}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>Conceptos clave, definiciones normativas y reglas críticas para el examen PSP.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. PROGRESO Y DESGLOSE POR SUBTEMAS */}
        {vista === "progreso" && (
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Historial y Desglose de Rendimiento</h2>
            <p style={{ color: C.muted, marginBottom: 30 }}>Analiza tus simulacros pasados y detecta tus brechas teóricas exactas.</p>

            <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 30 }}>
              <h3 style={{ fontSize: 18, marginBottom: 12, color: C.gold }}>Desglose Teórico por Subtemas</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Identifica qué áreas requieren repaso directo en la Guía Teórica.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["D1 - Análisis de Riesgos y Activos", "D1 - Evaluación de Amenazas", "D2 - Contramedidas Físicas y Electrónicas", "D3 - Gestión, Auditoría y Cumplimiento"].map((sub, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, padding: "12px 16px", borderRadius: 8 }}>
                    <span style={{ fontSize: 15 }}>{sub}</span>
                    <span style={{ fontSize: 14, fontWeight: "bold", color: C.blue }}>En consolidación</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Historial de Simulacros Realizados</h3>
            {historialUsuario.length === 0 ? (
              <p style={{ color: C.muted }}>Aún no tienes simulacros registrados.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {historialUsuario.map((sim, index) => (
                  <div key={sim.id || index} style={{ background: C.dark, padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Simulacro #{historialUsuario.length - index} · Dominio: {sim.dominio || "General"}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>Fecha: {new Date(sim.created_at).toLocaleDateString()} | Preguntas: {sim.total_preguntas || 10}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: (sim.puntaje_porcentaje || 0) >= 80 ? C.green : C.gold }}>
                          {sim.puntaje_porcentaje}%
                        </span>
                        <button onClick={() => setDesplegadoSim(desplegadoSim === index ? null : index)}
                          style={{ padding: "6px 12px", background: C.card, border: `1px solid ${C.border}`, color: C.white, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          {desplegadoSim === index ? "Ocultar errores" : "Ver detalle de errores"}
                        </button>
                      </div>
                    </div>

                    {desplegadoSim === index && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                        <h4 style={{ fontSize: 14, color: C.red, marginBottom: 8 }}>Retroalimentación de preguntas fallidas:</h4>
                        <p style={{ fontSize: 13, color: C.muted }}>
                          {sim.detalle_errores ? JSON.stringify(sim.detalle_errores) : "No hay errores registrados en este intento. ¡Excelente ejecución!"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. TUTOR IA CON FORMATO ORDENADO (whiteSpace: pre-wrap) */}
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
              {mensajesTutor.map((m, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: m.role === "user" ? C.card : C.dark, border: `1px solid ${C.border}`, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 6, fontWeight: "bold" }}>{m.role === "user" ? "Tú" : "Tutor PSP"}</div>
                  {/* whiteSpace pre-wrap para respetar los saltos de línea y formateo limpio */}
                  <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={inputTutor} onChange={(e) => setInputTutor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarTutor()} placeholder="Escribe tu consulta o pide un caso práctico..." style={{ flex: 1, padding: 12, background: C.black, color: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 15 }} />
              <button onClick={enviarTutor} disabled={loadingTutor} style={{ padding: "0 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>
                {loadingTutor ? "Pensando..." : "Enviar"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}