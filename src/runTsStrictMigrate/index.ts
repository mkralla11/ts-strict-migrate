import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';


interface IRunTsSTrictMigrate {
  repoPath: string,
  includeStagedFiles?: boolean,
  includeNewCommits?: boolean
}

export async function runTsStrictMigrate({repoPath, includeStagedFiles=true, includeNewCommits=true}: IRunTsSTrictMigrate){
  const git: SimpleGit = simpleGit(`${__dirname}/../gitTestData`, { binary: 'git' })
  // git uses a similarity test to determine if a file is 
  // renamed or considered a true "change", so we set the 
  // threshold at 70% for now
  let allNewFiles: string[] = (await git.diff({"--name-only": null, "--cached": null, "--diff-filter": "AC", "-M70%": null})).split("\n").filter((x)=>!!x)
  if(includeNewCommits){
    // get current branch
    const currentBranchName = await git.revparse({"--abbrev-ref": null, "HEAD": null})
    const headCommit = await git.revparse(["--short", "HEAD"])
    const commitsNotOnMaster = await getCommitsNotOnMasterFor(currentBranchName, git)
    
    const newFilesInNewCommits = await getNewFilesInNewCommitsComparing(commitsNotOnMaster, headCommit, git)
    allNewFiles = allNewFiles.concat(newFilesInNewCommits)
  }

  console.log(allNewFiles)
}


export async function getCommitsNotOnMasterFor(currentBranchName: string, git: SimpleGit): Promise<string[]>{
  return (await git.raw(["log", currentBranchName, "--not", `--exclude=${currentBranchName}`, "--branches", "--remotes", `--pretty=format:%h`])).split("\n")
}

export async function getNewFilesInNewCommitsComparing(commitsNotOnMaster: string[], headCommit: string, git: SimpleGit): Promise<string[]>{
  return (await Promise.all(commitsNotOnMaster.map(async (hash)=>{
    if(hash === headCommit){
      return ''
    }
    return (await git.diff(["--name-only", "--diff-filter=AC", "-M70%", hash, headCommit])).split("\n")
  }))).flatMap((x)=>x).filter((x)=>!!x)
}