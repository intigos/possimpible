const path = require('path');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
var DeclarationBundlerPlugin = require('types-webpack-bundler');


// load toolchain files
const fs = require('fs');
let rawdata = fs.readFileSync('config/toolchain.json');
let toolchainConfig = JSON.parse(rawdata);

const entrypoints = {}
toolchainConfig.libs.forEach(x => {
    entrypoints[x] = [path.resolve(__dirname, `./src/toolchain/${x}/src/main.ts`)]
})

module.exports = (env = {}) => ({
    mode: env.prod ? 'production' : 'development',
    devtool: env.prod ? 'source-map' : 'eval-cheap-module-source-map',
    entry: entrypoints,
    output: {
        path: path.resolve(__dirname, './dist/toolchain/'),
        filename: 'js/[name].js',
        library: {
            name: "[name]",
            type: "assign"
        }
    },
    stats: 'summary',
    plugins: [
        new webpack.DefinePlugin({
        }),
        new CaseSensitivePathsPlugin(),
        new RemoveEmptyScriptsPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: true,
                    happyPackMode: false,
                    configFile: "tsconfig.json"
                }
            },
        ],
    },
    stats: {
        colors: true,
        modules: true,
        reasons: true,
        errorDetails: true
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendors: {
                    name: 'chunk-vendors',
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    chunks: 'initial'
                },
                common: {
                    name: 'chunk-common',
                    minChunks: 2,
                    priority: -20,
                    chunks: 'initial',
                    reuseExistingChunk: true
                }
            }
        },
        minimizer: [
            new CssMinimizerPlugin(),
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    output: {
                        comments: false,
                    },
                },
            }),
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            '@': '/Users/nurv/git/intigos/possimpible/src',
            '&': '/Users/nurv/git/intigos/possimpible/dist',
        }
    },
    plugins: [
    ]
});
