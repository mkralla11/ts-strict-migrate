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

// interface IcreatedFiles {
//   [key: string]: string
// }

export interface CompileResult {
  prettyResult: string,
  // rawResult: string,
  success: boolean
}

interface TSCompiler {
  compile: (fileNames: string[])=>CompileResult
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
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    jsx: 4,
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    allowJs: false,
    exclude: ['node_modules'],
  };

  const composedOptions: ts.CompilerOptions = { ...forceCompilerOptions, ...options };

  // Create a Program with an in-memory emit
  // const createdFiles: IcreatedFiles = {};
  // let program: ts.Program;
  let fileNamesMap: Map<string, string> = new Map();
  // let host: ts.FormatDiagnosticsHost;

  const host = ts.createIncrementalCompilerHost(composedOptions)
  let builderProgram: ts.SemanticDiagnosticsBuilderProgram;
  // host.writeFile = (fileName: string, contents: string) => {
  //   // createdFiles[fileName] = contents;
  // };

  function createProgram(fileNames: string[]): ts.Program {
    fileNamesMap = new Map()
    for (const fileName of fileNames) {fileNamesMap.set(fileName, fileName)}
    
    builderProgram = ts.createSemanticDiagnosticsBuilderProgram(
      fileNames,
      composedOptions,
      host,
      builderProgram
    )
    return builderProgram.getProgram();
  }

  function getConfig(): ts.CompilerOptions {
    return composedOptions;
  }

  function compile(): CompileResult {
    const emitResult = builderProgram.emit();
    if(!builderProgram){
      throw new Error('compile called before createProgram')
    }
    // console.log(fileNamesMap)
    const allDiagnostics = ts.getPreEmitDiagnostics(builderProgram.getProgram())
      .filter(({file: {fileName=''}={}}: {file?: {fileName?: string}})=>{
        // console.log('diagnostic', fileName)
        return fileNamesMap.has(fileName)
      })
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
    // console.log(allDiagnostics)
    // process.exit(exitCode);
    return {
      // rawResult: rawResult.join('\n'),
      prettyResult: prettyResult,
      success: !allDiagnostics.length,
    };
  }

  return {
    compile,
    getConfig,
    createProgram,
  };
}
