import type { Config } from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  modulePathIgnorePatterns: ['src/gitTestData'],
  transform: {
    '^.+\\.(ts|tsx|js)$': 'ts-jest',
  },
};
export default config;
