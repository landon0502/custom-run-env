const path = require("path");
const fs = require("fs");
const JSON5 = require("json5");
const { isUndef } = require("./is");
const readFile = fs.promises.readFile;
/**
 * 补全路径
 * @param {*} dir
 * @param {*} relativePath
 * @param {boolean} isJoin
 * @returns
 */
function fillPath(dir, relativePath, isJoin = false) {
  let res = "";
  if (!relativePath) {
    res = dir;
  } else if (relativePath.startsWith(dir)) {
    res = relativePath;
  } else if (isJoin) {
    res = path.join(dir, relativePath);
  } else {
    res = path.resolve(dir, relativePath);
  }
  return res;
}

async function fsExist(path) {
  try {
    await fs.promises.access(path, fs.constants.F_OK | fs.constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function fsExistSync(path) {
  return fs.existsSync(path);
}

async function fsStat(path) {
  let stat = await fs.promises.stat(path);
  if (stat.isFile()) {
    return "file";
  }
  if (stat.isDirectory()) {
    return "dir";
  }
}

async function fsRemove(path) {
  await fs.promises.rm(path, {
    recursive: true,
  });
}

async function copy(from, to, overwrite) {
  // let isExist = await fsExist(to);
  // if (overwrite && isExist) {
  //   await fsRemove(to);
  // }
  await fs.promises.copyFile(from, to);
}

async function writeFile(path, content) {
  let data = new Uint8Array(Buffer.from(content));
  await fs.promises.writeFile(path, data);
}

async function readJsonValue(jsonPath) {
  let res = await readFile(jsonPath);
  let jsonValue = JSON5.parse(res.toString());
  return jsonValue;
}

/**
 * @desc 获取文件扩展名
 * @param { String } name
 * @returns {String}
 */
function getFileExt(name, upperCase) {
  if (isUndef(name)) return "";
  if (typeof name !== "string") throw new Error("文件名name必须为字符串");
  let ext = name.match(/\.([^.]+)$/)[1];
  if (upperCase) return ext.toUpperCase();
  return ext;
}

async function ensureDirectoryExists(dir) {
  let isExist = await fsExist(dir);
  if (!isExist) {
    // 如果目录不存在，则创建它
    await fs.promises.mkdir(dir, { recursive: true }); // 使用 { recursive: true } 可以创建多级目录
    console.log("目录已创建:", dir);
  }
}

/**
 * 获取目录下的目录list
 */
async function getDirectories(srcpath) {
  const dirents = await fs.promises.readdir(srcpath, { withFileTypes: true });
  const dirs = dirents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({ ...dirent }));
  return dirs;
}

/**
 * 解析file path
 */
function parsePathFileName(path) {
  if (!path)
    return {
      filename: "",
      ext: "",
      path: "",
    };
  let filename = path.match(/[^\/\\]+$/)[0]; // 使用正则表达式匹配最后的文件名部分
  let ext = getFileExt(filename);
  return { filename, ext, path };
}

function isParentPath(parentPath, childPath) {
  const resolvedParent = path.resolve(parentPath);
  const resolvedChild = path.resolve(childPath);
  return resolvedChild.startsWith(resolvedParent + path.sep);
}

module.exports = {
  fillPath,
  copy,
  fsRemove,
  fsStat,
  fsExist,
  writeFile,
  readJsonValue,
  readFile,
  getFileExt,
  ensureDirectoryExists,
  getDirectories,
  parsePathFileName,
  fsExistSync,
  isParentPath,
};
