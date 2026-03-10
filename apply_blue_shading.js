const fs = require('fs');
const file = 'c:\\Users\\Admin\\Documents\\Communication\\app\\dashboard\\data-center\\page.tsx';

let content = fs.readFileSync(file, 'utf8');

// Replacements for a solid Blue Shading theme (no gradients)

const replacements = {
    // Backgrounds
    'bg-gradient-to-br from-purple-600 to-amber-500': 'bg-blue-600',
    'bg-gradient-to-br from-amber-500 to-purple-600': 'bg-sky-600',
    'bg-gradient-to-br from-purple-500 to-amber-400': 'bg-indigo-600',
    'bg-gradient-to-br from-orange-400 to-amber-500': 'bg-blue-700',
    'bg-gradient-to-br from-blue-500 to-purple-500': 'bg-cyan-600',
    'bg-gradient-to-br from-amber-500 to-yellow-600': 'bg-blue-500',
    'bg-gradient-to-br from-emerald-500 to-amber-500': 'bg-slate-600',
    'bg-gradient-to-br from-purple-400 to-amber-400': 'bg-indigo-500',
    'bg-gradient-to-br from-purple-400 to-slate-500': 'bg-slate-500',

    // Buttons and Gradients
    'bg-gradient-to-r from-purple-600 to-amber-500': 'bg-blue-600',
    'bg-gradient-to-r from-purple-700 to-amber-600': 'bg-blue-700',
    'bg-gradient-to-br from-purple-600 to-purple-500': 'bg-blue-600',
    'bg-gradient-to-br from-purple-500 to-amber-500': 'bg-blue-600',
    'from-purple-600 to-amber-500': 'bg-blue-600', // Catching partials
    'from-purple-700 to-amber-600': 'bg-blue-700',
    'from-red-600 to-purple-700': 'bg-blue-800', // Bulk delete red to deep blue

    // Hover states
    'hover:from-purple-700': 'hover:bg-blue-700',
    'hover:to-amber-600': 'hover:bg-blue-700',

    // Text colors
    'text-purple-600': 'text-blue-600',
    'text-purple-700': 'text-blue-700',
    'text-purple-900': 'text-blue-900',
    'text-amber-600': 'text-blue-600',
    'text-amber-700': 'text-blue-700',
    'text-amber-900': 'text-blue-900',

    // Borders
    'border-purple-500': 'border-blue-500',
    'border-purple-600': 'border-blue-600',
    'border-amber-500': 'border-blue-500',
    'border-amber-600': 'border-blue-600',
    'border-amber-400/60': 'border-blue-400/60',

    // Rings and Shadows
    'ring-purple-600/20': 'ring-blue-500/20',
    'shadow-purple-500/40': 'shadow-blue-500/40',
    'shadow-amber-500/30': 'shadow-blue-500/30',
};

// Map of prefixes to handle more cases
const prefixMap = {
    'purple-': 'blue-',
    'amber-': 'blue-',
    'fuchsia-': 'indigo-',
    'pink-': 'blue-',
    'bg-purple-': 'bg-blue-',
    'text-purple-': 'text-blue-',
    'border-purple-': 'border-blue-',
    'hover:bg-purple-': 'hover:bg-blue-',
    'hover:text-purple-': 'hover:text-blue-',
};

// First pass: Exact matches for gradients and complex strings
for (const [oldClass, newClass] of Object.entries(replacements)) {
    const regex = new RegExp(oldClass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    content = content.replace(regex, newClass);
}

// Second pass: Prefix replacements for remaining colors
for (const [prefix, replacement] of Object.entries(prefixMap)) {
    const regex = new RegExp(prefix + '(\\d+)', 'g');
    content = content.replace(regex, (match, p1) => {
        return replacement + p1;
    });
}

// Specific fixes for "no gradient" requirement
content = content.replace(/bg-gradient-to-r/g, 'bg-blue-600'); // Default fallback
content = content.replace(/bg-gradient-to-br/g, 'bg-blue-600');
content = content.replace(/bg-gradient-to-tr/g, 'bg-blue-600');

// Clean up redundant background classes if multiple were generated
content = content.replace(/bg-blue-600 bg-blue-600/g, 'bg-blue-600');

fs.writeFileSync(file, content);
console.log('Blue shading applied, gradients removed.');
