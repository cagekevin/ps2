import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * 架构边界由 lint 强制，不靠自觉。
 * 规则改动必须同步 docs/CONVENTIONS.md。
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'jsx/**', 'tools/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: '请使用 core/http 的 request()，不要直接 fetch' }
      ]
    }
  },

  /* core 不能依赖上层 */
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/store/**', '**/components/**', '**/app/**'],
              message: 'core 层不能依赖 features / store / components / app'
            }
          ]
        }
      ]
    }
  },

  /* store 不能依赖 features / components / app */
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/components/**', '**/app/**'],
              message: 'store 不能依赖 features / components / app'
            }
          ]
        }
      ]
    }
  },

  /* domain 只能依赖 types */
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/**', '**/commands/**', '**/store/**', '**/components/**', '**/features/**', '**/app/**'],
              message: 'domain 层只能依赖 types'
            }
          ]
        }
      ]
    }
  },

  /* repo 只能依赖 core/storage、domain、types */
  {
    files: ['src/repo/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/commands/**', '**/store/**', '**/components/**', '**/features/**', '**/app/**'],
              message: 'repo 只能依赖 core/storage、domain、types'
            }
          ]
        }
      ]
    }
  },

  /* commands 不能依赖 features / components / app */
  {
    files: ['src/commands/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/components/**', '**/app/**'],
              message: 'commands 不能依赖 features / components / app'
            }
          ]
        }
      ]
    }
  },

  /* components 不能依赖 features / store / app */
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/store/**', '**/app/**'],
              message: 'components 不能依赖 features / store / app'
            },
            {
              group: ['**/core/ps/**', '**/core/storage/**', '**/core/cep/**'],
              message:
                'components 不能直接调 PS / 写盘 / 碰 CEP 桥（要什么经 hooks 或 core/feedback 原语）'
            }
          ]
        }
      ]
    }
  },

  /* hooks 不能依赖 commands / store / components / features / app
     （2026-10-28 补：此前 hooks 层一条规则都没有，`useRunCommand` 因此长期反向
       import `components/Toast`——这条越界又逼出「13 处手写 toast」） */
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/commands/**',
                '**/store/**',
                '**/components/**',
                '**/features/**',
                '**/app/**'
              ],
              message: 'hooks 只能依赖 core / domain / types'
            }
          ]
        }
      ]
    }
  },

  /* 唯一允许直接 fetch 的地方 */
  {
    files: ['src/core/http/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' }
  }
);
