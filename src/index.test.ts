import { SimpleGit } from 'simple-git';
import { 
  createTsStrictLintMigrate,
  RunTsStrictLintMigrateResult
} from './createTsStrictLintMigrate';

import { 
  getFilesAfterDateForBranch, 
  getStagedNewFiles, 
  getUnstagedAndStagedChangedFilesAfterDate,
  getFilesInCommitsNotOnMasterFor
} from './gitHelpers';


import {
  ensureTestGitRepoExists,
  removeTestRepo,
  gitAddAllTestFiles,
  gitCommitAllTestFiles,
  getCommittedTimestampsToFilesForBranch,
  ITmToFiles,
  testFileName1,
  tsTestFilename3,
  tsTestFilename4,
  tsTestFile4,
  tsTestFile2,
  testGitDirectory,
  delay,
  createExposedPromise
} from './testHelpers';
import {
  writeFile,
  ensureFile
} from 'fs-extra';

export type RunTsStrictLintMigrateResultOrProm = RunTsStrictLintMigrateResult | PromiseLike<RunTsStrictLintMigrateResult>


describe('runTsStrictMigrate', () => {
  jest.setTimeout(10000);
  
  let git: SimpleGit;
  let committedTimestampsToFiles: ITmToFiles;
  beforeEach(async () => {
    await removeTestRepo();
    git = await ensureTestGitRepoExists();
    committedTimestampsToFiles = await getCommittedTimestampsToFilesForBranch('testbranch', git);
  });

  it('should get staged new files', async () => {
    await gitAddAllTestFiles();
    const files = await getStagedNewFiles(git);
    expect(files).toContain(testFileName1);
  });

  it('should get unstaged/staged changed files after date', async () => {
    const timeStamp = Object.keys(committedTimestampsToFiles)[1];
    const newData4 = `
      console.log('new stuff')
    `  
    await writeFile(tsTestFile4, newData4);
    const newData2 = `
      console.log('SHOULD NOT BE CHECKED - NEW FILE ADDED BEFORE DATE.')
    `  
    await writeFile(tsTestFile2, newData2);
    const untrackedFilename = 'nested/something/file.js'
    const untrackedFile = `${testGitDirectory}/${untrackedFilename}`
    await ensureFile(untrackedFile);
    await writeFile(untrackedFile, newData2);

    const files = await getUnstagedAndStagedChangedFilesAfterDate('testbranch', timeStamp, git);
    
    expect(files).toEqual([tsTestFilename4, testFileName1, untrackedFilename]);
  });

  it('should get all files in commits not in master', async () => {
    const files = await getFilesInCommitsNotOnMasterFor('testbranch', git);
    expect(files).toEqual([tsTestFilename3, tsTestFilename4])
  });

  it('should get new files commited after date', async () => {
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1];
    const filesAfterDate = await getFilesAfterDateForBranch(
      'testbranch',
      secondTimeStamp,
      git,
    );
    // console.log("filesAfterDate", filesAfterDate)
    // console.log("committedTimestampsToFiles", committedTimestampsToFiles)
    expect(committedTimestampsToFiles[secondTimeStamp]).toEqual(filesAfterDate);
    // debugger
  });

  it('should execute runTsStrictMigrate on all staged and new committed files after date', async () => {
    // await gitAddAllTestFiles();
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1];
    const tsStrictLintMigrate = createTsStrictLintMigrate({
      repoPath: `${__dirname}/gitTestData`,
      includeStagedFiles: true,
      includeAllCurrentBranchCommitedFilesNotInMaster: true,
      includeCurrentBranchCommitedFiles: true,
      leakDate: secondTimeStamp,
      tsCompilerOpts: {
        baseUrl: `${__dirname}/gitTestData`,
        paths: {
          "root/*": ["*"],
        }
      },
      esLintCompilerOpts: {
        settings: {
          "react": {
            "version": "16.6.3"
          },
          "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
            "node": [".js", "jsx"]
          },
          "import/resolver": {
            "eslint-import-resolver-custom-alias": {
              "extensions": [".ts", ".tsx"],
              "alias": {
                "root": `${__dirname}/gitTestData`
              }
            }
          }
        }
      }
    });

    const res = await tsStrictLintMigrate.run()
    // console.log(res?.tsResults?.prettyResult);
    // console.log(res?.lintResults?.prettyResult);
    expect(res.success).toEqual(false);
    expect(res.lintSuccess).toEqual(false);
    expect(res.tsSuccess).toEqual(false);
    expect(res?.lintResults?.lintResult?.length).toEqual(2)
    expect(res?.lintResults?.lintResult?.[0]?.errorCount).toEqual(3);
    expect(res?.lintResults?.lintResult?.[1]?.errorCount).toEqual(12);
  });


  it('should watch', async () => {
    // await gitAddAllTestFiles();
    const exposedPromise = createExposedPromise<RunTsStrictLintMigrateResultOrProm>()
    const exposedPromise1 = createExposedPromise<RunTsStrictLintMigrateResultOrProm>()
    let count = 0

    const opts = {
      watchFiles: [`${__dirname}/gitTestData`],
      repoPath: `${__dirname}/gitTestData`,
      includeAllCurrentBranchCommitedFilesNotInMaster: true,
      includeStagedFiles: true,
      includeUnstagedFiles: true,
      watchIncludedFiles: true,
      tsCompilerOpts: {
        baseUrl: `${__dirname}/gitTestData`,
        paths: {
          "root/*": ["*"],
        }
      },
      esLintCompilerOpts: {
        settings: {
          "react": {
            "version": "16.6.3"
          },
          "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
            "node": [".js", "jsx"]
          },
          "import/resolver": {
            "eslint-import-resolver-custom-alias": {
              "extensions": [".ts", ".tsx"],
              "alias": {
                "root": `${__dirname}/gitTestData`
              }
            }
          }
        }
      },
      onResults: (res: RunTsStrictLintMigrateResultOrProm)=>{
        count = count + 1
        if(count === 1){
          console.log('first resolve')
          exposedPromise.resolve(res)
        }
        else if(count === 2){
          console.log('second resolve')
          exposedPromise1.resolve(res)
        }
      }
    }

    const tsStrictLintMigrate = createTsStrictLintMigrate(opts);
    await tsStrictLintMigrate.run()
  

    const res: RunTsStrictLintMigrateResult = await exposedPromise.promise

    // console.log(res?.tsResults?.prettyResult);
    // console.log(res?.lintResults?.prettyResult);
    expect(res.success).toEqual(false);
    expect(res.lintSuccess).toEqual(false);
    expect(res.tsSuccess).toEqual(false);
    expect(res?.lintResults?.lintResult?.length).toEqual(2)
    expect(res?.lintResults?.lintResult?.[0]?.errorCount).toEqual(3);
    expect(res?.lintResults?.lintResult?.[1]?.errorCount).toEqual(12);

    const newData = `

      console.log('new stuff')

    `  
    console.log('write to file')
    await writeFile(tsTestFile4, newData);
    
    const res1: RunTsStrictLintMigrateResult = await exposedPromise1.promise
    // console.log(res1?.tsResults?.prettyResult);
    // console.log(res1?.lintResults?.prettyResult);
    expect(res1.success).toEqual(false);
    expect(res1.lintSuccess).toEqual(false);
    expect(res1.tsSuccess).toEqual(false);
    expect(res1?.lintResults?.lintResult?.length).toEqual(2)
    expect(res1?.lintResults?.lintResult?.[0]?.errorCount).toEqual(3);
    expect(res1?.lintResults?.lintResult?.[1]?.errorCount).toEqual(0);

    // await delay(10000)
    await tsStrictLintMigrate.stop()


  });

});
