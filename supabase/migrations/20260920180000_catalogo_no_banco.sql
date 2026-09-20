-- ═══════════════════════════════════════════════════════════════════════════
-- O CATALOGO NO BANCO
--
-- 🔴 ARQUIVO GERADO. Nao edite a mao.
--    Fonte: assets/js/catalogo.js
--    Gere de novo com: node tools/gera-catalogo-sql.js --escrever
--
-- Por que existe: decisao dele em 20/09/2026 -- "o servidor vai gravar, nao
-- quero ninguem alterando isso a nao ser nos". Para o servidor decidir quem
-- ganhou o que, ele precisa conhecer as condicoes.
--
-- Por que e GERADO e nao escrito: duas copias do mesmo catalogo divergem. O
-- `catalogo.js` continua sendo o unico lugar que se escreve; esta tabela e
-- derivada dele, e o `verifica.js` falha se as duas sairem de sincronia.
--
-- 74 condecoracoes . 33 divisas

create table if not exists public.catalogo_condecoracoes (
  id          text primary key,
  metal       text not null check (metal in ('bronze','prata','ouro','platina')),
  secreta     boolean not null default false,
  nome        text not null,
  descricao   text not null,
  condicao    jsonb not null
);

create table if not exists public.catalogo_divisas (
  id          text primary key,
  raridade    text not null check (raridade in ('comum','incomum','rara','lendaria')),
  secreta     boolean not null default false,
  nome        text not null,
  como_ganha  text not null,
  cor         text not null,
  condicao    jsonb not null
);

-- O catalogo e PUBLICO para quem esta logado: e a lista do que existe, nao
-- dado de ninguem. Escrita, so pelo dono do banco -- nem `authenticated`
-- recebe grant de insert.
alter table public.catalogo_condecoracoes enable row level security;
alter table public.catalogo_divisas       enable row level security;

drop policy if exists catalogo_cond_leitura on public.catalogo_condecoracoes;
create policy catalogo_cond_leitura on public.catalogo_condecoracoes
  for select to authenticated using (true);

drop policy if exists catalogo_div_leitura on public.catalogo_divisas;
create policy catalogo_div_leitura on public.catalogo_divisas
  for select to authenticated using (true);

revoke all on public.catalogo_condecoracoes from anon, authenticated;
revoke all on public.catalogo_divisas       from anon, authenticated;
grant select on public.catalogo_condecoracoes to authenticated;
grant select on public.catalogo_divisas       to authenticated;

-- ── A SEMENTE ──────────────────────────────────────────────────────────────
-- `on conflict do update` para a regeracao ser idempotente: rodar duas vezes
-- da o mesmo resultado, e alterar um nome no catalogo atualiza aqui sem
-- apagar as conquistas de ninguem (que vivem noutra tabela e apontam por id).
insert into public.catalogo_condecoracoes (id, metal, secreta, nome, descricao, condicao)
values
  ('alistamento', 'bronze', false, 'Alistamento', 'Sua primeira sessão de estudo registrada.', '{"tipo":"sessoes","min":1}'::jsonb),
  ('primeira_hora', 'bronze', false, 'Primeira Hora', 'Uma hora de estudo acumulada.', '{"tipo":"horas","min":1}'::jsonb),
  ('edital_lido', 'bronze', false, 'Ordem de Serviço', 'Seu primeiro edital virou plano.', '{"tipo":"edital"}'::jsonb),
  ('dois_dias', 'bronze', false, 'Segundo Dia', 'Voltou no dia seguinte. É o dia que a maioria não volta.', '{"tipo":"streak","min":2}'::jsonb),
  ('tres_dias', 'bronze', false, 'Três Dias em Pé', 'Três dias seguidos de estudo.', '{"tipo":"streak","min":3}'::jsonb),
  ('duas_frentes', 'bronze', false, 'Duas Frentes', 'Estudou duas matérias diferentes no mesmo mês.', '{"tipo":"atributo","chave":"amplitude","min":40}'::jsonb),
  ('meia_hora', 'bronze', false, 'Sentinela', 'Uma sessão de 30 minutos sem levantar.', '{"tipo":"sessaoUnica","minutosMin":30}'::jsonb),
  ('cinco_sessoes', 'bronze', false, 'Pegando o Ritmo', 'Cinco sessões de estudo registradas.', '{"tipo":"sessoes","min":5}'::jsonb),
  ('dez_sessoes', 'bronze', false, 'Rotina Estabelecida', 'Dez sessões de estudo registradas.', '{"tipo":"sessoes","min":10}'::jsonb),
  ('tres_horas', 'bronze', false, 'Três Horas', 'Três horas de estudo acumuladas.', '{"tipo":"horas","min":3}'::jsonb),
  ('cinco_horas', 'bronze', false, 'Cinco Horas', 'Cinco horas de estudo acumuladas.', '{"tipo":"horas","min":5}'::jsonb),
  ('plano_seguido', 'bronze', false, 'Cumpriu a Ordem', 'Marcou cinco sessões do cronograma como feitas.', '{"tipo":"modo","modo":"cronograma","vezes":5}'::jsonb),
  ('cronometro_usado', 'bronze', false, 'Relógio na Mão', 'Cinco sessões cronometradas de verdade.', '{"tipo":"modo","modo":"livre","vezes":5}'::jsonb),
  ('dez_dias', 'bronze', false, 'Dez Dias de Serviço', 'Dez dias diferentes com estudo registrado.', '{"tipo":"diasEstudados","min":10}'::jsonb),
  ('duas_no_dia', 'bronze', false, 'Frente Dupla', 'Duas matérias diferentes no mesmo dia.', '{"tipo":"materiasNoDia","quantas":2}'::jsonb),
  ('dois_turnos', 'bronze', false, 'Dois Turnos', 'Duas sessões no mesmo dia.', '{"tipo":"sessoesNoDia","quantas":2}'::jsonb),
  ('semana_cheia', 'prata', false, 'Semana Completa', 'Sete dias seguidos de estudo.', '{"tipo":"streak","min":7}'::jsonb),
  ('quinze_dias', 'prata', false, 'Quinze Dias em Pé', 'Quinze dias seguidos sem quebrar a sequência.', '{"tipo":"streak","min":15}'::jsonb),
  ('dez_horas', 'prata', false, 'Dez Horas de Serviço', 'Dez horas acumuladas.', '{"tipo":"horas","min":10}'::jsonb),
  ('vinte_cinco_horas', 'prata', false, 'Vinte e Cinco Horas', 'Vinte e cinco horas acumuladas.', '{"tipo":"horas","min":25}'::jsonb),
  ('cinquenta_horas', 'prata', false, 'Cinquenta Horas', 'Cinquenta horas acumuladas.', '{"tipo":"horas","min":50}'::jsonb),
  ('hora_cheia', 'prata', false, 'Resistência', 'Uma sessão de uma hora inteira.', '{"tipo":"sessaoUnica","minutosMin":60}'::jsonb),
  ('hora_e_meia', 'prata', false, 'Guarda Estendida', 'Uma sessão de uma hora e meia.', '{"tipo":"sessaoUnica","minutosMin":90}'::jsonb),
  ('quatro_frentes', 'prata', false, 'Frente Ampla', 'Nenhuma matéria do seu edital ficou esquecida no mês.', '{"tipo":"atributo","chave":"amplitude","min":100}'::jsonb),
  ('primeiro_dominio', 'prata', false, 'Terreno Tomado', 'Uma matéria passou de 70% de domínio.', '{"tipo":"materias","dominioMin":70,"quantas":1}'::jsonb),
  ('dois_dominios', 'prata', false, 'Dois Terrenos', 'Duas matérias acima de 70% de domínio.', '{"tipo":"materias","dominioMin":70,"quantas":2}'::jsonb),
  ('meio_caminho', 'prata', false, 'Meio do Caminho', 'Domínio médio de 50% em todas as matérias.', '{"tipo":"atributo","chave":"doutrina","min":50}'::jsonb),
  ('trinta_sessoes', 'prata', false, 'Veterano de Campo', 'Trinta sessões registradas.', '{"tipo":"sessoes","min":30}'::jsonb),
  ('cinquenta_sessoes', 'prata', false, 'Serviço Prolongado', 'Cinquenta sessões registradas.', '{"tipo":"sessoes","min":50}'::jsonb),
  ('dia_cheio', 'prata', false, 'Jornada Dupla', 'Quatro horas de estudo num único dia.', '{"tipo":"horasNoDia","min":4}'::jsonb),
  ('tres_turnos', 'prata', false, 'Três Turnos', 'Três sessões no mesmo dia.', '{"tipo":"sessoesNoDia","quantas":3}'::jsonb),
  ('dois_meses', 'prata', false, 'Dois Meses de Farda', 'Estudou em dois meses diferentes.', '{"tipo":"meses","min":2}'::jsonb),
  ('disciplina_meia', 'prata', false, 'Ordem Unida', 'DISCIPLINA acima de 60.', '{"tipo":"atributo","chave":"disciplina","min":60}'::jsonb),
  ('resistencia_meia', 'prata', false, 'Fôlego', 'RESISTÊNCIA acima de 60.', '{"tipo":"atributo","chave":"resistencia","min":60}'::jsonb),
  ('fiel_ao_plano', 'prata', false, 'Fiel ao Plano', 'Marcou vinte sessões do cronograma como feitas.', '{"tipo":"modo","modo":"cronograma","vezes":20}'::jsonb),
  ('trinta_dias_est', 'prata', false, 'Trinta Dias de Serviço', 'Trinta dias diferentes com estudo registrado.', '{"tipo":"diasEstudados","min":30}'::jsonb),
  ('tres_no_dia', 'prata', false, 'Frente Tripla', 'Três matérias diferentes no mesmo dia.', '{"tipo":"materiasNoDia","quantas":3}'::jsonb),
  ('disciplina_total', 'ouro', false, 'Disciplina de Ferro', 'DISCIPLINA no máximo: vinte dias de estudo em trinta.', '{"tipo":"atributo","chave":"disciplina","min":100}'::jsonb),
  ('resistencia_total', 'ouro', false, 'Fôlego de Combate', 'RESISTÊNCIA no máximo: uma sessão de hora e meia.', '{"tipo":"atributo","chave":"resistencia","min":100}'::jsonb),
  ('doutrina_total', 'ouro', false, 'Doutrina Consolidada', 'DOUTRINA no máximo: domínio pleno de todas as matérias.', '{"tipo":"atributo","chave":"doutrina","min":100}'::jsonb),
  ('ficha_completa', 'ouro', false, 'Ficha Impecável', 'Disciplina, Resistência e Amplitude no máximo ao mesmo tempo.', '{"tipo":"atributosTodos","chaves":["disciplina","resistencia","amplitude"],"min":100}'::jsonb),
  ('trinta_dias', 'ouro', false, 'Trinta Dias em Pé', 'Um mês inteiro sem quebrar a sequência.', '{"tipo":"streak","min":30}'::jsonb),
  ('sessenta_dias', 'ouro', false, 'Sessenta Dias em Pé', 'Dois meses seguidos sem falhar um dia.', '{"tipo":"streak","min":60}'::jsonb),
  ('cem_horas', 'ouro', false, 'Cem Horas', 'Cem horas de estudo acumuladas.', '{"tipo":"horas","min":100}'::jsonb),
  ('duzentas_horas', 'ouro', false, 'Duzentas Horas', 'Duzentas horas de estudo acumuladas.', '{"tipo":"horas","min":200}'::jsonb),
  ('tres_dominios', 'ouro', false, 'Terreno Consolidado', 'Três matérias acima de 70% de domínio.', '{"tipo":"materias","dominioMin":70,"quantas":3}'::jsonb),
  ('cinco_dominios', 'ouro', false, 'Domínio Amplo', 'Cinco matérias acima de 70% de domínio.', '{"tipo":"materias","dominioMin":70,"quantas":5}'::jsonb),
  ('ninguem_atras', 'ouro', false, 'Ninguém Fica Para Trás', 'Nenhuma matéria abaixo de 50% de domínio.', '{"tipo":"dominioMinimo","min":50}'::jsonb),
  ('cem_sessoes', 'ouro', false, 'Cem Formaturas', 'Cem sessões registradas.', '{"tipo":"sessoes","min":100}'::jsonb),
  ('seis_meses', 'ouro', false, 'Meio Ano de Farda', 'Estudou em seis meses diferentes.', '{"tipo":"meses","min":6}'::jsonb),
  ('dez_mil_xp', 'ouro', false, 'Dez Mil', 'Dez mil pontos de experiência acumulados.', '{"tipo":"xp","min":10000}'::jsonb),
  ('platina', 'platina', false, 'Condecoração Máxima', 'Todas as outras condecorações conquistadas.', '{"tipo":"todas","exceto":["platina"]}'::jsonb),
  ('madrugador', 'bronze', true, 'Vigília', 'Cinco sessões começadas antes das 6 da manhã.', '{"tipo":"horario","deHora":4,"ateHora":6,"vezes":5}'::jsonb),
  ('coruja', 'bronze', true, 'Turno da Noite', 'Cinco sessões começadas depois da meia-noite.', '{"tipo":"horario","deHora":0,"ateHora":4,"vezes":5}'::jsonb),
  ('hora_do_almoco', 'bronze', true, 'Rancho Pulado', 'Dez sessões entre meio-dia e uma da tarde.', '{"tipo":"horario","deHora":12,"ateHora":13,"vezes":10}'::jsonb),
  ('fim_de_semana', 'prata', true, 'Sem Folga', 'Oito sessões em sábados e domingos.', '{"tipo":"diaSemana","dias":[0,6],"vezes":8}'::jsonb),
  ('segunda_feira', 'prata', true, 'Começo de Semana', 'Dez segundas-feiras estudadas. A mais difícil de todas.', '{"tipo":"diaSemana","dias":[1],"vezes":10}'::jsonb),
  ('domingo_fiel', 'prata', true, 'Domingo de Serviço', 'Dez domingos estudados.', '{"tipo":"diaSemana","dias":[0],"vezes":10}'::jsonb),
  ('semana_perfeita', 'prata', true, 'Semana Sem Brecha', 'Uma semana com os sete dias estudados.', '{"tipo":"semanaPerfeita","vezes":1}'::jsonb),
  ('quatro_perfeitas', 'ouro', true, 'Mês Sem Brecha', 'Quatro semanas com os sete dias estudados.', '{"tipo":"semanaPerfeita","vezes":4}'::jsonb),
  ('reintegrado', 'prata', true, 'Reintegrado', 'Voltou a estudar depois de mais de 14 dias sumido.', '{"tipo":"retorno","diasSumidoMin":14}'::jsonb),
  ('reintegrado_longo', 'ouro', true, 'De Volta ao Posto', 'Voltou a estudar depois de mais de 30 dias sumido.', '{"tipo":"retorno","diasSumidoMin":30}'::jsonb),
  ('maratona', 'ouro', true, 'Marcha Forçada', 'Uma sessão de três horas seguidas.', '{"tipo":"sessaoUnica","minutosMin":180}'::jsonb),
  ('maratona_dupla', 'ouro', true, 'Travessia', 'Oito horas de estudo num único dia.', '{"tipo":"horasNoDia","min":8}'::jsonb),
  ('ferro_em_brasa', 'ouro', true, 'Ferro em Brasa', 'Cem dias seguidos sem quebrar a sequência.', '{"tipo":"streak","min":100}'::jsonb),
  ('virada', 'prata', true, 'Virada de Jogo', 'A matéria a que você dedicou menos tempo passou de 50% de domínio.', '{"tipo":"materiaMenosEstudada","dominioMin":50}'::jsonb),
  ('obstinado', 'prata', true, 'Obstinado', 'A mesma matéria, sete dias seguidos.', '{"tipo":"materiaSeguida","dias":7}'::jsonb),
  ('especialista', 'ouro', true, 'Especialista', 'A mesma matéria, trinta dias seguidos.', '{"tipo":"materiaSeguida","dias":30}'::jsonb),
  ('cinco_turnos', 'ouro', true, 'Guarda Permanente', 'Cinco sessões separadas no mesmo dia.', '{"tipo":"sessoesNoDia","quantas":5}'::jsonb),
  ('pomodoro_fiel', 'prata', true, 'Método', 'Cinquenta sessões em pomodoro.', '{"tipo":"modo","modo":"pomodoro","vezes":50}'::jsonb),
  ('ano_de_farda', 'ouro', true, 'Um Ano de Farda', 'Estudou em doze meses diferentes.', '{"tipo":"meses","min":12}'::jsonb),
  ('cem_dias_est', 'ouro', true, 'Cem Dias de Serviço', 'Cem dias diferentes com estudo registrado.', '{"tipo":"diasEstudados","min":100}'::jsonb),
  ('madrugada_dupla', 'ouro', true, 'Duas Pontas do Dia', 'Vinte sessões antes das 6 da manhã.', '{"tipo":"horario","deHora":4,"ateHora":6,"vezes":20}'::jsonb),
  ('quinhentas_horas', 'ouro', true, 'Quinhentas Horas', 'Quinhentas horas de estudo acumuladas.', '{"tipo":"horas","min":500}'::jsonb)
on conflict (id) do update set
  metal = excluded.metal, secreta = excluded.secreta,
  nome = excluded.nome, descricao = excluded.descricao, condicao = excluded.condicao;

insert into public.catalogo_divisas (id, raridade, secreta, nome, como_ganha, cor, condicao)
values
  ('orador', 'incomum', false, 'Orador de Guerra', 'Português acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["português","língua portuguesa"],"dominioMin":70}'::jsonb),
  ('calculista', 'incomum', false, 'Calculista', 'Matemática acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["matemática"],"dominioMin":70}'::jsonb),
  ('engenheiro', 'incomum', false, 'Engenheiro de Campo', 'Física acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["física"],"dominioMin":70}'::jsonb),
  ('interprete', 'incomum', false, 'Intérprete', 'Inglês acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["inglês","língua inglesa"],"dominioMin":70}'::jsonb),
  ('guardiao', 'incomum', false, 'Guardião da Lei', 'Direito acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["direito","direito constitucional"],"dominioMin":70}'::jsonb),
  ('navegador', 'incomum', false, 'Navegador', 'Geografia acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["geografia"],"dominioMin":70}'::jsonb),
  ('cronista', 'incomum', false, 'Memória da Nação', 'História acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["história"],"dominioMin":70}'::jsonb),
  ('cyber', 'incomum', false, 'Operador Cyber', 'Informática acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["informática"],"dominioMin":70}'::jsonb),
  ('alquimista', 'incomum', false, 'Alquimista', 'Química acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["química"],"dominioMin":70}'::jsonb),
  ('medico', 'incomum', false, 'Médico de Combate', 'Biologia acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["biologia"],"dominioMin":70}'::jsonb),
  ('estrategista', 'incomum', false, 'Estrategista', 'Raciocínio lógico acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["raciocínio lógico"],"dominioMin":70}'::jsonb),
  ('administrador', 'incomum', false, 'Administrador de Elite', 'Administração acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["administração"],"dominioMin":70}'::jsonb),
  ('legislador', 'incomum', false, 'Legislador', 'Legislação acima de 70% de domínio', 'var(--latao-c)', '{"tipo":"materiaDominada","materias":["legislação","legislação especial"],"dominioMin":70}'::jsonb),
  ('sentinela', 'comum', false, 'Sentinela', 'DISCIPLINA acima de 60', 'var(--oliva-c)', '{"tipo":"atributo","chave":"disciplina","min":60}'::jsonb),
  ('inabalavel', 'rara', false, 'Inabalável', 'DISCIPLINA no máximo', 'var(--latao)', '{"tipo":"atributo","chave":"disciplina","min":100}'::jsonb),
  ('sapador', 'comum', false, 'Sapador', 'RESISTÊNCIA acima de 60', 'var(--oliva-c)', '{"tipo":"atributo","chave":"resistencia","min":60}'::jsonb),
  ('incansavel', 'rara', false, 'Incansável', 'RESISTÊNCIA no máximo', 'var(--latao)', '{"tipo":"atributo","chave":"resistencia","min":100}'::jsonb),
  ('batedor', 'comum', false, 'Batedor', 'AMPLITUDE no máximo — nenhuma matéria esquecida', 'var(--oliva-c)', '{"tipo":"atributo","chave":"amplitude","min":100}'::jsonb),
  ('instrutor', 'rara', false, 'Instrutor', 'DOUTRINA acima de 80', 'var(--latao)', '{"tipo":"atributo","chave":"doutrina","min":80}'::jsonb),
  ('veterano', 'rara', false, 'Veterano', 'Cem horas de estudo', 'var(--latao)', '{"tipo":"horas","min":100}'::jsonb),
  ('inquebrantavel', 'lendaria', false, 'Inquebrantável', 'Cem dias seguidos de estudo', 'var(--papel)', '{"tipo":"streak","min":100}'::jsonb),
  ('reintegrado', 'rara', false, 'Reintegrado', 'Voltar depois de mais de 14 dias sumido', 'var(--brasa-c)', '{"tipo":"condecoracao","id":"reintegrado"}'::jsonb),
  ('vigilia', 'rara', true, 'Vigília', 'secreta', 'var(--oliva)', '{"tipo":"condecoracao","id":"madrugador"}'::jsonb),
  ('turno_noite', 'rara', true, 'Turno da Noite', 'secreta', 'var(--oliva)', '{"tipo":"condecoracao","id":"coruja"}'::jsonb),
  ('marcha', 'lendaria', true, 'Marcha Forçada', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"maratona"}'::jsonb),
  ('ferro', 'lendaria', true, 'Ferro em Brasa', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"ferro_em_brasa"}'::jsonb),
  ('obstinado', 'rara', true, 'Obstinado', 'secreta', 'var(--oliva)', '{"tipo":"condecoracao","id":"obstinado"}'::jsonb),
  ('especialista', 'lendaria', true, 'Especialista', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"especialista"}'::jsonb),
  ('travessia', 'lendaria', true, 'Travessia', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"maratona_dupla"}'::jsonb),
  ('metodo', 'rara', true, 'Método', 'secreta', 'var(--oliva)', '{"tipo":"condecoracao","id":"pomodoro_fiel"}'::jsonb),
  ('sem_brecha', 'lendaria', true, 'Sem Brecha', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"quatro_perfeitas"}'::jsonb),
  ('ano_farda', 'lendaria', true, 'Um Ano de Farda', 'secreta', 'var(--papel)', '{"tipo":"condecoracao","id":"ano_de_farda"}'::jsonb),
  ('condecorado', 'lendaria', false, 'Condecorado', 'Conquistar a Condecoração Máxima', 'var(--papel)', '{"tipo":"condecoracao","id":"platina"}'::jsonb)
on conflict (id) do update set
  raridade = excluded.raridade, secreta = excluded.secreta,
  nome = excluded.nome, como_ganha = excluded.como_ganha,
  cor = excluded.cor, condicao = excluded.condicao;

-- 🔴 NAO ha `delete` aqui, de proposito. Se uma condecoracao sair do
-- catalogo, a linha antiga fica na tabela -- e quem ja a conquistou continua
-- com ela. Apagar seria desconquistar, que e exatamente o que a regra dele de
-- 02/08 proibe: "conquista nao se desconquista".
