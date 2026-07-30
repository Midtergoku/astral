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
    const { materia, concurso, quantidade, tipo } = await req.json();

    if (!materia || !concurso || !quantidade) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios: materia, concurso, quantidade" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tipoInstrucao = tipo === "certo_errado"
      ? `Gere questões do tipo CERTO ou ERRADO (verdadeiro/falso), com uma afirmação que pode ser verdadeira ou falsa.`
      : tipo === "multipla_escolha"
      ? `Gere questões de MÚLTIPLA ESCOLHA com 4 alternativas (A, B, C, D), apenas uma correta.`
      : `Misture os dois tipos: metade MÚLTIPLA ESCOLHA (4 alternativas A, B, C, D) e metade CERTO ou ERRADO. Varie a ordem.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Você é um especialista em elaboração de questões para concursos militares brasileiros, com profundo conhecimento no estilo das bancas examinadoras.

Gere ${quantidade} questões sobre "${materia}" no estilo do concurso "${concurso}".

${tipoInstrucao}

Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura exata:
{
  "questoes": [
    {
      "id": 1,
      "tipo": "multipla_escolha",
      "enunciado": "Texto da questão aqui...",
      "alternativas": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "resposta_correta": "A",
      "explicacao": "Explicação detalhada do porquê a resposta está correta e as outras erradas",
      "referencia": "Tópico ou assunto específico dentro de ${materia} que esta questão aborda"
    },
    {
      "id": 2,
      "tipo": "certo_errado",
      "enunciado": "Afirmação que pode ser certa ou errada...",
      "alternativas": ["Certo", "Errado"],
      "resposta_correta": "Certo",
      "explicacao": "Explicação detalhada do porquê a afirmação é correta ou errada",
      "referencia": "Tópico específico abordado"
    }
  ]
}

Regras importantes:
- Questões no nível de dificuldade real do concurso ${concurso}
- Linguagem formal e técnica como nas provas reais
- Explicações claras e didáticas
- Referências específicas ao conteúdo programático
- Para múltipla escolha: alternativas plausíveis mas apenas uma correta
- Para certo/errado: afirmações precisas, sem ambiguidade
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