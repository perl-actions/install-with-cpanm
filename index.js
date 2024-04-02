const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const exec = require("@actions/exec");
const io = require("@actions/io");

const fs = require("fs");
const path = require("path");
const os = require("os");

let PERL;

async function install_cpanm_location() {
  let out = "";

  const options = {};
  options.listeners = {
    stdout: (data) => {
      out += data.toString();
    },
  };

  let p = core.getInput("path");
  p.replace("\\", "\\\\");
  await exec.exec(PERL, ["-MConfig", "-e", `print "${p}"`], options);

  return path.resolve(out);
}

async function install_cpanm(install_to) {
  const url = "https://cpanmin.us";

  core.info(`Get cpanm from ${url}`);

  const cpanmScript = await tc.downloadTool(url);

  core.info(`cpanm Script: ${cpanmScript}`);
  core.info(`install_to ${install_to}`);

  const platform = os.platform();

  if (platform == "win32") {
    await io.cp(cpanmScript, install_to);
  } else {
    await do_exec([
      PERL,
      "-MFile::Copy=cp",
      "-e",
      `cp("${cpanmScript}", "${install_to}"); chmod(0755, "${install_to}")`,
    ]);
  }
  //await ioUtil.chmod(install_to, '0755')

  return install_to;
}

async function which_perl() {
  const perl = core.getInput("perl");
  if (perl == "perl") {
    return await io.which("perl", true);
  }
  return perl;
}

function is_true(b) {
  if (b !== null && (b === true || b == "true" || b == "1" || b == "ok")) {
    return true;
  }

  return false;
}

async function do_exec(cmd, env) {
  const sudo = is_true(core.getInput("sudo"));
  const platform = os.platform();
  const bin = sudo && platform != "win32" ? "sudo" : cmd.shift();

  core.info(`do_exec: ${JSON.stringify(bin)} ${JSON.stringify(env)}`);

  await exec.exec(bin, cmd, env);
}

async function run() {
  PERL = await which_perl();

  const cpanm_location = await install_cpanm_location();

  await install_cpanm(cpanm_location);

  // input arguments
  const install = core.getInput("install");
  const cpanfile = core.getInput("cpanfile");
  const tests = core.getInput("tests");
  const args = core.getInput("args");
  const verbose = core.getInput("verbose");
  const local_lib = core.getInput("local-lib");

  const w_tests = is_true(tests) ? null : "--notest";
  let w_args = [];
  let env = {};
  if (args !== null && args.length) {
    w_args = args.split(/\s+/);
  }

  if (local_lib !== null && local_lib.length) {

    w_args.push("--local-lib", local_lib);
    if ( local_lib.startsWith("~") ) {
      const home = process.env.HOME;
      const expanded_lib_path = local_lib.replace(/^~/, home);
      env = { PERL5LIB: expanded_lib_path };
      } else {
        env = { PERL5LIB: local_lib };
      }
  }

  /* base CMD_install command */
  let CMD_install = [PERL, cpanm_location];

  if (is_true(verbose)) {
    CMD_install.push("-v");
  }

  if (w_tests != null) {
    CMD_install.push(w_tests);
  }

  if (w_args.length) {
    CMD_install = CMD_install.concat(w_args);
  }

  let has_run = false;

  /* install one ore more modules */
  if (install !== null && install.length) {
    // install one or more modules
    core.info(`install: ${install}!`);
    const list = install.split("\n");

    let cmd = [...CMD_install]; /* clone array */
    cmd = cmd.concat(list);

    has_run = true;
    await do_exec(cmd, env);
  }

  /* install from cpanfile */
  if (cpanfile !== null && cpanfile.length) {
    // install one or more modules
    core.info(`cpanfile: ${cpanfile}!`);
    const cpanfile_full_path = path.resolve(cpanfile);
    core.info(`cpanfile: ${cpanfile_full_path}! [resolved]`);

    let cmd = [...CMD_install];
    cmd.push("--cpanfile", cpanfile_full_path, "--installdeps", ".");

    has_run = true;
    await do_exec(cmd, env);
  }

  /* custom run with args */
  if ( has_run === false && w_args.length ) {
    core.info(`custom run with args`);
    let cmd = [...CMD_install];
    has_run = true;
    await do_exec(cmd, env);
  }

  return;
}

// Call run
(async () => {
  try {
    await run();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
