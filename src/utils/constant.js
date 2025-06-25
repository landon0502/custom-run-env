const logoDpiConfig = {
  ios: {
    iphone: {
      "app@2x": 120,
      "app@3x": 180,
      "spotlight@3x": 120,
      "spotlight@2x": 80,
      "settings@2x": 58,
      "settings@3x": 87,
      "notification@2x": 40,
      "notification@3x": 60,
    },
    appstore: 1024,
    ipad: {
      app: 76,
      "app@2x": 152,
      notification: 20,
      "notification@2x": 40,
      "proapp@2x": 167,
      settings: 29,
      "settings@2x": 58,
      spotlight: 40,
      "spotlight@2x": 80,
    },
  },
  android: {
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
  },
};

const shopTypes = [
  {
    id: 1,
    name: "零售",
    introduce: "提供商超、服务、母婴、美业等通用解决方案",
    img: "/static/images/login/industry-isy-1.png",
  },
  {
    id: 2,
    name: "生鲜通",
    introduce: "适用水果、生鲜的单店、连锁解决方案",
    img: "/static/images/login/industry-2.png",
  },
  {
    id: 4,
    name: "轻餐宝",
    introduce: "适用于餐饮、烘焙茶饮的单店和连锁解决方案",
    img: "/static/images/login/industry-4.png",
  },
  {
    id: 5,
    name: "茶舍",
    introduce: "专注茶楼茶馆、茶店茶叶品牌专柜的茶行业解决方案",
    img: "/static/images/login/industry-3.png",
  },
  {
    id: 6,
    name: "食神",
    introduce: "适用于正餐行业的解决方案",
    img: "/static/images/login/industry-5.png",
  },
];

const PLUGIN_CONFIG_PRIFIX = "customrunenv";

const defaultBuildConfig = {
  //项目名字或项目绝对路径
  project: "copy",
  //打包平台 默认值android  值有"android","ios" 如果要打多个逗号隔开打包平台
  platform: "android",
  //是否使用自定义基座 默认值false  true自定义基座 false自定义证书
  iscustom: false,
  //打包方式是否为安心打包默认值false,true安心打包,false传统打包
  safemode: false,
  //android打包参数
  android: {
    //安卓包名
    packagename: "",
    //安卓打包类型 默认值0 0 使用自有证书 1 使用公共证书 2 使用老版证书 3 使用云端证书
    androidpacktype: "0",
    //安卓使用自有证书自有打包证书参数
    //安卓打包证书别名,自有证书打包填写的参数
    certalias: "",
    //安卓打包证书文件路径,自有证书打包填写的参数
    certfile: "",
    //安卓打包证书密码,自有证书打包填写的参数
    certpassword: "",
    //安卓打包证书库密码（HBuilderx4.41支持）,自有证书打包填写的参数
    storePassword: "",
    //安卓平台要打的渠道包 取值有"google","yyb","360","huawei","xiaomi","oppo","vivo"，如果要打多个逗号隔开
    channels: "",
  },
  //ios打包参数
  ios: {
    //ios appid
    bundle: "",
    //ios打包支持的设备类型 默认值iPhone 值有"iPhone","iPad" 如果要打多个逗号隔开打包平台
    supporteddevice: "",
    //iOS使用自定义证书打包的profile文件路径
    profile: "",
    //iOS使用自定义证书打包的p12文件路径
    certfile: "",
    //iOS使用自定义证书打包的证书密码
    certpassword: "",
  },
  //是否混淆 true混淆 false关闭
  isconfusion: false,
  //开屏广告 true打开 false关闭
  splashads: false,
  //悬浮红包广告true打开 false关闭
  rpads: false,
  //push广告 true打开 false关闭
  pushads: false,
  //加入换量联盟 true加入 false不加入
  exchange: false,
};

module.exports = {
  logoDpiConfig,
  shopTypes,
  PLUGIN_CONFIG_PRIFIX,
  defaultBuildConfig,
};
