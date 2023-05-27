/** @type {import('ts-jest').JestConfigWithTsJest} */
// 不要更動 module.exports ，改成 export name 會有問題
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ]
};