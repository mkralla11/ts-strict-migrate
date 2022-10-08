import { simpleGit, SimpleGit } from 'simple-git';
// import { JsxEmit } from 'typescript';
import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'node:events';
import { createTSCompiler, ICompileResult, PermittedTSCompilerOptions } from '../createTSCompiler';
import { lint, ILintResult, PermittedEsLintCompilerOptions as PermittedEsLintCompilerOptions } from '../linter';

function debounce<F extends(
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

export async function getStagedNewFiles(git: SimpleGit): Promise<string[]> {

  const allNewFiles: string = await git.diff([
    "--name-only",
    "--cached",
    "--diff-filter=AC",
    "-M70%"
  ])


  const allNewFilesArray: string[] = allNewFiles.split('\n').filter((x) => !!x) 
  return allNewFilesArray;
}

export async function getFilesAfterDateForBranch(
  branchName: string,
  date: string,
  git: SimpleGit,
): Promise<string[]> {
  const newFilesAfterDate = await git.raw([
    'log',
    branchName,
    `--since=${date}`,
    '--name-only',
    '--diff-filter=AC',
    '-M70%',
    '--pretty=format:',
  ]);

  const newFilesAfterDateArray = newFilesAfterDate.split('\n').filter((x) => !!x)
  return newFilesAfterDateArray;
}

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

export async function getFilesInCommitsNotOnMasterFor(
  currentBranchName: string,
  git: SimpleGit,
): Promise<string[]> {
  const string_ = await git.raw([
    'log',
    currentBranchName,
    '--name-only',
    '--not',
    `--exclude=${currentBranchName}`,
    '--branches',
    '--remotes',
    '--pretty=format:',
  ])

  return string_.split('\n').filter(Boolean);
}

export interface IRunTsStrictMigrateResult {
  lintResults?: ILintResult,
  tsResults?: ICompileResult,
  strictFiles?: string[],
  lintSuccess?: boolean,
  tsSuccess?: boolean,
  success: boolean
}

interface ICreateTsStrictMigrateOptions {
  repoPath: string,
  includeStagedFiles?: boolean,
  includeFilesAfterDate?: string,
  includeFilesInCommitsNotInMaster?: boolean,
  watchIncludedFiles?: boolean,
  tsCompilerOpts?: PermittedTSCompilerOptions,
  esLintCompilerOpts?: PermittedEsLintCompilerOptions,
  onResults?: (results: IRunTsStrictMigrateResult)=>void
}

interface ICreateTsStrictMigrateInst {
  run: ()=>Promise<IRunTsStrictMigrateResult>,
  stop: ()=>Promise<void>
}

export function createTsStrictLintMigrate({
  repoPath,
  includeStagedFiles,
  includeFilesAfterDate,
  includeFilesInCommitsNotInMaster,
  watchIncludedFiles,
  tsCompilerOpts: tsCompilerOptions = {},
  esLintCompilerOpts: esLintCompilerOptions = {},
  onResults,
}: ICreateTsStrictMigrateOptions): ICreateTsStrictMigrateInst {
  let watcher: Watcher = createWatcher();
  const tsCompiler = createTSCompiler(tsCompilerOptions);

  async function run(): Promise<IRunTsStrictMigrateResult> {
    const git: SimpleGit = simpleGit(repoPath, { binary: 'git' });
    // git uses a similarity test to determine if a file is
    // renamed or considered a true "change", so we set the
    // threshold at 70% for now
    let stagedFiles: string[] = [];
    let filesInCommitsNotInMaster: string[] = [];
    const currentBranchName = await git.revparse(['--abbrev-ref', 'HEAD' ]);

    if (includeStagedFiles) {
      stagedFiles = await getStagedNewFiles(git);
    }
    if (includeFilesInCommitsNotInMaster) {
      filesInCommitsNotInMaster = await getFilesInCommitsNotOnMasterFor(currentBranchName, git);
    }

    let allNewFiles: string[] = [...stagedFiles, ...filesInCommitsNotInMaster]


    if (includeFilesAfterDate) {
      const newFilesAfterDate = await getFilesAfterDateForBranch(
        currentBranchName,
        includeFilesAfterDate,
        git,
      );
      allNewFiles = [...allNewFiles, ...newFilesAfterDate];
    }

    const success = logErrorsForProhibitedFileExtensions(allNewFiles);

    if (!success) {
      return {
        success: false,
      };
    }

    allNewFiles = allNewFiles.filter((file) => /^.+\.(ts|tsx|cts|mts)$/.test(file) && !/^node_modules\/.+$/.test(file));

    const files = allNewFiles.map((filename) => `${repoPath}/${filename}`);

    const tsProgram = tsCompiler.createProgram(files);

    const composedEsLintCompilerOptions = {
      ...esLintCompilerOptions,
      parserOptions: {
        ...esLintCompilerOptions.parserOptions,
        programs: [tsProgram],
      },
    };

    // console.log('linting', files)

    handleUnwatch({ files, watchEnabled: !!watchIncludedFiles, watcher });
    const lintResults = await lint(files, composedEsLintCompilerOptions);
    handleWatch({ files, watchEnabled: !!watchIncludedFiles, watcher });

    const lintSuccess = !lintResults?.lintResult?.find(
      ({ errorCount }: {errorCount: number}) => errorCount > 0,
    );

    const tsResults = tsCompiler.compile(files);

    const { success: tsSuccess } = tsResults;

    await git.add(stagedFiles);

    const results = {
      strictFiles: allNewFiles,
      lintResults,
      tsResults,
      lintSuccess,
      tsSuccess,
      success: lintSuccess && tsSuccess,
    };

    onResults && onResults(results);

    return results;
  }

  const runDebounced = debounce(run, 100);

  async function stop(): Promise<void> {
    await watcher.close();
  }

  if (watchIncludedFiles) {
    watcher = createWatcher();
    watcher.init();
    watcher.on('add', runDebounced);
    watcher.on('change', runDebounced);
  }

  return {
    run,
    stop,
  };
}

interface IHandleWatchArguments {
  files: string[]
  watchEnabled: boolean
  watcher: Watcher
}

function handleUnwatch({ files, watchEnabled, watcher }: IHandleWatchArguments): void {
  watchEnabled && watcher.unwatchFiles(files);
}

function handleWatch({ files, watchEnabled, watcher }: IHandleWatchArguments): void {
  watchEnabled && watcher.watchFiles(files);
}

type watchUnwatchFunction = (files: string[])=>void

interface EventMap {
  add: (path: string) => void;
  change: (path: string) => void;
  unlink: (path: string) => void;
  addDir: (path: string) => void;
  unlinkDir: (path: string) => void;
  error: (error: Error) => void;
  ready: () => void;
  raw: (event:string, path:string) => void;
}

interface EventsBase {
  // matches EventEmitter.on
  on<U extends keyof EventMap>(event: U, listener: EventMap[U]): this;

  // matches EventEmitter.off
  off<U extends keyof EventMap>(event: U, listener: EventMap[U]): this;

  // matches EventEmitter.emit
  emit<U extends keyof EventMap>(
      event: U,
      ...arguments_: Parameters<EventMap[U]>
  ): void;
}

type publicEmitterFunctionMap = Pick<EventsBase, 'on' | 'off'>

interface Watcher extends publicEmitterFunctionMap {
  init: ()=>void
  close: ()=>Promise<void>
  unwatchFiles: watchUnwatchFunction
  watchFiles: watchUnwatchFunction
}

function createWatcher(): Watcher {
  let internalWatcher: FSWatcher;
  const eventEmitter: EventsBase = new EventEmitter();

  function init() {
    internalWatcher = watch([], {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      followSymlinks: true,
    });

    // Something to use when events are received.
    // const log = console.log.bind(console);
    // Add event listeners.
    internalWatcher
      .on('change', (path: string) => {
        eventEmitter.emit('change', path);
      });
    // .on('add', (path: string )=> {
    //   debugger
    //   log(`File ${path} has been added`)
    //   eventEmitter.emit('add', path)
    // })
    // .on('unlink', (path: string ) => log(`File ${path} has been removed`));
    // // More possible events.
    // internalWatcher
    //   .on('addDir', (path: string ) => log(`Directory ${path} has been added`))
    //   .on('unlinkDir', (path: string ) => log(`Directory ${path} has been removed`))
    //   .on('error', (error: string ) => log(`Watcher error: ${error}`))
    //   .on('ready', () => log('Initial scan complete. Ready for changes'))
    //   .on('raw', (event: string, path: string, details: unknown) => { // internal
    //     log('Raw event info:', event, path, details);
    //   });
  }

  const unwatchFiles: watchUnwatchFunction = (files) => {
    if (internalWatcher) {
      internalWatcher.unwatch(files);
    }
  };

  const watchFiles: watchUnwatchFunction = (files) => {
    if (internalWatcher) {
      internalWatcher.add(files);
    }
  };

  async function close(): Promise<void> {
    await internalWatcher.close();
  }

  return {
    init,
    close,
    unwatchFiles,
    watchFiles,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.on.bind(eventEmitter),
  };
}

/*
 // get current branch
const currentBranchName = await git.revparse({"--abbrev-ref": null, "HEAD": null})
const headCommit = await git.revparse(["--short", "HEAD"])
const commitsNotOnMaster = await getCommitsNotOnMasterFor(currentBranchName, git)

const newFilesInNewCommits = await getNewFilesInNewCommitsComparing(
  commitsNotOnMaster,
  headCommit,
  git
)
allNewFiles = allNewFiles.concat(newFilesInNewCommits)

export async function getCommitsNotOnMasterFor(
  currentBranchName: string,
  git: SimpleGit
): Promise<string[]>{
  return (await git.raw([
    "log",
    currentBranchName,
    "--not",
    `--exclude=${currentBranchName}`,
    "--branches",
    "--remotes",
    `--pretty=format:%h`
  ])).split("\n")
}

export async function getNewFilesInNewCommitsComparing(
  commitsNotOnMaster: string[],
  headCommit: string,
  git: SimpleGit
): Promise<string[]>{
  return (await Promise.all(commitsNotOnMaster.map(async (hash)=>{
    if(hash === headCommit){
      return ''
    }
    return (await git.diff([
    "--name-only",
    "--diff-filter=AC",
    "-M70%",
    hash,
    headCommit
  ])).split("\n")
  }))).flatMap((x)=>x).filter((x)=>!!x)
}
*/
