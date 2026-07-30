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
    const { materia, concurso } = await req.json();

    if (!materia || !concurso) {
      return new Response(
        JSON.stringify({ error: "Matéria e concurso são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Você é um especialista em concursos militares brasileiros.

Busque e liste os melhores recursos de estudo para a matéria "${materia}" do concurso "${concurso}".

Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura exata:
{
  "dica": "Uma dica estratégica de 2-3 frases sobre como estudar esta matéria para este concurso específico",
  "professores": [
    {
      "nome": "Nome do Professor",
      "canal": "Nome do Canal",
      "url": "https://youtube.com/...",
      "descricao": "Por que este professor é bom para esta matéria",
      "gratuito": true
    }
  ],
  "materiais_gratuitos": [
    {
      "nome": "Nome do Material",
      "tipo": "PDF/Site/Apostila",
      "url": "https://...",
      "descricao": "O que contém este material"
    }
  ],
  "cursos_pagos": [
    {
      "nome": "Nome do Curso",
      "plataforma": "Nome da Plataforma",
      "url": "https://...",
      "descricao": "Por que este curso é recomendado"
    }
  ]
}

Regras importantes:
- Máximo 3 professores, 3 materiais gratuitos e 2 cursos pagos
- Priorize sempre o conteúdo gratuito
- Use apenas URLs reais e verificadas
- Foque no concurso específico mencionado
- Retorne SOMENTE o JSON, nada mais`
      }],
    });

    const texto = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    const limpo = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(limpo);

    return new Response(
      JSON.stringify({ success: true, data: resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});