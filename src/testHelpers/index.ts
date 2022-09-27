import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

export async function ensureTestGitRepoExists(){

    try{
      debugger
      const git: SimpleGit = simpleGit(`${__dirname}/../gitTestData`, { binary: 'git' });
      await git.init()
      const res = await git.diff({"--name-only": null})
      debugger
    }
    catch(e){
      console.log(e)
      debugger
    }
}