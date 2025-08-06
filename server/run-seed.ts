#!/usr/bin/env tsx
import { seedRealContent } from './seed-content.js';

async function main() {
  try {
    await seedRealContent();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();