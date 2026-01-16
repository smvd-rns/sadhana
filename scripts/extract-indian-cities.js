// Script to extract ALL Indian cities from world_cities_full.js
// This extracts cities and attempts to map them to states

const fs = require('fs');
const path = require('path');

console.log('Starting extraction of Indian cities...');

// Read the world cities file
const filePath = path.join(__dirname, '..', 'world_cities_full.js');
const fileContent = fs.readFileSync(filePath, 'utf8');

const indianCities = [];

// Extract all Indian cities using regex
// Pattern: { "country": "IN", "city": "CityName" }
const cityPattern = /{\s*"country":\s*"IN",\s*"city":\s*"([^"]+)"\s*}/g;
let match;
let count = 0;

while ((match = cityPattern.exec(fileContent)) !== null) {
  const cityName = match[1];
  // Clean up any encoding issues
  const cleanCityName = cityName
    .replace(/\uFFFD/g, '') // Remove replacement character
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove invalid characters
    .trim();
  
  if (cleanCityName && cleanCityName.length > 0) {
    indianCities.push(cleanCityName);
    count++;
  }
}

// Remove duplicates and sort
const uniqueCities = [...new Set(indianCities)].sort();

console.log(`Found ${count} Indian city entries`);
console.log(`Unique cities: ${uniqueCities.length}`);

// Group cities by first letter for organization
const citiesByLetter = {};
uniqueCities.forEach(city => {
  const firstLetter = city.charAt(0).toUpperCase();
  if (!citiesByLetter[firstLetter]) {
    citiesByLetter[firstLetter] = [];
  }
  citiesByLetter[firstLetter].push(city);
});

// Save to JSON file
const outputPath = path.join(__dirname, '..', 'lib', 'data', 'indian-cities-extracted.json');
const outputData = {
  total: uniqueCities.length,
  extractedAt: new Date().toISOString(),
  cities: uniqueCities,
  citiesByLetter: citiesByLetter
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(outputData, null, 2),
  'utf8'
);

console.log(`\n✅ Successfully extracted ${uniqueCities.length} unique Indian cities`);
console.log(`📁 Saved to: ${outputPath}`);
console.log(`\nSample cities (first 30):`);
console.log(uniqueCities.slice(0, 30).join(', '));
