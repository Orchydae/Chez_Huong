/**
 * Unit-test config. ts-jest compiles via tsconfig.spec.json, which overrides the
 * project's `nodenext`/declaration settings to plain CommonJS so Jest's runtime
 * can load the tests and resolve extensionless relative imports. Full
 * type-checking still happens via `npm run build` and `npm run lint`.
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
};
