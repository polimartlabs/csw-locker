/**
 * Service for managing recipient storage operations using localStorage
 * Handles adding, removing, and retrieving removed recipients
 * Also manages transaction history and recipient frequency tracking
 */
export class RecipientStorageService {
  private static readonly REMOVED_RECIPIENTS_KEY = 'removedRecipients';
  private static readonly TRANSACTION_HISTORY_KEY = 'transactionHistory';
  private static readonly RECIPIENT_FREQUENCY_KEY = 'recipientFrequency';

  /**
   * Get all removed recipient addresses from localStorage
   */
  static getRemovedRecipients(): string[] {
    try {
      const stored = localStorage.getItem(this.REMOVED_RECIPIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading removed recipients from localStorage:', error);
      return [];
    }
  }

  /**
   * Add a recipient address to the removed list
   */
  static removeRecipient(address: string): void {
    try {
      const removedRecipients = this.getRemovedRecipients();
      if (!removedRecipients.includes(address)) {
        removedRecipients.push(address);
        localStorage.setItem(this.REMOVED_RECIPIENTS_KEY, JSON.stringify(removedRecipients));
      }
    } catch (error) {
      console.error('Error removing recipient from localStorage:', error);
    }
  }

  /**
   * Filter out removed recipients from a list of recipients
   */
  static filterRemovedRecipients<T extends { address: string }>(recipients: T[]): T[] {
    const removedRecipients = this.getRemovedRecipients();
    return recipients.filter(recipient => !removedRecipients.includes(recipient.address));
  }

  /**
   * Save a transaction to localStorage for tracking recipient frequency
   */
  static saveTransaction(
    fromAddress: string, 
    toAddress: string, 
    amount: string, 
    asset: string, 
    txHash?: string
  ): void {
    try {
      const now = new Date().toISOString();
      
      // Save transaction to history
      const transactionHistory = this.getTransactionHistory();
      const newTransaction = {
        id: txHash || `local_${Date.now()}`,
        from: fromAddress,
        to: toAddress,
        amount,
        asset,
        timestamp: now,
        txHash: txHash || null
      };
      
      transactionHistory.unshift(newTransaction);
      const limitedHistory = transactionHistory.slice(0, 100);
      localStorage.setItem(this.TRANSACTION_HISTORY_KEY, JSON.stringify(limitedHistory));
      
      // Update recipient frequency
      this.updateRecipientFrequency(toAddress, now);
    } catch (error) {
      console.error('Error saving transaction to localStorage:', error);
    }
  }

  /**
   * Get transaction history from localStorage
   */
  static getTransactionHistory(): any[] {
    try {
      const stored = localStorage.getItem(this.TRANSACTION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading transaction history from localStorage:', error);
      return [];
    }
  }

  /**
   * Update recipient frequency tracking
   */
  static updateRecipientFrequency(address: string, timestamp: string): void {
    try {
      const frequencyData = this.getRecipientFrequency();
      
      if (frequencyData[address]) {
        frequencyData[address].count += 1;
        frequencyData[address].lastSent = timestamp;
      } else {
        frequencyData[address] = {
          count: 1,
          lastSent: timestamp,
          firstSent: timestamp
        };
      }
      
      localStorage.setItem(this.RECIPIENT_FREQUENCY_KEY, JSON.stringify(frequencyData));
    } catch (error) {
      console.error('Error updating recipient frequency:', error);
    }
  }

  /**
   * Get recipient frequency data from localStorage
   */
  static getRecipientFrequency(): Record<string, { count: number; lastSent: string; firstSent: string }> {
    try {
      const stored = localStorage.getItem(this.RECIPIENT_FREQUENCY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading recipient frequency from localStorage:', error);
      return {};
    }
  }

  /**
   * Get recent recipients based on localStorage data
   */
  static getRecentRecipientsFromStorage(): Array<{ address: string; lastSent: string; frequency: number }> {
    try {
      const frequencyData = this.getRecipientFrequency();
      const removedRecipients = this.getRemovedRecipients();
      
      return Object.entries(frequencyData)
        .filter(([address]) => !removedRecipients.includes(address))
        .map(([address, data]) => ({
          address,
          lastSent: this.formatLastSent(data.lastSent),
          frequency: data.count
        }))
        .sort((a, b) => new Date(b.lastSent).getTime() - new Date(a.lastSent).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recent recipients from storage:', error);
      return [];
    }
  }

  /**
   * Format timestamp to human-readable format
   */
  private static formatLastSent(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get storage statistics for debugging
   */
  static getStorageStats(): { 
    removedCount: number; 
    removedRecipients: string[];
    transactionCount: number;
    recipientCount: number;
  } {
    const removedRecipients = this.getRemovedRecipients();
    const transactionHistory = this.getTransactionHistory();
    const frequencyData = this.getRecipientFrequency();
    
    return {
      removedCount: removedRecipients.length,
      removedRecipients,
      transactionCount: transactionHistory.length,
      recipientCount: Object.keys(frequencyData).length
    };
  }
}
