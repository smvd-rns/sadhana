const fs = require('fs');
const file = 'c:\\Users\\Admin\\Documents\\Communication\\app\\dashboard\\data-center\\page.tsx';

let content = fs.readFileSync(file, 'utf8');

// 1. Remove all common gradient patterns and replace with solid blue
content = content.replace(/bg-gradient-to-[rb]{1,2}\s+from-[a-z]+-\d+\s+via-[a-z]+-\d+\s+to-[a-z]+-\d+/g, 'bg-blue-600');
content = content.replace(/bg-gradient-to-[rb]{1,2}\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+/g, 'bg-blue-600');
content = content.replace(/bg-gradient-to-[rb]{1,2}\s+from-[a-z]+-\d+\/\d+\s+to-[a-z]+-\d+\/\d+/g, 'bg-blue-600/40');

// 2. Surgical color mappings
const colorMap = {
    'purple': 'blue',
    'amber': 'sky', // amber -> sky for nice shading variation
    'gold': 'cyan',
    'pink': 'blue',
    'fuchsia': 'indigo',
    'orange': 'blue'
};

for (const [oldCol, newCol] of Object.entries(colorMap)) {
    // Replace standalone color classes
    const regex = new RegExp(`([^a-zA-Z])${oldCol}-(\\d+)`, 'g');
    content = content.replace(regex, `$1${newCol}-$2`);
}

// 3. Clean up residual gradients
content = content.replace(/bg-gradient-to-[rb]{1,2}/g, 'bg-blue-600');
content = content.replace(/via-blue-\d+/g, '');
content = content.replace(/from-blue-\d+/g, 'bg-blue-600'); // Note: 'from' classes often imply gradient intent
content = content.replace(/to-blue-\d+/g, '');

// 4. Specific adjustments for "Nice Shading"
// Use sky/indigo for variations
content = content.replace(/blue-50/g, 'blue-50');
content = content.replace(/blue-100/g, 'blue-100');
content = content.replace(/blue-200/g, 'blue-200');
content = content.replace(/blue-300/g, 'sky-300');
content = content.replace(/blue-400/g, 'sky-400');
content = content.replace(/blue-500/g, 'blue-500');
content = content.replace(/blue-600/g, 'blue-600');
content = content.replace(/blue-700/g, 'blue-700');
content = content.replace(/blue-800/g, 'blue-800');
content = content.replace(/blue-900/g, 'blue-900');

// Fix overlapping background classes caused by Step 3
content = content.replace(/bg-blue-600\s+bg-blue-600/g, 'bg-blue-600');

fs.writeFileSync(file, content);
console.log('Blue shading applied aggressively.');
