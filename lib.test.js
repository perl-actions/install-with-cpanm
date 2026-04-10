jest.mock("@actions/core");
jest.mock("@actions/exec");
jest.mock("@actions/io");

const core = require("@actions/core");
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

// ── set_perl / get_perl ──────────────────────────────────────────────────────

describe("set_perl / get_perl", () => {
  test("get_perl returns the value set by set_perl", () => {
    set_perl("/custom/perl");
    expect(get_perl()).toBe("/custom/perl");
  });

  test("set_perl overwrites previous value", () => {
    set_perl("/first/perl");
    set_perl("/second/perl");
    expect(get_perl()).toBe("/second/perl");
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

  test("passes env parameter through to exec", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    exec.exec.mockResolvedValue(0);

    const env = { PERL5LIB: "/opt/lib" };
    await do_exec(["/usr/bin/perl", "script.pl"], env);

    expect(exec.exec).toHaveBeenCalledWith("/usr/bin/perl", ["script.pl"], { PERL5LIB: "/opt/lib" });
  });

  test("sudo with env parameter passes env through", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "true" : "");
    exec.exec.mockResolvedValue(0);

    const env = { PERL5LIB: "/opt/lib" };
    await do_exec(["/usr/bin/perl", "script.pl"], env);

    expect(exec.exec).toHaveBeenCalledWith("sudo", ["/usr/bin/perl", "script.pl"], { PERL5LIB: "/opt/lib" });
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

  test("accumulates stdout from multiple chunks", async () => {
    set_perl("/usr/bin/perl");
    core.getInput.mockImplementation((name) => name === "path" ? "/usr/local/bin/cpanm" : "");
    exec.exec.mockImplementation(async (bin, args, options) => {
      options.listeners.stdout(Buffer.from("/usr/local"));
      options.listeners.stdout(Buffer.from("/bin/cpanm"));
      return 0;
    });

    const result = await install_cpanm_location();

    expect(result).toBe(path.resolve("/usr/local/bin/cpanm"));
  });
});

// ── install_cpanm ─────────────────────────────────────────────────────────────

describe("install_cpanm", () => {
  test("downloads cpanm via curl and uses io.cp on win32", async () => {
    jest.spyOn(os, "platform").mockReturnValue("win32");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    exec.exec.mockResolvedValue(0);
    io.cp.mockResolvedValue(undefined);

    const result = await install_cpanm("/usr/local/bin/cpanm");

    const curlCall = exec.exec.mock.calls.find((call) => call[0] === "curl");
    expect(curlCall).toBeDefined();
    expect(curlCall[1]).toContain("https://cpanmin.us");
    expect(io.cp).toHaveBeenCalled();
    expect(result).toBe("/usr/local/bin/cpanm");
  });

  test("downloads cpanm via curl and uses perl File::Copy on non-win32", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    exec.exec.mockResolvedValue(0);

    set_perl("/usr/bin/perl");
    const result = await install_cpanm("/usr/local/bin/cpanm");

    const curlCall = exec.exec.mock.calls.find((call) => call[0] === "curl");
    expect(curlCall).toBeDefined();
    expect(curlCall[1]).toContain("https://cpanmin.us");
    // Second exec call should be the perl File::Copy via do_exec
    expect(exec.exec.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result).toBe("/usr/local/bin/cpanm");
  });

  test("perl File::Copy command references correct paths on linux", async () => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    core.getInput.mockImplementation((name) => name === "sudo" ? "false" : "");
    exec.exec.mockResolvedValue(0);

    set_perl("/usr/bin/perl");
    await install_cpanm("/usr/local/bin/cpanm");

    // The do_exec call (second exec) should contain File::Copy with the target path
    const copyCall = exec.exec.mock.calls.find((call) => {
      const args = call[1] || [];
      return args.some((a) => typeof a === "string" && a.includes("File::Copy"));
    });
    expect(copyCall).toBeDefined();
    expect(copyCall[1].join(" ")).toContain("/usr/local/bin/cpanm");
    expect(copyCall[1].join(" ")).toContain("chmod");
  });
});

// ── run ───────────────────────────────────────────────────────────────────────

describe("run", () => {
  beforeEach(() => {
    jest.spyOn(os, "platform").mockReturnValue("linux");
    io.which.mockResolvedValue("/usr/bin/perl");
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

  test("adds local-lib bin directory to PATH via core.addPath", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "/opt/perl5" };
      return inputs[name] || "";
    });

    await run();

    expect(core.addPath).toHaveBeenCalledWith(path.join("/opt/perl5", "bin"));
  });

  test("adds tilde-expanded local-lib bin directory to PATH", async () => {
    const originalHome = process.env.HOME;
    process.env.HOME = "/home/testuser";

    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "~/perl5" };
      return inputs[name] || "";
    });

    await run();

    expect(core.addPath).toHaveBeenCalledWith(path.join("/home/testuser/perl5", "bin"));

    process.env.HOME = originalHome;
  });

  test("does not call core.addPath when local-lib is empty", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "" };
      return inputs[name] || "";
    });

    await run();

    expect(core.addPath).not.toHaveBeenCalled();
  });

  test("expands tilde in local-lib path", async () => {
    const os = require("os");
    const originalHomedir = os.homedir;
    os.homedir = () => "/home/testuser";

    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "~/perl5" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[2]).toEqual(expect.objectContaining({ PERL5LIB: "/home/testuser/perl5" }));

    os.homedir = originalHomedir;
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

  test("installs from both install and cpanfile when both provided", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", cpanfile: "cpanfile", sudo: "false", tests: "false" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    // Should have separate install call for modules and cpanfile
    const moduleCall = calls.find((call) => (call[1] || []).includes("Moose"));
    const cpanfileCall = calls.find((call) => (call[1] || []).includes("--cpanfile"));
    expect(moduleCall).toBeDefined();
    expect(cpanfileCall).toBeDefined();
  });

  test("does not run custom args path when install was provided", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", args: "--mirror http://example.com" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    // The install call should include both the module and the extra args
    const installCall = calls.find((call) => (call[1] || []).includes("Moose"));
    expect(installCall).toBeDefined();
    expect(installCall[1]).toContain("--mirror");
    // has_run is true, so the "custom run with args" branch should NOT fire separately
    // Total exec calls: install_cpanm_location (1) + install_cpanm curl + do_exec (2) + module install (1) = 4
    // If custom args path also fired, there would be an extra call
    const argsOnlyCalls = calls.filter((call) => {
      const args = call[1] || [];
      return args.includes("--mirror") && !args.includes("Moose");
    });
    expect(argsOnlyCalls).toHaveLength(0);
  });

  test("local-lib with cpanfile install sets PERL5LIB", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", cpanfile: "cpanfile", sudo: "false", tests: "false", "local-lib": "/opt/perl5" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const cpanfileCall = calls.find((call) => (call[1] || []).includes("--cpanfile"));
    expect(cpanfileCall).toBeDefined();
    expect(cpanfileCall[1]).toContain("--local-lib");
    expect(cpanfileCall[2]).toEqual(expect.objectContaining({ PERL5LIB: "/opt/perl5" }));
  });

  test("empty local-lib does not set PERL5LIB or --local-lib", async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = { perl: "perl", install: "Moose", sudo: "false", tests: "false", "local-lib": "" };
      return inputs[name] || "";
    });

    await run();

    const calls = exec.exec.mock.calls;
    const installCall = calls[calls.length - 1];
    expect(installCall[1]).not.toContain("--local-lib");
  });
});

// ── index.js (entry point) ──────────────────────────────────────────────────

describe("index.js entry point", () => {
  test("calls core.setFailed when run() throws", async () => {
    // We need to test index.js which requires lib.js and calls run()
    // Reset modules so we can control the mock
    jest.resetModules();

    const mockCore = { setFailed: jest.fn(), getInput: jest.fn().mockReturnValue(""), info: jest.fn() };
    jest.doMock("@actions/core", () => mockCore);

    const mockExec = { exec: jest.fn().mockRejectedValue(new Error("exec failed")) };
    jest.doMock("@actions/exec", () => mockExec);

    const mockIo = { which: jest.fn().mockResolvedValue("/usr/bin/perl"), cp: jest.fn() };
    jest.doMock("@actions/io", () => mockIo);

    // Require index.js — it immediately invokes run()
    // The IIFE in index.js will catch the error and call core.setFailed
    await jest.isolateModulesAsync(async () => {
      // Need to wait for the async IIFE to complete
      // index.js runs (async () => { ... })() which returns a promise we can't easily await
      // But we can require it and wait a tick
      require("./index");
      // Wait for the async IIFE to settle
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockCore.setFailed).toHaveBeenCalledWith("exec failed");
  });
});
