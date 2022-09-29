import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git'
import {ensureDir, ensureFile, writeFile, remove} from 'fs-extra'
import { exec } from 'child_process'
import {promisify} from 'util'
const asyncExec = promisify(exec)

const testGitDir = `${__dirname}/../gitTestData`
const testGitHiddenGitFolder = `${testGitDir}/.git`
const tsTestFile = `${testGitDir}/example.ts`
// used to test staged file
export const test1fFileName = `example1.ts`
export const tsTestFile1 = `${testGitDir}/${test1fFileName}`
const tsTestFile1Delete = `${testGitDir}/exampleDel.ts`

const tsTestFile2 = `${testGitDir}/example2.ts`
const tsTestFile3 = `${testGitDir}/example3.ts`
const testBranchName = "testbranch"

const tsTestData = `
export function example(){
    return null
}
`

const tsTestData1 = `
export function example1(): any{
    return 'something'
}
`

const tsTestData3 = `/* eslint-disable */
export function example3(): void {
  return 'something'
}

function useTheExample(){
  console.log(example3())
}
useTheExample()
`

const tsTestData1Delete = `
export function example1(){
    return 'other'
}
`
function delay(ms: number): Promise<void>{
  return new Promise((res, rej)=>{
    setTimeout(()=>res(), ms)
  })
}

export async function ensureTestGitRepoExists(): Promise<SimpleGit> {
  await ensureDir(testGitDir)
  const git: SimpleGit = simpleGit(testGitDir, { binary: 'git' });
  await git.init()
  await git.checkoutLocalBranch('master')
  await ensureFile(tsTestFile2)
  await git.add(".")
  await git.commit("commit master 1 file")
  await delay(1000)
  await git.checkoutLocalBranch(testBranchName)
  await ensureFile(tsTestFile3)
  await writeFile(tsTestFile3, tsTestData3)
  await git.add(".")
  await git.commit("commit testbranch 1 file")
  await git.checkout('master')
  await ensureFile(tsTestFile)
  await writeFile(tsTestFile, tsTestData)
  await ensureFile(tsTestFile1Delete)
  await writeFile(tsTestFile1Delete, tsTestData1Delete)
  await git.add(".")
  await git.commit("commit master 2 more files")
  // switch to new branch
  await git.checkout(testBranchName)
  await ensureFile(tsTestFile1)
  await writeFile(tsTestFile1, tsTestData1)
  await remove(tsTestFile1Delete)
  return git
}

export async function gitAddAllTestFiles(){
  const git: SimpleGit = simpleGit(testGitDir, { binary: 'git' });
  await git.add(".")
}

export async function gitCommitAllTestFiles(){
  const git: SimpleGit = simpleGit(testGitDir, { binary: 'git' });
  await git.commit("commit rest of files")
}

export async function removeTestRepo(){
  await asyncExec(`rm -rf ${testGitDir}`)
}

export async function getTestBranchCommits(git: SimpleGit):  Promise<string[]>{
  return (await git.raw(["log", testBranchName, `--pretty=format:%h`])).split("\n")
}

export interface ITmToFiles {
  [key: string]: string[]
}

export async function getCommittedTimestampsToFilesForBranch(branchName: string, git: SimpleGit): Promise<ITmToFiles>{
  const arr: string[] = (await git.raw(["log", branchName, `--pretty=~~~%ct`, "--name-only"])).split("\n").filter((x)=>!!x)
  let curTm = ""
  return arr.reduce(function (acc: ITmToFiles, v: string): ITmToFiles{
    if(v.slice(0, 3) === "~~~"){
      const tm = v.slice(3)
      curTm = tm
    }
    else{
      acc[curTm] = acc[curTm] || []
      acc[curTm].push(v)
    }
    return acc
  }, {})

}

