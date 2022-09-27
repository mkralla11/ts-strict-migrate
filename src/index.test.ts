import {runTsStrictMigrate} from './index'
import {ensureTestGitRepoExists} from './testHelpers'


describe('runTsStrictMigrate', function(){
  beforeAll(async ()=>{
    await ensureTestGitRepoExists()
  })

  it('should run',async function(){
    // await runTsStrictMigrate({repoPath: `${__dirname}/gitTestData`})
    

  })
})