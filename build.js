import esbuild from 'esbuild'
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill'
import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill'

esbuild.build({
    logLevel: "info",
    entryPoints: ["src/index.js"],
    bundle: true,
    minify: false,
    format: 'esm',
    platform: 'browser',
    outfile: "dist/index.js",
    plugins: [

    ],
})

