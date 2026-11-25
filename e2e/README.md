# Varredura ponta a ponta

Abre o app no navegador e passa por todas as abas, matérias, cursos, editais e modos de jogo,
força conflitos de sessão, termina sessões e confere se "Continuar" segue para o artigo seguinte.
Registra erros de console, exceções e telas quebradas ("Algo deu errado") ou vazias.

```
npm run build && npx vite preview --port 4173 &
pip install playwright && playwright install chromium
python3 e2e/e2e.py            # tudo
python3 e2e/e2e.py modos      # só uma parte: abas, leis, modos, progressao, cursos, concursos
```
