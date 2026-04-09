jest.mock("@actions/core");
jest.mock("@actions/tool-cache");
jest.mock("@actions/exec");
jest.mock("@actions/io");

const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const exec = require("@actions/exec");
const io = require("@actions/io");
const os = require("os");
const path = require("path");

const { is_true, do_exec, which_perl, install_cpanm_location, install_cpanm, run, set_perl, get_perl } = require("./lib");

beforeEach(() => {
  jest.clearAllMocks();
  core.info.mockImplementation(() => {});
  core.getInput.mockImplementation(() => "");
});

// ── is_true ──────────────────────────────────────────────────────────────────

describe("is_true", () => {
  test("returns true for boolean true", () => {
    expect(is_true(true)).toBe(true);
  });

  test("returns true for string 'true'", () => {
    expect(is_true("true")).toBe(true);
  });

  test("returns true for string '1'", () => {
    expect(is_true("1")).toBe(true);
  });

  test("returns true for string 'ok'", () => {
    expect(is_true("ok")).toBe(true);
  });

  test("returns false for boolean false", () => {
    expect(is_true(false)).toBe(false);
  });

  test("returns false for string 'false'", () => {
    expect(is_true("false")).toBe(false);
  });

  test("returns false for string '0'", () => {
    expect(is_true("0")).toBe(false);
  });

  test("returns false for null", () => {
    expect(is_true(null)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(is_true("")).toBe(false);
  });
});

// ── which_perl ────────────────────────────────────────────────────────────────

describe("which_perl", () => {
  test("resolves 'perl' via io.which when input is 'perl'", async () => {
    core.getInput.mockImplementation((name) => name === "perl" ? "perl" : "");
    io.which.mockResolvedValue("/usr/bin/perl");

    const result = await which_perl();

    expect(io.which).toHaveBeenCalledWith("perl", true);
    expect(result).toBe("/usr/bin/perl");
  });

  test("returns custom perl path without calling io.which", async () => {
    core.getInput.mockImplementation((name) => name === "perl" ? "/opt/perl/bin/perl" : "");

    const result = await which_perl();

    expect(io.which).not.toHaveBeenCalled();
    expect(result).toBe("/opt/perl/bin/perl");
  });
});

// ── do_exec ───────────────────────────────────────────────────────────────────

describe("do_exec", () => {
  test("prepends sudo on non-windows when sudo input is true", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "true" : "");
    exec.exec.mockResolvedValue(0);

    await do_exec(["/usr/bin/perl", "script.pl"]);

    expect(exec.exec).toHaveBeenCalledWith("sudo", ["/usr/bin/perl", "script.pl"], undefined);
  });

  test("does not use sudo on win32 even when sudo input is true", async () => {
    jest.spyOn(os, "platform").mockReturnValue("win32");
    core.getInput.mockImplementation((name) => name === "sudo" ? "true" : "");
    exec.exec.mockResolvedValue(0);

    await do_exec(["/usr/bin/perl", "script.pl"]);

    expect(exec.exec).toHaveBeenCalledWith("/usr/bin/perl", ["script.pl"], undefined);
  });

  test("shifts first element as binary when sudo is false", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    exec.exec.mockResolvedValue(0);

    const cmd = ["/usr/bin/perl", "arg1", "arg2"];
    await do_exec(cmd);

    expect(exec.exec).toHaveBeenCalledWith("/usr/bin/perl", ["arg1", "arg2"], undefined);
  });
});

// ── install_cpanm_location ────────────────────────────────────────────────────

describe("install_cpanm_location", () => {
  test("executes perl with Config and returns resolved path", async () => {
    set_perl("/usr/bin/perl");
    core.getInput.mockImplementation((name) => name === "path" ? "/usr/local/bin/cpanm" : "");
    exec.exec.mockImplementation(async (bin, args, options) => {
      options.listeners.stdout(Buffer.from("/usr/local/bin/cpanm"));
      return 0;
    });

    const result = await install_cpanm_location();

    expect(exec.exec).toHaveBeenCalledWith(
      "/usr/bin/perl",
      ["-MConfig", "-e", 'print "/usr/local/bin/cpanm"'],
      expect.objectContaining({ listeners: expect.any(Object) })
    );
    expect(result).toBe(path.resolve("/usr/local/bin/cpanm"));
  });

  test("escapes backslashes in path on windows-style paths", async () => {
    set_perl("/usr/bin/perl");
    core.getInput.mockImplementation((name) => name === "path" ? "C:\\cpanm\\cpanm" : "");
    exec.exec.mockImplementation(async (bin, args, options) => {
      options.listeners.stdout(Buffer.from("C:\\cpanm\\cpanm"));
      return 0;
    });

    await install_cpanm_location();

    const printExpr = exec.exec.mock.calls[0][1][2];
    expect(printExpr).toContain("\\\\");
  });
});

// ── install_cpanm ─────────────────────────────────────────────────────────────

describe("install_cpanm", () => {
  test("downloads cpanm and uses io.cp on win32", async () => {
    jest.spyOn(os, "platform").mockReturnValue("win32");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    tc.downloadTool.mockResolvedValue("/tmp/cpanm-download");
    io.cp.mockResolvedValue(undefined);

    const result = await install_cpanm("/usr/local/bin/cpanm");

    expect(tc.downloadTool).toHaveBeenCalledWith("https://cpanmin.us");
    expect(io.cp).toHaveBeenCalledWith("/tmp/cpanm-download", "/usr/local/bin/cpanm");
    expect(result).toBe("/usr/local/bin/cpanm");
  });

  test("downloads cpanm and uses perl File::Copy on non-win32", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    tc.downloadTool.mockResolvedValue("/tmp/cpanm-download");
    exec.exec.mockResolvedValue(0);

    set_perl("/usr/bin/perl");
    const result = await install_cpanm("/usr/local/bin/cpanm");

    expect(tc.downloadTool).toHaveBeenCalledWith("https://cpanmin.us");
    expect(exec.exec).toHaveBeenCalled();
    const execArgs = exec.exec.mock.calls[0];
    expect(execArgs[0]).toBe("/usr/bin/perl");
    expect(result).toBe("/usr/local/bin/cpanm");
  });
});

// ── run ───────────────────────────────────────────────────────────────────────

describe("run", () => {
  beforeEach(() => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    io.which.mockResolvedValue("/usr/bin/perl");
    tc.downloadTool.mockResolvedValue("/tmp/cpanm-download");
    exec.exec.mockImplementation(async (bin, args, options) => {
      if (options && options.listeners) {
        options.listeners.stdout(Buffer.from("/usr/local/bin/cpanm"));
      }
      return 0;
    });
  });

  test("installs a single module", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("Moose");
    expect(installCall[1]).toContain("--notest");
  });

  test("installs multiple modules from newline-separated list", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose\nMooseX::Types", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("Moose");
    expect(installCall[1]).toContain("MooseX::Types");
  });

  test("runs tests when tests input is true", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "true" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).not.toContain("--notest");
  });

  test("installs from cpanfile", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", cpanfile: "cpanfile", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("--cpanfile");
    expect(installCall[1]).toContain("--installdeps");
  });

  test("adds verbose flag when verbose is true", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", verbose: "true" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("-v");
  });

  test("passes extra args to cpanm", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", args: "--mirror https://example.com" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("--mirror");
    expect(installCall[1]).toContain("https://example.com");
  });

  test("runs with custom args only when no install or cpanfile", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", sudo: "false", tests: "false", args: "--self-upgrade" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("--self-upgrade");
  });

  test("does nothing when no install, cpanfile, or args", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    // Only install_cpanm_location (1 exec call) and install_cpanm (1 exec call on linux) = 2 calls max
    // No additional exec call for module install
    const installCalls = exec.exec.mock.calls.filter((call) => {
      const args = call[1] || [];
      return args.includes("--notest") || args.includes("-v");
    });
    expect(installCalls).toHaveLength(0);
  });

  test("sets local-lib arg and PERL5LIB env var", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "/opt/perl5" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).toContain("--local-lib");
    expect(installCall[1]).toContain("/opt/perl5");
    expect(installCall[2]).toEqual(expect.objectContaining({ PERL5LIB: "/opt/perl5" }));
  });

  test("expands tilde in local-lib path", async () => {
    const originalHome = process.env.HOME;
    process.env.HOME = "/home/testuser";

    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "~/perl5" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[2]).toEqual(expect.objectContaining({ PERL5LIB: "/home/testuser/perl5" }));

    process.env.HOME = originalHome;
  });

  test("uses sudo on linux when sudo input is true", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "true", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[0]).toBe("sudo");
  });

  test("uses custom perl path", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "/opt/perl/bin/perl", install: "Moose", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    expect(get_perl()).toBe("/opt/perl/bin/perl");
  });
});
