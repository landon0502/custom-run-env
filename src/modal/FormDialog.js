const {
  noop,
  isPlainObject,
  isFunction,
  isString,
  toString,
  isObject,
  isEmpty,
  cloneDeep,
} = require("lodash");
const { getPlatForm } = require("../utils/platform.js");
const { isEvent, getEventName } = require("./context.js");
const { isUndef } = require("../utils/is.js");

const platform = getPlatForm();
class FormDialog {
  ui = {};
  formItems = [];
  formData = [];
  events = {};
  customValidate = null;
  constructor(options = {}) {
    const { formItems, validate: customValidate, ...dialogUi } = options;
    if (isFunction(customValidate)) {
      this.customValidate = customValidate;
    }

    this.updateFormUI(dialogUi);
    this.updateFormItems(formItems);
  }

  // 校验表单
  createValidate(formItems) {
    if (this.customValidate) {
      return this.customValidate;
    }
    return function (formData) {
      for (let i = 0; i < formItems.length; i++) {
        let formItem = formItems[i];
        let value = formData?.[formItem.name];
        let customMessageMap = new Map();
        // 自定义校验
        if (isFunction(formItem?.rule?.validate)) {
          let isVali = formItem.rule?.validate?.({
            value,
            formData,
            formItem,
            formItems,
            showError: (msg) => {
              customMessageMap.set(formItem.name, msg);
            },
          });
          if (!isVali) {
            let message =
              customMessageMap.get(formItem.name) ?? formItem?.rule?.message;
            this.showError(message);
            return false;
          }
        }

        if (formItem.required) {
          let message = formItem.message || `"${formItem.label}"字段为必填项`;
          if (isUndef(value) || value === "") {
            this.showError(message);
            return false;
          }
        }
      }
      return true;
    };
  }
  // 更新视图
  updateFormUI(ui) {
    this.ui = ui;
  }
  updateFormItems(formItems) {
    this.formItems = cloneDeep(formItems ?? []);
  }
  // 获取item值
  getFormItemValue(formData, formItem) {
    let fieldValue = formData[formItem.name];
    const setValue = isFunction(formItem.setValue)
      ? formItem.setValue
      : () => fieldValue;
    fieldValue = setValue(fieldValue, formData, formItem, this.formItems);
    if (
      ["input", "radioGroup"].includes(formItem.type) &&
      !isString(fieldValue)
    ) {
      fieldValue = toString(fieldValue);
    }
    if (
      (isUndef(fieldValue) || fieldValue === "") &&
      formItem?.type !== "label"
    ) {
      return formItem?.value ?? "";
    }
    return fieldValue;
  }
  // 设置值
  setFormValue(newFormData, newFormItems) {
    let _self = this;
    if (!isPlainObject(newFormData)) {
      return;
    }
    if (!isEmpty(newFormItems)) {
      _self.updateFormItems(newFormItems);
    }

    this.formItems.forEach((item) => {
      let value = _self.getFormItemValue(newFormData, item);
      if (item.type === "label") {
        if (isFunction(item.setValue)) {
          item.text = value;
        }
      } else {
        item.value = value;
      }
    });
    return { ...this.ui, formItems: this.formItems };
  }
  // 处理表单数据
  getFormValue(formData) {
    if (isUndef(formData)) {
      return {};
    }
    return this.formItems.reduce((acc, current) => {
      let value = formData?.[current.name] ?? "";
      if (["label", "button", "widgetGroup"].includes(current.type)) {
        return acc;
      }

      if (["true", "false"].includes(value)) {
        value = { true: true, false: false }[value];
      }
      return {
        ...acc,
        [current.name]: isFunction(current.getValue)
          ? current.getValue(value, formData, current)
          : value,
      };
    }, {});
  }
  // 打开表单
  async open(value, options = {}) {
    const { onChanged = noop, onOpened = noop, buttonEvents = {} } = options;
    let _self = this;
    _self.setFormValue(value);
    const validate = _self.createValidate(this.formItems);
    let res = await platform.window.showFormDialog({
      ..._self.ui,
      formItems: _self.formItems,
      validate: validate,
      async onChanged(field, config) {
        if (isObject(config)) {
          const { allWidget, changedWidget } = config;
          if (isObject(changedWidget) && isEvent(changedWidget.name)) {
            let event = getEventName(changedWidget.name);
            await buttonEvents?.[event]?.call?.(this, field, changedWidget);
          }
        }
        onChanged(field, config);
      },
      onOpened,
    });
    this.formData = _self.getFormValue(res);

    return this.formData;
  }
}

module.exports = FormDialog;
