import { simpleGit, SimpleGit } from 'simple-git';
import { 
  createTSCompiler, 
  CompileResult, 
  TsConfig 
} from '../createTSCompiler';
import { 
  lint, 
  LintResult, 
  EsLintConfig as EsLintConfig 
} from '../linter';
import {
  getStagedNewFiles,
  getUnstagedAndStagedChangedFilesAfterDate,
  getFilesAfterDateForBranch,
  getFilesInCommitsNotOnMasterFor
} from '../gitHelpers'
import {
  debounce,
  getErrorsForProhibitedFileExtensions,
  GetErrorsForProhibitedFileExtensionsResult
} from '../utilities'

import {
  ESLint
} from 'eslint'


import {
  createWatcher,
  Watcher,
  handleUnwatch,
  handleWatch
} from '../createWatcher'
import path from 'node:path'

type RawLintResult = ESLint.LintResult

export interface RunTsStrictLintMigrateResult {
  prohibitedFilesResults?: GetErrorsForProhibitedFileExtensionsResult,
  lintResults?: LintResult,
  tsResults?: CompileResult,
  strictFiles?: string[],
  lintSuccess?: boolean,
  tsSuccess?: boolean,
  success: boolean
}

export interface CreateTsStrictLintMigrateOptions {
  repoPath: string,
  extraFiles?: string[],
  includeStagedFiles?: boolean,
  includeUnstagedFiles?: boolean,
  includeCurrentBranchCommitedFiles?: boolean,
  includeAllCurrentBranchCommitedFilesNotInMaster?: boolean,
  watchIncludedFiles?: boolean,
  ignoreFilesFromWatch?: RegExp,
  watchFiles?: string[],
  leakDate?: string,
  excludeFiles?: string[],
  tsConfig?: TsConfig,
  esLintConfig?: EsLintConfig,
  onResults?: (results: RunTsStrictLintMigrateResult)=>void
}

export interface TsStrictLintMigrate {
  run: ()=>Promise<RunTsStrictLintMigrateResult>,
  stop: ()=>Promise<void>
}

export function createTsStrictLintMigrate({
  repoPath,
  extraFiles,
  includeStagedFiles,
  includeUnstagedFiles,
  includeCurrentBranchCommitedFiles,
  includeAllCurrentBranchCommitedFilesNotInMaster,
  watchIncludedFiles,
  watchFiles,
  ignoreFilesFromWatch,
  leakDate,
  excludeFiles,
  tsConfig: tsCompilerOptions = {},
  esLintConfig: esLintCompilerOptions = {},
  onResults,
}: CreateTsStrictLintMigrateOptions): TsStrictLintMigrate {
  let watcher: Watcher = createWatcher({ignoreFilesFromWatch});
  const tsCompiler = createTSCompiler(tsCompilerOptions);
  let rawLintResults: RawLintResult[];

  async function run(): Promise<RunTsStrictLintMigrateResult> {
    const git: SimpleGit = simpleGit(repoPath, { binary: 'git' });
    // git uses a similarity test to determine if a file is
    // renamed or considered a true "change", so we set the
    // threshold at 70% for now
    let stagedFiles: string[] = [];
    let filesInCommitsNotInMaster: string[] = [];
    let unstagedAndStagedFiles: string[] = [];
    let newFilesAfterDate: string[] = [];

    const currentBranchName = await git.revparse(['--abbrev-ref', 'HEAD' ]);

    if (includeStagedFiles) {
      stagedFiles = await getStagedNewFiles(git);
    }
    if (includeUnstagedFiles && leakDate) {
      unstagedAndStagedFiles = await getUnstagedAndStagedChangedFilesAfterDate(
        currentBranchName,
        leakDate,
        git,
      )
    }

    if (includeAllCurrentBranchCommitedFilesNotInMaster) {
      filesInCommitsNotInMaster = await getFilesInCommitsNotOnMasterFor(currentBranchName, git);
    }



    if (includeCurrentBranchCommitedFiles && leakDate) {
      newFilesAfterDate = await getFilesAfterDateForBranch(
        currentBranchName,
        leakDate,
        git,
      );
    }

    let allNewFiles: string[] = [
      ...stagedFiles, 
      ...unstagedAndStagedFiles, 
      ...filesInCommitsNotInMaster, 
      ...newFilesAfterDate,
      ...(extraFiles || [])
    ]

    allNewFiles = [...new Set(allNewFiles)]

    if(allNewFiles.length === 0){
      return {
        success: true,
      };
    }

    const prohibitedFilesResults = getErrorsForProhibitedFileExtensions(allNewFiles);

    if (!prohibitedFilesResults.success) {
      return {
        success: false,
        prohibitedFilesResults
      };
    }

    allNewFiles = allNewFiles.filter((file) => /^.+\.(ts|tsx|cts|mts)$/.test(file) && !/^node_modules\/.+$/.test(file));
    repoPath = repoPath[repoPath.length -1] === '/' ? repoPath.slice(0, -1) : repoPath
    let files = allNewFiles.map((filename) => path.join(repoPath, filename));

    if(excludeFiles && excludeFiles.length > 0){
      const excludeFilesObject = excludeFiles.reduce((accumulator: {[key: string]: boolean}, key)=>{
        accumulator[key] = true
        return accumulator
      }, {})
      files = files.filter((file)=>!excludeFilesObject[file])
    }

    const tsProgram = tsCompiler.createProgram(files);

    const composedEsLintCompilerOptions = {
      ...esLintCompilerOptions,
      parserOptions: {
        ...esLintCompilerOptions.parserOptions,
        programs: [tsProgram],
      },
    };

    // console.log('linting', files)
    const repoPathAsArray = watchFiles

    const lintResults = await lint(files, composedEsLintCompilerOptions);

    const lintSuccess = !lintResults?.lintResult?.find(
      ({ errorCount }: {errorCount: number}) => errorCount > 0,
    );

    const tsResults = tsCompiler.compile();

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

  
  const runDebounced = debounce(run, 10);


  // function runCheckDebounced(event: string, path: string){
  //   runDebounced()
  // }


  
  async function stop(): Promise<void> {
    await watcher.close();
  }

  if (watchIncludedFiles && watchFiles && watchFiles.length > 0) {
    watcher = createWatcher({ignoreFilesFromWatch});
    watcher.init();
    handleWatch({ files: watchFiles, watchEnabled: !!watchIncludedFiles, watcher });
    watcher.on('all', runDebounced);
  }

  return {
    run,
    stop,
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
