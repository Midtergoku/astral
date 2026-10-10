// ASSUNTOS COMUNS -- o que cada materia costuma cobrar em prova militar (10/10/2026)
//
// Pedido dele, em Progresso > Materias do edital: "nao e porque nao tem uma questao no banco que nao
// vai ter ali mostrando a submateria". A fonte CERTA dos assuntos e o EDITAL: desde 10/10 a IA le o
// conteudo programatico de cada materia (processar-edital, campo `assuntos`). Esta lista e a REDE para
// quando o edital ainda nao tem os assuntos lidos (toda leitura antes de 10/10, a simulacao, materia
// que o edital nao detalhou) -- e a tela DIZ que sao os comuns, nao os do edital.
//
// Feita a partir do que se repete nos conteudos programaticos de EEAR, ESA, EsPCEx, PM e bombeiros.
// Nomes curtos, do jeito que o aluno procura. Chave = o nome canonico de materia_do_banco()
// (MATERIAS_CONHECIDAS em prova.js). Materia sem lista aqui: nada e inventado.

const COMUNS = {
  "Português": ["Interpretação de texto", "Ortografia e acentuação", "Classes de palavras", "Verbos", "Concordância",
    "Regência", "Crase", "Colocação pronominal", "Pontuação", "Sintaxe da oração e do período", "Figuras de linguagem",
    "Semântica", "Tipologia e gêneros textuais"],
  "Matemática": ["Conjuntos", "Porcentagem", "Razão e proporção", "Equações e sistemas", "Funções", "Função do 1º grau",
    "Função do 2º grau", "Progressões", "Análise combinatória", "Probabilidade", "Estatística", "Geometria plana",
    "Geometria espacial", "Geometria analítica", "Trigonometria", "Logaritmo", "Matrizes e determinantes", "Polinômios",
    "Números complexos"],
  "Física": ["Cinemática", "Dinâmica", "Energia e trabalho", "Gravitação", "Hidrostática", "Termologia", "Óptica",
    "Ondulatória", "Eletrostática", "Eletricidade", "Magnetismo", "Vetores"],
  "Química": ["Estrutura atômica", "Tabela periódica", "Ligações químicas", "Funções inorgânicas", "Reações químicas",
    "Estequiometria", "Soluções", "Termoquímica", "Cinética química", "Equilíbrio químico", "Eletroquímica",
    "Química orgânica", "Radioatividade"],
  "Biologia": ["Citologia", "Bioquímica", "Genética", "Evolução", "Ecologia", "Botânica", "Zoologia",
    "Fisiologia humana", "Microbiologia e doenças", "Reprodução e embriologia"],
  "História": ["Brasil Colônia", "Brasil Império", "Brasil República", "Era Vargas", "Ditadura e redemocratização",
    "Antiguidade", "Idade Média", "Idade Moderna", "Revoluções do século XVIII", "Guerras Mundiais", "Guerra Fria",
    "História do seu estado"],
  "Geografia": ["Cartografia", "Geologia e relevo", "Clima", "Hidrografia", "Vegetação e biomas", "População",
    "Urbanização", "Agropecuária", "Indústria e energia", "Geopolítica", "Geografia do Brasil", "Geografia do seu estado"],
  "Inglês": ["Reading comprehension", "Vocabulary", "Verb tenses", "Modal verbs", "Prepositions", "Pronouns",
    "Adjectives", "Conditionals", "Cloze (completar texto)"],
  "Informática": ["Hardware e periféricos", "Sistemas operacionais", "Editor de texto", "Planilhas", "Apresentações",
    "Internet e navegadores", "Correio eletrônico", "Segurança da informação", "Redes de computadores",
    "Armazenamento em nuvem"],
  "Raciocínio lógico": ["Proposições e conectivos", "Tabela-verdade", "Equivalências lógicas", "Argumentação",
    "Sequências", "Diagramas lógicos", "Problemas de contagem"],
  "Direito constitucional": ["Princípios fundamentais", "Direitos e garantias fundamentais", "Direitos sociais",
    "Nacionalidade e direitos políticos", "Organização do Estado", "Administração pública (art. 37)",
    "Militares dos estados (art. 42)", "Segurança pública (art. 144)"],
  "Direito administrativo": ["Princípios da administração", "Atos administrativos", "Poderes administrativos",
    "Agentes públicos", "Licitações e contratos", "Responsabilidade civil do Estado", "Improbidade administrativa"],
  "Direitos humanos": ["Declaração Universal dos Direitos Humanos", "Direitos humanos na Constituição",
    "Tratados internacionais", "Uso progressivo da força", "Grupos vulneráveis"],
  "Legislação": ["Constituição Federal", "Estatuto dos militares", "Regulamento disciplinar", "Lei de organização básica",
    "Código Penal Militar", "Direitos humanos", "Estatuto da criança e do adolescente", "Lei Maria da Penha"],
  "Atualidades": ["Política nacional", "Economia", "Meio ambiente", "Ciência e tecnologia", "Relações internacionais",
    "Segurança pública"],
};

/** Assuntos comuns da materia (nome canonico do banco, ou o nome do edital). Lista vazia se nao conhecida. */
export function assuntosComuns(materiaBanco, nomeDoEdital = "") {
  return COMUNS[materiaBanco] || COMUNS[nomeDoEdital] || [];
}

/* A lista que a tela mostra, numa ordem so:
     1. os do EDITAL (a IA leu do conteudo programatico) -- se houver, so eles e os do Banco;
     2. senao, os COMUNS da materia;
     3. mais os assuntos que o Banco de questoes tem e a lista ainda nao trazia (o aluno ja pode treina-los).
   Devolve { lista: [nome...], fonte: 'edital' | 'comuns' | 'banco' | null }. Sem repetir (sem acento/caixa). */
export function assuntosDaMateria({ edital = [], banco = [], materiaBanco = "", nome = "" } = {}) {
  const chave = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const base = edital.length ? edital : assuntosComuns(materiaBanco, nome);
  const fonte = edital.length ? "edital" : (base.length ? "comuns" : (banco.length ? "banco" : null));
  const vistos = new Set();
  const lista = [];
  for (const a of [...base, ...banco]) {
    const s = String(a || "").trim();
    if (!s || vistos.has(chave(s))) continue;
    vistos.add(chave(s));
    lista.push(s);
  }
  return { lista, fonte };
}
