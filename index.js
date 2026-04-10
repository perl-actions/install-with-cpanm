const core = require("@actions/core");
const { run } = require("./lib");

(async () => {
  try {
    await run();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
