const os = require("os");
function isUndef(v) {
  return v === undefined || v === null;
}

/**
 * @zh 是否为数组
 */
const isArray = Array.isArray;

/**
 * @zh Object.prototype.toString.call判断数据类型
 */
function judgType(val) {
  let t = Object.prototype.toString.call(val);
  let reg = /^\[(object){1}\s{1}(\w+)\]$/i;
  return t.replace(reg, "$2").toLowerCase();
}

/**
 * @zh 判断对象是否是一个纯粹的对象
 */
function isObject(obj) {
  return judgType(obj) === "object";
}

/**
 * @zh 判断Array/Object为空
 */
function isEmpty(target) {
  return (
    isUndef(target) ||
    (Array.isArray(target) && target.length === 0) ||
    (isObject(target) && Reflect.ownKeys(target).length === 0)
  );
}

/**
 * @zh 判断是否为函数
 */
function isFunction(val) {
  return val instanceof Function;
}

/**
 * @zh 判断是否为async函数
 */
function isAsyncFunction(val) {
  return judgType(val) === "asyncfunction";
}

/**
 * @zh 判断是否为Date
 */
function isDate(val) {
  return val instanceof Date;
}

/**
 * @zh 判断为number
 */
function isNumber(val) {
  return typeof val === "number";
}

/**
 * @zh 判断是否是字符串
 * @en is string
 */
function isString(val) {
  return typeof val === "string";
}

/**
 *判断对象是否是一个纯粹的对象
 */
function isPlainObject(val) {
  return typeof val === "object" && judgType(val) === "object";
}

function isWindows() {
  return os.platform() === "win32";
}

function isMac() {
  return os.platform() === "darwin";
}

module.exports = {
  isUndef,
  isArray,
  isFunction,
  isAsyncFunction,
  isPlainObject,
  isNumber,
  isDate,
  isEmpty,
  judgType,
  isString,
  isWindows,
  isMac,
};
