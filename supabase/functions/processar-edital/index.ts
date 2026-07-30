import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF não enviado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: `Você é um especialista em concursos militares brasileiros. Analise este edital e retorne APENAS um JSON válido (sem markdown, sem backticks, sem texto extra) com esta estrutura exata:
{
  "concurso": "nome do concurso",
  "dataProva": "data no formato DD/MM/AAAA ou null",
  "materias": [
    { "nome": "Nome da Matéria", "questoes": 10, "peso": 12.5 }
  ]
}

Regras:
- Extraia TODAS as matérias/disciplinas da prova objetiva
- "questoes" é o número de questões de cada matéria (se não informado, use 10)
- "peso" é o percentual de cada matéria (questoes / total * 100)
- Ordene do maior para o menor peso
- Retorne SOMENTE o JSON, nada mais`,
          },
        ],
      }],
    });

    const texto = message.content[0].type === "text" ? message.content[0].text : "";
    const limpo = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(limpo);

    return new Response(
      JSON.stringify({ success: true, data: resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});