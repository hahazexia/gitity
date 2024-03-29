import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import showBranches from './util.mjs';

const inquirerMerge = (name, git, branches) => {
  inquirer
    .prompt({
      name: 'willMergeBranches',
      type: 'checkbox',
      message: `choose which branches will merge into ${name}`,
      choices: branches
    })
    .then(async (answers) => {
      const res = answers.willMergeBranches.filter(i => i !== 'master' && i !== `${name}`);
      if (res.length === 0) {
        console.log(`there is nothing will be merged in ${name}`);
        process.exit();
      } else {
        for (const b of res) {
          const mergeRes = await git.merge([b]);
          if (mergeRes.result === 'success' && mergeRes.conflicts.length === 0) {
            console.log(`merge ${b} is successful and no conflicts`);
          } else {
            console.log(`\n`);
            console.log('something is wrong, please check manually');
            process.exit();
          }
        }
      }
      showBranches(git);
    })
    .catch((error) => {
      console.log(error, 'error');
      process.exit();
    });
};

const testAction = async (name) => {
  // 检查用户输入的 test 分支名是否合法
  if (!name || !/^test\/[a-zA-Z0-9\-]+/g.test(name)) {
    console.log(`\n`);
    console.log(`your test branch name is invalid, please use correct test branch name`);
    process.exit();
  }
  // 初始化 git
  const git = simpleGit({
    baseDir: process.cwd(),
    binary: 'git',
  });

  // git status 查看当前分支状态
  const currentStatus = await git.status();
  const branches = await git.branch();

  if (currentStatus.isClean()) { // 当前分支状态干净，可以继续后续流程
    if (branches.current === name) { // 当前已经是 name 分支
      console.log(`already on ${name}`);
      console.log(`\n`);
      const filterBranches = branches.all.filter(i => !i.includes('remotes') && i !== name);
      inquirerMerge(name, git, filterBranches);

    } else if (branches.all.includes(name)) { // 本地已存在 name 分支
      console.log(`there has ${name}`);
      console.log(`\n`);
      await git.checkout([`${name}`]);
      const filterBranches = branches.all.filter(i => !i.includes('remotes') && i !== name);
      inquirerMerge(name, git, filterBranches);
    } else { // 本地还没有 name 分支
      console.log(`there is no ${name}`);
      console.log(`\n`);
      await git.checkout(`master`);
      await git.checkout(['-b', `${name}`]);
      const branches = await git.branch();
      const filterBranches = branches.all.filter(i => !i.includes('remotes') && i !== name);
      inquirerMerge(name, git, filterBranches);
    }
  } else { // 当前分支状态有未处理的文件，退出流程
    console.log(`\n`);
    console.log(`working tree not clean, please make sure all your changes is commited`);
    process.exit();
  }
};

export default testAction;
