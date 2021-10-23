import { Compilation, Compiler, Module } from 'webpack';
import fg from 'fast-glob';
import path from 'path';
import assert from 'assert';
import fs from 'fs/promises';

type Options = {
    /**
     * Glob file patterns to check.
     * @default ['src/**']
     */
    include?: string[];

    /**
     * Glob file patterns to exclude from result
     * @default []
     */
    exclude?: string[];

    /**
     * Path to the output file.
     * @default &lt;project root&gt;/unused
     */
    outputFile?: string;
};

const defaultOptions: Options = {
    include: ['src/**'],
    exclude: [],
    outputFile: path.join(__dirname, '../unused'),
};

class ModuleLogger {
    /**
     * Plugin options
     * @private
     */
    private options: Options;
    /**
     * Set of paths to analyze
     * @private
     */
    private allFiles: Set<string> = null;
    /**
     * Set of files included to final bundle
     * @private
     */
    private usedFiles = new Set<string>();

    /**
     * Indicates that plugin is ready to generate report
     * @private
     */
    private isReady = false;

    constructor(options: Options = defaultOptions) {
        this.options = { ...defaultOptions, ...options };
        assert(this.options.include.every(item => typeof item === 'string'));
        assert(this.options.exclude.every(item => typeof item === 'string'));
        assert(typeof this.options.outputFile === 'string');

        this.readSources().then(result => {
            this.allFiles = new Set(result);
            if (this.isReady) {
                this.generateReport();
            }
        });
    }

    /**
     * Read and return (asynchronously) list of files
     * according to patterns from options.
     * @private
     */
    private async readSources(): Promise<string[]> {
        return await fg(this.options.include, { dot: true, ignore: this.options.exclude, absolute: true });
    }

    generateReport() {
        this.usedFiles.forEach(file => {
            this.allFiles.delete(file);
        });
        const result = JSON.stringify(Array.from(this.allFiles), null, 2);
        fs.writeFile(this.options.outputFile, result).catch(err => console.error(err));
    }

    apply(compiler: Compiler) {
        compiler.hooks.afterDone.tap('generate report', stats => {
            stats.compilation.modules.forEach(module => {
                // FIXME: little bit hacky, but i couldn't find the better way
                // @ts-ignore
                const modulePath: string = module.resource || module.rootModule.resource;
                if (modulePath) {
                    this.usedFiles.add(modulePath);
                }
            });
            if (this.allFiles) {
                this.generateReport();
            } else {
                this.isReady = true;
            }
        });
    }
}

export default ModuleLogger;
