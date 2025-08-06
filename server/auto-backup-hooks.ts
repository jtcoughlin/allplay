import { BackupManager } from './backup-manager';
import { db } from './db';
import { content } from '@shared/schema';

/**
 * Automatic backup hooks that trigger during development operations
 */
export class AutoBackupHooks {
  
  /**
   * Pre-operation backup - automatically creates backup before risky operations
   */
  static async preOperationBackup(operationName: string): Promise<string> {
    const backupName = `pre-${operationName}-${new Date().toISOString().split('T')[0]}`;
    console.log(`🛡️ Creating automatic backup: ${backupName}`);
    return await BackupManager.createContentBackup(backupName);
  }
  
  /**
   * Post-content-change sync - automatically syncs database to seed after content changes
   */
  static async postContentChangeSync(): Promise<void> {
    console.log('🔄 Auto-syncing database to seed file...');
    await BackupManager.syncDatabaseToSeed();
    console.log('✅ Database automatically synchronized to seed file');
  }
  
  /**
   * Enhanced content insertion with automatic backup
   */
  static async safeContentInsert(contentItems: any[], operationName: string = 'content-update') {
    // Create pre-operation backup
    await this.preOperationBackup(operationName);
    
    // Perform the content insertion
    await db.delete(content);
    for (const item of contentItems) {
      await db.insert(content).values(item);
    }
    
    // Auto-sync to seed file
    await this.postContentChangeSync();
    
    console.log(`✅ Safe content operation completed with automatic backup and sync`);
  }
  
  /**
   * Weekly automatic backup (can be called periodically)
   */
  static async weeklyBackup(): Promise<void> {
    const backupName = `weekly-auto-backup-${new Date().toISOString().split('T')[0]}`;
    await BackupManager.createContentBackup(backupName);
    console.log('📅 Weekly automatic backup completed');
  }
  
  /**
   * Check if backup is needed based on time since last backup
   */
  static async shouldCreateBackup(): Promise<boolean> {
    try {
      const backups = await BackupManager.listBackups();
      if (backups.length === 0) return true;
      
      // Check if last backup is older than 24 hours
      const lastBackup = backups[0];
      const backupDate = lastBackup.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
      if (backupDate) {
        const lastBackupTime = new Date(backupDate).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return lastBackupTime < oneDayAgo;
      }
      return false;
    } catch {
      return true; // If we can't check, better safe than sorry
    }
  }
}