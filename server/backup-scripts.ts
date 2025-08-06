#!/usr/bin/env tsx
import { BackupManager } from './backup-manager';

/**
 * Command-line backup scripts
 * Usage: tsx server/backup-scripts.ts <command> [args]
 */

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  try {
    switch (command) {
      case 'create':
        await BackupManager.createContentBackup(arg);
        break;
        
      case 'restore':
        if (!arg) {
          console.error('❌ Please specify backup file to restore from');
          process.exit(1);
        }
        await BackupManager.restoreFromBackup(arg);
        break;
        
      case 'list':
        const backups = await BackupManager.listBackups();
        console.log('📋 Available backups:');
        backups.forEach(backup => console.log(`  - ${backup}`));
        break;
        
      case 'sync':
        await BackupManager.syncDatabaseToSeed();
        break;
        
      default:
        console.log(`
🔧 Allplay Backup Manager Commands:

  create [name]    - Create a timestamped backup of all content
  restore <file>   - Restore content from backup file
  list             - List all available backups
  sync             - Sync current database state to seed file

Examples:
  tsx server/backup-scripts.ts create
  tsx server/backup-scripts.ts create "pre-migration-backup"
  tsx server/backup-scripts.ts restore content-backup-2025-08-06.json
  tsx server/backup-scripts.ts sync
        `);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}