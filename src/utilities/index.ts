
export interface GetErrorsForProhibitedFileExtensionsResult {
  success: boolean,
  results: string[],
  prettyResult: string
}

export function getErrorsForProhibitedFileExtensions(files: string[]): GetErrorsForProhibitedFileExtensionsResult {
  let success = true;
  const results: string[] = [];
  for (const file of files) {
    if ((file.slice(-3) === '.js' || file.slice(-4) === '.jsx') && !/^node_modules\/.+$/.test(file)) {
      results.push(`\n\nPlease use .ts(x) extension instead of .js(x)\n\n${file}\n\n`);
      success = false;
    }
  }

  return {
    success,
    results,
    prettyResult: results.join('')
  };
}


export function debounce<F extends(
...arguments_: Parameters<F>) => ReturnType<F>>(
  function_: F,
  waitFor: number,
): (...arguments_: Parameters<F>) => void {
  let timeout: NodeJS.Timeout;
  return (...arguments_: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => function_(...arguments_), waitFor);
  };
}