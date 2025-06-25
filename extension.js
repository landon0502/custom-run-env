const { getPlatForm } = require("./src/utils/platform.js");
const ProcessEnvRun = require("./src/processEnvRun.js");
const { info } = require("./src/utils/logger.js");

const platform = getPlatForm();
//该方法将在插件激活的时候调用
function activate(context) {
  // 激活了

  const ctx = new ProcessEnvRun();
  info("插件激活了" + platform.platform);
  context.subscriptions.push(
    platform.commands.registerCommand("customrunenv.envWatch", (params) => {
      ctx.parse(params, { isWatchFile: true });
    })
  );

  context.subscriptions.push(
    platform.commands.registerCommand("customrunenv.genEnvConfig", (params) => {
      ctx.parse(params, { isGenConfigFile: true });
    })
  );

  context.subscriptions.push(
    platform.commands.registerCommand("customrunenv.stopWatch", () => {
      ctx.destory();
      info("已停止运行");
    })
  );
  context.subscriptions.push(
    platform.commands.registerCommand(
      "customrunenv.openConfigModal",
      (params) => {
        ctx.addOem(params);
      }
    )
  );

  context.subscriptions.push(
    platform.commands.registerCommand(
      "customrunenv.editOemConfig",
      (params) => {
        ctx.editOemConfig(params);
      }
    )
  );

  context.subscriptions.push(
    platform.commands.registerCommand(
      "customrunenv.saveCurrentOEM",
      (params) => {
        ctx.saveCurrentOEM(params);
      }
    )
  );

  // cli
  // if (platform.platform === "hbuilderx") {
  //   platform.subscriptions.push(platform.commands.registerCliCommand(
  //     "customrunenv.watch",
  //     (params) => {
  //       ctx.parse(params, { isWatchFile: true });
  //     }
  //   ));
  //   platform.subscriptions.push(platform.commands.registerCliCommand(
  //     "customrunenv.genEnvConfigFile",
  //     (params) => {
  //       ctx.parse(params, { isGenConfigFile: true });
  //     }
  //   ));
  //   platform.subscriptions.push(platform.commands.registerCliCommand(
  //     "customrunenv.stopEnvWatch",
  //     () => {
  //       ctx.destory();
  //       info("已停止运行");
  //     }
  //   ));
  // }
}
//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {}
module.exports = {
  activate,
  deactivate,
};
