import type { CoverKind } from '../ui/CourseCover';

export const COURSE_BOOKS = {
  eleitoral: 'Direito Eleitoral',
  eleitoralCrimes: 'Crimes Eleitorais e Processo Penal Eleitoral',
  processoCivil: 'Curso de Direito Processual Civil',
  processoCivilConhecimento: 'Curso de Direito Processual Civil, v. I',
  processoCivilEspeciais: 'Curso de Direito Processual Civil, v. II',
  processoCivilExecucao: 'Curso de Direito Processual Civil, v. III',
  processoCivilTribunais: 'Curso de Direito Processual Civil, v. III',
  teoriaConstituicao: 'Curso de Direito Constitucional — André Ramos Tavares',
  penal1: 'Curso de Direito Penal, v. 1, 10ª ed., 2026',
  penal2: 'Curso de Direito Penal, v. 2, 10ª ed., 2026',
  penal3: 'Curso de Direito Penal, v. 3, 10ª ed., 2026',
  cp: 'Código Penal Comentado, 26ª ed., 2026',
  cpp: 'Código de Processo Penal Comentado, 25ª ed., 2026',
  administrativo: 'Direito Administrativo',
  administrativoContratos: 'Direito Administrativo',
  administrativoAgentes: 'Direito Administrativo',
  administrativoProcesso: 'Direito Administrativo',
  administrativoControle: 'Direito Administrativo',
  civil1: 'Direito Civil, v. 1, 22ª ed., 2026',
  civil2: 'Direito Civil, v. 2, 21ª ed., 2026',
  civil3: 'Direito Civil, v. 3, 21ª ed., 2026',
  civil4: 'Direito Civil, v. 4, 18ª ed., 2026',
  civil5: 'Direito Civil, v. 5, 21ª ed., 2026',
  civil6: 'Direito Civil, v. 6, 19ª ed., 2026',
  constitucional: 'Direito Constitucional, 42ª ed., 2026 — Alexandre de Moraes',
  processoPenal: 'Direito Processual Penal, 23ª ed., 2026',
  processoPenalProvas: 'Direito Processual Penal, 23ª ed., 2026',
  processoPenalCautelares: 'Direito Processual Penal, 23ª ed., 2026',
  processoPenalRecursos: 'Direito Processual Penal, 23ª ed., 2026',
  consumidor: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  consumidorResponsabilidade: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  consumidorContratos: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  consumidorMercado: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  consumidorIndividual: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  consumidorColetivo: 'Manual de Direito do Consumidor, 15ª ed., 2026',
  organizacoes: 'Organizações Criminosas',
  portuguesEsquematizado: 'Português Esquematizado, 10ª ed., 2022 — Agnaldo Martino',
  gramaticaPestana: 'A Gramática para Concursos Públicos — Fernando Pestana',
  informaticaSatin: 'Manual Completo de Informática para Concursos — Helder Satin',
  microsoft365: 'Suporte Microsoft — Windows, Microsoft 365, Teams e OneDrive',
} as const;

export type CourseFact = readonly [id: string, term: string, criterion: string, scenario: string, pages: string];
export type CourseBookId = keyof typeof COURSE_BOOKS;
export interface CourseModule {
  id: string;
  title: string;
  book: CourseBookId;
  facts: readonly CourseFact[];
}
export interface DoctrineCourse {
  id: string;
  title: string;
  cover: CoverKind;
  modules: readonly CourseModule[];
}

export const DOCTRINE_COURSES: readonly DoctrineCourse[] = [
  {
    id: 'constitucional', title: 'Direito Constitucional', cover: 'const', modules: [
      { id: 'sentidos', title: 'Sentidos de Constituição', book: 'teoriaConstituicao', facts: [
        ['sociologico', 'Sentido sociológico', 'Investiga as forças econômicas, políticas e sociais que sustentam a organização real do poder.', 'Uma pesquisadora compara a carta escrita com o poder efetivamente exercido por grupos econômicos, militares e sociais. Qual sentido de Constituição orienta seu estudo?', '129–131'],
        ['politico', 'Sentido político', 'Identifica nas escolhas fundamentais do poder constituinte o núcleo da organização política.', 'Um autor distingue a escolha fundante sobre a forma de Estado das disposições que só têm estatura constitucional porque foram inseridas no documento. Qual sentido está em destaque?', '102–109, 128–129'],
        ['juridico', 'Sentido jurídico', 'Examina a Constituição como norma superior que disciplina a produção e a validade das normas inferiores.', 'Ao analisar a validade de uma lei ordinária, uma jurista toma a Constituição como parâmetro normativo superior. Qual sentido está em destaque?', '32–34'],
        ['formal', 'Critério formal', 'Verifica a incorporação de uma regra ao texto constitucional, independentemente do assunto que ela disciplina.', 'Uma regra minuciosa sobre uma prestação específica integra o texto constitucional. A classificação considera a posição da regra no documento. Qual critério foi usado?', '128–129'],
        ['substancial', 'Critério substancial', 'Classifica normas pelo seu conteúdo de organização do Estado, limitação do poder ou garantia de direitos.', 'Uma regra de organização estatal está fora do texto solene, mas é examinada pelo assunto que disciplina. Qual critério permite qualificá-la como constitucional?', '129'],
      ] },
      { id: 'classificacoes', title: 'Classificação das constituições', book: 'constitucional', facts: [
        ['promulgada', 'Constituição promulgada', 'É elaborada com participação popular, normalmente por representantes reunidos em órgão constituinte.', 'Representantes eleitos para uma assembleia redigem e aprovam a carta do país. Como se classifica sua origem?', '8'],
        ['outorgada', 'Constituição outorgada', 'É imposta por quem detém o poder, sem a participação popular que caracteriza a promulgação.', 'O governante edita por iniciativa unilateral a carta fundamental e dispensa a assembleia representativa. Qual a classificação quanto à origem?', '8'],
        ['rigida', 'Constituição rígida', 'Exige procedimento de alteração mais dificultoso do que o empregado para as leis ordinárias.', 'Uma mudança na carta exige dois turnos e quórum superior ao que basta para aprovar uma lei ordinária. Qual a classificação quanto à estabilidade?', '8–9'],
        ['flexivel', 'Constituição flexível', 'Pode ser modificada pelo mesmo procedimento empregado na elaboração das leis ordinárias.', 'O procedimento normal de produção legislativa basta tanto para editar uma lei comum quanto para alterar todas as regras da carta. Como se classifica a carta?', '8–9'],
        ['semirrigida', 'Constituição semirrígida', 'Combina matérias submetidas a rito especial de mudança com matérias alteráveis pelo rito comum.', 'A mesma carta prevê quórum agravado para um grupo de normas e admite alteração ordinária para as restantes. Qual categoria explica o desenho?', '8–9'],
        ['sintetica', 'Constituição sintética', 'Concentra-se na estrutura do Estado e nas garantias básicas, com menor detalhamento de políticas.', 'Ao comparar a extensão de duas cartas, uma delas tem poucos artigos e deixa quase toda disciplina minuciosa para a legislação. Qual é a classificação por extensão?', '9'],
      ] },
      { id: 'eficacia', title: 'Eficácia das normas', book: 'constitucional', facts: [
        ['plena', 'Eficácia plena', 'A norma está apta desde a vigência a produzir os efeitos para os quais foi editada, sem integração legislativa necessária.', 'Uma norma constitucional tem elementos suficientes para aplicação imediata e não prevê redução ordinária do seu alcance. Como classificá-la?', '10–11'],
        ['contida', 'Eficácia contida', 'A norma produz efeitos desde a vigência, mas admite restrições constitucionalmente autorizadas.', 'Uma liberdade pode ser exercida desde a promulgação. A carta permite que a lei estabeleça qualificações para seu exercício. Qual a categoria?', '10–11'],
        ['limitada', 'Eficácia limitada', 'Depende de integração para produzir plenamente seus efeitos, embora já vincule os poderes públicos.', 'A Constituição determina a criação de uma instituição, mas deixa à lei os requisitos que viabilizam sua operação. Qual é a classificação geral da eficácia?', '10–12'],
        ['programatica', 'Norma programática', 'Fixa objetivos para a atuação pública, servindo de parâmetro para sua concretização pelos poderes competentes.', 'Qual categoria específica descreve uma regra constitucional que determina uma política pública a ser desenvolvida progressivamente pelo legislador?', '11–12'],
      ] },
    ],
  },
  {
    id: 'hermeneutica', title: 'Hermenêutica Constitucional', cover: 'hermeneutica', modules: [
      { id: 'principios', title: 'Como interpretar a Constituição', book: 'teoriaConstituicao', facts: [
        ['unidade', 'Unidade da Constituição', 'Interpreta cada dispositivo em relação ao conjunto das normas constitucionais.', 'Uma intérprete recusa a leitura isolada de uma regra e reconstrói seu sentido à luz do sistema constitucional inteiro. Qual princípio orienta esse raciocínio?', '145–146'],
        ['harmonizacao', 'Concordância prática', 'Busca compatibilizar bens constitucionais em conflito, preservando quanto for possível de cada um.', 'No choque entre privacidade e liberdade de informar, uma solução protege a identidade de terceiros e permite divulgar o fato de interesse público. Qual técnica orienta a acomodação?', '145–146'],
        ['conforme', 'Interpretação conforme a Constituição', 'Entre leituras plausíveis de uma lei, preserva a compatível com a Constituição e afasta a incompatível.', 'Diante de duas leituras possíveis de uma lei, um tribunal exclui a que viola uma garantia constitucional e mantém o texto sob a leitura compatível. Qual técnica foi usada?', '146–148'],
        ['mutacao', 'Mutação constitucional', 'Modifica o sentido estabilizado de uma norma constitucional sem alterar a redação do dispositivo.', 'Ao longo de muitos anos, uma disposição constitucional passa a receber outro significado na prática institucional, apesar de o seu texto permanecer idêntico. Qual fenômeno está descrito?', '144–145, 236–237'],
      ] },
      { id: 'criterios', title: 'Efetividade e limites da interpretação', book: 'constitucional', facts: [
        ['efetividade', 'Máxima efetividade', 'Prefere, entre sentidos admissíveis, o que dá maior eficácia concreta à norma constitucional.', 'Uma garantia comporta duas leituras juridicamente possíveis. A intérprete prefere a que assegura que a garantia produza efeitos concretos. Qual princípio é decisivo?', '13–14'],
        ['conformidade', 'Conformidade funcional', 'Preserva a distribuição constitucional de funções e competências ao interpretar um dispositivo.', 'O tribunal rejeita uma leitura que, embora conveniente, transferiria para ele competência atribuída pela carta ao Legislativo. Que princípio explica o limite?', '13–14'],
        ['integrador', 'Efeito integrador', 'Favorece critérios de interpretação que reforcem a integração política e social.', 'Entre duas leituras conciliáveis com o texto, a intérprete privilegia a que favorece a coesão do Estado e da comunidade. Que orientação ela aplica?', '13–14'],
        ['forca', 'Força normativa da Constituição', 'Leva a sério a capacidade de a Constituição orientar a prática institucional e transformar a realidade.', 'Um parecer rejeita tratar a Constituição como simples retrato de relações políticas e exige uma leitura que sustente sua aplicação efetiva. Qual orientação é central?', '13–14, 23'],
      ] },
    ],
  },
  {
    id: 'penal', title: 'Direito Penal', cover: 'penal', modules: [
      { id: 'geral', title: 'Teoria do delito', book: 'penal1', facts: [
        ['fragmentariedade', 'Fragmentariedade', 'Seleciona somente parte das condutas lesivas a interesses relevantes para a tutela penal.', 'O Direito protege um mesmo bem de várias maneiras. A criminalização recai apenas sobre algumas formas graves de lesão. Qual princípio explica essa seleção?', '55–56'],
        ['subsidiariedade', 'Subsidiariedade', 'Reserva a intervenção penal para quando meios menos gravosos forem insuficientes.', 'Diante de um problema social, uma comissão verifica antes se medidas administrativas e civis oferecem proteção suficiente. Qual princípio penal orienta essa decisão?', '55–56'],
        ['dolo-eventual', 'Dolo eventual', 'O agente prevê a possibilidade do resultado e assume o risco de produzi-lo.', 'Em uma hipótese que declara expressamente que o agente aceita produzir o resultado, embora esse não seja seu objetivo principal, qual modalidade é descrita?', '235–240'],
        ['culpa-consciente', 'Culpa consciente', 'O agente prevê o resultado, mas confia concretamente em que poderá evitá-lo.', 'O enunciado informa que o agente antecipou o perigo, mas estava convencido, sem fundamento, de que controlaria a situação. Qual a modalidade subjetiva?', '237–240'],
        ['erro-tipo', 'Erro de tipo', 'A falsa percepção recai sobre um elemento do tipo penal e afasta o dolo correspondente.', 'Uma pessoa pega a mochila idêntica de um colega por acreditar sinceramente que ela é a sua. Qual instituto explica o erro sobre o caráter alheio da coisa?', '347–350'],
        ['crime-impossivel', 'Crime impossível', 'A consumação é inviável por ineficácia absoluta do meio ou impropriedade absoluta do objeto.', 'A hipótese informa que o objeto material indispensável ao delito jamais esteve onde o agente supunha e que a consumação era absolutamente inviável. Qual instituto se examina?', '372–375'],
      ] },
      { id: 'lei-penal', title: 'Lei penal no tempo e no espaço', book: 'cp', facts: [
        ['legalidade', 'Reserva legal', 'A definição da infração e da pena depende de lei prévia, sem criação penal por mera analogia prejudicial.', 'Um tribunal pretende incriminar uma conduta que não estava prevista em lei no momento da prática, valendo-se só da semelhança com outro delito. Qual garantia é diretamente contrariada?', '12–16'],
        ['abolitio', 'Abolitio criminis', 'Uma lei posterior retira a criminalização da conduta, sem manter sua punição em outro tipo.', 'A lei posterior elimina a figura criminosa e o comportamento deixa efetivamente de ser punível. Como se denomina o fenômeno?', '21–24'],
        ['benigna', 'Lei penal posterior mais benéfica', 'A disciplina posterior mais favorável alcança fatos anteriores, mesmo quando a conduta continua criminosa.', 'Uma alteração mantém o crime, porém reduz a pena cominada. Qual categoria permite beneficiar quem praticou o fato antes da mudança?', '21–23'],
        ['atividade', 'Teoria da atividade', 'Para o tempo do crime, considera o momento em que ocorreu a ação ou omissão.', 'Uma conduta dolosa ocorre num dia e o resultado no mês seguinte. Qual teoria usa o primeiro momento para definir o tempo do crime?', '36–38'],
        ['ubiquidade', 'Teoria da ubiquidade', 'Para o lugar do crime, leva em conta o local da conduta e o do resultado efetivo ou pretendido.', 'A conduta começa em um território e o resultado deve ocorrer em outro. Qual teoria permite considerar ambos para localizar a infração?', '48–49'],
      ] },
      { id: 'pessoa-patrimonio', title: 'Crimes contra a pessoa e o patrimônio', book: 'penal2', facts: [
        ['infanticidio', 'Infanticídio', 'Exige que a mãe, sob influência do estado puerperal, mate o próprio filho durante o parto ou logo após.', 'Em um caso fictício, o enunciado expressamente comprova as condições do parto, a maternidade e a influência do estado puerperal. Qual tipo especial distingue o caso do homicídio comum?', '58–61'],
        ['furto', 'Furto', 'Consiste na subtração de coisa móvel alheia sem violência ou grave ameaça à pessoa.', 'No vestiário vazio, alguém retira de propósito o relógio alheio para ficar com ele. Não há fraude de entrega nem violência. Qual é a figura básica?', '241–246'],
        ['roubo-proprio', 'Roubo próprio', 'A violência ou grave ameaça é empregada para realizar a subtração.', 'A violência ocorre antes de o agente tomar a coisa, precisamente para viabilizar a subtração. Qual modalidade fica caracterizada no exemplo?', '253–255, 271–273'],
        ['roubo-improprio', 'Roubo impróprio', 'A violência ou grave ameaça segue a subtração e serve para assegurar a impunidade ou a detenção da coisa.', 'Após a subtração já efetivada, o agente agride o perseguidor para manter consigo o bem. Qual modalidade explica a sequência dos fatos?', '253–255, 271–273'],
        ['extorsao', 'Extorsão', 'Constrange a vítima a agir, tolerar ou deixar de agir, buscando vantagem econômica indevida.', 'Sob grave ameaça, a vítima é forçada a realizar ela própria o ato indispensável para entregar a vantagem, em vez de apenas suportar a retirada de um bem. Qual figura deve ser examinada?', '271–273, 282–286'],
        ['apropriacao', 'Apropriação indébita', 'O agente já tinha posse ou detenção da coisa e depois passa a tratá-la como sua.', 'Uma pessoa recebe legitimamente um equipamento para guardar. Mais tarde, decide vendê-lo como se fosse proprietária. Qual crime descreve a inversão da posse?', '310–314'],
      ] },
      { id: 'administracao-penal', title: 'Crimes funcionais e falsidade', book: 'penal3', facts: [
        ['peculato', 'Peculato-apropriação', 'O agente público se apropria de bem cuja posse decorre do cargo.', 'Uma servidora recebe um valor em razão de suas atribuições e depois o incorpora ao patrimônio pessoal. Qual tipo funcional aparece na hipótese?', '359–363'],
        ['concussao', 'Concussão', 'O agente exige vantagem indevida em razão da função pública.', 'Um fiscal condiciona expressamente a liberação do ato a um pagamento pessoal que ele impõe ao particular. Qual tipo é identificado pelo verbo exigir?', '377–380'],
        ['corrupcao-passiva', 'Corrupção passiva', 'Abrange solicitar, receber ou aceitar promessa de vantagem indevida em razão da função.', 'Sem impor a entrega, o agente público pede espontaneamente uma vantagem em troca de favorecimento funcional. Qual figura corresponde ao núcleo solicitar?', '384–391'],
        ['prevaricacao', 'Prevaricação', 'O agente viola o dever funcional para satisfazer interesse ou sentimento pessoal.', 'Por animosidade particular, um servidor retarda ato de ofício que deveria praticar. O enunciado exclui vantagem econômica. Qual tipo melhor se ajusta?', '395–398'],
        ['falso-ideologico', 'Falsidade ideológica', 'A falsidade está no conteúdo declarado de um documento formalmente autêntico.', 'Um documento autêntico em sua forma contém uma declaração conscientemente falsa sobre fato juridicamente relevante, inserida para alterar a verdade. Qual a espécie de falsidade?', '311–316'],
      ] },
      { id: 'crime-organizado', title: 'Organizações criminosas', book: 'organizacoes', facts: [
        ['estrutura', 'Estrutura ordenada', 'A organização apresenta articulação estável e divisão de tarefas, que pode ser informal.', 'Em uma análise conceitual, o dado decisivo é que o grupo mantém funções distribuídas e organização duradoura. Qual componente está em exame?', '1–8'],
        ['finalidade', 'Finalidade de obter vantagem', 'O agrupamento organizado se dirige à obtenção de vantagem de qualquer natureza mediante as infrações consideradas pela lei.', 'A pergunta deixa de lado quantas pessoas participavam e qual papel cumpriam. Ela examina o benefício pretendido com a atividade do grupo. Que elemento está em foco?', '7–9'],
        ['colaboracao', 'Colaboração premiada', 'É um meio de obtenção de prova que envolve colaboração voluntária, com possibilidade de efeitos previstos em lei.', 'Um participante assistido por defensor oferece informações verificáveis e firma acordo escrito para colaborar. Qual instituto o caso descreve?', '44–49, 62–64'],
        ['acao-controlada', 'Ação controlada', 'Permite retardar a intervenção sob acompanhamento para atuar no momento mais eficaz à investigação.', 'Sem interromper a observação, a polícia adia a intervenção para melhorar a obtenção de prova, nos termos do procedimento legal. Qual técnica está descrita?', '88–92'],
        ['infiltracao', 'Infiltração de agentes', 'Envolve a inserção sob identidade encoberta de agente autorizado com finalidade investigativa.', 'A hipótese descreve um agente que, com autorização judicial, integra o ambiente do grupo sob identidade encoberta para uma investigação delimitada. Qual é o meio empregado?', '93–98'],
      ] },
    ],
  },
  {
    id: 'processo-penal', title: 'Direito Processual Penal', cover: 'processoPenal', modules: [
      { id: 'sistemas', title: 'Sistemas e garantias', book: 'processoPenal', facts: [
        ['necessidade', 'Princípio da necessidade', 'Vincula o exercício do poder de punir à passagem por um processo penal com garantias.', 'Diante de uma acusação, o Estado não pode aplicar a pena por ato próprio sem o caminho processual devido. Qual princípio expressa esse vínculo?', '1–4'],
        ['acusatorio', 'Sistema acusatório', 'Separa acusação e julgamento e protege a imparcialidade diante da gestão da prova.', 'A persecução é atribuída às partes e quem julga não substitui a acusação na construção do caso. Qual modelo está em foco?', '9–14, 19–22'],
        ['inquisitorio', 'Sistema inquisitório', 'Concentra funções e atribui protagonismo probatório ao órgão que também julga.', 'A mesma autoridade investiga, conduz a produção probatória de ofício como protagonista e depois decide a imputação. Qual modelo histórico se aproxima desse desenho?', '6–10'],
        ['inocencia', 'Presunção de inocência', 'Impede o tratamento automático do acusado como culpado e orienta a distribuição do ônus acusatório.', 'O juiz afirma que o acusado precisa provar que não praticou o fato para ser absolvido. Qual garantia é diretamente contrariada?', '48–53'],
        ['contraditorio', 'Contraditório', 'Exige oportunidade efetiva de conhecer e contestar elementos que possam influenciar o julgamento.', 'A defesa recebe o laudo em tempo hábil e pode contestá-lo, embora escolha não apresentar manifestação. Qual garantia foi operacionalizada?', '54–56'],
      ] },
      { id: 'prova-penal', title: 'Prova penal', book: 'cpp', facts: [
        ['ilicita', 'Prova ilícita', 'Na classificação doutrinária tradicional, obtém-se com violação de norma de direito material.', 'Um meio de prova foi produzido mediante violação à inviolabilidade domiciliar, sem consentimento válido nem hipótese autorizadora. Qual categoria tradicional descreve o vício da obtenção?', '268–274'],
        ['independente', 'Fonte independente', 'Uma via autônoma e regular chega à prova sem depender da obtenção ilícita anterior.', 'Duas diligências chegam ao mesmo objeto. A segunda já tinha origem lícita própria e não foi desencadeada pela primeira, que era irregular. Qual conceito interessa?', '273–276'],
        ['cadeia', 'Cadeia de custódia', 'Documenta o percurso do vestígio para permitir verificar identidade, manuseio e integridade.', 'Da coleta ao exame, cada transferência do vestígio é registrada, com identificação de quem o recebeu. Qual instituto dá sentido a esses registros?', '284–287'],
        ['reconhecimento', 'Reconhecimento de pessoas', 'Busca identificar alguém com procedimentos que reduzam sugestões e erros de memória.', 'Uma testemunha vai identificar a pessoa que acredita ter visto. O procedimento evita indicar antecipadamente quem a polícia considera suspeito. Que ato está sendo preparado?', '693–698'],
      ] },
    ],
  },
  {
    id: 'civil', title: 'Direito Civil', cover: 'civil', modules: [
      { id: 'parte-geral', title: 'Parte geral e integração', book: 'civil1', facts: [
        ['analogia', 'Analogia', 'Integra uma lacuna mediante aplicação de disciplina prevista para situação juridicamente semelhante.', 'Sem regra específica para a hipótese, uma jurista identifica uma norma aplicada a situação semelhante pela mesma razão jurídica. Qual instrumento de integração foi empregado?', '24–26'],
        ['antinomia', 'Antinomia', 'Há normas aparentemente incompatíveis incidentes sobre uma mesma situação.', 'Duas regras aplicáveis parecem ordenar soluções incompatíveis. Antes de decidir, a jurista verifica hierarquia, especialidade e cronologia. Que problema ela enfrenta?', '36–39'],
        ['ato-perfeito', 'Ato jurídico perfeito', 'O ato já se consumou segundo a lei vigente ao tempo em que foi praticado.', 'Um contrato foi celebrado e concluído sob a lei anterior com todos os elementos então exigidos. A pergunta destaca a consumação do ato. Qual categoria intertemporal é pertinente?', '39–40'],
        ['direito-adquirido', 'Direito adquirido', 'O titular já preencheu os requisitos para a aquisição do direito, mesmo se ainda não o exerceu.', 'Antes de mudar a lei, uma pessoa já preenchera todos os requisitos do direito, mas ainda não o tinha exercido. Que categoria o caso suscita?', '39–45'],
        ['coisa-julgada', 'Coisa julgada', 'Protege a estabilidade da decisão judicial que já não admite recurso, nos limites pertinentes.', 'Uma lei posterior é invocada para desconstituir de forma automática decisão definitiva. Qual categoria protege especificamente a estabilidade do julgado?', '39–42'],
      ] },
      { id: 'obrigacoes', title: 'Obrigações', book: 'civil2', facts: [
        ['prestacao', 'Prestação', 'É a conduta de dar, fazer ou não fazer que constitui o objeto imediato da obrigação.', 'O credor pode exigir que a outra parte execute um conserto já ajustado. Qual é o nome do elemento objetivo imediatamente exigível?', '3–9'],
        ['onus', 'Ônus jurídico', 'O sujeito pratica um ato em interesse próprio para obter ou preservar uma vantagem.', 'Uma parte deixa de tomar uma providência que lhe seria útil e perde a vantagem correspondente, sem violar dever perante a outra. Que categoria está em jogo?', '14–17'],
        ['recompensa', 'Promessa de recompensa', 'Uma declaração pública oferece vantagem a quem cumprir determinada condição ou realizar o serviço anunciado.', 'Uma pessoa anuncia publicamente que pagará a quem encontrar e devolver sua carteira. Qual fonte unilateral de obrigação o caso exemplifica?', '19–22'],
        ['indevido', 'Pagamento indevido', 'O recebimento de prestação sem dívida correspondente pode gerar dever de restituição.', 'Uma transferência é feita por acreditar, equivocadamente, que a parcela ainda estava em aberto. Qual figura corresponde diretamente à repetição desta prestação?', '24–28'],
        ['enriquecimento', 'Enriquecimento sem causa', 'Veda a retenção de vantagem patrimonial sem fundamento jurídico às custas de outra pessoa, observado o caráter subsidiário da restituição geral.', 'A questão parte de uma vantagem patrimonial injustificada e da ausência de remédio específico. Qual fundamento geral de restituição deve ser examinado?', '27–34'],
      ] },
      { id: 'contratos', title: 'Contratos', book: 'civil3', facts: [
        ['bilateral', 'Contrato bilateral', 'Há prestações reciprocamente vinculadas e ambas as partes assumem obrigações.', 'Uma parte deve entregar o bem e a outra deve pagar o preço. A pergunta considera a reciprocidade das obrigações. Qual é a categoria?', '22–23'],
        ['consensual', 'Contrato consensual', 'A formação se completa pelo acordo, sem exigir a entrega da coisa nesse momento.', 'O negócio se aperfeiçoa quando ambas as partes aceitam os termos, embora o objeto só seja entregue depois. Qual classe está descrita?', '24'],
        ['real', 'Contrato real', 'A entrega da coisa é elemento necessário ao aperfeiçoamento do contrato nessa classificação.', 'As partes ajustam o empréstimo gratuito de um objeto. A hipótese destaca que o contrato se aperfeiçoa com a entrega. Qual é a classe?', '24–25'],
        ['aleatorio', 'Contrato aleatório', 'A incerteza sobre a existência ou a extensão de uma prestação faz parte do risco assumido.', 'Um contratante assume expressamente o risco de que a produção futura esperada sequer exista. Qual classificação, quanto ao risco, é adequada?', '24–26'],
        ['boa-fe', 'Boa-fé objetiva', 'Impõe padrões de lealdade, cooperação e informação na relação contratual.', 'Um contratante oculta informação relevante para a execução do negócio. A análise se volta ao padrão de comportamento exigível, qualquer que seja sua crença. Qual princípio orienta o exame?', '73–83'],
      ] },
      { id: 'coisas', title: 'Direitos reais e posse', book: 'civil4', facts: [
        ['sequela', 'Direito de sequela', 'Permite ao titular perseguir a coisa vinculada ao seu direito mesmo quando passa às mãos de terceiro.', 'O bem é transferido a terceiro. O titular invoca uma prerrogativa real que acompanha a própria coisa. Qual característica é lembrada?', '6–8'],
        ['direta', 'Posse direta', 'É exercida por quem tem o bem sob seu poder imediato em virtude de uma relação jurídica.', 'Durante a locação, a inquilina recebe e usa o imóvel. Qual espécie de posse ela exerce?', '44–45'],
        ['indireta', 'Posse indireta', 'Conserva-se com quem atribuiu a outra pessoa o exercício imediato da posse.', 'Durante a locação, a proprietária mantém a relação possessória mediata, embora o bem esteja com a inquilina. Como se classifica essa posse?', '44–45'],
        ['detencao', 'Detenção', 'A pessoa conserva a coisa em nome alheio, em relação de dependência e em cumprimento de ordens.', 'O empregado guarda material da empresa obedecendo às instruções do empregador, em nome dele. Em que categoria sua atuação se enquadra?', '38–43'],
        ['funcao-social', 'Função social da propriedade', 'O exercício da propriedade é analisado também à luz das finalidades sociais do bem.', 'Um parecer examina o uso de uma propriedade à luz de suas repercussões sociais, além das faculdades individuais do dono. Qual ideia fundamenta essa leitura?', '23–28'],
      ] },
      { id: 'familia', title: 'Direito de Família', book: 'civil5', facts: [
        ['filhos', 'Igualdade entre filhos', 'A origem do vínculo de filiação não autoriza tratamentos jurídicos discriminatórios.', 'Uma proposta reduz a posição de um filho exclusivamente por ser adotivo. Que princípio específico incide sobre essa distinção?', '17–20'],
        ['solidariedade', 'Solidariedade familiar', 'Dá fundamento a deveres recíprocos de amparo e cooperação entre familiares.', 'Ao justificar um dever jurídico de assistência entre familiares, o argumento central é o amparo recíproco inerente à relação. Qual princípio foi mobilizado?', '15–17'],
        ['chefia', 'Igualdade na chefia familiar', 'Afasta a subordinação entre cônjuges na direção da família e no exercício de suas responsabilidades.', 'Uma regra entrega a um dos cônjuges o poder exclusivo de decidir assuntos familiares em razão do gênero. Qual princípio específico essa regra contraria?', '20–22'],
        ['guarda', 'Guarda compartilhada', 'Envolve responsabilização conjunta e exercício compartilhado de direitos e deveres parentais.', 'Apesar de residências distintas, os pais participam conjuntamente das decisões importantes relativas à criança. Qual modalidade de guarda é exemplificada?', '360–364'],
      ] },
      { id: 'sucessoes', title: 'Sucessões', book: 'civil6', facts: [
        ['legitima', 'Sucessão legítima', 'A lei define a ordem de vocação hereditária aplicável ao patrimônio alcançado por essa modalidade.', 'Na ausência de disposição válida de última vontade para determinado bem, busca-se na lei quem será chamado a suceder. Qual modalidade se aplica?', '7–9'],
        ['testamentaria', 'Sucessão testamentária', 'Decorre de disposição de última vontade, dentro dos limites legais.', 'Quanto à parcela disponível, uma pessoa indica em testamento o destinatário de certo bem. Qual modalidade fundamenta essa destinação?', '7–9'],
        ['saisine', 'Saisine', 'A herança se transmite com a abertura da sucessão, situada no momento da morte.', 'Uma pessoa morre hoje e o inventário só começa meses depois. Qual princípio explica a transmissão no momento da morte?', '9–12'],
        ['espolio', 'Espólio', 'É a massa patrimonial do falecido considerada unitariamente para fins de administração e representação processual.', 'Antes da partilha, uma cobrança relativa à massa de bens deixada pelo falecido precisa identificar essa unidade patrimonial no processo. Qual figura deve constar?', '35–40'],
        ['renuncia', 'Renúncia à herança', 'É ato expresso e formal pelo qual o chamado rejeita a herança.', 'Uma herdeira decide rejeitar a herança e manifesta formalmente essa decisão. Qual ato sucessório ela pratica?', '99–104'],
      ] },
    ],
  },
  {
    id: 'processo-civil', title: 'Direito Processual Civil', cover: 'processoCivil', modules: [
      { id: 'execucao', title: 'Execução civil e cumprimento', book: 'processoCivil', facts: [
        ['cumprimento', 'Cumprimento de sentença', 'É a fase ou via destinada a efetivar a obrigação reconhecida em título judicial, conforme a hipótese processual.', 'Após obter sentença condenatória exigível no próprio processo, a credora pede a efetivação do comando judicial. Qual é a via em foco?', '7–16'],
        ['titulo', 'Título executivo', 'É o suporte legalmente reconhecido que autoriza a execução forçada da obrigação nele representada.', 'Antes de instaurar a execução, o juiz verifica se o documento apresentado tem força executiva atribuída por lei. Qual elemento processual está sendo verificado?', '17–25'],
        ['liquidacao', 'Liquidação de sentença', 'Determina a quantia ou extensão da obrigação reconhecida em decisão judicial ilíquida quando essa determinação é necessária.', 'A sentença reconhece o dever de indenizar, mas ainda faltam elementos para determinar o valor. Qual procedimento serve para apurá-lo antes de exigir pagamento?', '51–60'],
        ['embargos', 'Embargos à execução', 'Constituem via típica de defesa do executado na execução fundada em título extrajudicial.', 'Citado na execução de título extrajudicial, o executado pretende deduzir sua defesa pela via típica prevista para essa relação executiva. Qual é a via?', '8–14, 58–65'],
        ['impugnacao', 'Impugnação ao cumprimento de sentença', 'É a via típica pela qual o executado suscita matérias de defesa na fase de cumprimento.', 'Uma dívida já foi reconhecida judicialmente. Na fase de cumprimento, o executado pretende alegar excesso pela via típica correspondente. Qual é ela?', '12–16, 42–45'],
      ] },
    ],
  },
  {
    id: 'administrativo', title: 'Direito Administrativo', cover: 'administrativo', modules: [
      { id: 'atos', title: 'Atos administrativos', book: 'administrativo', facts: [
        ['legitimidade', 'Presunção de legitimidade', 'Até prova em contrário, parte-se da conformidade do ato com a ordem jurídica.', 'Ao receber um ato administrativo, a pessoa presume inicialmente que ele foi praticado de acordo com a lei, embora possa contestá-lo. Que atributo está em foco?', '236–238'],
        ['veracidade', 'Presunção de veracidade', 'Incide sobre os fatos afirmados pela Administração e pode ser afastada por prova em contrário.', 'A discussão recai sobre a presunção relativa de que o fato registrado por um agente público efetivamente ocorreu. Como ela se denomina?', '237–238'],
        ['imperatividade', 'Imperatividade', 'Permite a imposição unilateral de obrigações ao administrado nas hipóteses cabíveis.', 'Em uma medida legal que impõe dever, o destinatário não precisa concordar para que a obrigação seja constituída. Qual atributo aparece?', '238–240'],
        ['autoexecutoriedade', 'Autoexecutoriedade', 'Permite a execução material de certas decisões sem ordem judicial prévia nas hipóteses admitidas.', 'Havendo autorização legal, a Administração executa materialmente medida urgente, sem buscar primeiro uma ordem judicial. Qual atributo fundamenta esse modo de execução?', '239–241'],
        ['motivacao', 'Motivação', 'Consiste em exteriorizar os fundamentos de fato e de direito do ato.', 'Em vez de examinar se os fatos existiram, o revisor verifica se a decisão expôs as razões que a sustentam. Que aspecto do ato está sendo conferido?', '248–250'],
      ] },
      { id: 'organizacao', title: 'Organização administrativa', book: 'administrativo', facts: [
        ['desconcentracao', 'Desconcentração', 'Distribui competências entre órgãos internos da mesma pessoa jurídica.', 'Um ministério distribui atribuições entre departamentos internos subordinados. Nenhuma nova pessoa jurídica surge. Como se chama a técnica?', '521–523'],
        ['descentralizacao', 'Descentralização', 'Reparte atribuições entre pessoas jurídicas distintas.', 'O titular da função transfere sua execução a uma pessoa jurídica diversa. Qual técnica se distingue da distribuição interna por esse elemento?', '521–524'],
        ['hierarquia', 'Hierarquia', 'Organiza relações internas de subordinação entre órgãos e agentes da mesma estrutura.', 'Uma autoridade superior coordena o trabalho das unidades subordinadas dentro da mesma pessoa jurídica. Que relação estrutural explica o comando interno?', '521–523'],
        ['cooperacao', 'Cooperação federativa', 'Pessoas políticas distintas atuam em conjunto para prestar interesses comuns, sem que o ajuste por si configure repartição interna de competências.', 'Dois municípios celebram ajuste para colaborar em serviço de interesse comum. A pergunta examina a atuação conjunta entre entes políticos. Qual conceito está em foco?', '527–529'],
      ] },
    ],
  },
  {
    id: 'eleitoral', title: 'Direito Eleitoral', cover: 'eleit', modules: [
      { id: 'direitos-politicos', title: 'Direitos políticos e candidaturas', book: 'eleitoral', facts: [
        ['ativa', 'Capacidade eleitoral ativa', 'Consiste na aptidão jurídica para votar.', 'A questão pergunta exclusivamente se a pessoa pode exercer o voto, sem tratar de candidatura. Que dimensão dos direitos políticos está em jogo?', '184–186, 193–195'],
        ['passiva', 'Capacidade eleitoral passiva', 'É a aptidão para ser votado, condicionada ao atendimento dos requisitos de elegibilidade e à ausência de impedimentos.', 'Uma pessoa está apta a votar. A análise seguinte pergunta se pode disputar validamente um mandato eletivo. Qual dimensão está em exame?', '184–186, 205–209'],
        ['alistamento', 'Alistamento eleitoral', 'É o procedimento de inscrição que habilita o interessado a integrar o corpo eleitoral.', 'Uma pessoa pede a primeira inscrição no cadastro para poder exercer regularmente o voto. Qual procedimento está em curso?', '185–190'],
        ['desincompatibilizacao', 'Desincompatibilização', 'É o afastamento da atividade ou função incompatível com a candidatura, observado o prazo aplicável.', 'Para concorrer, determinada pessoa precisa afastar-se de uma função pública dentro do prazo exigido. Qual instituto descreve esse afastamento?', '228–231'],
      ] },
    ],
  },
  {
    id: 'consumidor', title: 'Direito do Consumidor', cover: 'consumidor', modules: [
      { id: 'relacao-consumo', title: 'Relação de consumo e responsabilidade', book: 'consumidor', facts: [
        ['dialogo', 'Diálogo das fontes', 'Permite coordenar diplomas compatíveis para resolver o caso e preservar o propósito protetivo.', 'Em contrato de consumo, a intérprete aplica a proteção do CDC e integra a figura contratual com uma regra compatível do Código Civil. Qual orientação está em jogo?', '13–17'],
        ['vulnerabilidade', 'Vulnerabilidade', 'Traduz a posição de fragilidade do consumidor no mercado e fundamenta a tutela material.', 'Um consumidor com alta renda ainda é reconhecido como a parte vulnerável da relação de consumo. Qual princípio explica por que renda não resolve essa classificação?', '26–32'],
        ['hipossuficiencia', 'Hipossuficiência', 'Pode ser apreciada no caso concreto, inclusive sob o aspecto técnico ou informacional, em questões processuais de prova.', 'A consumidora não consegue acessar dados técnicos mantidos exclusivamente pelo fornecedor. Qual condição concreta se examina para fins probatórios?', '29–32, 98–101'],
        ['vicio', 'Vício do produto', 'Compromete a adequação ou utilidade do produto, sem que a hipótese necessariamente envolva dano externo.', 'Uma máquina nova para de funcionar por falha interna, sem atingir ninguém ou danificar outros bens. Que regime se considera primeiro?', '163–166'],
        ['fato', 'Fato do produto', 'Abrange o acidente de consumo decorrente de defeito que afeta a segurança e causa dano além da inadequação do bem.', 'A falha de um eletrodoméstico provoca incêndio que danifica os móveis da consumidora. Que categoria descreve a lesão que ultrapassa o próprio produto?', '163–167'],
      ] },
    ],
  },
];
