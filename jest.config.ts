import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ESM-safe __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load tsconfig.json safely
const tsconfig = JSON.parse(
  readFileSync(join(__dirname, 'tsconfig.json'), 'utf-8'),
);

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'], // ADD THIS LINE
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/src/',
  }),
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
};
