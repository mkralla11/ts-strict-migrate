import { ESLint } from 'eslint';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export interface LintResult {
  prettyResult: string,
  lintResult: ESLint.LintResult[]
}

export type PermittedEsLintCompilerOptions = ESLint.Options['baseConfig']

export async function lint(filePaths: string[], eslintOptions?: PermittedEsLintCompilerOptions): Promise<LintResult> {
  eslintOptions = typeof eslintOptions === 'undefined' ? {} as NonNullable<PermittedEsLintCompilerOptions> : eslintOptions;

  const forcedOptions: ESLint.Options = {
    useEslintrc: false,
    fix: true,
    baseConfig: {
      env: {
        ...eslintOptions.env,
      },
      extends: [
        ...(eslintOptions.extends || []),
        'plugin:@typescript-eslint/recommended',
        // 'airbnb',
        'airbnb-typescript',
        'plugin:react/all',
        'plugin:react-hooks/recommended',
        'plugin:react-native/all',
        'plugin:eslint-comments/recommended',
        'plugin:unicorn/recommended',
        'plugin:import/recommended',
        'prettier',
      ] as string[],
      globals: {
        ...eslintOptions.globals,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ...eslintOptions.parserOptions,
      },
      plugins: [
        ...(eslintOptions.plugins || []),
        '@typescript-eslint',
      ],
      rules: {
        ...eslintOptions.rules,
        'eslint-comments/no-use': ['error', { allow: [] }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        'no-unused-vars': 'off',
        'react/jsx-no-undef': 'off',
        'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        // already handled by eslint-comments/no-use
        'unicorn/no-abusive-eslint-disable': 'off',
        'import/no-cycle': 'error',
        'react-hooks/exhaustive-deps': 'error',
      },
      overrides: [
        ...(eslintOptions.overrides || []),
      ],
      settings: {
        ...eslintOptions.settings,
      },
    },
  };

  const eslint = new ESLint(forcedOptions);
  // await delay(500)
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
