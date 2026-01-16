/**
 * Script to import cities from all city.txt into Firestore
 * 
 * Usage: node scripts/import-cities-from-txt.js
 * 
 * Make sure to set up Firebase environment variables first.
 */

const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account if available
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    // If service account not available, use environment variables
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.error('Error: Firebase not initialized. Please set up Firebase Admin SDK or environment variables.');
      console.error('You can either:');
      console.error('1. Create a serviceAccountKey.json file in the root directory');
      console.error('2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables');
      process.exit(1);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
}

const db = admin.firestore();

/**
 * Import cities from the JSON file
 */
async function importCities() {
  try {
    // Read the JSON file
    const filePath = path.join(__dirname, '..', 'all city.txt');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const citiesData = JSON.parse(fileContent);

    console.log('📖 Reading cities from all city.txt...');
    console.log(`Found ${Object.keys(citiesData).length} states\n`);

    let totalCities = 0;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process each state
    for (const [state, cities] of Object.entries(citiesData)) {
      if (!Array.isArray(cities)) {
        console.warn(`⚠️  Skipping ${state}: not an array`);
        continue;
      }

      console.log(`\n📍 Processing ${state} (${cities.length} cities)...`);

      for (const cityName of cities) {
        if (!cityName || typeof cityName !== 'string') {
          continue;
        }

        totalCities++;
        const cityNameTrimmed = cityName.trim();

        if (!cityNameTrimmed) {
          skipped++;
          continue;
        }

        try {
          // Check if city already exists
          const existingQuery = await db.collection('cities')
            .where('name', '==', cityNameTrimmed)
            .where('state', '==', state)
            .limit(1)
            .get();

          if (!existingQuery.empty) {
            skipped++;
            continue;
          }

          // Add city to Firestore
          await db.collection('cities').add({
            name: cityNameTrimmed,
            state: state,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          imported++;
          
          // Progress indicator
          if (imported % 50 === 0) {
            process.stdout.write(`\r  ✓ Imported ${imported} cities...`);
          }
        } catch (error) {
          errors++;
          console.error(`\n❌ Error importing ${cityNameTrimmed}, ${state}:`, error.message);
        }
      }

      console.log(`  ✓ Completed ${state}: ${cities.length} cities processed`);
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`Total cities in file: ${totalCities}`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⏭️  Skipped (duplicates): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importCities();
