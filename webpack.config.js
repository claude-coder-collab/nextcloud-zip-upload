const webpackConfig = require('@nextcloud/webpack-vue-config');

webpackConfig.entry = {
    main: { import: './src/main.js', filename: 'zip_upload-main.js' },
};

module.exports = webpackConfig;
