import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules', 'supabase/functions/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // catch {} vazio é usado de propósito em alguns pontos (ex: localStorage
      // indisponível em modo privado) — silenciar o erro ali é a intenção, não
      // um esquecimento.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Este projeto roda em React 18 (sem o React Compiler). As regras de
      // "pureza" do plugin (herdadas do preset mais novo, pensado pro
      // Compiler) pegam padrões comuns e seguros em código React normal —
      // ex: usar useRef(valor) para guardar um valor calculado uma vez, ou
      // setState síncrono num efeito para estado inicial de loading. Cada
      // ocorrência real foi revisada manualmente; as que eram bugs de
      // verdade (ex: horário recalculado a cada render no resumo do
      // treino) foram corrigidas no código. As demais ficam como aviso,
      // não erro, pra não travar o lint por um padrão que já é seguro hoje.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/__tests__/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2021, vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  },
]
