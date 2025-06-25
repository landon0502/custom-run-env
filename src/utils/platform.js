const { isUndef } = require("./is");

function getPlatForm() {
  function getVscode() {
    let vscode = require("vscode");
    vscode.platform = "vscode";
    return vscode;
  }
  try {
    let hx = require("hbuilderx");
    if (isUndef(hx)) {
      return getVscode();
    }
    hx.platform = "hbuilderx";
    return hx;
  } catch (error) {
    return getVscode();
  }
}
module.exports = {
  getPlatForm,
};
