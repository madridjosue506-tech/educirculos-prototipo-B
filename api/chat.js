// api/chat.js

// Esta es una función serverless que se ejecutará en un entorno de Node.js (como Vercel).
// Se encarga de recibir la pregunta del usuario, añadir de forma segura la clave API de Gemini,
// y devolver la respuesta del modelo de IA.

export default async function handler(request, response) {
  console.log("[LOG] Iniciando la función de chat...");
  
  // Solo permitir peticiones POST
  if (request.method !== 'POST') {
    console.error("[ERROR] Método no permitido. Se recibió:", request.method);
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = request.body;
    console.log("[LOG] Prompt recibido del cliente:", prompt);

    if (!prompt) {
      console.error("[ERROR] No se recibió ningún prompt en la petición.");
      return response.status(400).json({ error: 'Prompt is required' });
    }

    // Obtener la clave API desde las variables de entorno del servidor
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[ERROR CRÍTICO] La variable de entorno GEMINI_API_KEY no fue encontrada en el servidor.");
        return response.status(500).json({ error: 'La configuración del servidor está incompleta.' });
    } else {
        console.log("[LOG] Clave API encontrada. Longitud:", apiKey.length, "(Esto confirma que la clave se está leyendo).");
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ 
            parts: [{ 
                text: `Responde a la siguiente pregunta de un estudiante de forma concisa y amigable, como un tutor experto. La pregunta es: "${prompt}"` 
            }] 
        }]
    };

    console.log("[LOG] Enviando petición a la API de Gemini...");
    // Hacer la llamada a la API de Gemini desde el servidor
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
        // Si la respuesta no es exitosa (ej. error 400, 403, 500)
        const errorBody = await geminiResponse.text();
        console.error(`[ERROR] La API de Gemini respondió con un error ${geminiResponse.status}.`);
        console.error("[ERROR] Cuerpo de la respuesta de error de Gemini:", errorBody);
        return response.status(geminiResponse.status).json({ error: 'Error al comunicarse con el asistente de IA.' });
    }

    const result = await geminiResponse.json();
    
    if (!result.candidates || result.candidates.length === 0) {
        console.error("[ERROR] La API de Gemini respondió exitosamente pero sin candidatos de respuesta.", result);
        return response.status(500).json({ error: 'El asistente de IA no pudo generar una respuesta.' });
    }

    const aiText = result.candidates[0].content.parts[0].text;
    console.log("[LOG] Respuesta de IA recibida y enviada al cliente.");

    // Enviar la respuesta de vuelta al cliente (tu archivo index.html)
    return response.status(200).json({ response: aiText });

  } catch (error) {
    console.error('[ERROR INESPERADO] Ocurrió una excepción en la función serverless:', error);
    return response.status(500).json({ error: 'Ha ocurrido un error interno en el servidor.' });
  }
}

