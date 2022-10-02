import * as ts from 'typescript';

// export interface ICompilerStrictMigrateOptions {
// }

interface IcreatedFiles {
  [key: string]: string
}

export interface ICompileResult {
  prettyResult: string,
  success: boolean
}

export function compile(fileNames: string[], options: ts.CompilerOptions): ICompileResult {
  // Create a Program with an in-memory emit
  const createdFiles: IcreatedFiles = {};
  const host = ts.createCompilerHost(options);
  host.writeFile = (fileName: string, contents: string) => {
    createdFiles[fileName] = contents;
  };
  // console.log('files', fileNames)
  const program = ts.createProgram(fileNames, options, host);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program);
    // .concat(emitResult.diagnostics);

  const output: string[] = [];
  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start ?? 0,
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      output.push(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      output.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
  // console.log(output.join('\n'));
  // console.log(emitResult)
  // let exitCode = emitResult.emitSkipped ? 1 : 0;
  // console.log(`Process exiting with code '${exitCode}'.`);

  // process.exit(exitCode);
  return {
    prettyResult: output.join('\n'),
    success: !emitResult.emitSkipped,
  };
}
