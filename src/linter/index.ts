import {ESLint} from 'eslint'

export interface ILintResult {
  prettyResult: string,
  lintResult: ESLint.LintResult[]
}

export async function lint(filePaths: string[]): Promise<ILintResult>{
  const eslint = new ESLint({
    fix: true, 
    baseConfig: {
      "extends": [
        "plugin:@typescript-eslint/recommended",
        "airbnb-base", 
        "plugin:eslint-comments/recommended"
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      "rules": {
        "eslint-comments/no-use": ["error", {"allow": []}]
      }
    }
  });

  // 2. Lint files.
  const results = await eslint.lintFiles(filePaths);

  // 3. Format the results.
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(results);
  return {
    prettyResult: resultText,
    lintResult: results
  }
}