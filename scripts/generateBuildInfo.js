const fs = require("fs");
const path = require("path");

const buildDate = new Date()
  .toISOString()
  .replace("T", " ")
  .replace(/\.\d{3}Z$/, " UTC");

const output = `export const BUILD_DATE = "${buildDate}";
`;

const outputPath = path.join(__dirname, "..", "src", "buildInfo.js");

fs.writeFileSync(outputPath, output, "utf8");

console.log(`Build info generated: ${buildDate}`);