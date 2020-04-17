const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");
const exec = require("@actions/exec");

async function action() {
  const cpanm = await tc.downloadTool("https://cpanmin.us");
  core.setOutput("cpanminus", cpanm);
  await exec.exec("sudo", ["perl", cpanm, "App::cpanminus"]);
  return;
}

// Call action
(async () => {
  try {
    await action();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
