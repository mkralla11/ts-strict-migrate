import { simpleGit, SimpleGit } from 'simple-git';
import {
  ensureDir, ensureFile, writeFile, remove,
} from 'fs-extra';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
// import {fileURLToPath} from 'node:url';
// import path from 'node:path';

const asyncExec = promisify(exec);
// const __dirname = path.dirname(fileURLToPath(import.meta.url))

type Resolve<T> = (value: T | PromiseLike<T>)=>void
type Reject = (error: Error)=>void

interface ExposedPromise<T> {
  resolve: Resolve<T>,
  reject: Reject,
  promise: Promise<T>
}

export function createExposedPromise<T>(): ExposedPromise<T> {
  const resolve: Resolve<T> = (value) => {
    resolver(value);
  };

  const reject = (error: Error) => {
    rejecter(error);
  };
  let resolver: Resolve<T>;
  let rejecter: Reject;

  const promise = new Promise<T>((promResolve: Resolve<T>, rej: Reject) => {
    resolver = promResolve;
    rejecter = rej;
  });
  return {
    resolve,
    reject,
    promise,
  };
}

export const testGitDirectory = `${__dirname}/../gitTestData`;
const tsTestFile = `${testGitDirectory}/example.ts`;
// used to test staged file
export const testFileName1 = 'example1.ts';
export const tsTestFile1 = `${testGitDirectory}/${testFileName1}`;
const tsTestFile1Delete = `${testGitDirectory}/exampleDel.ts`;

export const tsTestFile2 = `${testGitDirectory}/example2.js`;
const tsTestFileDeclaration2 = `${testGitDirectory}/example2.d.ts`;

export const tsTestFilename3 = 'example3.ts';
export const tsTestFilename4 = 'nested/example4.tsx';

export const tsTestFile3 = `${testGitDirectory}/${tsTestFilename3}`;
export const tsTestFile4 = `${testGitDirectory}/${tsTestFilename4}`;

const testBranchName = 'testbranch';

const tsTestData = `
export function example(){
    return null
}
`;

const tsTestData1 = `
import {MyComponent} from 'root/nested/example4'
export function example1(): void{
    return 'something'
}
`;

const tsTestDataDeclaration2 = `
export function unused(): void
`;
const tsTestData2 = `
  // this a JS file 
  // this is not included in files pulled in test run
  export function unused(){
    return 'a string instead'
  }
`;

const tsTestData3 = `/* eslint-disable */
export function example3(): boolean {
  return 'something'
}

function useTheExample(){
  console.log(example3())
}
useTheExample()
`;

const tsTestData4 = `
import React, {useState, useEffect} from 'react'
import {View, Text} from 'react-native'
import {example3} from 'root/example3'
import {example1} from 'root/example1'
import {unused} from 'root/example2'

export function MyComponent({text}) {
  const [otherText, setOtherText] = useState("wow")
  const supposedlyVoid: string = unused()

  useEffect(()=>{
    if (true) {
      setOtherText(!otherText)
    }
  }, [])


  return (
    <View>
      <Text>
        {text}
      </Text>
    </View>
  )
}
`;

const tsTestData1Delete = `
export function example1(){
    return 'other'
}
`;
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export async function ensureTestGitRepoExists(): Promise<SimpleGit> {
  await ensureDir(testGitDirectory);
  const git: SimpleGit = simpleGit(testGitDirectory, { binary: 'git' });
  await git.init();
  await git.checkoutLocalBranch('master');
  await ensureFile(tsTestFile2);
  await writeFile(tsTestFile2, tsTestData2);
  await ensureFile(tsTestFileDeclaration2);
  await writeFile(tsTestFileDeclaration2, tsTestDataDeclaration2);
  await git.add('.');
  await git.commit('commit master 1 file');
  await delay(800);
  await git.checkoutLocalBranch(testBranchName);
  await ensureFile(tsTestFile3);
  await writeFile(tsTestFile3, tsTestData3);
  await ensureFile(tsTestFile4);
  await writeFile(tsTestFile4, tsTestData4);

  await git.add('.');
  await git.commit('commit testbranch 1 file');
  await git.checkout('master');
  await ensureFile(tsTestFile);
  await writeFile(tsTestFile, tsTestData);
  await ensureFile(tsTestFile1Delete);
  await writeFile(tsTestFile1Delete, tsTestData1Delete);
  await git.add('.');
  await git.commit('commit master 2 more files');
  // switch to new branch
  await git.checkout(testBranchName);
  await ensureFile(tsTestFile1);
  await writeFile(tsTestFile1, tsTestData1);
  await remove(tsTestFile1Delete);
  return git;
}

export async function gitAddAllTestFiles(): Promise<void> {
  const git: SimpleGit = simpleGit(testGitDirectory, { binary: 'git' });
  await git.add('.');
}

export async function gitCommitAllTestFiles(): Promise<void> {
  const git: SimpleGit = simpleGit(testGitDirectory, { binary: 'git' });
  await git.commit('commit rest of files');
}

export async function removeTestRepo(): Promise<void> {
  await asyncExec(`rm -rf ${testGitDirectory}`);
}

export async function getTestBranchCommits(git: SimpleGit): Promise<string[]> {
  const string_ = await git.raw(['log', testBranchName, '--pretty=format:%h']);
  return string_.split('\n')
}

export interface ITmToFiles {
  [key: string]: string[]
}

export async function getCommittedTimestampsToFilesForBranch(
  branchName: string,
  git: SimpleGit,
): Promise<ITmToFiles> {
  const string_: string = await git.raw(['log', branchName, '--pretty=~~~%ct', '--name-only']);
  const array: string[] = string_.split('\n').filter((x) => !!x);
  let currentTm = '';
  return array.reduce((accumulator: ITmToFiles, v: string): ITmToFiles => {
    if (v.slice(0, 3) === '~~~') {
      const tm = v.slice(3);
      currentTm = tm;
    } else {
      accumulator[currentTm] = accumulator[currentTm] || [];
      accumulator[currentTm].push(v);
    }
    return accumulator;
  }, {});
}
