const { getPlatForm } = require("./platform.js");
const hx = getPlatForm();
const { fillPath } = require("./file");
const { isUndef, isWindows } = require("./is");
const { PLUGIN_CONFIG_PRIFIX } = require("./constant.js");

/**
 * @desc 获取当前工作区
 */
function getVscodeCurrentWorkspace() {
  const { workspace, window } = hx;
  const editor = window.activeTextEditor;

  let workspaceFolder = null;
  // 当存在激活窗口时 可直接获取当前文件工作区地址
  if (editor) {
    const selectedWorkspaceFolder = workspace.getWorkspaceFolder(
      editor.document.uri
    );

    if (selectedWorkspaceFolder) {
      workspaceFolder = selectedWorkspaceFolder;
    }
  }
  if (!workspaceFolder) {
    // 如果不存在激活窗口 则通过vscode.workspace.workspaceFolders来查找
    const workspaceFolders = workspace.workspaceFolders;

    // 当值存在一个工作区时
    if (workspaceFolders && workspaceFolders?.length > 0) {
      workspaceFolder = workspaceFolders[0];
    }
  }
  if (!workspaceFolder) {
    let msg = "未获取到工作区根目录！";
    window.showErrorMessage(msg);
    throw new Error(msg);
  }

  return workspaceFolder;
}
// 获取当前运行工作区
async function getWorkspaceFolder(params) {
  if (hx.platform === "vscode") {
    return getVscodeCurrentWorkspace();
  }
  if (hx.platform === "hbuilderx") {
    if (isUndef(params)) {
      let workspaceFolders = await hx.workspace.getWorkspaceFolders();
      return workspaceFolders[0];
    }
    if (params.metaType === "TextEditor") {
      return params.document.workspaceFolder;
    }
    if (params.workspaceFolder) {
      return params.workspaceFolder;
    }
    hx.window.showErrorMessage("请选择项目！");
    throw new Error("请选择项目！");
  }
  return null;
}

// 获取对应配置

function getHxConfig(key) {
  if (!key.startsWith(PLUGIN_CONFIG_PRIFIX)) {
    key = [PLUGIN_CONFIG_PRIFIX, key].join(".");
  }
  return hx.workspace.getConfiguration().get(key);
}

// 补全工作区路径
function fillWorkspaceFilePath(workspaceFolder, filePath) {
  try {
    if (!workspaceFolder) {
      return "";
    }
    if (!filePath) {
      filePath = "./";
    }
    // 处理数据
    let workspacePath = workspaceFolder.uri.path;
    if (
      isWindows() &&
      (workspacePath.startsWith("/") || workspacePath.startsWith("\\"))
    ) {
      workspacePath = workspacePath.slice(1);
    }
    return fillPath(workspacePath, filePath);
  } catch (error) {
    console.error("出错误了!!", error);
  }
}

module.exports = {
  getHxConfig,
  getWorkspaceFolder,
  fillWorkspaceFilePath,
  getVscodeCurrentWorkspace,
};
