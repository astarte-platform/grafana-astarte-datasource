const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    target: 'node',
    context: __dirname + '/src',
    entry: './module.ts',
    mode: 'production',
    output: {
        filename: 'module.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'amd'
    },
    optimization: {
        //do not minimize, it breaks angularJS
        minimize: false
    },
    plugins: [
        new CopyWebpackPlugin([
            { from: '../README.md' },
            { from: 'plugin.json' },
            {
                from: 'img',
                to: 'img'
            },
            {
                from: 'partials',
                to: 'partials'
            }
        ])
    ],
    externals: [
        function(context, request, callback) {
            var prefix = 'grafana/';
            if (request.indexOf(prefix) === 0) {
                return callback(null, request.substr(prefix.length));
            }
            callback();
        }
    ],
    resolve: {
        extensions: [ '.ts', '.js' ]
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: { presets: ['@babel/preset-env'] }
                    },
                    'ts-loader',
                ],
                exclude: /node_modules/
            }
        ]
    }
}
