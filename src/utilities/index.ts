

export function logErrorsForProhibitedFileExtensions(files: string[]): boolean {
  let sucess = true;
  for (const file of files) {
    if ((file.slice(-3) === '.js' || file.slice(-4) === '.jsx') && !/^node_modules\/.+$/.test(file)) {
      console.error(`
Please use .ts(x) extension instead of .js(x)
${file}
      `);
      sucess = false;
    }
  }

  return sucess;
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