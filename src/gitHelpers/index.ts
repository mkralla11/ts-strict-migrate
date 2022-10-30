import { simpleGit, SimpleGit } from 'simple-git';

type Flag = string

type Flags = Flag[]

export async function getDiffNamesOnlyWithFlags(git: SimpleGit, flags: Flags): Promise<string[]> {

  const files: string = await git.diff([
    "--name-only",
    "-M70%",
    ...flags
  ])


  const filesArray: string[] = files.split('\n').filter((x) => !!x) 
  return filesArray;
}

export async function getStagedNewFiles(git: SimpleGit): Promise<string[]> {

  const allNewFiles = await getDiffNamesOnlyWithFlags(git, ["--diff-filter=AC", "--cached"])

  return allNewFiles;
}


export async function getUnstagedAndStagedChangedFilesAfterDate(
  branchName: string,
  date: string,
  git: SimpleGit,
): Promise<string[]> {

  const unstagedAndStagedFiles: string = await git.raw([
    "status",
    "-M70%",
    "--porcelain"
  ])

  const unstagedAndStagedFilesArray: string[] = unstagedAndStagedFiles
    .split('\n')



  const newAndUntrackedFiles = unstagedAndStagedFilesArray
    .filter((name)=>['A ', '??'].includes(name.slice(0,2)))
    .map((name)=>name.slice(3))


  // Modified Staged, Modified Unstaged
  const changedFiles = unstagedAndStagedFilesArray
    .filter((name)=>['M ', ' M'].includes(name.slice(0,2)))
    .map((name)=>name.slice(3))

  const changedFilesMap = new Map<string, string>();

  for (const name of changedFiles) {
    changedFilesMap.set(name, name)
  }

  // console.log(changedFilesMap)
  const newFilesAfterDate = await getFilesAfterDateForBranch(
    branchName,
    date,
    git,
  )

  const changedFilesAfterDate = newFilesAfterDate.filter((name)=>changedFilesMap.has(name))

  return [...changedFilesAfterDate, ...newAndUntrackedFiles]
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