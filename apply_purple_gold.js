const fs = require('fs');
const path = require('path');
const file = 'c:\\Users\\Admin\\Documents\\Communication\\app\\dashboard\\data-center\\page.tsx';

let content = fs.readFileSync(file, 'utf8');

// Replace pink-xxx with purple-xxx (most cases)
// Specific replacements for the new theme
content = content.replace(/pink-500/g, 'purple-600');
content = content.replace(/pink-600/g, 'purple-700');
content = content.replace(/pink-400/g, 'purple-500');
content = content.replace(/pink-300/g, 'purple-400');
content = content.replace(/pink-100/g, 'purple-50');
content = content.replace(/pink-50/g, 'purple-50');

// Handle fuchsia if any left
content = content.replace(/fuchsia-/g, 'purple-');

// Shifting specifically to amber/gold where requested (like shadows and some hovers)
// This is more surgical
content = content.replace(/shadow-pink-500\/30/g, 'shadow-amber-500/30');

fs.writeFileSync(file, content);
console.log('Colors updated via script.');
