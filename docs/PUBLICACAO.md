# LEX — checklist para publicar na App Store e no Google Play

Situação atual: o LEX é um PWA (site instalável) em https://m1chelon.github.io/lex/.
Já está pronto no app: tela de boas-vindas, onboarding, tutorial da Tuca, Política de
Privacidade (LGPD), Termos de Uso, Sobre/licenças, exportar backup e **apagar todos os dados**
(as lojas exigem um jeito de excluir os dados dentro do app).

## 1. Custos
| Item | Valor | Observação |
|---|---|---|
| Apple Developer Program | US$ 99 por ano | Exige Mac com Xcode para gerar o build (ou serviço de build na nuvem, como Codemagic/EAS) |
| Google Play Console | US$ 25 uma vez | Conta pessoal nova exige teste fechado com 12 testadores por 14 dias antes da produção |
| Domínio próprio (opcional) | ~R$ 40 por ano | Para o site, o suporte e a política de privacidade |
| Servidor para ranking/câmaras (opcional) | grátis no início | Supabase ou Firebase têm plano gratuito |

## 2. Empacotar o app
1. Instalar o Capacitor no projeto: `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`.
2. `npx cap init LEX br.app.lex --web-dir dist-public` (o ID `br.app.lex` é exemplo; ele não muda depois de publicado).
3. `npm run build:public && npx cap add ios && npx cap add android && npx cap sync`.
4. Ícones e telas de abertura: gerar a partir de `public/icon.svg` com `@capacitor/assets`.
5. Trocar o que só existe no navegador:
   - vibração → `@capacitor/haptics` (no iPhone o navegador não vibra; no app nativo vibra);
   - avisos e Pomodoro → `@capacitor/local-notifications` (lembrete do ponto, fim do foco e da pausa, sem servidor);
   - número no ícone → `@capawesome/capacitor-badge`.
6. A doutrina pessoal **não** pode ir para a loja (direitos autorais). Publicar só o build público.

## 3. O que as lojas pedem
- **Política de Privacidade em URL pública**: publicar o texto de `src/content/legal.ts` numa página (ex.: `/lex/privacidade.html`).
- **Responsável e contato**: preencher `RESPONSAVEL` e `CONTATO` em `src/content/legal.ts` (nome ou empresa e e-mail de suporte).
- **Apple — rótulos de privacidade**: "Dados não coletados" (tudo fica no aparelho). Se o clima for mantido: localização aproximada enviada à Open-Meteo, sem vínculo com a identidade e sem rastreamento.
- **Google — Segurança dos dados**: mesmas respostas; marcar "os dados podem ser excluídos pelo usuário".
- **Classificação etária**: questionário IARC/Apple. Conteúdo de leis penais (drogas, violência) é textual e educativo → provavelmente 12+.
- **Diretriz da Apple sobre informações de governo**: o app precisa citar a fonte oficial e dizer que não é afiliado a órgãos públicos. Já está em Termos e em cada lei.
- **Diretriz 4.2 (funcionalidade mínima)**: um app que só embrulha um site pode ser recusado. Os recursos nativos (notificações locais, vibração e widget) ajudam a passar.
- **Saúde e bem-estar**: deixar claro que o check-in não é serviço de saúde (já está nos Termos). Mostrar o CVV 188.

## 4. Material da página na loja
- Nome: "LEX — Lei seca jogando" (até 30 caracteres).
- Subtítulo (Apple, 30 caracteres): "Vade Mecum, casos e simulados".
- Capturas: 6,7" e 6,5" (iPhone), 5,5" (opcional) e celular Android. Sugestão de 5 telas: Início com a Tuca; questão de lacuna; carimbo DEFERIDO; folha de ponto e liga; Vade Mecum.
- Ícone 1024×1024 sem transparência (Apple) e 512×512 (Google).
- Descrição, palavras-chave (concurso, OAB, TJSP, escrevente, lei seca, vade mecum) e categoria Educação.

## 5. Recursos que precisam de servidor (próxima fase)
- **Conta** (Entrar com Apple é obrigatório se houver login com Google).
- **Ranking nacional, entre colegas e câmaras**: tabela de pontos semanais por liga (Vara → Supremo), convites por link e moderação de nomes.
- **Exclusão de conta dentro do app**: obrigatória nas duas lojas quando houver conta.
- **Sincronização do backup** entre aparelhos.
- **Ideias anotadas para depois**: vídeos curtos por artigo ou inciso (feed vertical) e uma aba de loja com descontos de parceiros (livros e cursos).

## 6. Antes de enviar
- [ ] `npm test`, `npm run build:public` sem erros
- [ ] Testar offline, primeira abertura, restaurar backup e apagar todos os dados
- [ ] Revisar textos legais com o responsável
- [ ] Versão `1.0.0` em `package.json` e `APP_VERSION` em `src/screens/Legal.tsx`
