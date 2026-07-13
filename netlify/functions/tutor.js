exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
  
    try {
      const { messages, dominio } = JSON.parse(event.body);
  
      const systemPrompt = "Eres un tutor experto en la certificacion PSP de ASIS International. Ayudas a candidatos a prepararse para el examen PSP en espanol." +
        " El examen tiene 3 dominios: D1 Assessment (amenazas, vulnerabilidades, riesgo), D2 Design (contramedidas fisicas y electronicas), D3 Implementation (gestion, auditoria, cumplimiento)." +
        " Cuando el usuario pida una pregunta: genera una pregunta de opcion multiple (A, B, C, D) estilo Prometric, espera su respuesta, luego explica la correcta y por que las otras son incorrectas." +
        " Cuando el usuario haga una pregunta libre, responde con ejemplos practicos. Cita referencias ASIS cuando sea posible. Responde SIEMPRE en espanol." +
        (dominio > 0 ? " Enfocate en el Dominio " + dominio + " del examen PSP." : "");
  
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
  