const { spawn } = require("child_process");
const logger = require("./logger");
function exec(command) {
  try {
    const child = spawn(command, []);
    child.stdout.on("data", (data) => {
      logger.info(`标准输出: ${data}`);
    });

    child.stderr.on("data", (data) => {
      logger.error(`标准错误输出: ${data}`);
    });

    child.on("close", (code) => {
      logger.info(`子进程退出码: ${code}`);
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  exec,
};
