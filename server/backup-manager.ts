import { db } from './db';
import { content } from '@shared/schema';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const BACKUP_DIR = './backups';

/**
 * Comprehensive backup manager to prevent data loss
 */
export class BackupManager {
  
  /**
   * Create a timestamped backup of all content
   */
  static async createContentBackup(backupName?: string): Promise<string> {
    try {
      // Ensure backup directory exists
      await mkdir(BACKUP_DIR, { recursive: true });
      
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = backupName || `content-backup-${timestamp}.json`;
      const filepath = join(BACKUP_DIR, filename);
      
      // Fetch all content from database
      const allContent = await db.select().from(content);
      
      // Create comprehensive backup object
      const backup = {
        timestamp: new Date().toISOString(),
        totalItems: allContent.length,
        contentByService: this.groupContentByService(allContent),
        rawContent: allContent,
        metadata: {
          schemaVersion: '1.0',
          backupType: 'full',
          source: 'database'
        }
      };
      
      // Write backup to file
      await writeFile(filepath, JSON.stringify(backup, null, 2));
      
      console.log(`✅ Content backup created: ${filename}`);
      console.log(`📊 Backup contains ${allContent.length} items across ${Object.keys(backup.contentByService).length} services`);
      
      return filepath;
    } catch (error) {
      console.error('❌ Failed to create content backup:', error);
      throw error;
    }
  }
  
  /**
   * Restore content from backup file
   */
  static async restoreFromBackup(backupFile: string): Promise<void> {
    try {
      const backupPath = backupFile.startsWith('./backups') ? backupFile : join(BACKUP_DIR, backupFile);
      const backupData = await readFile(backupPath, 'utf-8');
      const backup = JSON.parse(backupData);
      
      console.log(`🔄 Restoring content from backup: ${backupFile}`);
      console.log(`📅 Backup created: ${backup.timestamp}`);
      console.log(`📊 Restoring ${backup.totalItems} items`);
      
      // Clear existing content
      await db.delete(content);
      console.log('🧹 Cleared existing content');
      
      // Restore content from backup
      for (const item of backup.rawContent) {
        await db.insert(content).values(item);
      }
      
      console.log(`✅ Successfully restored ${backup.totalItems} content items`);
      this.logContentSummary(backup.contentByService);
      
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      throw error;
    }
  }
  
  /**
   * List available backups
   */
  static async listBackups(): Promise<string[]> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(BACKUP_DIR);
      return files.filter(file => file.endsWith('.json')).sort().reverse();
    } catch (error) {
      console.log('📁 No backup directory found');
      return [];
    }
  }
  
  /**
   * Sync current database state to seed file
   */
  static async syncDatabaseToSeed(): Promise<void> {
    try {
      const allContent = await db.select().from(content);
      
      // Generate new seed file content
      const seedFileContent = `import { db } from './db';
import { content } from '@shared/schema';

// Auto-generated seed file - Last updated: ${new Date().toISOString()}
// Total items: ${allContent.length}
const realContent = ${JSON.stringify(allContent, null, 2)};

export async function seedRealContent() {
  console.log('🌱 Seeding database with real content...');
  
  try {
    // Clear existing content
    await db.delete(content);
    console.log('✅ Cleared existing content');

    // Insert real content
    for (const item of realContent) {
      await db.insert(content).values(item);
    }
    
    console.log(\`✅ Seeded \${realContent.length} real content items\`);
    ${this.generateServiceLogging(allContent)}
    console.log('🎯 All content synchronized from database');
    console.log('🚀 Seed file auto-updated with current database state');
    
  } catch (error) {
    console.error('❌ Error seeding content:', error);
    throw error;
  }
}

// Auto-run seeding if this file is executed directly  
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  seedRealContent()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
`;

      // Write updated seed file
      await writeFile('./server/seed-content.ts', seedFileContent);
      console.log('✅ Seed file synchronized with current database state');
      console.log(`📊 Updated with ${allContent.length} content items`);
      
    } catch (error) {
      console.error('❌ Failed to sync database to seed file:', error);
      throw error;
    }
  }
  
  /**
   * Generate service-specific logging code
   */
  private static generateServiceLogging(allContent: any[]): string {
    const serviceGroups = this.groupContentByService(allContent);
    const logLines = Object.entries(serviceGroups).map(([service, items]) => {
      const icon = this.getServiceIcon(service);
      return `    console.log('${icon} ${service} content:', realContent.filter(c => c.service === '${service}').length);`;
    });
    return logLines.join('\n');
  }
  
  /**
   * Group content by service for reporting
   */
  private static groupContentByService(allContent: any[]) {
    return allContent.reduce((groups, item) => {
      const service = item.service;
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }
  
  /**
   * Log content summary
   */
  private static logContentSummary(contentByService: Record<string, any[]>) {
    Object.entries(contentByService).forEach(([service, items]) => {
      const icon = this.getServiceIcon(service);
      console.log(`${icon} ${service} content: ${items.length}`);
    });
  }
  
  /**
   * Get icon for service
   */
  private static getServiceIcon(service: string): string {
    const icons: Record<string, string> = {
      'netflix': '📺',
      'amazon-prime': '🎬',
      'espn-plus': '🏈',
      'youtube-tv': '📺',
      'hulu': '🎭',
      'cnn': '📰',
      'spotify': '🎵',
      'disney-plus': '🏰'
    };
    return icons[service] || '🎯';
  }
}