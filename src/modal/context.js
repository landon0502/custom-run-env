const { fillPath, parsePathFileName } = require("../utils/file");
const { getHxConfig } = require("../utils/editor.js");
const { isEmpty, toString } = require("lodash");
const cheerio = require("cheerio");
/**
 * 生成事件key
 * @param {*} name
 */
const EventPrefixKey = "__Event__";
function genEventKey(name) {
  if (!name) {
    throw new Error("Name param is not valid");
  }
  return `${EventPrefixKey}@${name}`;
}

/**
 * 是否为事件处理
 */
function isEvent(name) {
  if (!name) {
    return false;
  }
  return name.startsWith(EventPrefixKey);
}

/**
 * 传入一个事件名参数，判断是否为
 */
function isEqualEvent(value, condvalue) {
  if (!isEvent(value)) {
    return false;
  }
  return value === genEventKey(condvalue);
}

/**
 * 获取事件名称
 */
function getEventName(name) {
  if (isEvent(name)) {
    return name.split("@")[1];
  }
  return name;
}

/**
 * 获取OEM配置
 */
function getOEM(config) {
  const shopSelectTypes =
    config.shopTypes?.map?.((item) => ({
      name: item.name,
      value: item.id,
    })) ?? [];

  return {
    zhonglunInfo2:
      "<p>江苏中仑网络科技有限公司（以下简称“中仑网络”）是国内领先的Saas服务公司，中仑网络采用先进的云端技术，自主开发基于Saas架构的零售软件，并依托鸿盛科技的硬件研发和生产能力，为中小商户提供软硬件一体解决方案。</p><p>中仑网络通过软硬一体、云端结合的SaaS模式打造了涵盖提升效率的SaaS产品群、大数据增值服务、整合行业上下游资源的开放平台共计三个层次为中仑网络的客户提供全方位的服务。</p>",
    payAgreement: config.payAgreement,
    serverPhone: "400-993-3621",
    isZhonglun: config.isZhonglun,
    loginTheme: config.loginTheme,
    isNeutral: config.isNeutral,
    isOEM: config.isOEM,
    appName: config.appName,
    oemcode: config.oemcode,
    upgrade: config.upgrade,
    logo: config.logo,
    loginLogo: config.loginLogo,
    shopTypes: config.shopTypes,
    shopSelectTypes,
  };
}

/**
 * 获取manifest配置
 * @param {*} config
 * @returns
 */
function getManifest(config) {
  const manifest = config.manifest ?? {};
  // 组装隐私协议
  const getPrivacy = () => {
    const message = `请你务必审慎阅读、充分理解“服务协议和隐私政策”各条款，包括但不限于：为了更好的向你提供服务，我们需要收集你的设备标识、操作日志等信息用于分析、优化应用性能。<br/>　　你可阅读${
      manifest.userAgreement
        ? `<a href="${manifest.userAgreement}">《用户协议》</a>和`
        : ""
    }${
      manifest.privacyAgreement
        ? `<a href="${manifest.privacyAgreement}">《隐私政策》</a>`
        : ""
    }了解详细信息。如果你同意，请点击下面按钮开始接受我们的服务。`;

    const secondMessage = `进入应用前，你需先同意${
      manifest.userAgreement
        ? `<a href="${manifest.userAgreement}">《用户协议》</a>和`
        : ""
    }${
      manifest.privacyAgreement
        ? `<a href="${manifest.privacyAgreement}">《隐私政策》</a>`
        : ""
    }，否则将退出应用。`;

    return {
      prompt: "template",
      template: {
        title: "服务协议和隐私政策",
        message: message,
        buttonAccept: "同意",
        buttonRefuse: "暂不同意",
        second: {
          title: "温馨提示",
          message: secondMessage,
          buttonAccept: "同意并继续",
          buttonRefuse: "退出应用",
        },
      },
    };
  };

  return {
    name: manifest.name || config.appName,
    appid: config.appid,
    versionName: "",
    versionCode: "",
    "app-plus": {
      privacy: getPrivacy(),
      distribute: {
        icons: config.logo,
        splashscreen: {
          ios: {
            storyboard: manifest["ios.storyboard"],
          },
          android: ["hdpi", "xhdpi", "xxhdpi"].reduce((acc, current) => {
            return {
              ...acc,
              [current]: manifest[`android.${current}`],
            };
          }, {}),
          iosStyle: "storyboard",
          androidStyle: "default",
          useOriginalMsgbox:
            !!manifest.userAgreement || !!manifest.privacyAgreement,
        },
        sdkConfigs: {
          maps: {
            amap: {
              appkey_ios: manifest.amapioskey,
              appkey_android: manifest.amapandroidkey,
            },
          },
        },
      },
      nativePlugins: manifest.nativePlugins,
    },
  };
}

/**
 * 获取打包配置
 */
function getBuildPackage() {}

/**
 * 提取a标签中的url
 */
function extractLinksWithCheerio(html) {
  const $ = cheerio.load(html);
  const links = [];

  $("a").each((i, elem) => {
    const href = $(elem).attr("href");
    const title = $(elem).html().replace("》", "").replace("《", "").trim();
    if (href) {
      links.push({
        href,
        title,
      });
    }
  });

  return links;
}

/**
 * 转换配置
 * @param {*} config
 * @param {*} selectPath
 * @param {*} assetsImageDir
 * @param {*} notFillPath
 * @returns
 */
function transOEMConfigToForm(
  config = {},
  selectPath,
  assetsImageDir,
  notFillPath = false
) {
  const { oem, buildPackage, manifest } = config;
  let splashscreen = manifest["app-plus"]?.distribute?.splashscreen ?? {};

  const getCurFileFulpath = (path) => {
    if (notFillPath) {
      return path;
    }
    if (!path) {
      return "";
    }
    if (!selectPath) {
      return path;
    }
    return fillPath(selectPath, path);
  };

  const handleStaticAssets = (path) => {
    if (notFillPath) {
      return path;
    }
    if (!path) {
      return "";
    }
    let filename = parsePathFileName(path).filename;
    if (!filename) {
      return "";
    }
    if (assetsImageDir) {
      return fillPath(assetsImageDir, filename, true);
    }
    let oemAssetsImageDir = getHxConfig("oemAssetsImageDir");
    return getCurFileFulpath(fillPath(oemAssetsImageDir, filename, true));
  };

  // 处理shopType中的数据
  if (!isEmpty(oem.shopTypes)) {
    oem.shopTypes.forEach((item) => {
      item.shopTypeLogo = handleStaticAssets(item.shopTypeLogo);
    });
  }

  // 启动图
  const androidSplashscreen = {
    "ios.storyboard": getCurFileFulpath(splashscreen?.ios?.storyboard),
    "android.hdpi": getCurFileFulpath(splashscreen?.android?.hdpi),
    "android.xhdpi": getCurFileFulpath(splashscreen?.android?.xhdpi),
    "android.xxhdpi": getCurFileFulpath(splashscreen?.android?.xxhdpi),
  };

  // 高德地图
  const amap = manifest["app-plus"]?.distribute?.sdkConfigs?.maps?.amap ?? {
    appkey_ios: "",
    appkey_android: "",
  };

  // 获取包名
  const getPackagename = () => {
    let nativePlugins = manifest["app-plus"].nativePlugins ?? {};
    let plugins = Object.entries(nativePlugins)
      .map(([_, config]) => {
        return config.__plugin_info__;
      })
      .filter(Boolean);
    let first = plugins.find(
      (item) => item.android_package_name || item.ios_bundle_id
    ) ?? {
      android_package_name: buildPackage?.android?.packagename ?? "",
      ios_bundle_id: buildPackage?.ios?.bundle ?? "",
    };
    return {
      androidPackageName: first.android_package_name,
      iosBundle: first.ios_bundle_id,
    };
  };
  const packageName = getPackagename();

  const links = extractLinksWithCheerio(
    manifest["app-plus"]?.privacy?.template?.message ?? ""
  );
  return {
    zhonglunInfo2: oem.zhonglunInfo2,
    payAgreement: oem.payAgreement,
    serverPhone: oem.serverPhone,
    isZhonglun: oem.isZhonglun,
    loginTheme: oem.loginTheme,
    isNeutral: toString(oem.isNeutral),
    isOEM: toString(oem.isOEM),
    appName: oem.appName,
    oemcode: oem.oemcode,
    upgrade: oem.upgrade,
    logo: handleStaticAssets(oem.logo),
    loginLogo: handleStaticAssets(oem.loginLogo),
    shopTypes: oem.shopTypes,
    appid: manifest.appid,
    androidPackageName: packageName.androidPackageName,
    iosBundle: packageName.iosBundle,
    manifest: {
      name: manifest.name,
      nativePlugins: manifest["app-plus"].nativePlugins ?? {},
      privacyAgreement:
        links.find((item) => item.title === "隐私政策")?.href ?? "",
      userAgreement:
        links.find((item) => item.title === "用户协议")?.href ?? "",
      ...androidSplashscreen,
      amapandroidkey: amap.appkey_android,
      amapioskey: amap.appkey_ios,
    },
    buildPackage: {},
  };
}

module.exports = {
  EventPrefixKey,
  genEventKey,
  isEvent,
  isEqualEvent,
  getEventName,
  getOEM,
  getManifest,
  getBuildPackage,
  transOEMConfigToForm,
  extractLinksWithCheerio,
};
