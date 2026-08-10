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

// ─── PALETA DE COLORES Y ESTILOS ──────────────────────────────────────────────
const C = {
  black: "#0b1d2a", dark: "#132c3f", card: "#1b3a52",
  border: "rgba(216,232,240,0.12)", gold: "#ff5a1f", goldD: "rgba(255,90,31,0.12)", goldB: "rgba(255,90,31,0.35)",
  white: "#e3edf2", muted: "#7a92a3", green: "#3ddc84", greenD: "rgba(61,220,132,0.10)",
  red: "#ff5c5c", redD: "rgba(255,92,92,0.08)", blue: "#5fb8e0", purple: "#9d7aff"
};

export default function SecurePathPSP() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [vista, setVista] = useState("dashboard");
  const [historial, setHistorial] = useState([]);
  const [desplegadoSim, setDesplegadoSim] = useState(null);

  // Tutor IA states
  const [mensajesTutor, setMensajesTutor] = useState([
    { role: "assistant", content: "Hola, soy tu tutor experto en la certificación PSP de ASIS International. ¿Qué dominio o concepto deseas practicar hoy?" }
  ]);
  const [inputTutor, setInputTutor] = useState("");
  const [loadingTutor, setLoadingTutor] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sp_session") || "null");
      if (stored?.access_token) {
        setSession(stored);
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

  const cargarHistorial = async (userId, token) => {
    try {
      const data = await dbGet("sesiones_simulacro", `select=*&usuario_id=eq.${userId}&order=created_at.desc`, token);
      setHistorial(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const enviarTutor = async () => {
    if (!inputTutor.trim()) return;
    setLoadingTutor(true);
    const nuevos = [...mensajesTutor, { role: "user", content: inputTutor }];
    setMensajesTutor(nuevos);
    setInputTutor("");
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

  // Métricas globales para el Dashboard
  const totalSimulacros = historial.length;
  const promedioGlobal = totalSimulacros > 0 ? Math.round(historial.reduce((acc, s) => acc + (s.puntaje_porcentaje || 0), 0) / totalSimulacros) : 0;
  const mejorNota = totalSimulacros > 0 ? Math.max(...historial.map(s => s.puntaje_porcentaje || 0)) : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "sans-serif", paddingBottom: 40 }}>
      {/* ── NAV HEADER RESPONSIVE ── */}
      <nav style={{ background: C.dark, borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 12 }}>
        <span onClick={() => setVista("dashboard")} style={{ fontFamily: "sans-serif", fontSize: 20, fontWeight: 800, color: C.gold, cursor: "pointer" }}>
          Secure<span style={{ color: C.white, fontWeight: 400 }}>Path</span>
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {[["dashboard", "Inicio"], ["simulacro", "Simulacro"], ["curso", "Curso"], ["progreso", "Progreso"], ["tutor", "Tutor IA"]].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)}
              style={{ padding: "8px 14px", background: vista === v ? C.goldD : "transparent", border: `1px solid ${vista === v ? C.goldB : "transparent"}`, color: vista === v ? C.gold : C.muted, borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
              {l}
            </button>
          ))}
          <button onClick={handleLogout} style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, fontSize: 14, cursor: "pointer", marginLeft: 8 }}>
            Salir
          </button>
        </div>
      </nav>

      {/* ── CONTENEDOR PRINCIPAL FLUIDO ── */}
      <div style={{ maxWidth: 1200, margin: "30px auto", padding: "0 20px" }}>
        
        {/* 1. VISTA DASHBOARD (INICIO) */}
        {vista === "dashboard" && (
          <div>
            <div style={{ marginBottom: 30 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Panel Ejecutivo de Preparación</h1>
              <p style={{ color: C.muted, fontSize: 16 }}>Resumen de rendimiento y accesos rápidos para tu certificación PSP®.</p>
            </div>

            {/* Tarjetas de Métricas (Informativas, sin aspecto de botón) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 40 }}>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Simulacros Realizados</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.gold }}>{totalSimulacros}</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Promedio Global</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.blue }}>{promedioGlobal}%</div>
              </div>
              <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Mejor Nota</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{mejorNota}%</div>
              </div>
            </div>

            {/* Accesos Rápidos (Acciones claras) */}
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Accesos Rápidos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <button onClick={() => setVista("simulacro")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Ir a Simulacros</div>
                <div style={{ fontSize: 13, color: C.muted }}>Practica con preguntas cronometradas por dominio.</div>
              </button>
              <button onClick={() => setVista("curso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Guía Teórica</div>
                <div style={{ fontSize: 13, color: C.muted }}>Revisa los 20 subtemas en bloques estructurados.</div>
              </button>
              <button onClick={() => setVista("tutor")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.purple, marginBottom: 6 }}>Tutor IA</div>
                <div style={{ fontSize: 13, color: C.muted }}>Resuelve dudas y genera práctica guiada al instante.</div>
              </button>
              <button onClick={() => setVista("progreso")} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.white }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 6 }}>Ver Progreso</div>
                <div style={{ fontSize: 13, color: C.muted }}>Analiza tus estadísticas y desglose por subtemas.</div>
              </button>
            </div>
          </div>
        )}

        {/* 2. VISTA PROGRESO Y DESGLOSE POR SUBTEMAS */}
        {vista === "progreso" && (
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Historial y Desglose de Rendimiento</h2>
            <p style={{ color: C.muted, marginBottom: 30 }}>Revisa tus simulacros pasados y analiza tus áreas de mejora detalladas.</p>

            <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 30 }}>
              <h3 style={{ fontSize: 18, marginBottom: 16, color: C.gold }}>Desglose Teórico por Subtemas</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Basado en tus respuestas, aquí puedes identificar qué subtemas específicos requieren mayor repaso en la Guía Teórica.</p>
              {/* Bloque resumido de subtemas clave */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["D1 - Análisis de Riesgos y Activos", "D1 - Evaluación de Amenazas", "D2 - Contramedidas Físicas", "D3 - Gestión y Cumplimiento"].map((sub, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, padding: "12px 16px", borderRadius: 8 }}>
                    <span style={{ fontSize: 15 }}>{sub}</span>
                    <span style={{ fontSize: 14, fontWeight: "bold", color: C.blue }}>Estado: En consolidación</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Historial de Simulacros Realizados</h3>
            {historial.length === 0 ? (
              <p style={{ color: C.muted }}>Aún no tienes simulacros registrados.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {historial.map((sim, index) => (
                  <div key={sim.id || index} style={{ background: C.dark, padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Simulacro #{historial.length - index} · Dominio: {sim.dominio || "General"}</div>
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

                    {/* Menú desplegable para ver errores (Acordeón) */}
                    {desplegadoSim === index && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                        <h4 style={{ fontSize: 14, color: C.red, marginBottom: 8 }}>Retroalimentación de preguntas fallidas:</h4>
                        <p style={{ fontSize: 13, color: C.muted }}>
                          {sim.detalle_errores ? JSON.stringify(sim.detalle_errores) : "No hay errores registrados en este intento o la sesión se completó de forma perfecta. ¡Excelente trabajo!"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. VISTA TUTOR IA */}
        {vista === "tutor" && (
          <div style={{ background: C.dark, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 6 }}>Tutor IA — Práctica Activa</h2>
            <p style={{ color: C.muted, marginBottom: 20, fontSize: 14 }}>Consulta tus dudas o pídele al tutor que te genere preguntas tipo examen con explicación inmediata.</p>
            
            <div style={{ height: 400, overflowY: "auto", marginBottom: 20, padding: 12, background: C.black, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
              {mensajesTutor.map((m, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: m.role === "user" ? C.card : C.dark, border: `1px solid ${C.border}`, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 4, fontWeight: "bold" }}>{m.role === "user" ? "Tú" : "Tutor PSP"}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.4 }}>{m.content}</div>
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

        {/* 4. VISTA SIMULACRO Y CURSO (Placeholders funcionales) */}
        {vista === "simulacro" && (
          <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Módulo de Simulacros</h2>
            <p style={{ color: C.muted, marginBottom: 20 }}>Selecciona un dominio para iniciar tu práctica cronometrada bajo condiciones del examen real.</p>
            <button onClick={() => alert("Simulacro iniciado")} style={{ padding: "12px 24px", background: C.gold, border: "none", color: C.white, fontWeight: "bold", borderRadius: 6, cursor: "pointer" }}>Comenzar Simulacro Rápido (10 preguntas)</button>
          </div>
        )}

        {vista === "curso" && (
          <div style={{ background: C.dark, padding: 30, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Guía Teórica de 20 Subtemas</h2>
            <p style={{ color: C.muted, marginBottom: 20 }}>Accede a los bloques de estudio estructurados para optimizar tu carga cognitiva.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {["Dominio 1: Physical Security Assessment", "Dominio 2: Application & Design", "Dominio 3: Implementation"].map((dom, i) => (
                <div key={i} style={{ background: C.card, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{dom}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>Subtemas listos para lectura rápida.</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}