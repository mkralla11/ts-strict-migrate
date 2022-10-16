# ts-strict-lint-migrate


Migrating from JavaScript to strict TypeScript and ESLint all at once is hard. 

This library makes the transition easy by strict type-checking and linting *only new files* added to git *after* the desired leak date, ie. the date you start your migration.


**my-typescript-project/package.json**
```JSON
{
  "name": "my-typescript-project",
  "version": "0.0.1",
  "main": "index.tsx",
  "scripts": {
    "start": "...",
    "ts-strict-lint-migrate": "ts-node ./tsStrictLintMigrateRunner/run.ts"
  },
  "devDependencies": {
    "ts-node": "^10.9.1",
    "ts-strict-lint-migrate": "^0.0.9",
    "typescript": "^4.8.4"
  }
}

```


**my-typescript-project/tsStrictLintMigratRunner/run.ts**
```typescript
import {runTsStrictMigrate} from 'ts-strict-lint-migrate'

async function run(): Promise<void> {
  const {success, lintResults, tsResults} = await runTsStrictMigrate({
    // Base path of your repository directory.
    // This is needed for git operations.
    repoPath: `${__dirname}/../src`,

    // all committed files from this date to present 
    // that should strict type checked and linted
    leakDate: "2020-01-01",

    // In case you want to make sure no one can bypass your strict type checking
    // and linting, you can turn on this option in your CI/CD pipeline
    // so builds will fail for the given Pull Request if anyone
    // tries to back-date files.
    // This option includes ALL files committed in the current branch that 
    // are not in master, regardless of leakDate.
    // default: false
    includeAllCurrentBranchCommitedFilesNotInMaster: !!process.env.CI,


    // This option is similar to the above, but respects
    // the leak date. It is a more relaxed option to use in CI/CD,
    // and theoretically code allow devs to bypass if they know
    // how to back-date files.
    // Any files in the current branch that were added after
    // the leak date will be strict type checked and linted.
    includeCurrentBranchCommitedFiles: !!process.env.CI,


    // This option should be used in a pre-commit hook for good DX
    // (also good to use in watch mode)
    // default: false
    includeStagedFiles: !process.env.CI,

    // This option is great to use in watch mode
    // default: false
    includeUnstagedFiles: !process.env.CI,

    // this option enables watch mode for any files included by the above options
    // default: false
    watchIncludedFiles: !process.env.CI,

    // Any Typescript compiler options
    tsCompilerOpts: {
      // ...
      // helpful to set baseUrl to
      // adjust ts import paths
      baseUrl: `${__dirname}/../src`,
      paths: {
        "some-alias/*": ["*"],
      }
    },

    // Any eslint configuration
    esLintCompilerOpts: {
      // ...
      settings: {
        // ...
      }
    }
    onResults: ({success, lintResults, tsResults}: IRunTsStrictMigrateResultOrProm)=>{
      if(!success){
        tsResults?.prettyResult && console.log("\nTypescript Errors\n\n", tsResults.prettyResult)
        lintResults?.prettyResult && console.log("\nESLint Errors\n\n", lintResults.prettyResult)
        console.error("\n\nFailed ts strict type checking and linting. Please fixe the errors above. \n\n")
        process.exit(1)
      }
  })

  await tsStrictLintMigrate.run()


}

run().catch((e)=>{
  console.error(e)
  process.exit(1)
})

```