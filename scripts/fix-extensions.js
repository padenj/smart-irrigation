import fs from 'fs';
import path from 'path';

const distDir = './dist'; // Adjust to your output directory

function addJsExtensions(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      addJsExtensions(filePath); // Recursively process subdirectories
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/from\s+['"](\..*?)['"]/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from '${p1}.js'`;
        }
        return match;
      });
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

addJsExtensions(distDir);