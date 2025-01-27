const { prettyJSON } = require("lazy-z");

const packageJson = {
  name: "tfxjs generated acceptance tests",
  version: "0.0.1",
  description: "acceptance tests for terraform directory",
  main: "tfxjs.test.js",
  scripts: {
    test: "tfx .",
    build: "npm i && npm i -g tfxjs mocha",
  },
  author: "This file was automatically generated by tfxjs",
  license: "ISC",
  dependencies: {
    tfxjs: "^1.1.1",
  },
};
/**
 * Initialize a directory with needed files for tfxjs tests
 * @param {Object} fs initialized file system (fs) package
 * @param {Object} exec initialized exec package
 * @param {string} filePath file path where files should be created
 */
const tfxInit = function (fs, exec, filePath) {
  if (!fs.existsSync(filePath)) {
    // if filepath does not exist, create it
    fs.mkdirSync(filePath);
  }
  fs.writeFileSync(`${filePath}/package.json`, prettyJSON(packageJson));
  fs.writeFileSync(`${filePath}/tfxjs.test.js`, "");
  return exec(`cd ${filePath} && npm run build`);
};

module.exports = tfxInit;
