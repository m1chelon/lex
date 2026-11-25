// Verificações que evitam quebras em tempo de execução (ex.: hooks depois de return → tela preta).
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'dist-public', 'public', 'node_modules', 'audit'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'react-hooks': reactHooks },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { 'react-hooks/rules-of-hooks': 'error' },
  },
);
