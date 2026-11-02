const path = require('path');
const webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  const styleLoaders = [
    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
    { loader: 'css-loader', options: { esModule: false } },
  ];

  return {
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      chunkFilename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      publicPath: 'auto',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        vue$: 'vue/dist/vue.esm.js',
        exifr$: 'exifr/dist/full.esm.js',
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        url: require.resolve('url/'),
        util: require.resolve('util/'),
        assert: require.resolve('assert/'),
        events: require.resolve('events/'),
        vm: require.resolve('vm-browserify'),
        process: require.resolve('process/browser.js'),
        os: false,
        fs: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        zlib: false,
        child_process: false,
        worker_threads: false,
        constants: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.css$/,
          use: styleLoaders,
        },
        {
          test: /\.s[ac]ss$/,
          use: styleLoaders.concat('sass-loader'),
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp|ico)$/i,
          type: 'asset/resource',
          generator: { filename: 'assets/images/[name].[hash:8][ext]' },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: { filename: 'assets/fonts/[name].[hash:8][ext]' },
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
        favicon: path.resolve(__dirname, 'icons/32x32.png'),
      }),
      new webpack.DefinePlugin({
        global: 'globalThis',
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser.js',
      }),
      ...(isProd
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].[contenthash:8].css',
              chunkFilename: 'css/[name].[contenthash:8].css',
            }),
          ]
        : []),
    ],
    devServer: {
      port: 8080,
      hot: true,
      historyApiFallback: true,
      allowedHosts: 'all',
      client: {
        overlay: { errors: true, warnings: false },
      },
    },
    performance: {
      hints: false,
    },
    devtool: isProd ? false : 'eval-cheap-module-source-map',
  };
};
