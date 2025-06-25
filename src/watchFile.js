const chokidar = require("chokidar");
const { isUndef } = require("./utils/is");
const noop = () => {};

const defaultOptions = {
  persistent: true, // 保持监控状态

  // ignore .txt files
  // ignored: (file) => file.endsWith('.txt'),
  // watch only .txt files
  // ignored: (file, _stats) => _stats?.isFile() && !file.endsWith('.txt'),

  // awaitWriteFinish: true, // emit single event when chunked writes are completed
  // atomic: true, // emit proper events when "atomic writes" (mv _tmp file) are used

  // The options also allow specifying custom intervals in ms
  // awaitWriteFinish: {
  //   stabilityThreshold: 2000,
  //   pollInterval: 100
  // },
  // atomic: 100,

  interval: 1000,
  // binaryInterval: 300,

  // cwd: '.',
  depth: 99,

  // followSymlinks: true,
  // ignoreInitial: false,
  // ignorePermissionErrors: false,
  // usePolling: false,
  // alwaysStat: false,
};

/**
 * 文件监听
 */
class WatchFile {
  watcher = null;
  initWatch = (watchDir, options, handle) => {
    this.destory();
    this.watcher = chokidar.watch(
      watchDir,
      Object.assign({}, defaultOptions, options ?? {})
    );
    this.watchChange(handle?.onChange ?? noop, handle.onError ?? noop);
  };
  watchOn = (name, callback = noop) => {
    if (isUndef(this.watcher)) {
      throw new Error("未初始化监听");
    }
    return this.watcher.on(name, callback);
  };
  watchChange = (callback = noop, errorHandler = noop) => {
    this.watchOn("add", (filePath) => {
      callback({
        filePath,
        type: "add",
      });
    })
      .on("change", (filePath) => {
        callback({
          filePath,
          type: "change",
        });
      })
      .on("unlink", (filePath) => {
        callback({
          filePath,
          type: "unlink",
        });
      })
      .on("error", (error) => {
        errorHandler(error);
      });
  };
  unwatch(filepath) {
    this.watcher.unwatch(filepath);
  }
  stopWatch = (callback = noop) => {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      callback();
    }
  };
}

module.exports = WatchFile;
