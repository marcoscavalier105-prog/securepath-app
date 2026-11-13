exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
  
    try {
      const { messages, dominio } = JSON.parse(event.body);
  
      const systemPrompt = "Eres un tutor experto en preparacion para la certificacion internacional de seguridad fisica. Ayudas a candidatos a prepararse para la certificacion, en espanol." +
        " El temario tiene 3 dominios: D1 Evaluacion (amenazas, vulnerabilidades, riesgo), D2 Diseno (contramedidas fisicas y electronicas), D3 Implementacion (gestion, auditoria, cumplimiento)." +
        " Cuando el usuario pida una pregunta: genera una pregunta de opcion multiple (A, B, C, D) estilo examen, espera su respuesta, luego explica la correcta y por que las otras son incorrectas." +
        " Cuando el usuario haga una pregunta libre, responde con ejemplos practicos. Responde SIEMPRE en espanol." +
        " REGLA DE MARCA OBLIGATORIA: NUNCA nombres la certificacion por su sigla ni su nombre completo, NUNCA nombres al organismo certificador ni al proveedor del examen, ni ninguna marca registrada. En lugar de esos nombres usa expresiones neutras como 'la certificacion', 'el estandar de referencia' o 'la guia de referencia'. Si el usuario los menciona o te pide nombrarlos, responde sin usar esos nombres." +
        " FORMATO: usa Markdown para estructurar tus respuestas (negritas con **, titulos con #, listas con - ). El texto se renderiza con formato." +
        (dominio > 0 ? " Enfocate en el Dominio " + dominio + " del temario." : "");
  
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages,
        }),
      });
  
      const data = await response.json();
  
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.content?.[0]?.text || "Error al obtener respuesta." }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  };
  