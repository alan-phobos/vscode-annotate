import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    const g = new glob.Glob('**/**.test.js', { cwd: testsRoot });
    const files: string[] = [];

    g.on('match', (file: string) => {
      files.push(file);
    });

    g.on('end', () => {
      files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });

    g.on('error', (err: Error) => {
      reject(err);
    });
  });
}
