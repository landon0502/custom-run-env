const { getPlatForm } = require("./platform.js");
const hx = getPlatForm();

class Logger {
  loggerId = "";
  outputChannel = null;
  show = false;
  constructor({ loggerId }) {
    this.loggerId = loggerId;
    this.outputChannel = hx.window.createOutputChannel(loggerId);
  }
  showLogger = () => {
    this.outputChannel.show();
  };

  appendLoggerLine = async (message) => {
    if (!this.show) {
      this.show = true;
      this.showLogger();
    }
    await this.outputChannel.appendLine(message);
  };
  logByType = async (message, type) => {
    let msg = `[${type}]:${message}`;
    await this.appendLoggerLine(msg);
  };
  info = (msg) => this.logByType(msg, "INFO");
  error = (msg) => this.logByType(msg, "ERROR");
  success = (msg) => this.logByType(msg, "SUCCESS");
  warning = (msg) => this.logByType(msg, "WARNING");
}
module.exports = new Logger({
  loggerId: "env-config-logger",
});
