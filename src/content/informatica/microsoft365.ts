// Questões originais sobre os itens do edital que o Manual não aprofunda (Windows 10/11 atual,
// Microsoft 365, Teams e OneDrive). Fonte: artigos do Suporte Microsoft em português
// (support.microsoft.com/pt-br). A "página" é o número da ficha:
//  1 Explorador de Arquivos e pastas      2 Atalhos de teclado do Windows
//  3 Área de transferência e Microsoft 365 4 Word: estrutura, tabelas, legendas e índices
//  5 Excel: fórmulas e funções            6 Excel: classificar, filtrar, importar dados e macros
//  7 OneDrive: armazenamento e sincronização 8 OneDrive: compartilhamento, versões e Lixeira
//  9 Teams: chats e chamadas              10 Teams: equipes, canais e colaboração
// 11 Teams: agendar e gravar reuniões     12 Outlook: mensagens e anexos
export const microsoft365 = `
@S01|Windows 10 e 11: arquivos, pastas e atalhos|1–2
1|No Explorador de Arquivos, a extensão do nome do arquivo (por exemplo, .docx ou .pdf) indica o tipo de arquivo e o programa associado à sua abertura.|C|O Windows usa a extensão para associar o arquivo ao aplicativo padrão.
1|No Explorador de Arquivos do Windows, o atalho Ctrl+Shift+N|cria uma nova pasta no local aberto|O atalho cria a pasta e já deixa o nome em edição.|abre uma nova janela anônima|cria um novo documento de texto|abre as propriedades da pasta|renomeia a pasta selecionada
2|O atalho Windows+L|bloqueia o computador|Bloquear a sessão protege os dados ao se afastar da mesa; a sessão continua aberta.|desliga o computador|abre o Explorador de Arquivos|mostra a área de trabalho|abre as configurações
2|No Windows, o atalho Windows+Shift+S abre a ferramenta de captura para recortar uma parte da tela.|C|A captura vai para a área de transferência e pode ser colada em outro aplicativo.
2|O atalho Windows+D minimiza todas as janelas e mostra a área de trabalho; repetido, restaura as janelas.|C|É útil para acessar rapidamente ícones da área de trabalho.
1|Para selecionar vários arquivos não adjacentes no Explorador de Arquivos, deve-se clicar sobre eles mantendo pressionada a tecla|Ctrl|Ctrl seleciona itens alternados; Shift seleciona um intervalo contínuo.|Shift|Alt|Windows|Tab

@S02|Área de transferência e integração com o Microsoft 365|3
3|O histórico da área de transferência do Windows, aberto com Windows+V, permite colar itens copiados anteriormente, e não apenas o último.|C|Após ativado, o histórico guarda vários itens recentes de texto e imagem.
3|No Windows 10 e 11, a pasta Documentos pode ser sincronizada com o OneDrive, o que permite acessar os arquivos em outros dispositivos.|C|O backup de pastas do OneDrive protege Área de Trabalho, Documentos e Imagens.
3|Os aplicativos do Microsoft 365 permitem que várias pessoas editem o mesmo documento ao mesmo tempo quando ele está salvo no OneDrive ou no SharePoint.|C|A coautoria depende de o arquivo estar armazenado na nuvem.

@S03|Word: estrutura, tabelas, legendas e índices|4
4|No Word, para numerar automaticamente figuras e tabelas ("Figura 1", "Tabela 2"), usa-se o recurso|Inserir Legenda, na guia Referências|Legendas numeradas podem gerar depois um índice de ilustrações.|Marcadores, na guia Página Inicial|Cabeçalho, na guia Inserir|Quebras, na guia Layout|Controlar Alterações, na guia Revisão
4|No Word, cabeçalho e rodapé são áreas das margens superior e inferior que se repetem nas páginas e podem conter, por exemplo, o número da página.|C|O número de página é inserido como campo e se atualiza automaticamente.
4|No Word, o recurso Colunas, da guia Layout, permite distribuir o texto em duas ou mais colunas, como em jornais.|C|Com quebras de seção, é possível ter colunas só em parte do documento.
4|No Word, campos (como data, número de página e sumário) são atualizados automaticamente ou com a tecla F9.|C|Campos são códigos que exibem informações dinâmicas.
4|Uma caixa de texto, no Word, é um objeto que pode ser posicionado livremente na página e conter texto independente do fluxo principal.|C|A caixa de texto é inserida pela guia Inserir.

@S04|Excel: fórmulas, funções, classificação e dados|5–6
5|A fórmula =MÉDIA(B2:B5), com os valores 4, 6, 8 e vazio em B5, retorna|6|A função MÉDIA ignora células vazias: (4 + 6 + 8) / 3 = 6.|4,5|4|18|#DIV/0!
5|A fórmula =ARRED(7,456;2) retorna 7,46.|C|ARRED arredonda para o número de casas indicado no segundo argumento.
5|A função =HOJE() retorna a data atual, e =AGORA() retorna a data e a hora atuais.|C|Ambas são voláteis: o valor é recalculado ao abrir ou atualizar a planilha.
5|Para unir o texto de A1 e B1 com um espaço entre eles, pode-se usar|=A1&" "&B1|O operador & concatena textos; CONCAT e CONCATENAR têm o mesmo efeito.|=A1+" "+B1|=SOMA(A1;B1)|=A1;B1|=UNIR(A1:B1)
6|Classificar uma lista em ordem decrescente pela coluna "Valor" reorganiza as linhas inteiras, mantendo os dados de cada registro juntos.|C|A classificação considera o intervalo de dados selecionado, e não só a coluna.
6|No Excel, macros são sequências de comandos gravadas (em VBA) que automatizam tarefas repetitivas; arquivos com macros são salvos no formato .xlsm.|C|O formato .xlsx não armazena macros.
6|A importação de dados externos (por exemplo, de um arquivo de texto ou CSV) é feita pela guia|Dados|A guia Dados reúne obter dados externos, classificar, filtrar e ferramentas de dados.|Página Inicial|Inserir|Fórmulas|Exibir

@S05|OneDrive: armazenar e compartilhar|7–8
7|Com o recurso Arquivos Sob Demanda do OneDrive, o arquivo marcado com ícone de nuvem está disponível apenas on-line e é baixado quando aberto.|C|O recurso economiza espaço: o arquivo aparece no Explorador, mas só é baixado quando necessário.
8|Ao compartilhar um arquivo do OneDrive, é possível escolher se quem recebe o link pode editar ou apenas exibir o conteúdo.|C|As configurações do link definem a permissão e, conforme a conta, validade e senha.
8|Um arquivo excluído do OneDrive vai para a Lixeira do OneDrive. Em conta pessoal, ele é apagado automaticamente após|30 dias|Em contas corporativas ou de estudante, o prazo padrão é de 93 dias, salvo configuração do administrador.|7 dias|60 dias|um ano|nunca, até que o usuário a esvazie
8|O histórico de versões do OneDrive permite restaurar uma versão anterior de um documento do Office.|C|Útil quando o arquivo foi alterado por engano ou corrompido.
7|Esvaziar a Lixeira do computador não esvazia a Lixeira do OneDrive na web.|C|A Lixeira do OneDrive é gerenciada no site ou no aplicativo do OneDrive.

@S06|Teams: chats, equipes e canais|9–10
9|No Microsoft Teams, conversas de chat podem ser individuais ou em grupo e não exigem a criação de uma equipe.|C|Chats ficam fora das equipes; canais pertencem a uma equipe.
10|No Teams, as equipes se organizam em canais, que podem ser padrão, privados ou compartilhados.|C|Canais padrão são visíveis a todos os membros; privados, a parte deles; compartilhados, a pessoas de outras equipes.
10|Para chamar a atenção de um colega em uma conversa do Teams, usa-se|@ seguido do nome da pessoa (menção)|A menção gera notificação específica para a pessoa citada.|# seguido do nome da pessoa|o comando /nome|o envio por Cco|a reação de curtir
10|Arquivos compartilhados em um canal do Teams ficam armazenados no SharePoint da equipe e podem ser editados em conjunto no Word, no Excel e no PowerPoint.|C|A aba Arquivos do canal corresponde a uma biblioteca do SharePoint.
9|No Teams é possível fazer chamadas de áudio e vídeo diretamente de um chat individual ou em grupo.|C|Os ícones de chamada aparecem no topo da conversa.
10|No Teams, o OneNote pode ser adicionado como guia de um canal para anotações compartilhadas pela equipe.|C|Guias integram aplicativos (OneNote, Planner, Excel, sites) ao canal.

@S07|Teams: reuniões e gravações|11
11|Reuniões do Teams podem ser agendadas pelo Calendário do próprio Teams ou pelo Outlook.|C|O convite inclui o link de participação.
11|Gravações de reuniões do Teams que não são de canal ficam salvas, em regra, no OneDrive de quem iniciou a gravação; as de reuniões de canal, no SharePoint da equipe.|C|O armazenamento segue o local de origem da reunião.
11|A sala de espera (lobby) de uma reunião do Teams permite que o organizador decida quem entra.|C|As opções da reunião definem quem pode ignorar a sala de espera.
11|Durante uma reunião no Teams, o participante pode compartilhar a tela inteira ou apenas uma janela específica.|C|O compartilhamento seletivo evita expor outras janelas abertas.

@S08|Outlook: mensagens e anexos|12
12|No Outlook, para enviar um documento junto da mensagem, usa-se o comando|Anexar Arquivo|O anexo segue com a mensagem; também é possível compartilhar um link do OneDrive.|Encaminhar|Responder a Todos|Cco|Prioridade Alta
12|Enviar um link de compartilhamento do OneDrive em vez de anexar o arquivo permite que todos trabalhem na mesma versão do documento.|C|O anexo gera cópias separadas; o link aponta para o arquivo único na nuvem.
`;
