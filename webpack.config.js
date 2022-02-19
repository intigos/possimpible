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

// load toolchain files
const fs = require('fs');
const {spawn} = require("child_process");
let rawdata = fs.readFileSync('config/toolchain.json');
let toolchainConfig = JSON.parse(rawdata);

const entrypoints = {}
toolchainConfig.execs.forEach(x => {
    entrypoints[x] = [path.resolve(__dirname, `./src/toolchain/${x}/src/main.ts`)]
})

const bootConfig = (env = {}) => ({
    mode: env.prod ? 'production' : 'development',
    devtool: env.prod ? 'source-map' : 'eval-cheap-module-source-map',
    entry: entrypoints,
    output: {
        path: path.resolve(__dirname, './dist/bin/'),
        filename: 'js/[name].js',
        publicPath: '/',
        chunkFilename: 'js/[name].js'
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

                    configFile: "src/toolchain/tsconfig.json"
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
    stats: 'errors-only',


    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
                    const child = spawn('ts-node', ["-T", "utils/linking.ts"]);
                    child.stdout.on('data', function (data) {
                        process.stdout.write(data);
                    });
                    child.stderr.on('data', function (data) {
                        process.stderr.write(data);
                    });

                });
            }
        }
    ],

    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            '@': path.resolve(__dirname, '/src'),
            '#': path.resolve(__dirname, '/src/libs/include'),
        },
    },
    experiments: {
        topLevelAwait: true,
    },
});

const coreConfig = (env = {}) => ({
    mode: env.prod ? 'production' : 'development',
    devtool: env.prod ? 'source-map' : 'eval-cheap-module-source-map',
    entry: {
        vm: [path.resolve(__dirname, './src/main.ts')],
    },
    output: {
        path: path.resolve(__dirname, './dist/'),
        filename: 'js/[name].js',
        chunkFilename: 'js/[name].js'
    },
    stats: 'summary',
    plugins: [
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: 'true',
            __VUE_PROD_DEVTOOLS__: 'false'
        }),
        new CaseSensitivePathsPlugin(),
        new HtmlWebpackPlugin(
            {
                template: path.resolve(__dirname, 'public/index.html')
            }
        ),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'public'),
                    toType: 'dir',
                    globOptions: {
                        ignore: ['**/index.html']
                    }
                },

            ]}),
        new RemoveEmptyScriptsPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].css'
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(sass|scss)$/,

                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            url: false,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [['autoprefixer']],
                            },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {

                        }
                    }
                ]
            },

            // {
            //     test: /\.(sass|scss)$/,
            //     use: ['style-loader', 'css-loader', 'sass-loader']
            // },
            {
                test: /\.less$/,
                use: ['style-loader', 'css-loader', 'less-loader']
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(eot|woff|svg|jpg|ttf)$/,
                use: ['file-loader']
            },
            // {
            //     test: /\.js$/,
            //     use: 'babel-loader'
            // },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
            {
                test: /dist\/[^.]+\.img$/,
                type: 'asset/inline'
            },
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    happyPackMode: false,
                    appendTsSuffixTo: [/\.vue$/],
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
        runtimeChunk: true,
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
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        hot: true,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        }
    },
    stats: 'errors-only',
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            '@': path.resolve(__dirname, '/src'),
            '&': path.resolve(__dirname, '/dist'),
        },
        plugins: [
            new TsconfigPathsPlugin({ configFile: "./tsconfig.json" }),
        ]
    },
});

const configuration = [bootConfig, coreConfig];
configuration.watch = true;
module.exports = configuration
