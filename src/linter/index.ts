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

export type EsLintConfig = ESLint.Options['baseConfig']


export async function lint(filePaths: string[], eslintOptions?: EsLintConfig): Promise<LintResult> {
  eslintOptions = typeof eslintOptions === 'undefined' ? {} as NonNullable<EsLintConfig> : eslintOptions;

  const forcedOptions: ESLint.Options = {
    useEslintrc: false,
    fix: false,
    baseConfig: eslintOptions
  };

  const eslint = new ESLint(forcedOptions);
  // await delay(500)
  // 2. Lint files.
  const results = await eslint.lintFiles(filePaths);
  

  await ESLint.outputFixes(results)

  // 3. Format the results.
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = await formatter.format(results);
  return {
    prettyResult: resultText,
    lintResult: results,
  };
}
