// Textos legais do app (Política de Privacidade, Termos de Uso e Sobre), exigidos pelas lojas
// e pela LGPD (Lei 13.709/2018). Revisar o campo RESPONSAVEL e o contato antes de publicar.
export const LEGAL_UPDATED = '20 de novembro de 2026';
export const RESPONSAVEL = 'Responsável pelo LEX (dados a preencher antes da publicação nas lojas)';
export const CONTATO = 'pela seção Ajuda e contato, no perfil do LEX';

export interface LegalSection { h: string; p: string[] }
export const PRIVACIDADE: LegalSection[] = [
  { h: 'Resumo', p: ['O LEX funciona sem conta e sem servidor próprio. Seu progresso, suas anotações, seus check-ins de bem-estar e suas preferências ficam guardados apenas neste aparelho. Não vendemos, não compartilhamos e não usamos seus dados para publicidade.'] },
  { h: 'Quem é o controlador', p: [`${RESPONSAVEL}. Contato: ${CONTATO}.`] },
  { h: 'Quais dados o app trata', p: [
    'Progresso de estudo (respostas, revisões, tempo de estudo, pontos, carreira, folha de ponto e liga): gerado por você e armazenado localmente (IndexedDB do aparelho).',
    'Preferências (nome ou apelido opcional, metas, aparência, horário de estudo): armazenadas localmente.',
    'Check-in de bem-estar (humor e anotação opcional): dado pessoal sensível de saúde nos termos do art. 5º, II, da LGPD. É opcional, pode ser recusado a cada dia ("Prefiro não responder") ou desligado em Você, e nunca sai do aparelho.',
    'Localização aproximada para o clima e os trajes do Capi. Você pode indicar uma cidade ou usar o GPS. As coordenadas são arredondadas (cerca de 1 km) antes de qualquer envio.',
  ] },
  { h: 'Com quem os dados são compartilhados', p: [
    'Open-Meteo (open-meteo.com): recebe somente as coordenadas arredondadas ou o nome da cidade digitada, para devolver a temperatura e o tempo. Nenhum identificador seu é enviado. Você pode desligar o clima em Você → Aparência.',
    'Nenhum outro terceiro recebe dados. O app não usa ferramentas de análise, rastreamento ou anúncios.',
  ] },
  { h: 'Bases legais (LGPD, art. 7º e art. 11)', p: ['Execução do serviço que você pediu (estudo e progresso), consentimento para o clima por localização e consentimento específico e destacado para o check-in de bem-estar, revogável a qualquer momento.'] },
  { h: 'Por quanto tempo', p: ['Os dados ficam no aparelho até você apagá-los. O histórico de humor guarda no máximo os últimos 120 registros.'] },
  { h: 'Seus direitos (LGPD, art. 18)', p: ['Acesso e portabilidade: Você → Dados → Exportar backup. Correção: edite nas próprias telas. Eliminação: Você → Dados → Apagar todos os dados (apaga tudo deste aparelho, sem cópia em servidor). Revogação do consentimento: desligue o clima ou o bem-estar em Você.'] },
  { h: 'Crianças e adolescentes', p: ['O LEX é destinado a estudantes e concurseiros. Menores de 18 anos devem usá-lo com ciência dos responsáveis.'] },
  { h: 'Segurança', p: ['Como não há servidor, não há base central a ser invadida. Proteja o aparelho com senha ou biometria; quem tiver acesso ao aparelho desbloqueado poderá ver o seu progresso.'] },
  { h: 'Alterações', p: [`Esta política pode mudar quando surgirem recursos online (como ranking e câmaras). Você será avisado no app antes. Última atualização: ${LEGAL_UPDATED}.`] },
];

export const TERMOS: LegalSection[] = [
  { h: 'O que é o LEX', p: ['Um app de estudo da legislação brasileira em formato de jogo: lei seca, casos, simulados e revisão espaçada. Ao usar o app, você concorda com estes termos.'] },
  { h: 'Não é fonte oficial', p: [
    'Os textos legais vêm de fontes públicas oficiais (Senado Federal, Planalto, Assembleias Legislativas e Tribunais) e são conferidos por rotinas automáticas, mas podem conter atrasos ou erros. Para qualquer uso profissional, processual ou em prova, confira sempre o texto na fonte oficial indicada em cada lei.',
    'O LEX não tem vínculo com o Senado, a Presidência da República, o TJSP, o TJMS, o TSE ou qualquer órgão público ou banca organizadora. Nomes de tribunais e editais são usados apenas para indicar o conteúdo estudado.',
  ] },
  { h: 'Não é aconselhamento jurídico', p: ['Explicações, casos e comentários têm fim didático e não substituem a orientação de um advogado ou de outro profissional habilitado.'] },
  { h: 'Bem-estar', p: ['O check-in de humor e a respiração guiada são ferramentas de autocuidado, não serviço de saúde. Em sofrimento intenso, procure ajuda profissional. O CVV atende de graça, 24 horas, pelo 188.'] },
  { h: 'Uso adequado', p: ['O conteúdo é para seu estudo pessoal. Não copie o app ou seus conteúdos didáticos para revenda. Materiais pessoais que você importar (como doutrina do seu acervo) são de sua responsabilidade e ficam só no seu aparelho.'] },
  { h: 'Recursos futuros', p: ['Ranking, câmaras (clubes) e outros recursos online, quando lançados, poderão exigir conta e ter regras próprias de convivência.'] },
  { h: 'Responsabilidade', p: ['O app é oferecido "no estado em que se encontra". Fazemos o possível para manter a lei atualizada, mas não garantimos resultado em provas.'] },
  { h: 'Lei aplicável', p: [`Estes termos seguem a lei brasileira, inclusive o Código de Defesa do Consumidor quando aplicável. Última atualização: ${LEGAL_UPDATED}.`] },
];

export const SOBRE: LegalSection[] = [
  { h: 'Fontes da legislação', p: ['Senado Federal (Normas/LexML), Portal da Legislação do Planalto, Assembleia Legislativa de SP, Assembleia Legislativa de MS, Tribunal de Justiça de SP e Tribunal de Justiça de MS. Cada lei mostra a fonte, a versão e a data da conferência.'] },
  { h: 'Clima e localização', p: ['Weather data by Open-Meteo.com, licença CC BY 4.0. Malhas estaduais do IBGE para associar a posição aproximada do dispositivo a uma unidade da federação. O cruzamento com a malha é feito no aparelho.'] },
  { h: 'Tecnologia e licenças', p: ['React, Vite, Dexie, Motion e ts-fsrs (licença MIT). Fonte Open Sans (SIL Open Font License 1.1). Algoritmo de repetição espaçada FSRS.'] },
  { h: 'Mascote', p: ['Capi, a capivara de toga, foi desenhada para o LEX.'] },
];
