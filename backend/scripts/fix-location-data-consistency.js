require('dotenv').config();
const { ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB, locationsTable } = require('../dynamodb');

/**
 * Migration script to fix location data consistency issues
 * 
 * This script will:
 * 1. Find locations where locationId and name don't match
 * 2. Show you the inconsistencies 
 * 3. Optionally fix them by using the display name as the canonical value
 */

async function scanAllLocations() {
  try {
    const command = new ScanCommand({
      TableName: locationsTable
    });
    const response = await dynamoDB.send(command);
    return response.Items || [];
  } catch (error) {
    console.error('Error scanning locations:', error);
    throw error;
  }
}

async function fixLocationConsistency(location, dryRun = true) {
  const { locationId, name, ...rest } = location;
  
  if (dryRun) {
    console.log(`[DRY RUN] Would update locationId from "${locationId}" to "${name}"`);
    return;
  }
  
  try {
    // Create new record with consistent data
    const newLocation = {
      locationId: name, // Use display name as the canonical ID
      name: name,
      ...rest
    };
    
    await dynamoDB.send(new PutCommand({
      TableName: locationsTable,
      Item: newLocation
    }));
    
    // If the locationId changed, delete the old record
    if (locationId !== name) {
      await dynamoDB.send(new DeleteCommand({
        TableName: locationsTable,
        Key: { locationId: locationId }
      }));
    }
    
    console.log(`✅ Fixed location: "${locationId}" -> "${name}"`);
  } catch (error) {
    console.error(`❌ Error fixing location "${locationId}":`, error);
    throw error;
  }
}

async function main() {
  const dryRun = !process.argv.includes('--fix');
  
  console.log('🔍 Scanning for location data consistency issues...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --fix to apply changes)' : 'FIXING DATA'}`);
  console.log('---');
  
  try {
    const locations = await scanAllLocations();
    console.log(`Found ${locations.length} locations in database`);
    
    const inconsistentLocations = locations.filter(loc => loc.locationId !== loc.name);
    
    if (inconsistentLocations.length === 0) {
      console.log('✅ No consistency issues found! All locations have matching locationId and name.');
      return;
    }
    
    console.log(`⚠️  Found ${inconsistentLocations.length} locations with consistency issues:`);
    console.log('');
    
    for (const location of inconsistentLocations) {
      console.log(`Location: ${location.name}`);
      console.log(`  - locationId: "${location.locationId}"`);
      console.log(`  - name: "${location.name}"`);
      console.log(`  - customMessage: ${location.customMessage ? 'YES' : 'NO'}`);
      console.log(`  - createdAt: ${location.createdAt}`);
      console.log('');
      
      await fixLocationConsistency(location, dryRun);
    }
    
    if (dryRun) {
      console.log('');
      console.log('💡 To apply these fixes, run:');
      console.log('   node scripts/fix-location-data-consistency.js --fix');
    } else {
      console.log('');
      console.log('✨ Location data consistency issues have been fixed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);