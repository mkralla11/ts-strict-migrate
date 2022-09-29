import {runTsStrictMigrate} from './index'
import {getFilesAfterDateForBranch, getStagedNewFiles} from './runTsStrictMigrate'
import {
  ensureTestGitRepoExists, 
  removeTestRepo, 
  gitAddAllTestFiles, 
  gitCommitAllTestFiles,
  getCommittedTimestampsToFilesForBranch,
  ITmToFiles,
  test1fFileName
} from './testHelpers'
import { SimpleGit } from 'simple-git'


describe('runTsStrictMigrate', function(){
  let git: SimpleGit
  let committedTimestampsToFiles: ITmToFiles
  beforeEach(async ()=>{
    await removeTestRepo()
    git = await ensureTestGitRepoExists()
    committedTimestampsToFiles = await getCommittedTimestampsToFilesForBranch("testbranch", git)
  })



  it('should get staged new files',async function(){
    await gitAddAllTestFiles()
    const files = await getStagedNewFiles(git)
    expect(files).toContain(test1fFileName)
  })

  it('should get new files commited after date',async function(){
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1]
    // console.log('since', secondTimeStamp)
    const filesAfterDate = await getFilesAfterDateForBranch(
      'testbranch',
      secondTimeStamp,
      git
    )
    // console.log("filesAfterDate", filesAfterDate)
    // console.log("committedTimestampsToFiles", committedTimestampsToFiles)
    expect(committedTimestampsToFiles[secondTimeStamp]).toEqual(filesAfterDate)
    // debugger
  })

  it('should execute runTsStrictMigrate on all staged and new committed files after date', async function(){
    await gitAddAllTestFiles()
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1]
    const res = await runTsStrictMigrate({
      repoPath: `${__dirname}/gitTestData`,
      includeFilesAfterDate: secondTimeStamp
    })
    
    console.log(res.lintResults.prettyResult)
    expect(res.success).toEqual(false)
    expect(res.lintResults.lintResult[1].errorCount).toEqual(3)
  })
})

