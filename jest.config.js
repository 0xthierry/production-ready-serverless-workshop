module.exports = {  
  testEnvironment: 'node',
  testMatch: ['**/test-cases/**/*'],
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['./jest.setup.js'],
}