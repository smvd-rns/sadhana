const fs = require('fs');
const file = 'c:\\Users\\Admin\\Documents\\Communication\\app\\dashboard\\data-center\\page.tsx';

let content = fs.readFileSync(file, 'utf8');

// Use a map for precise class-to-class replacement to avoid partial matches or overlaps
const replacements = {
    'pink-500': 'purple-600',
    'pink-600': 'purple-700',
    'pink-400': 'purple-500',
    'pink-300': 'purple-400',
    'pink-200': 'purple-300',
    'pink-100': 'purple-100',
    'pink-50': 'purple-50',
    'fuchsia-500': 'purple-600',
    'fuchsia-600': 'purple-700',
    'fuchsia-400': 'purple-500',
    'bg-pink-500': 'bg-purple-600',
    'text-pink-500': 'text-purple-600',
    'border-pink-500': 'border-purple-600',
    'border-pink-300': 'border-amber-400/60',
    'hover:border-pink-400': 'hover:border-purple-400',
    'hover:border-pink-300': 'hover:border-amber-400/60',
    'hover:text-pink-600': 'hover:text-purple-600',
    'hover:bg-pink-50': 'hover:bg-purple-50',
    'shadow-pink-500/40': 'shadow-purple-500/40',
    'shadow-pink-500/30': 'shadow-amber-500/30',
    'from-pink-500': 'from-purple-600',
    'to-pink-600': 'to-purple-700',
    'to-pink-500': 'to-amber-500',
    'from-purple-400 to-pink-400': 'from-purple-500 to-amber-500' // creating a specific rainbow/sunset blend
};

for (const [oldClass, newClass] of Object.entries(replacements)) {
    const regex = new RegExp(oldClass, 'g');
    content = content.replace(regex, newClass);
}

fs.writeFileSync(file, content);
console.log('Colors sanitized via robust script.');
