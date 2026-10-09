-- ============================================================================
-- TEXTOS LEGAIS DE 09/10/2026 (auditoria LGL-05/LGL-06, roadmap 3.18)
--
-- A Politica e os Termos foram postos em dia com o que o Astral faz hoje:
-- Google como operador (entrar com Google), os registros que o sistema faz
-- (aceite, origem, etapas, uso de IA, erros, IP embaralhado por 2 dias), o
-- que FICA depois da exclusao (erros sem vinculo ate 12 meses, auditoria sem
-- e-mail/nome, a leitura do edital sem vinculo, as copias de seguranca), e a
-- mudanca relevante avisada NA TELA (o e-mail ainda nao chega -- SEG-02).
--
-- Mudou a data no topo dos dois -> muda aqui. Quem aceitou a versao de 03/10
-- ve a tela de aceite uma vez, na proxima entrada (consentimento.js). O
-- testa-consentimento falha se a data da pagina e a daqui divergirem.
-- ============================================================================
create or replace function public.versoes_vigentes()
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'termos',   '2026-10-09',     -- termos.html, "Ultima atualizacao: 9 de outubro de 2026"
    'politica', '2026-10-09'      -- privacidade.html, "Ultima atualizacao: 9 de outubro de 2026"
  );
$$;
