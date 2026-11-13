import { useState, useEffect } from "react";

// ─── Conexión Supabase (solo clave anon; todo pasa por RPC con SECURITY DEFINER) ───
const SUPABASE_URL = "https://fhcbaafzccjkbkskreje.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY2JhYWZ6Y2Nqa2Jrc2tyZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDA0MDIsImV4cCI6MjA5NjU3NjQwMn0.R7G1zaDI7yoPuq8ECIt8tWvnVxJZ4JNQWKe7ilJxpk4";

const rpc = async (fn, args = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `HTTP ${res.status}`); }
  return res.json();
};

// Paleta SecurePath
const C = {
  bg: "#0a1a2b", bg2: "#0e2135", card: "#122942", card2: "#16314d", line: "#24405f",
  ink: "#eef4fa", ink2: "#c2d2e2", ink3: "#8fa6bd",
  brand: "#f05a28", brand2: "#d64a1e", ok: "#34c77b", d1: "#4aa3e0", d2: "#9b7cf6", d3: "#34c77b",
};
const WHATSAPP_NUM = "51944116759"; // WhatsApp de atención SecurePath (Marcos)
const URL_PRIVACIDAD = "https://seghum.com/privacidad/";
const URL_SECUREPATH = "https://seghum.com/securepath/";

export default function MiniSimulacro() {
  const [pantalla, setPantalla] = useState("intro"); // intro|quiz|cargando|resultado|lead|done
  const [preguntas, setPreguntas] = useState([]);
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState({}); // pregunta_id -> 'A'|'B'|'C'|'D'
  const [resultado, setResultado] = useState(null);
  const [form, setForm] = useState({ nombre: "", whatsapp: "", correo: "", consent: false });
  const [token, setToken] = useState(null);
  const [explicaciones, setExplicaciones] = useState([]);
  const [primeraExplicacion, setPrimeraExplicacion] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const origen = new URLSearchParams(window.location.search).get("o") ||
                 new URLSearchParams(window.location.search).get("utm_source") || "web";

  const empezar = async () => {
    setPantalla("cargando"); setError("");
    try {
      const data = await rpc("leer_mini_preguntas");
      setPreguntas(data); setIdx(0); setRespuestas({}); setPantalla("quiz");
    } catch { setError("No se pudieron cargar las preguntas. Intenta de nuevo."); setPantalla("intro"); }
  };

  const elegir = (pid, op) => setRespuestas((r) => ({ ...r, [pid]: op }));

  const siguiente = async () => {
    if (idx < preguntas.length - 1) { setIdx(idx + 1); return; }
    // calificar
    setPantalla("cargando");
    try {
      const payload = preguntas.map((p) => ({ pregunta_id: p.pregunta_id, opcion: respuestas[p.pregunta_id] || "" }));
      const res = await rpc("calificar_mini", { respuestas: payload });
      setResultado(res);
      try { const g = await rpc("explicacion_gratis_mini"); if (g && g[0]) setPrimeraExplicacion(g[0]); } catch { /* opcional */ }
      setPantalla("resultado");
    } catch { setError("No se pudo calificar. Intenta de nuevo."); setPantalla("quiz"); }
  };

  const enviarLead = async () => {
    setError("");
    if (!form.nombre.trim()) return setError("Escribe tu nombre.");
    if (form.whatsapp.replace(/\D/g, "").length < 9) return setError("Escribe tu WhatsApp con código de país.");
    if (!form.consent) return setError("Marca la casilla de consentimiento para continuar.");
    setEnviando(true);
    try {
      const r = await rpc("guardar_lead", {
        p_nombre: form.nombre, p_whatsapp: form.whatsapp, p_correo: form.correo || null,
        p_consentimiento: true, p_puntaje_total: resultado.aciertos,
        p_d1: resultado.d1.aciertos, p_d2: resultado.d2.aciertos, p_d3: resultado.d3.aciertos, p_origen: origen,
      });
      setToken(r.token);
      const exp = await rpc("explicaciones_mini", { p_token: r.token });
      setExplicaciones(exp); setPantalla("done");
    } catch (e) { setError(e.message || "No se pudo guardar. Intenta de nuevo."); }
    finally { setEnviando(false); }
  };

  const lectura = (a) => a >= 8 ? "Tienes una base sólida. Con repaso enfocado, estás muy cerca."
    : a >= 5 ? "Tienes buen punto de partida. Hay áreas claras por reforzar."
    : "Estás empezando el camino. Un plan estructurado te va a servir muchísimo.";

  const nivel = (a) => a >= 8 ? { label: "Nivel avanzado", bg: "rgba(52,199,123,.15)", color: C.ok }
    : a >= 5 ? { label: "Nivel intermedio", bg: "rgba(240,166,60,.15)", color: C.warn }
    : { label: "Nivel inicial", bg: "rgba(74,163,224,.15)", color: C.d1 };

  const waLink = resultado
    ? `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(`Hola, hice el mini simulacro y saqué ${resultado.aciertos}/10. Quiero información del grupo del 15 de diciembre.`)}`
    : "#";

  // ─── estilos inline ───
  const S = {
    wrap: { minHeight: "100vh", background: `radial-gradient(1200px 600px at 50% -10%, #11283f 0%, ${C.bg} 60%)`, color: C.ink, fontFamily: '"Segoe UI",system-ui,sans-serif', display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px" },
    inner: { width: "100%", maxWidth: 620 },
    bar: { display: "flex", alignItems: "center", gap: 10, padding: "18px 2px" },
    logo: { fontWeight: 700, fontSize: "1.05rem" },
    pill: { marginLeft: "auto", fontSize: ".72rem", fontWeight: 700, color: C.brand, border: `1px solid ${C.brand2}`, padding: "4px 10px", borderRadius: 20 },
    card: { background: `linear-gradient(180deg,${C.card},${C.bg2})`, border: `1px solid ${C.line}`, borderRadius: 18, padding: "26px 22px", boxShadow: "0 20px 50px -25px rgba(0,0,0,.7)" },
    btn: { width: "100%", cursor: "pointer", border: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "1rem", padding: "15px 24px", borderRadius: 13, background: `linear-gradient(135deg,${C.brand},${C.brand2})`, color: "#1a0a04", boxShadow: `0 10px 24px -10px ${C.brand2}` },
    h1: { fontSize: "1.8rem", lineHeight: 1.15, margin: "10px 0", letterSpacing: "-.02em" },
    opt: (sel) => ({ display: "flex", alignItems: "flex-start", gap: 13, background: sel ? "rgba(240,90,40,.12)" : "#1b3853", border: `1.5px solid ${sel ? C.brand : "#335a7e"}`, borderRadius: 13, padding: "15px 16px", cursor: "pointer", marginBottom: 11, textAlign: "left", width: "100%", color: C.ink, fontFamily: "inherit" }),
    key: (sel) => ({ flex: "none", width: 28, height: 28, borderRadius: 7, background: sel ? C.brand : "#0e2135", border: `1px solid ${sel ? C.brand : "#4a7098"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: sel ? "#1a0a04" : "#cfe0f0" }),
    field: { marginBottom: 14 },
    label: { display: "block", fontSize: ".84rem", color: C.ink2, marginBottom: 6, fontWeight: 600 },
    input: { width: "100%", background: C.bg2, border: `1.5px solid ${C.line}`, borderRadius: 11, padding: "13px 14px", color: C.ink, fontSize: "1rem", fontFamily: "inherit", boxSizing: "border-box" },
    err: { background: "rgba(232,96,76,.12)", border: "1px solid #e8604c", color: "#ffb4a8", borderRadius: 10, padding: "10px 14px", fontSize: ".9rem", margin: "12px 0" },
  };

  const DomBar = ({ nombre, v, t, color }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", marginBottom: 6 }}>
        <span style={{ color: C.ink2 }}>{nombre}</span><b>{v}/{t}</b>
      </div>
      <div style={{ height: 9, background: C.card2, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${t ? (v / t) * 100 : 0}%`, background: color, borderRadius: 8, transition: "width .9s" }} />
      </div>
    </div>
  );

  return (
    <div style={S.wrap}><div style={S.inner}>
      <div style={S.bar}>
        <span style={S.logo}>Secure<span style={{ color: C.brand }}>Path</span></span>
        <span style={S.pill}>100% gratis</span>
      </div>

      {pantalla === "intro" && (
        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <div style={{ color: C.brand, fontWeight: 700, fontSize: ".8rem", letterSpacing: ".14em", textTransform: "uppercase" }}>Mini simulacro de diagnóstico</div>
          <h1 style={S.h1}>¿Qué tan listo estás para la <span style={{ color: C.brand }}>certificación internacional de seguridad</span>?</h1>
          <p style={{ color: C.ink2, maxWidth: 440, margin: "0 auto 22px" }}>10 preguntas reales. Descubre tu punto de partida por área en menos de 10 minutos — sin crear cuenta.</p>
          {error && <div style={S.err}>{error}</div>}
          <button style={S.btn} onClick={empezar}>Empezar el simulacro →</button>
          <div style={{ color: C.ink2, fontSize: ".82rem", marginTop: 12 }}>10 preguntas · menos de 10 min · resultado por área</div>
          <div style={{ color: C.brand, fontSize: ".82rem", fontWeight: 700, marginTop: 8 }}>Grupo del 15 dic. · 10 cupos</div>
          <div style={{ color: C.ink3, fontSize: ".78rem", marginTop: 12 }}>🔒 No pedimos datos para empezar</div>
        </div>
      )}

      {pantalla === "cargando" && (
        <div style={{ ...S.card, textAlign: "center", marginTop: 40 }}>
          <div style={{ width: 38, height: 38, margin: "0 auto 14px", border: `3px solid ${C.line}`, borderTopColor: C.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: C.ink2 }}>Preparando tus preguntas…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {pantalla === "quiz" && preguntas[idx] && (() => {
        const p = preguntas[idx]; const doms = { 1: ["Evaluación", C.d1], 2: ["Diseño", C.d2], 3: ["Implementación", C.d3] };
        const [dn, dc] = doms[p.dominio_id] || ["", C.d1];
        return (
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: ".8rem", color: C.ink2, fontWeight: 600 }}>Pregunta {idx + 1} de {preguntas.length}</span>
              <span style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", padding: "3px 9px", borderRadius: 20, background: dc + "26", color: dc }}>{dn}</span>
            </div>
            <div style={{ height: 7, background: C.card2, borderRadius: 10, overflow: "hidden", margin: "12px 0 22px" }}>
              <div style={{ height: "100%", width: `${((idx + 1) / preguntas.length) * 100}%`, background: `linear-gradient(90deg,${C.brand},${C.brand2})`, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.42, marginBottom: 20, color: "#fff" }}>{p.texto}</div>
            {Object.entries(p.opciones).map(([k, v]) => {
              const sel = respuestas[p.pregunta_id] === k;
              return (
                <button key={k} style={S.opt(sel)} onClick={() => elegir(p.pregunta_id, k)}>
                  <span style={S.key(sel)}>{k}</span><span style={{ paddingTop: 2 }}>{v}</span>
                </button>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
              <button onClick={() => idx > 0 && setIdx(idx - 1)} style={{ background: "none", border: "none", color: C.ink3, cursor: "pointer", fontFamily: "inherit", fontSize: ".88rem", visibility: idx === 0 ? "hidden" : "visible" }}>← Anterior</button>
              <button onClick={siguiente} disabled={!respuestas[p.pregunta_id]} style={{ ...S.btn, width: "auto", padding: "11px 20px", fontSize: ".92rem", opacity: respuestas[p.pregunta_id] ? 1 : 0.5 }}>
                {idx === preguntas.length - 1 ? "Ver mi resultado →" : "Siguiente →"}
              </button>
            </div>
          </div>
        );
      })()}

      {pantalla === "resultado" && resultado && (
        <div style={S.card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", fontWeight: 800, color: C.brand }}>{resultado.aciertos}<span style={{ fontSize: "1.2rem", color: C.ink3 }}>/{resultado.total}</span></div>
            <div style={{ display: "inline-block", margin: "6px 0 4px", padding: "4px 14px", borderRadius: 20, background: nivel(resultado.aciertos).bg, color: nivel(resultado.aciertos).color, fontWeight: 700, fontSize: ".82rem" }}>{nivel(resultado.aciertos).label}</div>
            <div style={{ color: C.ink2, margin: "8px 0 22px" }}>{lectura(resultado.aciertos)}</div>
          </div>
          {resultado.d1.total > 0 && <DomBar nombre="Evaluación" v={resultado.d1.aciertos} t={resultado.d1.total} color={C.d1} />}
          {resultado.d2.total > 0 && <DomBar nombre="Diseño" v={resultado.d2.aciertos} t={resultado.d2.total} color={C.d2} />}
          {resultado.d3.total > 0 && <DomBar nombre="Implementación" v={resultado.d3.aciertos} t={resultado.d3.total} color={C.d3} />}
          {primeraExplicacion && (
            <div style={{ background: "rgba(52,199,123,.08)", border: `1px solid ${C.ok}`, borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
              <div style={{ color: C.ok, fontWeight: 700, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Una explicación de regalo</div>
              <div style={{ fontSize: ".9rem", color: C.ink2 }}><b style={{ color: C.ink }}>{primeraExplicacion.pregunta}</b> — Respuesta correcta: {primeraExplicacion.correcta}. {primeraExplicacion.explicacion}</div>
            </div>
          )}
          <div style={{ textAlign: "center", margin: "20px 0 8px" }}>
            <div style={{ color: C.brand, fontWeight: 700, fontSize: ".8rem", letterSpacing: ".1em", textTransform: "uppercase" }}>Así enseñamos adentro</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0" }}>Mira un ejemplo de clase</div>
            <div style={{ aspectRatio: "16/9", borderRadius: 14, border: `1px solid ${C.line}`, background: "linear-gradient(135deg,#143050,#0c1a2a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,.95)", display: "flex", alignItems: "center", justifyContent: "center", color: C.bg, fontSize: "1.4rem" }}>▶</div>
            </div>
          </div>
          <div style={{ textAlign: "center", color: C.ink3, fontSize: ".85rem", borderTop: `1px dashed ${C.line}`, paddingTop: 14, marginTop: 10 }}>Para ver <b style={{ color: C.ink2 }}>en qué fallaste</b> y recibir un plan, deja tu contacto 👇</div>
          <button style={{ ...S.btn, marginTop: 16 }} onClick={() => { setError(""); setPantalla("lead"); }}>Ver mis errores y mi plan →</button>
        </div>
      )}

      {pantalla === "lead" && (
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.35rem", marginBottom: 8 }}>Casi listo 🔓</h2>
            <p style={{ color: C.ink2, fontSize: ".95rem" }}>Déjanos dónde escribirte y te mostramos las explicaciones + un plan.</p>
          </div>
          {error && <div style={S.err}>{error}</div>}
          <div style={S.field}><label style={S.label}>Nombre</label>
            <input style={S.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" /></div>
          <div style={S.field}><label style={S.label}>WhatsApp</label>
            <input style={S.input} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="51 9XX XXX XXX" />
            <div style={{ fontSize: ".76rem", color: C.ink3, marginTop: 5 }}>Con código de país (51).</div></div>
          <div style={S.field}><label style={S.label}>Correo <span style={{ color: C.ink3, fontWeight: 400 }}>(opcional)</span></label>
            <input style={S.input} value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="tucorreo@ejemplo.com" /></div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 11, background: C.card2, border: `1px solid ${C.line}`, borderRadius: 11, padding: "13px 14px", margin: "6px 0 18px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} style={{ marginTop: 3, width: 18, height: 18, accentColor: C.brand }} />
            <span style={{ fontSize: ".84rem", color: C.ink2 }}>Acepto que SecurePath me contacte sobre el programa y acepto la <a href={URL_PRIVACIDAD} target="_blank" rel="noreferrer" style={{ color: C.brand }}>política de privacidad</a>.</span>
          </label>
          <button style={{ ...S.btn, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={enviarLead}>{enviando ? "Enviando…" : "Ver mis explicaciones →"}</button>
        </div>
      )}

      {pantalla === "done" && (
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: "2.4rem" }}>✅</div>
            <h2 style={{ fontSize: "1.3rem", margin: "8px 0" }}>¡Listo, {form.nombre.split(" ")[0]}!</h2>
            <p style={{ color: C.ink2 }}>Estas son las explicaciones de tu simulacro.</p>
          </div>
          {preguntas.map((p, i) => {
            const exp = explicaciones.find((e) => e.pregunta_id === p.pregunta_id);
            const miResp = respuestas[p.pregunta_id];
            const ok = exp && miResp === exp.correcta;
            return (
              <div key={p.pregunta_id} style={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "15px 16px", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: ".94rem", marginBottom: 8 }}>{i + 1}. {p.texto}</div>
                <div style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: 6, color: ok ? C.ok : "#e8604c" }}>{ok ? "✓ Correcta" : "✗ Revisar"}</div>
                {exp && <div style={{ fontSize: ".88rem", color: C.ink2 }}><b style={{ color: C.ink }}>Respuesta: {exp.correcta}.</b> {exp.explicacion}</div>}
              </div>
            );
          })}
          <a href={waLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", background: "#25D366", color: "#06351c", fontWeight: 700, padding: "15px", borderRadius: 13, marginTop: 8 }}>
            Escribir por WhatsApp sobre el grupo del 1 de diciembre
          </a>
          <div style={{ textAlign: "center", marginTop: 16 }}><a href={URL_SECUREPATH} style={{ color: C.ink3, fontSize: ".85rem" }}>Conoce SecurePath →</a></div>
        </div>
      )}
    </div></div>
  );
}
