module.exports = {
  apps: [{
    name: 'conf-bot',
    script: 'src/index.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
