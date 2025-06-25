const { isPlainObject } = require("lodash");
/**
 * 节流
 * @param {function} fn
 * @param {number} wait
 * @returns {function}
 */
function throttle(fn, wait = 1000) {
  let pre = Date.now();
  return function () {
    let now = Date.now();
    if (now - pre >= wait) {
      fn.apply(this, arguments);
      pre = Date.now();
    }
  };
}

/**
 * 防抖
 * @param {function} fn
 * @param {number} delay
 * @returns {function}
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    const callback = () => {
      fn.call(this, ...args);
      timer = null;
    };
    if (!delay) {
      return callback;
    }
    timer = setTimeout(callback, delay);
  };
}

function safeParse(input, defaultValue = {}) {
  if (input) {
    try {
      return JSON.parse(input);
    } catch (ex) {}
  }
  return defaultValue;
}

function expectArray(input) {
  if (input) {
    if (Array.isArray(input)) {
      return input;
    }
    const value = safeParse(input, []);
    if (isString(value)) {
      return expectArray(value);
    }
    return Array.isArray(value) ? value : [];
  }
  return [];
}

function expectObject(input) {
  if (input) {
    if (isPlainObject(input)) {
      return input;
    }
    const value = safeParse(input, {});
    return isPlainObject(value) ? value : {};
  }
  return {};
}

function chineseToHex(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}

module.exports = {
  throttle,
  debounce,
  expectArray,
  expectObject,
  chineseToHex,
};
