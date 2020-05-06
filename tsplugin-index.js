"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const globby_1 = __importDefault(require("globby"));
const typescript_1 = require("./typescript");
const watchFiles_1 = require("./watchFiles");
const SERVERLESS_FOLDER = '.serverless';
const BUILD_FOLDER = '.build';
class TypeScriptPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.hooks = {
            'before:run:run': () => __awaiter(this, void 0, void 0, function* () {
                this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies();
            }),
            'before:offline:start': () => __awaiter(this, void 0, void 0, function* () {
                this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies();
                this.watchAll();
            }),
            'before:offline:start:init': () => __awaiter(this, void 0, void 0, function* () {
              console.log('before:offline:start:init: ');
                this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies();
                this.watchAll();
            }),
            'before:package:createDeploymentArtifacts': () => __awaiter(this, void 0, void 0, function* () {
              console.log('before:package:createDeploymentArtifacts: ');
                this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies(true);
            }),
            'after:package:createDeploymentArtifacts': () => __awaiter(this, void 0, void 0, function* () {
                yield this.cleanup();
            }),
            'before:deploy:function:packageFunction': () => __awaiter(this, void 0, void 0, function* () {
                this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies(true);
            }),
            'after:deploy:function:packageFunction': () => __awaiter(this, void 0, void 0, function* () {
                yield this.cleanup();
            }),
            'before:invoke:local:invoke': () => __awaiter(this, void 0, void 0, function* () {
                const emitedFiles = this.compileTs();
                yield this.copyExtras();
                yield this.copyDependencies();
                if (this.isWatching) {
                    emitedFiles.forEach((filename) => {
                        const module = require.resolve(path.resolve(this.originalServicePath, filename));
                        delete require.cache[module];
                    });
                }
            }),
            'after:invoke:local:invoke': () => {
                if (this.options.watch) {
                    this.watchFunction();
                    this.serverless.cli.log('Waiting for changes...');
                }
            },
        };
    }
    get functions() {
        const { options } = this;
        const { service } = this.serverless;
        const allFunctions = options.function
            ? {
                [options.function]: service.functions[this.options.function],
            }
            : service.functions;
        // Ensure we only handle runtimes that support Typescript
        const res = _.pickBy(allFunctions, ({ runtime }) => {
            const resolvedRuntime = runtime || service.provider.runtime;
        // If runtime is not specified on the function or provider, default to previous behaviour
            const regexRuntime = /^node/;
            return resolvedRuntime === undefined
                ? true
                : regexRuntime.exec(resolvedRuntime);
        });
        this.serverless.cli.log('res: ' + JSON.stringify(res));

        return res
    }
    get rootFileNames() {
        return typescript_1.extractFileNames(this.originalServicePath, this.serverless.service.provider.name, this.functions);
    }
    prepare() {
        // exclude serverless-plugin-typescript
        for (const fnName in this.functions) {
            const fn = this.functions[fnName];
            fn.package = fn.package || {
                exclude: [],
                include: [],
            };
            // Add plugin to excluded packages or an empty array if exclude is undefined
            fn.package.exclude = _.uniq([
                ...(fn.package.exclude || []),
                'node_modules/serverless-plugin-typescript',
            ]);
        }
        this.serverless.cli.log('this.functions: ' + JSON.stringify(this.functions));

    }
    watchFunction() {
        if (this.isWatching) {
            return;
        }
        this.serverless.cli.log(`Watch function ${this.options.function}...`);
        this.isWatching = true;
        watchFiles_1.watchFiles(this.rootFileNames, this.originalServicePath, this.serverless, () => __awaiter(this, void 0, void 0, function* () {
            yield this.serverless.pluginManager.spawn('invoke:local');
        }));
    }
    watchAll() {
        if (this.isWatching) {
            return;
        }
        this.serverless.cli.log('Watching typescript files...');
        this.isWatching = true;
        watchFiles_1.watchFiles(this.rootFileNames, this.originalServicePath, this.serverless, this.compileTs.bind(this));
    }
    compileTs() {
        this.prepare();
        this.serverless.cli.log('Compiling with Typescript...');
        if (!this.originalServicePath) {
            // Save original service path and functions
            this.originalServicePath = this.serverless.config.servicePath;
            // Fake service path so that serverless will know what to zip
            // this.serverless.config.servicePath = path.join(this.originalServicePath, BUILD_FOLDER);
        }
        const tsconfig = typescript_1.getTypescriptConfig(this.originalServicePath, this.serverless, this.isWatching ? null : this.serverless.cli);
        tsconfig.outDir = BUILD_FOLDER;
        tsconfig.exclude = [
          "lambdas/pyfunc/**/*",
        ]
        const emitedFiles = typescript_1.run(this.rootFileNames, tsconfig);
        this.serverless.cli.log('Typescript compiled.' + JSON.stringify(emitedFiles));
        return emitedFiles;
    }
    /**
     * Link or copy extras such as node_modules or package.include definitions.
     */
    copyExtras() {
        return __awaiter(this, void 0, void 0, function* () {
            const { service } = this.serverless;
            // include any "extras" from the "include" section
            if (service.package.include && service.package.include.length > 0) {
                const files = yield globby_1.default(service.package.include);
                for (const filename of files) {
                    const destFileName = path.resolve(path.join(BUILD_FOLDER, filename));
                    const dirname = path.dirname(destFileName);
                    if (!fse.existsSync(dirname)) {
                        fse.mkdirpSync(dirname);
                    }
                    if (!fse.existsSync(destFileName)) {
                        fse.copySync(path.resolve(filename), path.resolve(path.join(BUILD_FOLDER, filename)));
                    }
                }
            }
        });
    }
    /**
     * Copy the `node_modules` folder and `package.json` files to the output directory.
     *
     * @param isPackaging Provided if serverless is packaging the service for deployment
     */
    copyDependencies(isPackaging = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const outPkgPath = path.resolve(path.join(BUILD_FOLDER, 'package.json'));
            const outModulesPath = path.resolve(path.join(BUILD_FOLDER, 'node_modules'));
            // copy development dependencies during packaging
            if (isPackaging) {
                if (fse.existsSync(outModulesPath)) {
                    fse.removeSync(outModulesPath);
                }
                fse.copySync(path.resolve('node_modules'), path.resolve(path.join(BUILD_FOLDER, 'node_modules')), {
                    dereference: true,
                });
            }
            else {
                if (!fse.existsSync(outModulesPath)) {
                    yield this.linkOrCopy(path.resolve('node_modules'), outModulesPath, 'junction');
                }
            }
            // copy/link package.json
            if (!fse.existsSync(outPkgPath)) {
                yield this.linkOrCopy(path.resolve('package.json'), outPkgPath, 'file');
            }
        });
    }
    /**
     * Move built code to the serverless folder, taking into account individual
     * packaging preferences.
     */
    moveArtifacts() {
        return __awaiter(this, void 0, void 0, function* () {
            const { service } = this.serverless;
            yield fse.copy(path.join(this.originalServicePath, BUILD_FOLDER, SERVERLESS_FOLDER), path.join(this.originalServicePath, SERVERLESS_FOLDER));
            if (this.options.function) {
                const fn = service.functions[this.options.function];
                fn.package.artifact = path.join(this.originalServicePath, SERVERLESS_FOLDER, path.basename(fn.package.artifact));
                return;
            }
            if (service.package.individually) {
                const functionNames = Object.keys(this.functions);
                functionNames.forEach((name) => {
                    service.functions[name].package.artifact = path.join(this.originalServicePath, SERVERLESS_FOLDER, path.basename(service.functions[name].package.artifact));
                });
                return;
            }
            service.package.artifact = path.join(this.originalServicePath, SERVERLESS_FOLDER, path.basename(service.package.artifact));
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            // yield this.moveArtifacts();
            // Restore service path
            this.serverless.config.servicePath = this.originalServicePath;
            this.serverless.cli.log(this.originalServicePath)
            // Remove temp build folder
            /**
             * @fix
             */
            // fse.removeSync(path.join(this.originalServicePath, BUILD_FOLDER));
        });
    }
    /**
     * Attempt to symlink a given path or directory and copy if it fails with an
     * `EPERM` error.
     */
    linkOrCopy(srcPath, dstPath, type) {
        return __awaiter(this, void 0, void 0, function* () {
            return fse.symlink(srcPath, dstPath, type).catch((error) => {
                if (error.code === 'EPERM' && error.errno === -4048) {
                    return fse.copy(srcPath, dstPath);
                }
                throw error;
            });
        });
    }
}
module.exports = TypeScriptPlugin;
//# sourceMappingURL=index.js.map