const { getPlatForm } = require("./utils/platform.js");
const parseJsonc = require("json-format");
const { isUndef } = require("./utils/is.js");
const { debounce } = require("./utils/common.js");
const {
  writeFile,
  readJsonValue,
  fsRemove,
  fillPath,
  ensureDirectoryExists,
  getDirectories,
  parsePathFileName,
  fsExist,
  copy,
  fsExistSync,
  isParentPath,
} = require("./utils/file");
const {
  mergeWith,
  isEqual,
  isArray,
  isString,
  isNumber,
  isPlainObject,
  isEmpty,
  isObject,
  cloneDeep,
  pick,
} = require("lodash");
const {
  getHxConfig,
  getWorkspaceFolder,
  fillWorkspaceFilePath,
} = require("./utils/editor.js");
const { logoDpiConfig, defaultBuildConfig } = require("./utils/constant.js");
const { resizeResolution } = require("./utils/assets.js");
const logger = require("./utils/logger.js");
const WatchFile = require("./watchFile.js");
const { manifestInfoModal, showFormDialog } = require("./modal/index.js");
const {
  getOEM,
  getManifest,
  transOEMConfigToForm,
} = require("./modal/context.js");
const { pinyin } = require("pinyin");
// const { exec } = require("./utils/command.js");

const hx = getPlatForm();

class ProcessEnvRun extends WatchFile {
  // 缓存参数，在配置文件监听时有用
  params = null;
  envName = "";
  workspaceFolder = null;
  watchStatusBarItem = null;
  OEMExtraConfig = null;
  // 读取的配置
  appConfig = null;
  constructor() {
    super();
    this.watchEditorConfiguration();
  }
  get workspaceDir() {
    return fillWorkspaceFilePath(this.workspaceFolder, "./");
  }
  get runEnvDir() {
    return fillPath(this.workspaceDir, getHxConfig("runEnvDir"));
  }
  get projectRootDir() {
    if (fsExistSync(fillPath(this.workspaceDir, "./src/manifest.json"))) {
      return fillPath(this.workspaceDir, "./src");
    }
    if (fsExistSync(fillPath(this.workspaceDir, "manifest.json"))) {
      return this.workspaceDir;
    }
    return "./";
  }
  get manifestJsonOutputPath() {
    return fillPath(this.projectRootDir, "manifest.json");
  }
  get oemJsonOutputPath() {
    return fillPath(
      this.projectRootDir,
      getHxConfig("oemJsonOutputFilename") + ".json"
    );
  }
  // 获取选择的环境配置目录
  get selectedEnvDir() {
    return fillPath(this.runEnvDir, this.envName);
  }
  get assetsImageDir() {
    return fillPath(
      this.selectedEnvDir,
      this.OEMExtraConfig?.oemAssetsImageDir || getHxConfig("oemAssetsImageDir")
    );
  }
  /**
   * 监听编辑器配置是否更改
   */
  watchEditorConfiguration = () => {
    hx.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customrunenv.runEnvDir")) {
        if (this.workspaceFolder) {
          await this.getEnvs();
        }
      }
    });
  };

  /**
   * 监听配置目录文件变化
   */
  genConfigFile = debounce(async (...args) => {
    try {
      await this.writeEnvConfig(...args);
    } catch (error) {
      errorCallback(error);
    }
  }, 200);

  /**
   * 处理自定义运行环境中的配置
   * @returns
   */
  getSelectedConfig = async () => {
    let configPath = fillPath(this.selectedEnvDir, "./config.json");
    let isExistConfig = await fsExist(configPath);
    if (!isExistConfig) {
      return Promise.reject(new Error(`${this.envName}缺少config.json配置`));
    }
    const appConfig = await readJsonValue(configPath);
    let manifestPath = fillPath(this.selectedEnvDir, "./manifest.json");
    let isExistManifest = await fsExist(manifestPath);
    if (isExistManifest) {
      let config = await readJsonValue(manifestPath);
      if (!isEmpty(config)) {
        appConfig.manifest = config;
      }
    }
    return {
      appConfig: appConfig,
    };
  };

  handleNativePlugin(plugins, { androidPackageName, iosBundle }) {
    let nativePlugins = cloneDeep(plugins);
    if (!isPlainObject(nativePlugins) || !nativePlugins) {
      return {};
    }
    Object.entries(nativePlugins).forEach(([key, config]) => {
      let plugin_info = config.__plugin_info__;
      // 离线包名好像不需要这个配置？？
      if (isPlainObject(plugin_info)) {
        if (
          plugin_info.platforms?.toLocaleLowerCase?.()?.includes?.("android")
        ) {
          plugin_info.android_package_name = androidPackageName;
        }
        if (plugin_info.platforms?.toLocaleLowerCase?.()?.includes?.("ios")) {
          plugin_info.ios_bundle_id = iosBundle;
        }
      }
    });
    return nativePlugins;
  }

  /**
   * 写入manifest
   * @param {*} manifest
   */
  async writeManifestConfig(manifest, { iosBundle, androidPackageName }) {
    if (isString(manifest?.["app-plus"]?.distribute?.icons)) {
      manifest["app-plus"].distribute.icons = await this.appLogoHandler(
        logoDpiConfig,
        manifest["app-plus"].distribute.icons
      );
    }
    this.splashscreenHandler(manifest);
    let oldManifestJson = await readJsonValue(this.manifestJsonOutputPath);

    let manifestJson = mergeWith(
      oldManifestJson,
      manifest,
      (objValue, srcValue, key) => {
        if (key === "nativePlugins") {
          return srcValue;
        }
        if (isArray(objValue) && isArray(srcValue)) {
          return [...objValue, ...srcValue].reduce((acc, current) => {
            if (!acc.some((item) => isEqual(item, current))) {
              return [...acc, current];
            }
            return acc;
          }, []);
        }
      }
    );
    let oemManifestNativePlugins = manifest["app-plus"]?.nativePlugins ?? {};
    // 重写包名
    let nativePlugins = manifestJson["app-plus"]?.nativePlugins;
    if (isPlainObject(nativePlugins)) {
      Object.entries(nativePlugins).forEach(([key, config]) => {
        let plugin_info = config.__plugin_info__;
        let oem_plugin_info =
          oemManifestNativePlugins[key]?.__plugin_info__ ?? {};
        // 离线包名好像不需要这个配置？？
        if (isPlainObject(plugin_info)) {
          if (
            plugin_info.platforms?.toLocaleLowerCase?.()?.includes?.("android")
          ) {
            // 如何oem的manifest中存在包名，则不使用打包包名，否则使用打包名
            plugin_info.android_package_name =
              oem_plugin_info.android_package_name ?? androidPackageName;
          }
          if (plugin_info.platforms?.toLocaleLowerCase?.()?.includes?.("ios")) {
            plugin_info.ios_bundle_id =
              oem_plugin_info.ios_bundle_id ?? iosBundle;
          }
        }
      });
    }
    // if (isPlainObject(manifestJson?.["app-plus"]?.privacy)) {
    //   manifestJson["app-plus"].privacy.prompt = manifestJson?.["app-plus"]
    //     ?.distribute?.splashscreen?.useOriginalMsgbox
    //     ? "template"
    //     : "none";
    // }
    await writeFile(this.manifestJsonOutputPath, parseJsonc(manifestJson));
  }

  /**
   * 写入oem
   * @param {*} oemConfig
   * @param {*} env
   * @returns
   */
  async writeOemConfig(oemConfig) {
    if (isUndef(oemConfig)) {
      return fsRemove(this.oemJsonOutputPath);
    }
    await writeFile(this.oemJsonOutputPath, parseJsonc(oemConfig));
    await this.generateImageResolutionConfig(oemConfig);
  }

  /**
   * 写入环境配置
   */
  writeEnvConfig = async () => {
    try {
      /**
       * 读取项目配置
       */
      logger.info("解析中...");
      let appConfig = this.appConfig;
      let { script, iosBundle, androidPackageName } =
        await this.genBuildPackage();
      await this.writeManifestConfig(appConfig.manifest, {
        iosBundle,
        androidPackageName,
      });
      await this.writeOemConfig(appConfig.oem);
      logger.success("已生成应用页面配置✅");
      if (script) logger.info("在命令行中执行该命令：" + script);
    } catch (error) {
      this.tryCatchError(error.toString());
    }
  };

  /**
   * 状态图标
   * @param {*} show
   * @param {*} options
   * @returns
   */
  handleWatchStatusBar = (show, options) => {
    if (isUndef(this.watchStatusBarItem)) {
      this.watchStatusBarItem = hx.window.createStatusBarItem(
        hx.StatusBarAlignment.Left,
        100
      );
    }

    if (show) {
      if (isUndef(options)) {
        throw new Error("status bar必须传入options参数！");
      }
      Object.entries(options).forEach(([key, value]) => {
        this.watchStatusBarItem[key] = value;
      });
      this.watchStatusBarItem.show();

      return;
    }

    this.watchStatusBarItem.hide();
  };

  /**
   * 获取环境列表
   */
  async getEnvs() {
    try {
      let envs = await getDirectories(this.runEnvDir);
      this.envs = envs.map((dir) => ({
        label: dir.name,
        key: dir.name,
        ...dir,
      }));
    } catch (_) {
      this.envs = [];
      return Promise.reject("未找到OEM配置目录！！！");
    }
  }

  /**
   * 打包配置
   */
  async genBuildPackage() {
    try {
      let configPath = fillPath(
        this.workspaceDir,
        "./build-package-config.json"
      );
      // 先删除
      if (fsExistSync(configPath)) {
        await fsRemove(configPath);
      }
      if (isEmpty(this.appConfig.buildPackage)) {
        return {
          script: "",
          iosBundle: "",
          androidPackageName: "",
        };
      }
      let config = this.appConfig.buildPackage;
      await writeFile(configPath, parseJsonc(config));
      let script = `${getHxConfig(
        "HBuilderXCliName"
      )} pack --host HBuilderX --config ${configPath}`;
      return {
        script,
        iosBundle: config.ios.bundle,
        androidPackageName: config.android.packagename,
      };
    } catch (error) {
      this.tryCatchError(error.toString());
      return {};
    }
  }

  /**
   * 初始化插件环境
   */
  async initWorkspace(params) {
    this.workspaceFolder = await getWorkspaceFolder(params);
  }
  async initPluginEnv(params) {
    let _self = this;
    _self.params = params ?? {};
    let { args } = params;
    let { name } = args ?? {};
    _self.envName = name;
    await _self.initWorkspace(params);
    return { commandArgs: args, workspaceFolder: _self.workspaceFolder };
  }
  /**
   * 配置调整弹窗
   */
  async adjustAppConfig(isAdjust) {
    let { appConfig } = await this.getSelectedConfig();
    this.appConfig = appConfig;
    if (isAdjust) {
      let config = await manifestInfoModal(appConfig.manifest);
      appConfig.manifest = { ...appConfig.manifest, ...config };
    }
  }

  /**
   * OEM列表
   */
  async openOEMList(params) {
    try {
      let _self = this;
      const selectPath = params.fsPath;
      const envRes = await _self.initPluginEnv(params);
      if (isUndef(_self.workspaceFolder)) return Promise.reject("未选择项目!");
      await _self.getEnvs();
      if (isEmpty(this.envs)) return Promise.reject("未找到任何OEM配置");
      let selectOem = this.envs.find(
        (item) =>
          selectPath === item.path ||
          isParentPath(item.path, selectPath) ||
          envRes.commandArgs?.name === item.label
      );
      if (!selectOem) {
        let env = await hx.window.showQuickPick(_self.envs, {
          placeHolder: "请选择一个运行环境",
        });
        if (!env) return Promise.reject("未选择需要运行的oem环境！！！");
        return env;
      }
      return selectOem;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * 在对应oem中写入必要的配置
   */
  async writeOEMExtraConfig(oemDir) {
    let writePath = fillPath(oemDir, "./plugin-conf.json");
    await writeFile(
      writePath,
      parseJsonc({ oemAssetsImageDir: getHxConfig("oemAssetsImageDir") })
    );
  }
  async readOEMExtraConfig() {
    try {
      this.OEMExtraConfig = await readJsonValue(
        fillPath(this.selectedEnvDir, "./plugin-conf.json")
      );
    } catch (error) {
      this.OEMExtraConfig = null;
    }
  }
  /**
   * 解析配置
   * @param {*} params
   * @param {*} options
   * @returns
   */
  parse = async (params, options = { isWatchFile: true }) => {
    let _self = this;
    // console.log("[cli参数] name:", name);
    try {
      let selected = await _self.openOEMList(params);
      _self.envName = selected.key;
      await this.readOEMExtraConfig();
      if (selected) {
        try {
          logger.info(`已选择[${selected.label}]运行环境`);
          if (options.isWatchFile) {
            logger.info("开始监听文件......");
            _self.initWatch(
              [
                fillPath(_self.selectedEnvDir, "./config.json"),
                fillPath(_self.selectedEnvDir, "./manifest.json"),
                fillPath(_self.selectedEnvDir, "./assets"),
              ],
              {},
              {
                async onChange({ type, filePath }) {
                  let msg = type + ":" + filePath;
                  logger.info(msg);
                  await _self.adjustAppConfig(false);
                  _self.genConfigFile();
                  _self.handleWatchStatusBar(true, {
                    text: `${selected.label} Configuration Watch...(click stop)`,
                    command: "customrunenv.stopWatch",
                    backgroundColor:
                      hx.platform === "vscode"
                        ? new hx.ThemeColor("statusBarItem.warningBackground")
                        : "#FF9800",
                    color: "#FFFFFF",
                    tooltip: "点击停止监听",
                  });
                },
                onError: (err) => {
                  logger.error(err);
                },
              }
            );
          } else if (options?.isGenConfigFile) {
            await _self.adjustAppConfig(true);
            await _self.writeEnvConfig();
            this.resetState();
          }
        } catch (error) {
          console.log(error);
        }
      }
    } catch (err) {
      hx.window.showErrorMessage(err?.toString?.() ?? err);
      return Promise.reject(err);
    }
  };

  /*******************  处理资源 **********************/
  async handleIconSize(dpi, outputPath, url) {
    let imageOutputPath = `${outputPath}/${dpi}x${dpi}.png`;
    await ensureDirectoryExists(outputPath);
    return resizeResolution({
      inputPath: url,
      outputPath: imageOutputPath,
      dpi,
    });
  }
  /**
   * 处理应用logo
   * @param {*} value
   * @param {*} logo
   * @returns
   */
  cache = {};
  async appLogoHandler(dpi, logoPath, clearCache = true) {
    let res = {};
    let url = fillPath(this.selectedEnvDir, logoPath);
    let isExistLogo = await fsExist(url);
    if (!isExistLogo) return this.tryCatchError(`LOGO文件不存在：${url}`);
    const handleLogoImage = (dpi) => {
      let outputPath = fillWorkspaceFilePath(
        this.workspaceFolder,
        "unpackage/res/icons"
      );
      return this.handleIconSize(dpi, outputPath, url);
    };

    if (isPlainObject(dpi)) {
      let ls = Object.entries(dpi);
      for (let i = 0; i < ls.length; i++) {
        let [key, value] = ls[i];
        res[key] = await this.appLogoHandler(value, logoPath, false);
      }
    } else if (isNumber(dpi)) {
      // 缓存已处理的图片；
      if (this.cache[dpi]) return this.cache[dpi];
      let path = handleLogoImage(dpi);
      this.cache[dpi] = path;
      return path;
    }
    if (clearCache) this.cache = {};
    return res;
  }

  /**
   * 处理图片 所有的资源都在当前环境的assets中去找 如果存在着拷贝至对应目录
   * @param {string | {url: string, copyTo: string}} img
   * @returns
   */
  async assetsStaticImgHandler(img) {
    if (img && isString(img)) {
      let { filename } = parsePathFileName(img);
      let imgFillPath = fillPath(this.assetsImageDir, filename);
      let isExist = await fsExist(imgFillPath);
      if (isExist) {
        let copyToPath = fillPath(this.projectRootDir, img, true);
        await copy(imgFillPath, copyToPath, true);
      }
    }
    return "";
  }

  /**
   * 处理图片资源 将图片处理成不同的分辨率
   * @param {*} oemConfig
   * @param {*} env
   */
  async generateImageResolutionConfig(oemConfig) {
    const { loginLogo, shopTypes, logo } = oemConfig ?? {};
    if (loginLogo) {
      await this.assetsStaticImgHandler(loginLogo);
    }
    if (logo) {
      await this.assetsStaticImgHandler(logo);
    }
    if (isArray(shopTypes) && !isEmpty(shopTypes)) {
      await Promise.allSettled(
        shopTypes.map((item) => this.assetsStaticImgHandler(item.img))
      );
      await Promise.allSettled(
        shopTypes
          .filter((item) => item.shopTypeLogo)
          .map((item) => this.assetsStaticImgHandler(item.shopTypeLogo))
      );
    }
  }
  /**
   * 处理mainfest中的启动页图片
   * @param {*} manifest
   * @returns
   */
  splashscreenHandler(manifest) {
    let splashscreen = manifest?.["app-plus"]?.distribute?.splashscreen;
    if (!isObject(splashscreen)) {
      return;
    }
    const fillSplashFilePath = (config) => {
      let res = {};
      if (isPlainObject(config)) {
        let links = Object.entries(config).filter(([key, value]) => !!value);
        for (let i = 0; i < links.length; i++) {
          let [key, path] = links[i];
          res[key] = fillPath(this.selectedEnvDir, path);
        }
      }
      return res;
    };
    splashscreen.ios = fillSplashFilePath(splashscreen.ios);
    splashscreen.android = fillSplashFilePath(splashscreen.android);
    return splashscreen;
  }
  /*******************  处理资源 end **********************/

  /********************** 配置窗口 ************************/
  /**
   * 打开配置表单
   * @param {*} config 回显配置
   * @param {boolean} removeOldOem 是否删除旧的oem
   * @returns
   */
  async openConfigModal(config, removeOldOem = false) {
    try {
      let res = await showFormDialog(config);
      let oem = getOEM(res);
      const manifest = getManifest(res);
      let oemDir = fillPath(this.runEnvDir, `./${res.appName}`);
      await ensureDirectoryExists(oemDir);
      // 创建必要目录
      let oemAssetsImageDir = getHxConfig("oemAssetsImageDir");
      await ensureDirectoryExists(fillPath(oemDir, oemAssetsImageDir));
      // 这里面会处理资源路径数据
      await this.handleGenConfigAssets({
        oem,
        manifest,
        appName: res.appName,
      });
      // 写入oem配置
      let configPath = fillPath(oemDir, "./config.json");
      await writeFile(configPath, parseJsonc({ oem, buildPackage: {} }));

      // 写入manifest配置
      manifest["app-plus"].nativePlugins = this.handleNativePlugin(
        manifest["app-plus"].nativePlugins,
        {
          androidPackageName: res.androidPackageName,
          iosBundle: res.iosBundle,
        }
      );
      let manifestPath = fillPath(oemDir, "./manifest.json");
      await writeFile(manifestPath, parseJsonc(manifest));
      await this.writeOEMExtraConfig(oemDir);
      if (res?.appName !== config?.appName && removeOldOem) {
        await fsRemove(fillPath(this.runEnvDir, config.appName));
      }
      logger.success(`操作成功：OEM${res.appName}`);
    } catch (error) {
      return Promise.reject(error.toString());
    }
  }
  getPrefixName = (name) => {
    return pinyin(name, {
      style: pinyin.STYLE_FIRST_LETTER,
    })
      .map((item) => item.join(""))
      .join("")
      .toLocaleUpperCase();
  };
  async handleGenConfigAssets({ oem, manifest, appName }) {
    // 移动资源
    const handleMoveAssets = async (sourcePath, filename, prefix) => {
      let oemAssetsImageDir = getHxConfig("oemAssetsImageDir");
      let oemAssetsDir = fillPath(
        fillPath(this.runEnvDir, `./${appName}`),
        oemAssetsImageDir
      );
      let toPath = fillPath(oemAssetsDir, filename);
      await copy(sourcePath, toPath, true);
      if (prefix) {
        return prefix + filename;
      }
      return fillPath(oemAssetsImageDir, filename, true);
    };

    // 一个manifest配置和一个config配置
    const handleOemAssets = async (oemConfig) => {
      let projectAssetsImagePathPrefix = "/static/images/login/";

      let isAssetsFile = (path) =>
        typeof path === "string" &&
        path.startsWith(projectAssetsImagePathPrefix);

      if (oemConfig.logo && !isAssetsFile(oemConfig.logo)) {
        let filename = `${this.getPrefixName(appName)}-logo.png`;
        oemConfig.logo = await handleMoveAssets(
          oemConfig.logo,
          filename,
          projectAssetsImagePathPrefix
        );
      }
      if (oemConfig.loginLogo && !isAssetsFile(oemConfig.loginLogo)) {
        let filename = `${this.getPrefixName(appName)}-login-logo.png`;
        oemConfig.loginLogo = await handleMoveAssets(
          oemConfig.loginLogo,
          filename,
          projectAssetsImagePathPrefix
        );
      }
      for (let i = 0; i < oemConfig.shopTypes.length; i++) {
        let item = oemConfig.shopTypes[i];
        if (item.shopTypeLogo && !isAssetsFile(item.shopTypeLogo)) {
          let filename = `${this.getPrefixName(appName)}-${this.getPrefixName(
            item.name
          )}-logo.png`;

          // 处理显示logo
          item.shopTypeLogo = await handleMoveAssets(
            item.shopTypeLogo,
            filename,
            projectAssetsImagePathPrefix
          );

          // 处理shop type img
          // let shopTypeImg = parsePathFileName(item.img).filename;

          // item.img = await handleMoveAssets(
          //   item.img,
          //   shopTypeImg,
          //   projectAssetsImagePathPrefix
          // );
        }
      }
    };
    const handleManifestAssets = async (manifestConfig) => {
      const distribute = manifestConfig?.["app-plus"]?.distribute ?? {};
      if (distribute.icons) {
        let filename = "app-icon.png";
        distribute.icons = await handleMoveAssets(distribute.icons, filename);
      }
      if (distribute?.splashscreen?.ios?.storyboard) {
        let filename = "storyboard.zip";
        distribute.splashscreen.ios.storyboard = await handleMoveAssets(
          distribute.splashscreen.ios.storyboard,
          filename
        );
      }
      if (isPlainObject(distribute?.splashscreen?.android)) {
        let map = {
          hdpi: "a480",
          xhdpi: "a720",
          xxhdpi: "a1080",
        };
        let keys = Object.keys(distribute.splashscreen.android);
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          if (distribute?.splashscreen?.android[key]) {
            let filename = map[key] + ".9.png";
            distribute.splashscreen.android[key] = await handleMoveAssets(
              distribute.splashscreen.android[key],
              filename
            );
          }
        }
      }
    };

    const handleBuildConfig = async (buildConfig) => {
      defaultBuildConfig;
    };
    await handleBuildConfig();
    await handleOemAssets(oem);
    await handleManifestAssets(manifest);
  }

  async addOem() {
    try {
      await this.openConfigModal(void 0, false);
      hx.window.showInformationMessage("OEM配置已生成");
    } catch (error) {
      this.tryCatchError(error.toString());
    }
  }
  async editOemConfig(params) {
    try {
      const selected = await this.openOEMList(params);
      this.envName = selected.key;
      const selectPath = selected.path;
      await this.readOEMExtraConfig();
      // 读取oem配置
      let configPath = fillPath(selectPath, "config.json");
      if (!fsExistSync(configPath)) {
        return new Promise("未找到OEM配置！！！");
      }
      let manifestPath = fillPath(selectPath, "manifest.json");
      const config = await readJsonValue(configPath);
      let manifest = await readJsonValue(manifestPath);
      const formData = transOEMConfigToForm(
        { ...config, manifest },
        selectPath,
        this.assetsImageDir
      );
      await this.openConfigModal(formData, true);
      hx.window.showInformationMessage("OEM配置已更新");
    } catch (error) {
      this.tryCatchError(error.toString());
    } finally {
      this.resetState();
    }
  }
  /********************** 配置窗口 end ************************/

  /********************** 保存当前环境 ************************/
  async saveCurrentOEM(params) {
    try {
      const config = {};
      await this.initWorkspace(params);
      let oemConfigPath = fillPath(
        this.projectRootDir,
        getHxConfig("oemJsonOutputFilename") + ".json"
      );
      let manifestPath = fillPath(this.projectRootDir, "manifest.json");

      if (fsExistSync(oemConfigPath)) {
        let oemConfig = await readJsonValue(oemConfigPath);
        oemConfig.logo = fillPath(this.projectRootDir, oemConfig.logo, true);
        oemConfig.loginLogo = fillPath(
          this.projectRootDir,
          oemConfig.loginLogo,
          true
        );
        oemConfig.shopTypes = oemConfig.shopTypes.map((item) => ({
          ...item,
          shopTypeLogo: item.shopTypeLogo
            ? fillPath(this.projectRootDir, item.shopTypeLogo, true)
            : "",
        }));
        config.oem = oemConfig;
        this.envName = oemConfig.appName;
      } else {
        throw new Error("未找到OEM配置");
      }
      if (fsExistSync(manifestPath)) {
        let manifest = await readJsonValue(manifestPath);
        let requireKeys = [
          "name",
          "appid",
          "versionName",
          "versionCode",
          "app-plus",
        ];
        let requisite = pick(manifest, requireKeys);

        requisite["app-plus"] = pick(requisite["app-plus"], [
          "privacy",
          "distribute",
          "nativePlugins",
        ]);
        if (isPlainObject(requisite["app-plus"]?.distribute)) {
          requisite["app-plus"].distribute.splashscreen.ios.storyboard =
            fillPath(
              this.workspaceDir,
              requisite["app-plus"].distribute.splashscreen.ios.storyboard
            );
          requisite["app-plus"].distribute.splashscreen.android.hdpi = fillPath(
            this.workspaceDir,
            requisite["app-plus"].distribute.splashscreen.android.hdpi
          );
          requisite["app-plus"].distribute.splashscreen.android.xhdpi =
            fillPath(
              this.workspaceDir,
              requisite["app-plus"].distribute.splashscreen.android.xhdpi
            );
          requisite["app-plus"].distribute.splashscreen.android.xxhdpi =
            fillPath(
              this.workspaceDir,
              requisite["app-plus"].distribute.splashscreen.android.xxhdpi
            );
        }
        config.manifest = requisite;
      }

      const formData = transOEMConfigToForm(config, void 0, void 0, true);
      await this.openConfigModal(formData, false);
    } catch (error) {
      this.tryCatchError(error.toString());
    }
  }
  /********************** 保存当前环境 end ************************/
  resetState() {
    this.envName = "";
    this.workspaceFolder = null;
    this.envs = [];
    this.params = null;
    this.OEMExtraConfig = null;
  }

  destory = () => {
    this.params = null;
    this.stopWatch(() => {
      hx.window.showInformationMessage("已停止监听");
      logger.info("已停止监听");
      this.resetState();
    });
    if (this.watchStatusBarItem) {
      this.handleWatchStatusBar(false);
      this.watchStatusBarItem.dispose();
      this.watchStatusBarItem = null;
    }
  };

  tryCatchError(errorMsg) {
    this.destory();
    hx.window.showErrorMessage(errorMsg);
    logger.error(errorMsg);
  }
}

module.exports = ProcessEnvRun;
