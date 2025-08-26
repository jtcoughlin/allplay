/**
 * Script to fix malformed SVG data URLs in the database
 */
import { DataUrlFixer } from './utils/dataUrlFixer.js';

async function runFix() {
  try {
    console.log('🚀 Starting data URL fix...');
    const fixedCount = await DataUrlFixer.fixAllDataUrls();
    console.log(`✅ Data URL fix complete! Fixed ${fixedCount} URLs.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Data URL fix failed:', error);
    process.exit(1);
  }
}

runFix();