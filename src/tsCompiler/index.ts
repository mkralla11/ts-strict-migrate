import * as ts from "typescript";

// export interface ICompilerStrictMigrateOptions {
// }


interface IcreatedFiles {
  [key: string]: string
}


export function compile(fileNames: string[], options: ts.CompilerOptions): boolean {
  // Create a Program with an in-memory emit
  const createdFiles: IcreatedFiles = {};
  const host = ts.createCompilerHost(options);
  host.writeFile = (fileName: string, contents: string) => createdFiles[fileName] = contents
  // console.log('files', fileNames)
  let program = ts.createProgram(fileNames, options, host);
  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    // .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });
  // console.log(emitResult)
  // let exitCode = emitResult.emitSkipped ? 1 : 0;
  // console.log(`Process exiting with code '${exitCode}'.`);

  // process.exit(exitCode);
  return !emitResult.emitSkipped
}