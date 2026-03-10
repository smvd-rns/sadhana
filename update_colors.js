const fs = require('fs');
const file = 'c:\\Users\\Admin\\Documents\\Communication\\app\\dashboard\\data-center\\page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/rose-/g, 'pink-').replace(/fuchsia-/g, 'purple-');
fs.writeFileSync(file, content);
console.log('done');
