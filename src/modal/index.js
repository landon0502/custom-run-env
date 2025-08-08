const { shopTypes } = require("../utils/constant.js");
const {
  isEmpty,
  cloneDeep,
  isPlainObject,
  merge,
  omit,
  isUndefined,
} = require("lodash");
const { getHxConfig } = require("../utils/editor.js");
const { expectObject, chineseToHex } = require("../utils/common.js");
const { genEventKey } = require("./context.js");
const FormDialog = require("./FormDialog");
const { isUndef } = require("../utils/is.js");
const { pinyin } = require("pinyin");

const appUsefulNativePlugins = expectObject(
  getHxConfig("appUsefulNativePlugins")
);
const plugins = Object.entries(appUsefulNativePlugins).map(
  ([key, nativePlugin]) => {
    return {
      _plugin_key_: key,
      ...nativePlugin,
    };
  }
);

/**
 * 获取upgrade
 */
function genUpgrade(appName, appid, split = "-") {
  let prefix = pinyin(appName, {
    style: pinyin.STYLE_FIRST_LETTER,
  })
    .map((item) => item.join(""))
    .join("")
    .toLocaleUpperCase()
    .trim();
  return [prefix, appid].join(split);
}

/**
 * @description 窗口控件
 * @param {Object} selected
 */
async function manifestInfoModal(manifest) {
  const form = new FormDialog({
    title: "运行配置信息？",
    submitButtonText: "确定(&S)",
    cancelButtonText: "取消(&C)",
    width: 440,
    height: 280,
    formItems: [
      {
        type: "input",
        name: "name",
        label: `应用名称：`,
        value: "",
        disabled: true,
      },
      {
        type: "input",
        name: "appid",
        label: `应用appid：`,
        value: "",
        disabled: true,
      },
      {
        type: "input",
        name: "versionName",
        value: "",
        label: "版本名称",
      },
      {
        type: "input",
        name: "versionCode",
        value: "",
        label: "版本号",
      },
    ],
  });
  return await form.open(manifest);
}

/**
 * 选择商铺类型
 */
async function openShopTypeSelectModal(data, isOem) {
  let renderShopTypes = cloneDeep(shopTypes).map((item) => ({
    ...item,
    name: isOem && item.id === 6 ? "餐饮" : item.name,
  }));
  let typeMap = {
    0: 1,
    1: 2,
    2: 4,
    3: 5,
    4: 6,
    5: 7,
  };
  let prefix = "_shopTypes_",
    split = ".";
  const ui = {
    title: "选择商铺类型",
    formItems: [
      {
        type: "list",
        title: "OEM支持的店铺类型",
        name: "shopTypes",
        columnStretches: [1],
        items: renderShopTypes.map((item) => ({
          columns: [{ label: item.name, value: item.id }],
        })),
        value: [],
        multiSelection: true,
        searchable: true,
        searchColumns: [0],
        setValue(shopTypeSelected) {
          return renderShopTypes.reduce((acc, current, index) => {
            if (shopTypeSelected?.some?.((item) => item.id === current.id)) {
              return [...acc, index];
            }
            return acc;
          }, []);
        },
        getValue(selectedIndexs) {
          return (
            selectedIndexs?.map?.((index) =>
              renderShopTypes.find((item) => item.id === typeMap[index])
            ) ?? []
          );
        },
      },
      ...renderShopTypes.map((item) => ({
        type: "fileSelectInput",
        label: item.name + "商铺选择LOGO",
        name: `${prefix}${split}${item.id}`,
        placeholder: "请选择LOGO图片",
        filters: ["*.PNG", "*.png"],
        setValue(fieldValue, formData) {
          const shopTypesConfig = formData?.shopTypes ?? [];
          let cur = shopTypesConfig.find((config) => config.id === item.id);
          return cur?.shopTypeLogo;
        },
      })),
    ],
    width: 440,
    height: 600,
    submitButtonText: "提交(&S)",
    cancelButtonText: "取消(&C)",
  };

  const form = new FormDialog(ui);
  let res = await form.open(data);
  let config = omit(
    res,
    Object.keys(res).filter((key) => key.startsWith(prefix))
  );

  config.shopTypes?.forEach((type) => {
    let key = `${prefix}${split}${type.id}`;
    type.shopTypeLogo = res[key];
  });
  return config;
}

/**
 * manifest 配置
 */
const nativeConfigPrefixKey = "_nativePlugin_";
async function openAppManifestModal(data) {
  let formItems = [
    {
      type: "input",
      name: "name",
      label: "应用名称",
      placeholder: "请输入应用名称",
      value: "",
    },
    {
      type: "input",
      name: "privacyAgreement",
      label: "隐私协议",
      value: isUndefined(data.privacyAgreement)
        ? "https://091801.zhonglunnet.com/clause/index.html?title=隐私政策"
        : "",
    },
    {
      type: "input",
      name: "userAgreement",
      label: "用户协议",
      value: isUndefined(data.userAgreement)
        ? "https://091801.zhonglunnet.com/clause/index.html"
        : "",
    },
    {
      type: "fileSelectInput",
      name: "ios.storyboard",
      mode: "file",
      label: "IOS启动图",
      placeholder: "请选择storyboard",
      value: "",
      filters: ["*.zip"],
    },
    {
      type: "fileSelectInput",
      name: "android.hdpi",
      mode: "file",
      label: "android hdpi",
      placeholder: "请选择hdpi启动图",
      value: "",
      filters: ["*.PNG;*.png"],
    },
    {
      type: "fileSelectInput",
      name: "android.xhdpi",
      mode: "file",
      label: "android xhdpi",
      placeholder: "请选择xhdpi启动图",
      value: "",
      filters: ["*.PNG;*.png"],
    },
    {
      type: "fileSelectInput",
      name: "android.xxhdpi",
      mode: "file",
      label: "android xxhdpi",
      placeholder: "请选择xxhdpi启动图",
      value: "",
      filters: ["*.PNG;*.png"],
    },
    {
      type: "input",
      name: "amapandroidkey",
      label: "高德地图android key",
      value: "",
      placeholder: "请输入高德地图android key",
    },
    {
      type: "input",
      name: "amapioskey",
      label: "高德地图ios key",
      value: "",
      placeholder: "请输入高德地图ios key",
    },
    {
      type: "widgetGroup",
      name: "native-plugin-config",
      widgets: [
        {
          type: "button",
          name: genEventKey("onSelectNativePlugins"),
          text: "选择原生插件",
          size: "small",
        },
      ],
    },
    {
      type: "label",
      name: "selectedNativePlugins",
      text: '<span style="color:red;">未配置插件</span>',
      setValue(_, formData) {
        let nativePlugins = formData.nativePlugins ?? {};
        if (!isEmpty(nativePlugins)) {
          return `${Object.values(nativePlugins)
            .map((item) => `${item?.__plugin_info__?.name ?? ""}`)
            .join(",")}`;
        }
        console.log("未配置插件");
        return '<span style="color:red;">未配置插件</span>';
      },
    },
  ];
  let nativePluginSeleted = {
    nativePlugins: data?.nativePlugins ?? {},
  };
  let form = new FormDialog({
    title: "配置manifest",
    submitButtonText: "确认(&S)",
    cancelButtonText: "取消(&C)",
    formItems: formItems,
    width: 640,
    height: 400,
  });

  const handleNativePluginFormItems = (nativePluginsMap) => {
    if (!isPlainObject(nativePluginsMap)) {
      return [];
    }
    const split = "<@>";
    return Object.entries(nativePluginsMap).reduce(
      (acc, [key, { __plugin_info__ }]) => {
        if (
          __plugin_info__?.parameters &&
          !isEmpty(__plugin_info__?.parameters)
        ) {
          let params = Object.entries(__plugin_info__.parameters).reduce(
            (parameters, [paramKey, currentParams]) => {
              return [
                ...parameters,
                {
                  label: paramKey,
                  type: "input",
                  value: currentParams.value,
                  name: [nativeConfigPrefixKey, key, paramKey].join(split),
                  placeholder: currentParams.des,
                  setValue(fieldValue, formData, widget) {
                    const { name } = widget;
                    if (name.startsWith(nativeConfigPrefixKey)) {
                      const [_, key, paramKey] = name.split(split);
                      return nativePluginSeleted.nativePlugins?.[key]?.[
                        paramKey
                      ];
                    }
                    return fieldValue;
                  },
                  getValue(fieldValue, formData, widget) {
                    const { name } = widget;
                    if (name.startsWith(nativeConfigPrefixKey)) {
                      const [_, key, paramKey] = name.split(split);
                      if (
                        isPlainObject(nativePluginSeleted.nativePlugins[key])
                      ) {
                        nativePluginSeleted.nativePlugins[key][paramKey] =
                          fieldValue;
                      }
                    }
                    return fieldValue;
                  },
                },
              ];
            },
            []
          );
          return [
            ...acc,
            {
              type: "label",
              name: chineseToHex(__plugin_info__.name),
              text: `<span style="color:black;">${__plugin_info__.name}</span>`,
            },
            ...params,
          ];
        } else {
        }
        return acc;
      },
      []
    );
  };
  if (!isEmpty(data.nativePlugins)) {
    let nativePluginsFormItems = handleNativePluginFormItems(
      data.nativePlugins
    );
    form.updateFormItems(
      form.setFormValue(data, [...formItems, ...nativePluginsFormItems])
        .formItems
    );
  }

  let res = await form.open(data, {
    buttonEvents: {
      async onSelectNativePlugins() {
        let newNativePluginSeleted = await openNativePluginConfig(data);
        Object.entries(newNativePluginSeleted.nativePlugins).forEach(
          ([key, item]) => {
            let oldConfig = nativePluginSeleted.nativePlugins?.[key];
            if (oldConfig) {
              merge(item, oldConfig);
            }
          }
        );

        Object.assign(data, newNativePluginSeleted);
        nativePluginSeleted = newNativePluginSeleted;
        let newUI = [
          ...formItems,
          ...handleNativePluginFormItems(newNativePluginSeleted.nativePlugins),
        ];
        this.updateForm(form.setFormValue(data, newUI));
      },
    },
  });

  // 整合

  return omit(
    { ...data, ...res, ...nativePluginSeleted },
    Object.keys(res).filter((key) => key.startsWith(nativeConfigPrefixKey))
  );
}

/**
 * 原生插件选择
 */
async function openNativePluginConfig(config) {
  const form = new FormDialog({
    title: "请选择原生插件",
    formItems: [
      {
        type: "list",
        title: "选择原生插件",
        name: "nativePlugins",
        columnStretches: [1],
        items: plugins.map((item) => ({
          columns: [
            { label: item.__plugin_info__.name, value: item._plugin_key_ },
          ],
        })),
        value: [],
        multiSelection: true,
        searchable: true,
        searchColumns: [0],
        setValue(value) {
          return plugins.reduce((acc, current, index) => {
            if (!isUndef(value?.[current._plugin_key_])) {
              return [...acc, index];
            }
            return acc;
          }, []);
        },
        getValue(selected) {
          return plugins.reduce(
            (acc, { _plugin_key_, ...pluginConfig }, index) => {
              if (selected?.includes?.(index)) {
                return {
                  ...acc,
                  [_plugin_key_]: pluginConfig,
                };
              }
              return acc;
            },
            {}
          );
        },
      },
    ],
    width: 440,
    height: 400,
  });
  return form.open(config);
}

/**
 * 配置打包配置
 */
async function showBuildConfigDialog(config) {
  const form = new FormDialog({
    title: "请配置打包配置",
    formItems: [
      {
        type: "label",
        name: "android.build",
        text: "android 配置",
      },
      {
        type: "input",
        name: "android.packagename",
        label: "包名",
        placeholder: "请输入",
        value: "",
      },
      {
        type: "fileSelectInput",
        name: "android.certfile",
        mode: "file",
        label: "证书文件",
        placeholder: "证书文件",
        value: "",
        filters: ["*.jks,*.keystore"],
      },
      {
        type: "input",
        name: "android.certalias",
        label: "证书别名",
        placeholder: "请输入",
        value: "",
      },
      {
        type: "input",
        name: "android.certpassword",
        label: "安卓打包证书密码",
        placeholder: "请输入",
        value: "",
      },
      {
        type: "input",
        name: "android.storePassword",
        label: "安卓打包证书库密码",
        placeholder: "请输入",
        value: "",
      },
      {
        type: "label",
        name: "ios.build",
        text: "ios 配置",
      },
      {
        type: "input",
        name: "ios.bundle",
        label: "包名",
        placeholder: "请输入",
        value: "",
      },
      {
        type: "fileSelectInput",
        name: "android.certfile",
        mode: "file",
        label: "秘钥证书",
        placeholder: "秘钥证书",
        value: "",
        filters: ["*.p12"],
      },
      {
        type: "fileSelectInput",
        name: "android.profile",
        mode: "file",
        label: "证书profile文件",
        placeholder: "证书文件",
        value: "",
        filters: ["*.mobileprovision"],
      },
      {
        type: "input",
        name: "ios.certpassword",
        label: "iOS使用自定义证书打包的证书密码",
        placeholder: "请输入",
        value: "",
      },
    ],
    width: 440,
    height: 400,
  });
  return form.open(config);
}

/**
 * 显示配置表单
 * @returns
 */

async function showFormDialog(data) {
  try {
    data = cloneDeep(data) ?? {};
    let manifest = data?.manifest ?? {};
    let buildPackage = data?.buildPackage ?? {};
    let isOem = "true";
    const form = new FormDialog({
      title: "OEM配置",
      formItems: [
        {
          type: "input",
          name: "appName",
          label: "OEM名称",
          placeholder: "请输入OEM名称",
          value: "",
          required: true,
        },
        {
          type: "input",
          name: "appid",
          label: "uniapp APPID",
          placeholder: "请输入APPID",
          value: "",
          required: true,
        },
        {
          type: "input",
          name: "androidPackageName",
          label: "安卓包名",
          placeholder: "请输入安卓包名",
          value: "",
        },
        {
          type: "input",
          name: "iosBundle",
          label: "ios包名",
          placeholder: "请输入ios包名",
          value: "",
        },
        {
          type: "input",
          name: "oemcode",
          label: "服务商编号OEM CODE",
          placeholder: "请输入OEM CODE",
          value: "",
          required: true,
        },
        {
          type: "input",
          name: "upgrade",
          label: "应用推送升级标识upgrade",
          placeholder:
            "请输入upgrade，如何不填写会自动生成（应用名称首拼 + appid横线后部分拼接）",
          value: "",
        },
        // {
        //   type: "input",
        //   name: "serverPhone",
        //   label: "服务联系电话",
        //   placeholder: "请输入联系电话",
        //   value: "400-993-3621",
        // },
        // {
        //   type: "input",
        //   name: "zhonglunInfo2",
        //   label: "中仑信息",
        //   placeholder: "请输入zhonglunInfo2",
        //   value:
        //     "<p>江苏中仑网络科技有限公司（以下简称“中仑网络”）是国内领先的Saas服务公司，中仑网络采用先进的云端技术，自主开发基于Saas架构的零售软件，并依托鸿盛科技的硬件研发和生产能力，为中小商户提供软硬件一体解决方案。</p><p>中仑网络通过软硬一体、云端结合的SaaS模式打造了涵盖提升效率的SaaS产品群、大数据增值服务、整合行业上下游资源的开放平台共计三个层次为中仑网络的客户提供全方位的服务。</p>",
        // },

        {
          type: "input",
          name: "payAgreement",
          label: "支付协议",
          value: isUndefined(data.payAgreement)
            ? "https://091801.zhonglunnet.com/clause/index.html?title=支付开通协议"
            : "",
        },
        {
          type: "fileSelectInput",
          label: "logo",
          name: "logo",
          placeholder: "请选择LOGO图片",
          filters: ["*.PNG", "*.png"],
          required: true,
        },
        {
          type: "fileSelectInput",
          label: "登录logo",
          name: "loginLogo",
          placeholder: "请选择登录LOGO图片",
          filters: ["*.PNG", "*.png"],
          required: true,
        },
        {
          type: "radioGroup",
          name: "isZhonglun",
          label: "中仑应用: ",
          items: [
            { label: "是", id: "1" },
            { label: "否", id: "0" },
          ],
          value: "0",
        },
        {
          type: "radioGroup",
          name: "isOEM",
          label: "是否是OEM应用: ",
          items: [
            { label: "是", id: "true" },
            { label: "否", id: "false" },
          ],
          value: isOem,
        },
        {
          type: "radioGroup",
          name: "isNeutral",
          label: "中兴应用: ",
          items: [
            { label: "是", id: "true" },
            { label: "否", id: "false" },
          ],
          value: "false",
        },
        {
          type: "radioGroup",
          name: "loginTheme",
          label: "登录主题: ",
          items: [
            { label: "中仑", id: "common" },
            { label: "OEM", id: "oem" },
          ],
          value: "common",
        },
        {
          type: "widgetGroup",
          name: "oem-config",
          widgets: [
            {
              type: "button",
              name: genEventKey("onSetShopType"),
              text: "选择支持的商铺类型",
              size: "small",
            },
          ],
          rule: {
            message: "请选择支持的商铺类型",
            validate({ value }) {
              return !isEmpty(value);
            },
          },
        },
        {
          type: "label",
          name: "shopTypeNames",
          text: '<span style="color:red;">当前未选择支持的商品</span>',
          setValue(_, value) {
            return !isEmpty(value?.shopTypes)
              ? "已选择：" + value?.shopTypes?.map?.((item) => item.name).join()
              : '<span style="color:red;">选择的商铺类型</span>';
          },
        },
        {
          type: "widgetGroup",
          name: "manifest-config",
          widgets: [
            {
              type: "button",
              name: genEventKey("onSetManifest"),
              text: "配置oem manifest",
              size: "small",
            },
          ],

          rule: {
            message: "请配置manifest",
            validate() {
              return !isEmpty(manifest);
            },
          },
        },
        // {
        //   type: "widgetGroup",
        //   name: "build-config",
        //   widgets: [
        //     {
        //       type: "button",
        //       name: genEventKey("onSetBuildConfig"),
        //       text: "设置打包配置",
        //       size: "small",
        //     },
        //   ],
        // },
      ],
      width: 640,
      submitButtonText: "提交(&S)",
      cancelButtonText: "取消(&C)",
    });
    const formData = await form.open(data, {
      onChanged: async function (field, config) {
        console.log(config);
        if (typeof config === "string" && field === "isOEM") {
          isOem = config;
        }
      },
      buttonEvents: {
        async onSetShopType() {
          let shopTypesConfig = await openShopTypeSelectModal(
            data,
            isOem === "true"
          );
          Object.assign(data, shopTypesConfig);
          this.updateForm(form.setFormValue(data));
        },
        async onSetManifest() {
          if (!manifest.name) {
            manifest.name = data.appName;
          }
          manifest = await openAppManifestModal(manifest);
          Object.assign(data, { manifest });
        },
        async onSetBuildConfig() {
          buildPackage = await showBuildConfigDialog(buildPackage);
          Object.assign(data, { buildPackage });
        },
      },
    });

    if (!formData.upgrade) {
      formData.upgrade = genUpgrade(
        formData.appName,
        formData.appid.replace("__UNI__", "")
      );
    }
    return { ...data, ...formData };
  } catch (error) {
    return Promise.reject(error === -1 ? "已取消" : error);
  }
}

module.exports = { showFormDialog, manifestInfoModal };
