import fs from 'fs/promises';
import path from 'path';

const copyFilesPlugin = (options = {}) => ({
  name: 'copy-files',
  setup(build) {
    build.onEnd(async () => {
      await Promise.all(
        Object.entries(options).map(async ([source, target]) => {
          const sourcePath = path.resolve(source);
          const targetPath = path.resolve(target);
          
          if (sourcePath === targetPath) {
            return;
          }
          
          try {
            await fs.access(source);
          } catch {
            return;
          }
          
          const targetDir = path.dirname(targetPath);
          await fs.mkdir(targetDir, { recursive: true });
          
          return fs.cp(source, target, { recursive: true });
        }),
      );
    });
  },
});

export default copyFilesPlugin;
