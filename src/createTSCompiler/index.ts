import * as ts from 'typescript';

export type PermittedTSCompilerOptions = Pick<
  ts.CompilerOptions,
  'jsx' |
  'target' |
  'module' |
  'lib' |
  'moduleResolution' |
  'paths' |
  'resolveJsonModule' |
  'skipLibCheck' |
  'baseUrl'
  >

interface IcreatedFiles {
  [key: string]: string
}

export interface ICompileResult {
  prettyResult: string,
  // rawResult: string,
  success: boolean
}

interface TSCompiler {
  compile: (fileNames: string[])=>ICompileResult
  getConfig: ()=>ts.CompilerOptions
  createProgram: (fileNames: string[])=>ts.Program
}

export function createTSCompiler(options: PermittedTSCompilerOptions): TSCompiler {
  const forceCompilerOptions = {
    strict: true,
    noImplicitAny: true,
    noImplicitReturns: true,
    strictNullChecks: true,
    noFallthroughCasesInSwitch: true,
    noPropertyAccessFromIndexSignature: true,
    forceConsistentCasingInFileNames: true,
    noImplicitOverride: true,
    noEmitOnError: true,
    esModuleInterop: true,
    skipLibCheck: true,
    jsx: 4,
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    allowJs: false,
    exclude: ['node_modules'],
  };

  const composedOptions: ts.CompilerOptions = { ...options, ...forceCompilerOptions };

  // Create a Program with an in-memory emit
  // const createdFiles: IcreatedFiles = {};
  let program: ts.Program;
  // let host: ts.FormatDiagnosticsHost;

  function createProgram(fileNames: string[]): ts.Program {
    const host = ts.createCompilerHost(composedOptions);
    host.writeFile = (/*fileName: string, contents: string*/) => {
      // createdFiles[fileName] = contents;
    };
    program = ts.createProgram(fileNames, composedOptions, host);
    return program;
  }

  function getConfig(): ts.CompilerOptions {
    return composedOptions;
  }

  function compile(): ICompileResult {
    const emitResult = program.emit();

    const allDiagnostics = ts
      .getPreEmitDiagnostics(program);
      // .concat(emitResult.diagnostics);

    // const rawResult: string[] = [];
    const prettyResult = ts.formatDiagnosticsWithColorAndContext(allDiagnostics, {
      getCurrentDirectory: () => '',
      getCanonicalFileName: fileName => fileName,
      getNewLine: () => '\n\n',
    })

    // for (const diagnostic of allDiagnostics) {
    //   if (diagnostic.file) {
    //     const { line, character } = ts.getLineAndCharacterOfPosition(
    //       diagnostic.file,
    //       diagnostic.start ?? 0,
    //     );
    //     const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    //     rawResult.push(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    //   } else {
    //     rawResult.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    //   }
    // }
    // console.log(output.join('\n'));
    // console.log(emitResult)
    // let exitCode = emitResult.emitSkipped ? 1 : 0;
    // console.log(`Process exiting with code '${exitCode}'.`);

    // process.exit(exitCode);
    return {
      // rawResult: rawResult.join('\n'),
      prettyResult: prettyResult,
      success: !emitResult.emitSkipped,
    };
  }

  return {
    compile,
    getConfig,
    createProgram,
  };
}
