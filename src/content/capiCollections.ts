import type { CollectionRows } from './capiCatalog';

// Nome | modelo | cor | detalhe | estampa/acabamento | ID de versões anteriores (opcional).
export const BASIC_COLLECTIONS = [
  ['xp', 'alfaiataria', 'Alfaiataria e ternos', `
Terno azul-marinho clássico|suit|30374d|ff4048||terno-classico
Terno branco de gala|tux|f4eee2|292b3c|cetim
Terno bege de verão|suit|c7a783|627d96|linho
Terno vinho|suit|72364d|f7cd91|
Terno verde-oliva|suit|606447|ce935a|
Terno risca de giz|suit|333c56|cdd3dd|riscas
Terno xadrez inglês|suit|514852|d09978|xadrez
Terno de tweed|suit|78604c|daa779|tweed
Smoking preto com cetim|tux|292735|8793ae|cetim
Terno de três peças com colete|vest|4f5f74|e9b06c|três-peças
Blazer de veludo bordô|jacket|63334f|ce8f9e|veludo
Terno de linho branco|suit|efe2ca|527671|linho
Paletó trespassado italiano|double|344868|ecce91|
Casaca imperial do século XIX|coat|4b2750|ecd08c|bordado
Terno rosa pastel|suit|daa5b1|91516a|
`],
  ['xp', 'elegantes', 'Moda feminina e looks elegantes', `
Tailleur preto clássico|tailleur|323344|ddd3c6|
Tailleur branco|tailleur|eee6d8|d19a70|
Tailleur rosa|tailleur|d790a8|ffe0d8|
Tailleur azul-marinho|tailleur|263d68|aebff0|
Vestido tubinho preto|dress|30303d|b7a7ca|tubinho
Vestido verde-esmeralda|gown|257463|9addb0|manga longa
Vestido vermelho midi|dress|b94052|f8b0ad|midi
Vestido floral primavera|dress|f1c6b1|ae4e7d|flores
Vestido-camisa bege|dress|d0a682|f8e2bc|abotoado
Vestido plissado azul|gown|4e72ae|bdd5ef|plissado
Saia lápis com camisa de seda|tailleur|98717c|f8e0cb|seda
Saia midi com cardigan|cardigan|9980a8|f0cfbb|midi
Conjunto feminino de linho|double|dec5a4|995b50|linho
Macacão elegante de alfaiataria|jumpsuit|4d4269|e9c081|cinto
Blazer cropped com calça social|jacket|b0817f|f6d9cc|cropped
`],
  ['xp', 'casuais', 'Roupas casuais e universitárias', `
Moletom com capuz cinza|hoodie|8793a6|dfe5ed|
Jaqueta jeans clássica|denim|4973a5|ebc186|
Jaqueta de couro preta|jacket|303343|adb9ce|couro
Jaqueta bomber verde|jacket|5e795e|bec799|bomber
Camiseta “Art. 5º”|tee|e7dbc5|333b52|Art. 5º
Camiseta “Vade Mecum e café”|tee|65455a|ffddb1|Vade e café
Camisa havaiana tropical|shirt|408077|f5c883|flores
Camisa polo branca|polo|f1e9d9|6b86af|
Suéter de gola alta preto|turtleneck|333541|abadbf|
Cardigan de tricô|cardigan|ad8566|f9d8ad|trico
Camisa xadrez de flanela|shirt|aa515a|ecd29d|xadrez
Jardineira jeans|overalls|4971a2|eac684|
Jaqueta universitária LEX|jacket|44558f|eee0c5|LEX
Pijama xadrez com pantufas|pajamas|656ca1|e6bad0|xadrez
Capa de chuva amarela|raincoat|e5ac45|fff1bc|
`],
  ['xp', 'calcados', 'Calçados e tênis', `
Sapato Oxford preto|oxford|252735|a5a6b7|
Sapato Derby caramelo|derby|a0613d|e9bb80|
Mocassim vinho|loafer|723448|db8593|
Loafer com fivela dourada|loafer|343246|ecd085|fivela
Sapatênis bege|sneaker|c2a685|f4e4cb|
Tênis branco minimalista|sneaker|eeeae3|a7b0bf|minimal
Tênis retrô colorido|sneaker|775f98|f3aa8b|lateral
Tênis de corrida neon|runner|5e862d|d6f982|
Tênis de cano alto|highTop|a74859|fcdfc0|
Tênis plataforma|platform|be7591|efcfde|
Sapatilha de bico fino|flat|d1a88f|f8ddc8|
Scarpin preto clássico|heel|29293b|c0aaba|
Sapato de salto bloco nude|heel|be8c79|f6d9c9|bloco
Bota Chelsea de couro|boot|5e453f|b18c6c|elastico
Bota cowboy|cowboyBoot|8c5739|edbd7d|bordado
`],
  ['xp', 'chapeus', 'Chapéus e acessórios de cabeça', `
Chapéu Panamá bege|panama|e6c18a|655046|palha
Fedora preto|fedora|333442|8990ae|
Boina francesa|beret|ae4f59|f3a7ae|
Boina irlandesa de tweed|flatCap|776052|c5ac88|tweed
Cartola preta clássica|topHat|303139|a0877d|
Chapéu pantaneiro de palha|wideHat|c69b60|e6c289|palha
Chapéu cowboy de couro|cowboyHat|885843|e3b577|
Boné esportivo liso|baseball|315e82|d8ecf0|
Boné oficial do LEX|baseball|414b88|efcea0|LEX
Bucket hat colorido|bucket|a270a5|f0a17c|blocos
Touca de lã com pompom|beanie|6978ac|dec8f3|pompom
Viseira de tenista|visor|eee6df|8dafe0|
Chapéu-coco britânico|bowler|323140|a096b0|
Capelo de formatura|mortarboard|242b46|eacb84|
Fascinator elegante com pequeno véu|fascinator|b87388|f7d9d9|veu
`],
  ['xp', 'oculos', 'Óculos', `
Óculos redondos dourados|round|ba884d|f7d68b||oculos-dourados
Óculos quadrados pretos|square|24253a|abb6cb|
Óculos de meia armação|halfRim|394b69|d3e8f5|
Óculos tartaruga|square|a16240|edbf80|tartaruga
Óculos gatinho|catEye|a14367|f8bbd1|
Óculos com correntinha dourada|round|b7804a|f5d08a|corrente
Óculos aviador|aviator|b1844e|d4e0c4|smoke
Óculos de sol pretos clássicos|square|24253b|9baac9|sol
Óculos de sol redondos|round|503c55|d7a8c7|sol
Óculos espelhados azuis|aviator|3d75ae|a8e9fe|espelho
Óculos em formato de coração|heart|ba506c|ffbdcc|
Óculos hexagonais|hex|647983|f0d28b|
Monóculo aristocrático|monocle|b88547|fcecbb|corrente
Óculos futuristas com visor|shield|4d7da8|73def8|espelho
Óculos grandes de armação transparente|round|d7c7be|fff1d9|grande
`],
  ['xp', 'luvas', 'Luvas', `
Luvas de couro pretas|glove|303342|7f899e|couro
Luvas de couro caramelo|glove|a36846|e5b780|couro
Luvas de cetim branco|glove|f1e7da|ffffff|cetim
Luvas longas de ópera|operaGlove|5d4268|cfafda|cetim
Luvas sem dedos|fingerless|414457|9899ad|
Luvas de tricô de inverno|mitten|8e566e|efadb2|trico
Luvas de renda preta|operaGlove|393344|c9c0dc|renda
Luvas de couro para direção|fingerless|8d513b|e3ad7c|perfurado
Luvas de motociclista|glove|33374c|abacba|placas
Luvas de jardinagem floridas|glove|7a9761|ffe7a7|flores
Luvas de boxe vermelhas|boxing|b74349|f5afa2|
Luvas espaciais prateadas|glove|acbacb|ebf7ff|placas
Luvas brancas de mágico|glove|f1e9de|ceab77|costura
Luvas cerimoniais douradas|operaGlove|c69b59|fff2ba|bordado
Luvas futuristas luminosas|glove|475c8b|73f3e6|neon
`],
  ['xp', 'acessorios', 'Joias, relógios e acessórios', `
Relógio minimalista prateado|watch|a8b4cb|ecf1fa|azul|relogio-aco
Relógio dourado vintage|watch|b48041|f8d990|cream
Smartwatch preto|smartWatch|303547|70d0bc|
Pulseira da amizade|bracelet|a55f97|f7bb81|contas
Bracelete de couro|bangle|89583f|deb581|couro
Colar de pérolas|necklace|eee2d8|fff7de|perolas
Gargantilha dourada|choker|bc8a51|ffeab9|
Brincos de argola|hoop|c38c49|ffe29f|
Brincos de pedras preciosas|gem|8e5cbc|f2d3f7|
Gravata-borboleta|bow|a73e51|fbc6bf|
Gravata de seda listrada|tie|466591|f3ce92|riscas
Lenço de seda estampado|scarf|915f9b|f7d0a4|flores
Broche de capivara dourado|pin|d3a352|fff0b3|capi
Bolsa transversal de couro|bag|965e46|ecc391|transversal
Pasta executiva de couro|case|704b39|d4a476|
`],
  ['xp', 'juridica', 'Coleção jurídica', `
Toga de magistrado|robe|262c46|b496a4|magistrado
Beca de advogado|robe|323048|d2a775|advogado
Beca de formatura|robe|444267|a8c3ed|formatura
Vade Mecum bordô|book|74394b|efbe91|VM
Constituição Federal azul|book|365b8c|f2d695|CF
Código Civil verde|book|447357|e0c38a|CC
Código Penal vermelho|book|ac424c|f9cd9c|CP
Código de Processo Civil branco|book|e8e2d5|725d88|CPC
Código de Processo Penal azul-escuro|book|2c3a5f|dad0a6|CPP
Livro de súmulas dourado|book|bd9051|fff0c2|S
Martelo de juiz em madeira|gavel|8d563e|e2b479|
Balança da Justiça em miniatura|scale|cc9e62|fff1bd|
Placa de mesa “Ordem!”|plaque|775447|fff2ce|Ordem!
Pasta com autos processuais|file|b79169|fae4c2|AUTOS
Caneta-tinteiro do jurista|pen|323751|e5b96e|
`],
] as const satisfies readonly CollectionRows[];

export const PAID_COLLECTIONS = [
  ['icons', 'musica', 'Música e cultura pop', `
Fedora do Luar|fedora|2d2b40|9f9abe|luar
Luva Estelar|glove|f3eee7|b7dae9|cristais
Jaqueta do Rei do Rock|jacket|312f3b|c2c4d5|couro
Óculos da Paz|round|9969a7|eec8e8|tinta
Macacão Relâmpago|jumpsuit|4d6dad|ff657a|raio
Jaqueta do Palco|coat|a8424d|f9c373|bordado
Boina da Bossa|beret|8a7463|f5cea2|linho
Terno do Jazz|tux|f2e0c7|2c2c41|cetim
Óculos da Diva|catEye|bb7392|fee0b7|grande
Capa do Show|cape|6e528c|d1afd9|cristais
`],
  ['icons', 'estadistas', 'Estadistas e figuras históricas', `
Bicórnio Imperial|bicorne|323246|e1b567|bordado
Cartola do Presidente|topHat|292a37|6b676b|alta
Casaco do Estadista|coat|3c4056|e4d9c6|gravata
Farda do Libertador|coat|344c78|f2c373|farda
Túnica do Filósofo|robe|e1cfab|a47a55|drapeado
Manto do Imperador|cape|505488|ecc981|bordado
Terno da República|vest|575374|dec29a|século-XX
Traje do Diplomata|coat|30354e|eec981|faixa
Boina Revolucionária|beret|363748|efc366|losango
Casaco da Independência|coat|726340|f9ca80|farda
`],
  ['icons', 'pioneiras', 'Ícones femininos da história', `
Tailleur da Elegância|tailleur|a89179|e7c49e|tweed
Vestido da Primeira-Dama|dress|e0a1b2|ffe0e2|pillbox
Vestido da Imperatriz|gown|e0bf8a|fbe9bd|império
Colar do Nilo|necklace|c19955|65b7a9|nilo
Vestido da Cientista|dress|565673|e3d1ab|gola
Chapéu da Sufragista|wideHat|5c5375|dac5df|laço
Vestido da Era do Jazz|dress|49395e|dbae7f|franjas
Conjunto da Aviadora|jacket|875540|ffdea2|aviadora
Vestido da Pintora|gown|8f4b66|f7b45f|flores
Coroa da Rainha|crown|d2a455|c66fa2|pérolas
`],
  ['icons', 'ficcao', 'Literatura, cinema e personagens clássicos', `
Chapéu do Detetive|deerstalker|8c7159|d9baa0|xadrez
Sobretudo do Investigador|coat|bd9b75|e9ceb0|lapela
Cartola do Mágico|topHat|363247|d05a63|fita
Terno do Agente Secreto|tux|2c3046|eeeeee|cetim
Óculos do Bruxo|round|4c4160|daa7bd|fantasia
Capa do Vampiro|cape|27263b|a44664|gola alta
Chapéu do Aventureiro|fedora|91603f|dbaa78|couro
Traje do Mosqueteiro|cape|466198|e4d5a8|mosqueteiro
Relógio do Viajante|pocketWatch|c69a57|f8e4b7|
Boina do Artista|beret|5d4f7a|e38b8d|artist
`],
  ['icons', 'juristas', 'Grandes juristas, filósofos e intelectuais', `
Peruca do Tribunal|wig|e3ddd0|fbf0df|
Toga do Orador Romano|robe|e6ceb0|98616a|romana
Manto do Iluminista|cape|775060|e6c381|bordado
Casaco do Filósofo|coat|3e4148|baaa89|veludo
Colete do Professor|vest|8a6e5a|e4c793|tweed
Óculos do Intelectual|round|63594f|e9c888|discreto
Beca do Constitucionalista|robe|505381|e3c395|faixa
Toga da Justiça Antiga|robe|d3b084|864f48|bordado
Traje do Humanista|coat|77495a|e2b176|veludo
Capa do Grande Jurista|cape|4b4471|f2cd87|LEX
`],
  ['brasil', 'sul', 'Sul', `
Bombacha gaúcha tradicional|breeches|6b6553|c5b391|
Poncho de lã pampeano|poncho|8e684f|eac28f|riscas
Chapéu gaúcho de aba larga|wideHat|514d45|c5b392|cordão
Bota campeira de couro|boot|78513a|d5a576|costura
Lenço vermelho gaúcho|scarf|b6414b|f5b4ae|gaúcho
Vestido de prenda|gown|9b6d8d|f5d9c7|babados
Boina de lã serrana|beret|727a63|cbcfaa|trico
Casaco de inverno da Serra Gaúcha|coat|67788e|dfc7af|lã
Traje de festa germânica do Sul|vest|548185|ebcd9f|festa
Cuia de chimarrão com bomba|cup|8e603e|c6d78e|chimarrão
`],
  ['brasil', 'nordeste', 'Nordeste', `
Chapéu de couro sertanejo|wideHat|8f5738|e7b179|sertanejo
Gibão de couro do sertão|coat|a36c47|edba8b|costura
Alpercatas de couro|sandal|805338|d7a275|
Vestido de quadrilha junina|dress|5c7fb1|f6ad80|bandeirinhas
Camisa de festa junina|shirt|b1665e|f4ca87|xadrez
Chapéu de palha nordestino|panama|d0a46b|fbe1a4|palha
Vestido de renda renascença|gown|f0e2cd|e0ae82|renda
Roupa branca de capoeira|uniform|eee5d7|ce8a5d|cordão
Lenço estampado de chita|scarf|a65171|ffcc7d|flores
Bolsa artesanal de palha|bag|cda067|f6d09b|palha
`],
  ['brasil', 'centro-oeste', 'Centro-Oeste', `
Chapéu pantaneiro|cowboyHat|ab8153|ebc497|palha
Camisa pantaneira de manga longa|shirt|6b7c65|d9ca9c|manga longa
Calça de montaria pantaneira|pants|76624c|d3ad7a|costura
Botas de peão|cowboyBoot|62463a|cf9366|costura
Cinto de couro com fivela trabalhada|belt|774b37|ecd181|bordado
Cuia de tereré sul-mato-grossense|cup|a5734b|b2e1bc|tereré
Lenço de pescoço pantaneiro|scarf|586c94|d8c5a5|poa
Colete de fazendeiro do Cerrado|vest|94845e|cfd49a|bolsos
Camisa country bordada|shirt|4d6d88|eab281|bordado
Chapéu de palha do Cerrado|wideHat|c9a267|eac58b|palha
`],
  ['brasil', 'norte', 'Norte', `
Chapéu de palha amazônico|bucket|b79b60|e2c489|palha
Camisa com grafismos marajoaras|shirt|88574d|f4cf93|geometria
Bolsa de fibras naturais|bag|b48c5b|eee0b4|fibra
Sandálias artesanais de couro|sandal|966746|e4b58b|trançado
Saia com estampas de fauna amazônica|skirt|53765e|e7bf7d|fauna
Camisa florida de verão amazônico|shirt|5b8990|f9bc81|flores
Capa de chuva tropical|raincoat|438a7a|a8e6ac|tropical
Chapéu de pescador ribeirinho|bucket|5d776f|adc2a6|costura
Lenço estampado com vitórias-régias|scarf|678a71|e6d4a8|folhas
Mochila de aventura amazônica|bag|527560|b6c799|mochila
`],
  ['brasil', 'sudeste', 'Sudeste', `
Terno de linho do malandro carioca|suit|f1e4c8|a94d54|linho
Chapéu de palha do sambista|panama|dfad70|ac565d|palha
Sapato bicolor de samba|oxford|473d48|f2deba|bicolor
Vestido de carnaval com paetês|dress|7454a2|f1ad9e|cristais
Camisa de boteco carioca|shirt|567b9e|edc986|riscas
Chapéu de tropeiro mineiro|wideHat|6c5241|cda478|cordão
Avental de café mineiro|apron|82644c|f8d59a|café
Jaqueta urbana paulistana|jacket|394a70|a0add1|urbana
Camisa de pescador caiçara|shirt|608b91|e4d2a6|costura
Lenço de seda com estampa de azulejos coloniais|scarf|5366a3|e6d9b7|azulejo
`],
  ['mundo', 'franca', 'França', `
Boina parisiense vermelha|beret|a54d5b|efabb0|paris
Camisa listrada bretã|tee|eddfc3|496687|riscas
Trench coat bege francês|coat|be9a74|f7dcb5|cinto
Lenço de seda parisiense|scarf|a56e8f|f8d09a|poa
Vestido de inspiração Belle Époque|gown|9d859f|f4d9c6|renda
Sapatos de balé clássicos|flat|dab1ba|ffdfdf|fita
Casaco de veludo do século XVIII|coat|68527c|f1c589|veludo
Chapéu cloche dos anos 1920|cloche|9a6a59|e2b197|fita
Colete de garçom parisiense|vest|343748|ecdac3|gravata
Bolsa de couro estruturada|bag|99624f|f1ceb4|estruturada
`],
  ['mundo', 'reino-unido', 'Reino Unido', `
Cartola vitoriana|topHat|3e3549|b09bb9|alta
Chapéu-coco londrino|bowler|30313c|d8b58b|fita
Boina de tweed inglesa|flatCap|80695c|d2b897|tweed
Sobretudo britânico de lã|coat|514d62|b7a8bf|lã
Colete xadrez de alfaiataria|vest|796259|dfb889|xadrez
Saia escocesa de tartã (kilt)|skirt|a74e59|e9c7a0|tartã
Cachecol de tartã|scarf|795373|e4ba8c|tartã
Guarda-chuva londrino|umbrella|453b50|c3b0ce|
Chapéu de caça deerstalker|deerstalker|725d55|c2ae9a|tweed
Toga e peruca de barrister|robe|2f3148|e8ddd0|barrister
`],
  ['mundo', 'eua', 'Estados Unidos', `
Chapéu cowboy texano|cowboyHat|c0925f|f1c99b|estrela
Botas western bordadas|cowboyBoot|9d6140|ffd18b|bordado
Jaqueta universitária americana|jacket|995367|ffe1b0|varsity
Boné de beisebol retrô|baseball|88617e|f9caad|beisebol
Jaqueta jeans de rodeio|denim|416789|dcaa88|bordado
Terno de gangster dos anos 1920|double|47445d|c5c0d1|riscas
Vestido pin-up dos anos 1950|dress|b15765|fff1d0|poa
Jaqueta de aviador americana|jacket|745441|e9cba8|aviadora
Camisa havaiana estilo anos 1980|shirt|653a7f|f2a3b9|flores
Moletom universitário vintage|hoodie|6c6d9b|f0c9a4|varsity
`],
  ['mundo', 'japao', 'Japão', `
Kimono tradicional|kimono|8f5d7f|f3c4af|flores
Yukata de verão|kimono|4f76a8|d3daef|ondas
Casaco haori|coat|62798a|e8d1a9|haori
Sandálias geta|geta|9c6d4c|d98676|
Sandálias zori|sandal|c39f72|ede0b6|tecido
Faixa obi decorativa|obi|a14d69|edc785|geometria
Leque dobrável sensu|fan|e1b68f|a75265|flores
Casaco happi de festival|kimono|4c5e8c|f3caa2|festival
Uniforme escolar japonês clássico|uniform|333e5d|dbbec1|gola
Chapéu de palha amigasa|cone|c9a66e|eecb9a|amigasa
`],
  ['mundo', 'volta', 'Volta ao mundo', `
Sombrero mexicano|sombrero|c89b62|b46063|bordado
Poncho andino peruano|poncho|9b5867|f4bf81|geometria
Boina basca espanhola|beret|394359|8296b1|basca
Traje de flamenco espanhol|gown|993f58|f4a9a3|babados
Chapéu alpino alemão|fedora|647b61|d4c28e|pluma
Camisa listrada de gondoleiro veneziano|tee|eadad0|a7546f|riscas
Sari indiano|gown|536b9d|e5b86d|sari
Fez marroquino|fez|a3475a|d9b98a|
Hanbok coreano|gown|b9849e|e9d297|hanbok
Chapéu de palha cônico vietnamita|cone|cca36b|f2d69e|palha
`],
  ['sports', 'automobilismo', 'Automobilismo', `
Macacão de Fórmula vermelho|racing|ab424a|f4d1b6|pista
Macacão de Fórmula azul-marinho|racing|344878|b6cbee|pista
Macacão de Fórmula preto e dourado|racing|303344|e7be72|pista
Capacete de corrida vermelho|fullHelmet|ae4755|f9c9b8|riscas
Capacete de corrida amarelo e verde|fullHelmet|d9ae4e|57976a|brasil
Capacete de corrida cromado|fullHelmet|a2b1c6|f5eeeb|cromo
Capacete retrô de piloto|helmet|7187a9|f4d3ac|retro
Luvas de piloto profissionais|glove|3b4970|e2b778|pista
Botas de automobilismo|boot|46425d|f49e6b|pista
Balaclava de corrida|balaclava|3a3f5b|c7cee1|
Jaqueta de equipe de corrida|jacket|416692|f2ce8d|pit
Troféu de campeão automobilístico|trophy|cda350|ffecae|chegada
`],
  ['sports', 'quadras', 'Tênis, padel e badminton', `
Raquete de tênis clássica de madeira|racket|a06a48|f4dfb9|madeira
Raquete de tênis profissional moderna|racket|4e6188|d9f287|carbono
Raquete de padel|paddle|5d61a4|f0ada5|furos
Raquete de badminton|shuttleRacket|5c8790|e2ebb3|
Camisa polo de tenista|polo|eae7de|729771|quadra
Saia esportiva plissada|skirt|e4dbe7|aa8fc0|plissado
Shorts de tênis|shorts|ced8e2|776e9f|quadra
Viseira branca de tenista|visor|f3ede4|abc6d7|quadra
Munhequeiras esportivas|sweatband|8c749e|efb6c7|par
Bolsa de raquetes|bag|536e82|cedfa9|raquetes
`],
  ['sports', 'futebol', 'Futebol', `
Camisa de futebol verde e amarela|uniform|e4bd50|4b9064|brasil
Camisa de futebol listrada|uniform|577296|ece0d1|riscas
Uniforme de goleiro|uniform|9261a0|bce1a4|goleiro
Chuteiras clássicas pretas|cleat|303541|c6bbc4|
Chuteiras coloridas modernas|cleat|8062ac|e1f091|
Luvas de goleiro|glove|8d60a7|e8efa0|acolchoado
Braçadeira de capitão|sweatband|ebbf68|74465f|C
Bola de futebol clássica|soccerBall|eee7d9|34394d|
Cachecol de torcedor|scarf|365b87|d6dce5|riscas
Troféu de campeonato de futebol|trophy|bf8c43|fae09f|futebol
`],
  ['sports', 'americanos', 'Basquete e esportes americanos', `
Regata de basquete retrô|singlet|81569b|e7ba69|retro
Regata de basquete moderna|singlet|3c6189|f2bbac|quadra
Tênis de basquete de cano alto|highTop|5b5392|e7a58e|quadra
Bola de basquete|basketBall|c57f4c|573633|
Faixa de cabeça de basquete|headband|7b4f92|e8c3e1|
Uniforme de futebol americano|armor|546f86|f3bb8c|11
Capacete de futebol americano|fullHelmet|527483|efe0ce|grade
Bola de futebol americano|americanBall|a16244|e9d2ad|
Luva de beisebol|baseballMitt|95613c|e8bd80|
Taco de beisebol|bat|b98858|f7ce93|
`],
  ['sports', 'lutas', 'Artes marciais e lutas', `
Kimono de judô branco|kimono|eee6d8|54638c|judô
Kimono de jiu-jítsu azul|kimono|45659c|c2b4d0|jiu-jítsu
Dobok de taekwondo|uniform|efe7dc|3d4055|v
Uniforme de karatê|kimono|e7ded0|5c6357|karatê
Faixa preta de artes marciais|obi|343541|b6a29a|nó
Luvas de boxe vermelhas|boxing|c24c50|f9c7b1|boxe
Luvas de boxe douradas|boxing|c29854|ffebad|boxe
Shorts de boxe clássico|shorts|a14859|f0cba7|boxe
Capacete de proteção de boxe|helmet|9b4a59|efbca9|boxe
Cinturão de campeão|belt|4f415a|f1c77c|campeão
`],
  ['sports', 'aventura', 'Esportes aquáticos e de aventura', `
Roupa de surfista|wetsuit|46596f|68caba|surfe
Prancha de surfe|board|df986d|f2dfb9|surfe
Óculos de natação|goggles|457795|aeddde|água
Touca de natação|cap|7193bb|edc7dd|água
Roupa de mergulho|wetsuit|3d4664|d3bce4|mergulho
Máscara de mergulho|goggles|425176|d2b6e5|mergulho
Capacete de ciclismo|helmet|568b7e|d7f0b7|vents
Camisa de ciclismo|racing|4d7996|e0cf9d|ciclismo
Capacete de skate|helmet|75608c|ecc39f|skate
Skate clássico|board|836c9e|e9a48b|skate
Óculos de esqui|goggles|6278ba|f7c5b6|espelho
Jaqueta de snowboard|hoodie|557c91|d8b8da|neve
`],
  ['sports', 'olimpicos', 'Esportes olímpicos e tradicionais', `
Uniforme de esgrima|armor|e5e5e2|a1adcb|esgrima
Máscara de esgrima|faceMask|4e5371|c9d2df|malha
Florete de esgrima|foil|a7b5cc|eed2ae|
Arco esportivo de competição|archery|7269a3|d8c8eb|
Uniforme de atletismo|singlet|588773|f4c6ac|pista
Tênis de corrida profissional|runner|5689a4|f3dc98|
Uniforme de ginástica artística|wetsuit|885c9e|f5b8c8|cristais
Medalha de ouro|medal|ddb25f|a46a8d|
Camisa polo de golfe|polo|6c876d|f4e5bd|listras
Taco de golfe|club|6a647e|e2d5e5|
`],
  ['sports', 'especiais', 'Esportes especiais e divertidos', `
Uniforme de e-sports do LEX|uniform|565390|94e7d5|LEX
Headset gamer com microfone|headset|4f436a|e9a8c6|
Raquete de tênis de mesa|paddle|ae4c64|e6ba98|mesa
Camisa de jogador de polo|polo|904e67|e9cfa4|3
Gravata xadrez do enxadrista|tie|5a5378|e9c190|xadrez
Troféu de mestre do xadrez|trophy|ba9158|f3dca9|xadrez
`],
] as const satisfies readonly CollectionRows[];
