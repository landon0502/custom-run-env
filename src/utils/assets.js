// const sharp = require("sharp");
// const { parsePathFileName } = require("./file");
// const { isUndef } = require("./is");
const logger = require("./logger");
const { Jimp } = require("jimp");
/**
 * 处理图片分辨率
 */
// function resizeResolution(options) {
//   return new Promise(async (resolve, reject) => {
//     let { ext, pixs = [], inputPath, outputPath, formatOptions } = options;
//     if (isUndef(ext)) {
//       ext = parsePathFileName(inputPath).ext;
//     }
//     if (!ext) {
//       logger.error("当前图片不是一个有效的图片！！！");
//     }
//     sharp(inputPath)
//       .resize(...pixs.slice(0, 2), { withoutEnlargement: true }) // 不改变原始尺寸
//       .toFormat(ext, formatOptions) // 转换为JPEG格式并应用压缩选项
//       .toFile(outputPath, (err, info) => {
//         if (err) {
//           console.error("出现错误", err);
//           reject(err);
//         } else {
//           console.log(`图片压缩成功,保存为: ${outputPath}`);
//           resolve(outputPath);
//         }
//       });
//   });
// }
/**
 * 处理图片分辨率1
 */
async function resizeResolution(options) {
  let { dpi, inputPath, outputPath } = options;
  const image = await Jimp.read(inputPath);
  image.resize({
    w: dpi,
    h: dpi,
  });
  // image.quality(formatOptions.compression);

  await image.write(outputPath); // resize and save
  return outputPath;
}

module.exports = {
  resizeResolution,
};
