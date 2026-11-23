const a=`
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
`,e=`
@I01|Hardware e conceitos básicos|8–15
11|A memória RAM é volátil: seu conteúdo se perde quando o computador é desligado.|C|A RAM guarda dados e programas em uso e depende de energia. O armazenamento permanente fica nas memórias secundárias (HD, SSD).
12|Em relação ao armazenamento, é correto afirmar que|o SSD não tem partes móveis e costuma ser mais rápido que o HD|O SSD usa memória flash, sem disco nem cabeça de leitura, o que reduz o tempo de acesso.|o HD é uma memória volátil|o SSD perde os dados ao desligar o computador|o HD é mais rápido por usar memória flash|a memória RAM é a principal memória secundária
14|Uma impressora multifuncional que também digitaliza documentos é periférico de|entrada e saída|Ao imprimir, envia informação para fora (saída); ao digitalizar, leva informação ao computador (entrada).|apenas entrada|apenas saída|armazenamento|processamento
10|O processador (CPU) é o componente responsável por executar as instruções dos programas.|C|A CPU processa as instruções e coordena as operações do computador.

@I02|Microsoft 365 e editor de texto (Word)|16–18
17|O Microsoft 365 é oferecido como serviço em nuvem por assinatura e inclui, além de Word, Excel, PowerPoint e Outlook, aplicativos como OneDrive e Teams.|C|O pacote em nuvem reúne aplicativos de produtividade, armazenamento e comunicação, acessíveis em vários dispositivos.
18, 23|No Word em português, o atalho Ctrl+N aplica|negrito|Na versão em português: Ctrl+N negrito, Ctrl+I itálico, Ctrl+S sublinhado.|novo documento|sublinhado|itálico|numeração
18, 23|No Word em português, os atalhos Ctrl+E e Ctrl+J aplicam, respectivamente,|alinhamento centralizado e justificado|Ctrl+E centraliza, Ctrl+J justifica, Ctrl+G alinha à direita e Ctrl+Q à esquerda.|alinhamento à esquerda e à direita|espaçamento e recuo|negrito e itálico|centralizado e à direita
18|O atalho Ctrl+Enter, no Word, insere uma quebra de página manual.|C|O cursor passa para o início da página seguinte.
18, 23|No Word em português, o atalho Ctrl+B executa o comando|Salvar|Ctrl+B salva o documento; F12 abre "Salvar como"; Ctrl+P imprime; Ctrl+L localiza; Ctrl+U substitui.|Negrito|Abrir|Localizar|Imprimir
18|O comando Pincel de Formatação copia a formatação de um trecho para aplicá-la a outro, sem copiar o texto.|C|O pincel replica fonte, tamanho, cor e outros atributos de formatação.
18, 23|Para gerar um sumário automático no Word, o caminho recomendado é|aplicar estilos de título aos títulos e inserir o sumário pela guia Referências|O sumário automático é montado a partir dos estilos de título (Título 1, Título 2...).|digitar os títulos em negrito e usar Ctrl+Enter|inserir uma tabela e numerar manualmente as páginas|aplicar marcadores a cada título|usar a guia Revisão e o comando Contar Palavras
18|O formato padrão de documento do Word desde a versão 2007 é o DOCX.|C|Até a versão 2003 o padrão era DOC. O Word também salva em PDF.

@I03|Editor de planilhas (Excel)|19
19, 26|Na planilha, a fórmula =SOMA(A1:A4) soma|os valores de A1, A2, A3 e A4|Os dois-pontos indicam intervalo contínuo. Para somar só A1 e A4, usa-se o ponto e vírgula: =SOMA(A1;A4).|apenas A1 e A4|apenas A1 e A2|os valores de A1 a A4 e divide por 4|o número de células preenchidas de A1 a A4
19, 26|Ao copiar a fórmula =B2*$C$1 da célula D2 para D3, obtém-se|=B3*$C$1|A referência relativa (B2) se ajusta à nova linha; a absoluta ($C$1) permanece fixa.|=B2*$C$2|=B3*$C$2|=C3*$C$1|=B2*$C$1
19, 26|A fórmula =SE(A1>=7;"Aprovado";"Reprovado"), com 6,5 em A1, retorna|Reprovado|O teste lógico (6,5 >= 7) é falso; a função retorna o terceiro argumento.|Aprovado|VERDADEIRO|FALSO|#VALOR!
19, 26|Para contar quantas células do intervalo B2:B50 contêm a palavra "Deferido", usa-se|=CONT.SE(B2:B50;"Deferido")|CONT.SE conta as células que atendem ao critério. CONT.VALORES conta as não vazias; CONT.NÚM, as numéricas.|=SOMASE(B2:B50;"Deferido")|=CONT.VALORES(B2:B50)|=CONT.NÚM(B2:B50;"Deferido")|=SE(B2:B50="Deferido")
19, 26|A fórmula =PROCV(105;A2:D40;3;FALSO) procura o valor 105 na primeira coluna do intervalo e retorna o conteúdo da terceira coluna da mesma linha, exigindo correspondência exata.|C|O último argumento FALSO (ou 0) exige correspondência exata.
19|No Excel, o resultado de =2+3*4 é|14|A multiplicação tem precedência sobre a adição: 3*4 = 12; 12 + 2 = 14.|20|24|9|10
19, 26|A fórmula =SOMASE(A2:A10;"Cível";B2:B10) soma os valores de B2:B10 cujas células correspondentes em A2:A10 contenham "Cível".|C|SOMASE testa o critério no primeiro intervalo e soma o intervalo indicado no terceiro argumento.
19|A mensagem de erro #DIV/0! indica|divisão por zero ou por célula vazia|O Excel não divide por zero; células vazias são tratadas como zero nesse cálculo.|referência a célula excluída|nome de função digitado errado|valor não encontrado em pesquisa|texto usado onde se espera número

@I04|Apresentações e questões de Office|20–28
20|No PowerPoint, o modo Apresentação de Slides é iniciado a partir do primeiro slide com a tecla F5.|C|F5 inicia do começo; Shift+F5, do slide atual.
22–24|No Word, a guia Revisão reúne recursos como Ortografia e Gramática, Novo Comentário e Controlar Alterações.|C|Controlar Alterações registra inserções e exclusões para revisão colaborativa.
25–27|No Excel, o recurso Filtro permite exibir apenas as linhas que atendem a critérios, sem excluir as demais.|C|O filtro oculta temporariamente as linhas que não atendem ao critério.
25–27|Para manter fixa a referência à célula C1 ao copiar uma fórmula, deve-se escrever|$C$1|O cifrão fixa a coluna e a linha. $C1 fixa só a coluna; C$1, só a linha.|C1|C$1|$C1|#C#1
22–24|No Word, a quebra de seção permite usar, no mesmo documento, orientações de página diferentes (retrato e paisagem).|C|Cada seção pode ter configuração própria de margens, orientação, colunas, cabeçalho e rodapé.
25–27|A alça de preenchimento do Excel, arrastada a partir de uma célula com "Janeiro", completa as células seguintes com Fevereiro, Março e assim por diante.|C|O Excel reconhece sequências conhecidas (meses, dias da semana, números em progressão).

@I05|Bancos de dados|29–37
31|Em SQL, o comando SELECT é usado para consultar dados de uma ou mais tabelas.|C|SELECT recupera registros; INSERT inclui; UPDATE altera; DELETE exclui.
31–34|O comando SQL usado para alterar registros já existentes em uma tabela é|UPDATE|UPDATE modifica valores de registros existentes.|INSERT|SELECT|DELETE|CREATE

@I06|Internet e navegação|38–46
40, 45|No endereço https://www.tjsp.jus.br/Concursos, o trecho "https" indica|o protocolo de comunicação seguro (HTTP com criptografia)|O "s" indica conexão protegida por criptografia (TLS). "www.tjsp.jus.br" é o domínio e "/Concursos", o caminho do recurso.|o domínio do tribunal|a pasta do servidor|o tipo de arquivo da página|o nome do navegador
40|URL é o endereço que localiza um recurso na internet, como uma página, uma imagem ou um arquivo.|C|URL significa Localizador Uniforme de Recursos.
41, 46|Nos navegadores, a navegação anônima (privada) impede que o provedor de internet e o empregador vejam os sites acessados.|E|A navegação privada só deixa de gravar histórico, cookies e dados de formulário no próprio dispositivo. A rede continua vendo o tráfego.
41, 46|Nos principais navegadores, o atalho Ctrl+Shift+T|reabre a última guia fechada|Ctrl+T abre nova guia; Ctrl+W fecha a guia; Ctrl+H abre o histórico; Ctrl+D adiciona aos favoritos.|abre uma nova guia anônima|fecha todas as guias|abre o histórico|adiciona a página aos favoritos
45|Intranet é uma rede privada, restrita a uma organização, que usa as mesmas tecnologias e protocolos da internet.|C|A intranet aplica os protocolos da internet em ambiente de acesso restrito.
41|Para imprimir a página aberta no navegador, usa-se o atalho Ctrl+P.|C|Ctrl+P abre a janela de impressão, com opção de salvar em PDF.
43|Um link (hiperlink) é uma referência que, ao ser acionada, leva a outro documento, página ou parte do mesmo documento.|C|Links conectam recursos na web e podem apontar para outros sites ou âncoras internas.

@I07|Correio eletrônico e busca|47–49
47|Ao enviar um e-mail, os endereços informados no campo Cco (cópia oculta) não ficam visíveis para os demais destinatários.|C|Cco preserva a privacidade dos endereços. O campo Cc mostra a todos quem recebeu cópia.
47|Ao encaminhar um e-mail recebido com anexo, o anexo é mantido; ao responder, em regra, o anexo original não é reenviado.|C|Encaminhar repassa a mensagem com anexos; Responder e Responder a todos, por padrão, não os incluem.
47|O protocolo usado no envio de mensagens de correio eletrônico é o|SMTP|SMTP envia; POP3 e IMAP são usados para receber. O IMAP mantém as mensagens sincronizadas no servidor.|POP3|IMAP|HTTP|FTP
47|"Responder a todos" envia a resposta ao remetente e aos destinatários dos campos Para e Cc, mas não aos que estavam em Cco.|C|Os destinatários em cópia oculta não aparecem na mensagem e por isso não são incluídos.
49|Em buscadores como o Google, a pesquisa "improbidade administrativa" site:jus.br retorna apenas páginas do domínio jus.br que contenham a expressão exata.|C|As aspas exigem a expressão exata; o operador site: restringe o domínio.
49|Em buscadores, o sinal de menos antes de uma palavra (por exemplo, recurso -eleitoral)|exclui dos resultados as páginas com essa palavra|O operador "-" elimina resultados que contenham o termo.|obriga a palavra a aparecer|busca sinônimos da palavra|busca apenas no título|busca arquivos PDF

@I08|Windows e sistemas operacionais|50–61
57|No Windows, o atalho Windows+E abre o|Explorador de Arquivos|Windows+D mostra a área de trabalho; Windows+L bloqueia a sessão; Windows+V abre o histórico da área de transferência.|Menu Iniciar|Painel de Controle|navegador padrão|Gerenciador de Tarefas
57, 59|Ao selecionar um arquivo de uma unidade local e pressionar Shift+Delete, o arquivo é excluído sem passar pela Lixeira.|C|Shift+Delete exclui permanentemente, após confirmação. Delete envia para a Lixeira.
59|Ao arrastar um arquivo com o mouse entre pastas da mesma unidade, o padrão do Windows é|mover o arquivo|Na mesma unidade, arrastar move; para outra unidade, arrastar copia. Com Ctrl, força-se a cópia; com Shift, o movimento.|copiar o arquivo|criar um atalho|excluir o arquivo|compactar o arquivo
55, 59|Excluir o atalho de um programa da área de trabalho não remove o programa do computador.|C|O atalho é só um apontador para o arquivo ou programa original.
57|O atalho Ctrl+X recorta o item selecionado, colocando-o na área de transferência para ser colado em outro lugar.|C|Ctrl+C copia, Ctrl+X recorta e Ctrl+V cola.
57|No Windows, a tecla F2, com um arquivo selecionado no Explorador, permite|renomear o arquivo|F2 renomeia; F5 atualiza; Alt+Enter abre as propriedades.|excluir o arquivo|abrir o arquivo|copiar o arquivo|exibir as propriedades
59|No Windows, os caracteres barra (/), asterisco (*), interrogação (?) e dois-pontos (:) não podem ser usados em nomes de arquivos.|C|Também são proibidos barra invertida, aspas, sinais de menor e maior e a barra vertical.
57|O atalho Alt+Tab alterna entre as janelas abertas.|C|Mantendo Alt pressionado, cada toque em Tab avança para a próxima janela.
53, 60|A Lixeira do Windows guarda arquivos excluídos de unidades locais e permite restaurá-los ao local de origem.|C|Enquanto estão na Lixeira, os arquivos ocupam espaço e podem ser restaurados.

@I09|Redes de computadores|62–65
63|Uma rede que interliga computadores de um mesmo prédio ou escritório é classificada como|LAN|LAN é rede local. MAN abrange uma cidade; WAN, grandes distâncias, como a internet.|WAN|MAN|PAN|VPN
63|O endereço IP identifica um dispositivo em uma rede que usa o protocolo TCP/IP.|C|O IP é o endereço lógico usado para encaminhar pacotes entre redes.

@I10|Segurança da informação e backup|66–70
68|Phishing é a tentativa de obter dados pessoais, como senhas, por meio de mensagens ou páginas que imitam instituições confiáveis.|C|O golpe explora a confiança da vítima. Desconfie de links e anexos inesperados.
68|O tipo de código malicioso que criptografa os arquivos do usuário e exige pagamento para liberá-los é o|ransomware|O ransomware "sequestra" os dados; backups atualizados e desconectados são a principal defesa.|spyware|worm|adware|keylogger
69|No backup incremental, copiam-se apenas os arquivos criados ou alterados desde o último backup de qualquer tipo.|C|O diferencial copia o que mudou desde o último backup completo; o incremental, desde o último backup (completo ou incremental).
68|Os princípios básicos da segurança da informação incluem confidencialidade, integridade e disponibilidade.|C|Confidencialidade (acesso só a quem pode), integridade (dados não alterados indevidamente) e disponibilidade (acesso quando necessário).
68|A autenticação em dois fatores combina, por exemplo, algo que o usuário sabe (senha) com algo que ele possui (código no celular).|C|O segundo fator reduz o risco de acesso indevido quando a senha vaza.
`;export{a as m,e as s};
