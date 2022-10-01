import { simpleGit, SimpleGit } from 'simple-git';
// import { JsxEmit } from 'typescript';
import * as ts from 'typescript';
import { compile } from '../tsCompiler';
import { lint, ILintResult } from '../linter';

export async function getStagedNewFiles(git: SimpleGit): Promise<string[]> {
  const allNewFiles: string[] = (await git.diff({
    '--name-only': null, '--cached': null, '--diff-filter': 'AC', '-M70%': null,
  })).split('\n').filter((x) => !!x);
  return allNewFiles;
}

export async function getFilesAfterDateForBranch(
  branchName: string,
  date: string,
  git: SimpleGit,
): Promise<string[]> {
  const newFilesAfterDate = (await git.raw([
    'log',
    branchName,
    `--since=${date}`,
    '--name-only',
    '--diff-filter=AC',
    '-M70%',
    '--pretty=format:',
  ])).split('\n').filter((x) => !!x);
  return newFilesAfterDate;
}

interface IRunTsStrictMigrate {
  repoPath: string,
  includeStagedFiles?: boolean,
  includeFilesAfterDate?: string
}

interface IRunTsStrictMigrateResult {
  lintResults: ILintResult,
  strictFiles: string[],
  success: boolean
}

// type jsx: JsxEmit = 'react';

export async function runTsStrictMigrate(
  {
    repoPath,
    includeFilesAfterDate,
  }: IRunTsStrictMigrate,
): Promise<IRunTsStrictMigrateResult> {
  const git: SimpleGit = simpleGit(repoPath, { binary: 'git' });
  // git uses a similarity test to determine if a file is
  // renamed or considered a true "change", so we set the
  // threshold at 70% for now
  let allNewFiles: string[] = await getStagedNewFiles(git);
  if (includeFilesAfterDate) {
    const currentBranchName = await git.revparse({ '--abbrev-ref': null, HEAD: null });
    const newFilesAfterDate = await getFilesAfterDateForBranch(
      currentBranchName,
      includeFilesAfterDate,
      git,
    );
    allNewFiles = allNewFiles.concat(newFilesAfterDate);
  }

  allNewFiles.forEach((file) => {
    if (file.slice(-3) === '.js' || file.slice(-4) === '.jsx') {
      console.error(`
Please use .ts(x) extension instead of .js(x)
${file}
      `);
      process.exit(1);
    }
  });

  const files = allNewFiles.map((filename) => `${repoPath}/${filename}`);

  const lintResults = await lint(files);

  const success = compile(files, {
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    noFallthroughCasesInSwitch: true,
    noPropertyAccessFromIndexSignature: true,
    forceConsistentCasingInFileNames: true,
    noImplicitOverride: true,
    noEmitOnError: true,
    esModuleInterop: true,
    skipLibCheck: true,
    jsx: 4,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  });

  return {
    strictFiles: allNewFiles,
    lintResults,
    success,
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
