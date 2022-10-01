import { ESLint } from 'eslint';

export interface ILintResult {
  prettyResult: string,
  lintResult: ESLint.LintResult[]
}

export async function lint(filePaths: string[]): Promise<ILintResult> {
  const eslint = new ESLint({
    useEslintrc: false,
    fix: true,
    baseConfig: {
      extends: [
        'plugin:@typescript-eslint/recommended',
        'airbnb',
        'plugin:react/all',
        'plugin:react-hooks/recommended',
        'plugin:react-native/all',
        'plugin:eslint-comments/recommended',
      ],
      parser: '@typescript-eslint/parser',
      plugins: [
        '@typescript-eslint',
      ],
      rules: {
        'eslint-comments/no-use': ['error', { allow: [] }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        'no-unused-vars': 'off',
        'react/jsx-no-undef': 'off',
        'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
      },
    },
  });

  // 2. Lint files.
  const results = await eslint.lintFiles(filePaths);

  // 3. Format the results.
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = await formatter.format(results);
  return {
    prettyResult: resultText,
    lintResult: results,
  };
}
