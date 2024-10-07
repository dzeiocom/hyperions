import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'

export default [
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: ['tsconfig.json'],
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.nodeBuiltin
			}
		},
		plugins: {
			'@stylistic': stylistic,
		},
		ignores: [
			'node_modules/',
			'out/',
			'*.js',
			'__tests__/',
			'src/route.ts',
			'dist/',
			'.astro/',
			'.diaz/'
		],

		rules: {
			'@stylistic/arrow-parens': [
				'error',
				'always'
			],
			'@stylistic/eol-last': 'error',
			'@stylistic/indent': [
				'error',
				'tab',
				{
					SwitchCase: 1
				}
			],
			'@stylistic/linebreak-style': [
				'error',
				'unix'
			],
			'@stylistic/max-len': [
				'warn',
				{
					code: 256
				}
			],
			'@stylistic/member-delimiter-style': [
				'error',
				{
					multiline: {
						delimiter: 'none',
						requireLast: true
					},
					singleline: {
						delimiter: 'comma',
						requireLast: false
					}
				}
			],
			'@stylistic/new-parens': 'error',
			'@stylistic/no-extra-parens': 'off',
			'@stylistic/no-extra-semi': 'error',
			'@stylistic/no-multiple-empty-lines': 'error',
			'@stylistic/no-trailing-spaces': 'error',
			'@stylistic/quote-props': [
				'error',
				'consistent-as-needed'
			],
			'@stylistic/quotes': [
				'error',
				'single',
				{
					avoidEscape: true
				}
			],
			'@stylistic/semi': [
				'error',
				'never'
			],
			'@stylistic/space-before-function-paren': [
				'error',
				{
					anonymous: 'never',
					asyncArrow: 'always',
					named: 'never'
				}
			],
			'@stylistic/spaced-comment': [
				'error',
				'always',
				{
					block: {
						exceptions: [
							'*'
						]
					}
				}
			],
			'@stylistic/type-annotation-spacing': 'error',


			'@typescript-eslint/adjacent-overload-signatures': 'error',
			'@typescript-eslint/array-type': [
				'error',
				{
					default: 'generic'
				}
			],
			'@typescript-eslint/consistent-type-assertions': 'error',
			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					accessibility: 'explicit'
				}
			],
			'@typescript-eslint/member-ordering': 'error',
			'@typescript-eslint/no-empty-function': 'error',
			'@typescript-eslint/no-empty-interface': 'error',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-extra-parens': 'off',
			'@typescript-eslint/no-extraneous-class': [
				'warn',
				{
					allowStaticOnly: true
				}
			],
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/no-namespace': 'error',
			'@typescript-eslint/no-non-null-assertion': [
				'warn'
			],
			'@typescript-eslint/no-parameter-properties': 'off',
			'@typescript-eslint/no-shadow': 'error',
			'@typescript-eslint/no-unused-expressions': [
				'error',
				{
					allowTernary: true
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'@typescript-eslint/prefer-for-of': 'error',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/prefer-namespace-keyword': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true
				}
			],
			'@typescript-eslint/triple-slash-reference': 'error',

			'@typescript-eslint/unbound-method': [
				'error',
				{
					ignoreStatic: true
				}
			],

			'@typescript-eslint/unified-signatures': 'error',


			'arrow-body-style': 'error',
			'complexity': [
				'warn',
				10
			],
			'constructor-super': 'error',
			'curly': 'error',
			'dot-notation': 'error',
			'eqeqeq': [
				'error',
				'smart'
			],
			'for-direction': 'error',
			'getter-return': 'error',
			'guard-for-in': 'error',
			'id-blacklist': [
				'error',
				'any',
				'Number',
				'number',
				'String',
				'string',
				'Boolean',
				'boolean',
				'Undefined'
			],
			'id-length': [
				'warn',
				{
					exceptions: [
						'_'
					]
				}
			],
			'id-match': 'error',
			'max-classes-per-file': [
				'error',
				1
			],
			'max-depth': [
				'warn',
				2
			],
			'no-async-promise-executor': 'error',
			'no-await-in-loop': 'warn',
			'no-bitwise': 'error',
			'no-caller': 'error',
			'no-compare-neg-zero': 'error',
			'no-cond-assign': 'error',
			'no-console': 'off',
			'no-constant-condition': 'error',
			'no-control-regex': 'warn',
			'no-debugger': 'error',
			'no-delete-var': 'error',
			'no-dupe-args': 'error',
			'no-dupe-else-if': 'error',
			'no-dupe-keys': 'error',
			'no-duplicate-case': 'error',
			'no-empty': [
				'error',
				{
					allowEmptyCatch: true
				}
			],
			'no-empty-character-class': 'error',
			'no-eval': 'error',
			'no-ex-assign': 'error',
			'no-extra-boolean-cast': 'error',
			'no-fallthrough': 'off',
			'no-func-assign': 'error',
			'no-import-assign': 'error',
			'no-inner-declarations': 'error',
			'no-invalid-regexp': 'error',
			'no-irregular-whitespace': 'error',
			'no-label-var': 'error',
			'no-loss-of-precision': 'error',
			'no-misleading-character-class': 'error',
			'no-new-wrappers': 'error',
			'no-obj-calls': 'error',
			'no-promise-executor-return': 'error',
			'no-prototype-builtins': 'error',
			'no-regex-spaces': 'error',
			'no-setter-return': 'error',
			'no-shadow': [
				'error',
				{
					builtinGlobals: false,
					hoist: 'all'
				}
			],
			'no-shadow-restricted-names': 'error',
			'no-sparse-arrays': 'error',
			'no-template-curly-in-string': 'warn',
			'no-throw-literal': 'error',
			'no-undef': 'error',
			'no-undef-init': 'error',
			'no-underscore-dangle': 'off',
			'no-unexpected-multiline': 'error',
			'no-unreachable': 'warn',
			'no-unreachable-loop': 'warn',
			'no-unsafe-finally': 'error',
			'no-unsafe-negation': 'error',
			'no-unsafe-optional-chaining': 'error',
			'no-unused-expressions': [
				'error',
				{
					allowTernary: true
				}
			],
			'no-unused-labels': 'error',
			'no-unused-vars': 'off',
			'no-var': 'error',
			'object-shorthand': [
				'warn',
				'methods'
			],
			'one-var': [
				'error',
				'never'
			],
			'prefer-arrow-callback': 'warn',
			'prefer-const': 'error',
			'radix': 'error',
			'require-atomic-updates': 'warn',
			'use-isnan': 'error',
			'valid-typeof': 'warn'
		}
	}
]
