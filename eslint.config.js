import js from "@eslint/js";

export default [
    js.configs.recommended,

    {
        ignores: [
            "node_modules/**",
            "**/dist/**",
            "**/generated/**",
            "**/build/**",
            "coverage/**",
            ".agents/**",
            ".claude/**",
            ".cursor/**",
            ".devin/**",
        ],
    },

    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                exports: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },

    {
        files: ["**/*.test.{js,mjs,cjs}", "**/*.spec.{js,mjs,cjs}"],
        languageOptions: {
            globals: {
                describe: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
            },
        },
    },
];