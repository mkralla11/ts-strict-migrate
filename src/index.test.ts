import { SimpleGit } from 'simple-git';
import { 
  getFilesAfterDateForBranch, 
  getStagedNewFiles, 
  createTsStrictLintMigrate,
  getFilesInCommitsNotOnMasterFor,
  IRunTsStrictMigrateResult
} from './createTsStrictLintMigrate';
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
  delay,
  createExposedPromise
} from './testHelpers';
import {
  writeFile
} from 'fs-extra';

type IRunTsStrictMigrateResultOrProm = IRunTsStrictMigrateResult | PromiseLike<IRunTsStrictMigrateResult>


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

  it('should get all files in commits not in master', async () => {
    const files = await getFilesInCommitsNotOnMasterFor('testbranch', git);
    expect(files).toEqual([tsTestFilename3, tsTestFilename4])
  });

  it('should get new files commited after date', async () => {
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1];
    // console.log('since', secondTimeStamp)
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
    await gitAddAllTestFiles();
    const secondTimeStamp = Object.keys(committedTimestampsToFiles)[1];
    const tsStrictLintMigrate = createTsStrictLintMigrate({
      repoPath: `${__dirname}/gitTestData`,
      includeStagedFiles: true,
      includeFilesInCommitsNotInMaster: true,
      includeFilesAfterDate: secondTimeStamp,
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
    console.log(res?.tsResults?.prettyResult);
    console.log(res?.lintResults?.prettyResult);
    expect(res.success).toEqual(false);
    expect(res.lintSuccess).toEqual(false);
    expect(res.tsSuccess).toEqual(false);
    expect(res?.lintResults?.lintResult?.length).toEqual(3)
    expect(res?.lintResults?.lintResult?.[0]?.errorCount).toEqual(3);
    expect(res?.lintResults?.lintResult?.[1]?.errorCount).toEqual(3);
  });


  it('should watch', async () => {
    await gitAddAllTestFiles();
    const exposedPromise = createExposedPromise<IRunTsStrictMigrateResultOrProm>()
    const exposedPromise1 = createExposedPromise<IRunTsStrictMigrateResultOrProm>()
    let count = 0

    const opts = {
      repoPath: `${__dirname}/gitTestData`,
      includeFilesInCommitsNotInMaster: true,
      includeStagedFiles: true,
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
      onResults: (res: IRunTsStrictMigrateResultOrProm)=>{
        count = count + 1
        if(count === 1){
          exposedPromise.resolve(res)
        }
        else if(count === 2){
          exposedPromise1.resolve(res)
        }
      }
    }

    const tsStrictLintMigrate = createTsStrictLintMigrate(opts);
    await tsStrictLintMigrate.run()
  

    const res: IRunTsStrictMigrateResult = await exposedPromise.promise

    console.log(res?.tsResults?.prettyResult);
    console.log(res?.lintResults?.prettyResult);
    expect(res.success).toEqual(false);
    expect(res.lintSuccess).toEqual(false);
    expect(res.tsSuccess).toEqual(false);
    expect(res?.lintResults?.lintResult?.length).toEqual(3)
    expect(res?.lintResults?.lintResult?.[0]?.errorCount).toEqual(3);
    expect(res?.lintResults?.lintResult?.[1]?.errorCount).toEqual(3);

    const newData = `

      console.log('new stuff')

    `  

    await writeFile(tsTestFile4, newData);
    
    const res1: IRunTsStrictMigrateResult = await exposedPromise1.promise

    console.log(res1?.tsResults?.prettyResult);
    console.log(res1?.lintResults?.prettyResult);
    expect(res1.success).toEqual(false);
    expect(res1.lintSuccess).toEqual(false);
    expect(res1.tsSuccess).toEqual(false);
    expect(res1?.lintResults?.lintResult?.length).toEqual(3)
    expect(res1?.lintResults?.lintResult?.[0]?.errorCount).toEqual(2);
    expect(res1?.lintResults?.lintResult?.[1]?.errorCount).toEqual(3);

    // await delay(10000)
    await tsStrictLintMigrate.stop()


  });

});
