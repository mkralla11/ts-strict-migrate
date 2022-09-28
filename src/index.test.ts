import {runTsStrictMigrate} from './index'
import {
  ensureTestGitRepoExists, 
  removeTestRepo, 
  gitAddAllTestFiles, 
  gitCommitAllTestFiles,
  getMasterCommits,
  getTestBranchCommits
} from './testHelpers'
import { SimpleGit } from 'simple-git'


describe('runTsStrictMigrate', function(){
  let git: SimpleGit
  let masterCommits: string[]
  let testBranchCommits: string[]
  beforeEach(async ()=>{
    await removeTestRepo()
    git = await ensureTestGitRepoExists()
    masterCommits = await getMasterCommits(git)
    testBranchCommits = await getTestBranchCommits(git)
  })



  // it('should run ts-strict on staged files',async function(){
  //   await gitAddAllTestFiles()
  //   await runTsStrictMigrate({
  //     repoPath: `${__dirname}/gitTestData`
  //   })
  // })

  it('should run ts-strict on new files from new commits not in master',async function(){
    await gitAddAllTestFiles()
    await gitCommitAllTestFiles()
    await runTsStrictMigrate({
      repoPath: `${__dirname}/gitTestData`,
      includeNewCommits: true
    })
    console.log("masterCommits", masterCommits)
    console.log("testBranchCommits", testBranchCommits)
  })
})

