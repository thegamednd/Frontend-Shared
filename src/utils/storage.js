/**
 * Local Storage Utility with namespace support and realm-aware structure
 * Provides type-safe operations with validation, defaults, and error handling
 */

const STORAGE_PREFIX = 'realmForge_';
const CURRENT_VERSION = 1;

export class StorageManager {
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.storageKey = `${STORAGE_PREFIX}${namespace}`;
  }

  /**
   * Get data from localStorage with optional default value
   * @param {string} key - The key to retrieve
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} The stored value or default
   */
  get(key = null, defaultValue = null) {
    try {
      const data = this._getData();
      
      if (key === null) {
        return data;
      }
      
      return this._getNestedValue(data, key, defaultValue);
    } catch (error) {
      console.warn(`Storage get error for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set data in localStorage
   * @param {string|object} key - The key to set or object to merge
   * @param {*} value - The value to store (if key is string)
   * @returns {boolean} Success status
   */
  set(key, value = null) {
    try {
      let data = this._getData();
      
      if (typeof key === 'object' && value === null) {
        // Merge object into existing data
        data = { ...data, ...key };
      } else if (typeof key === 'string') {
        // Set specific key-value pair
        data = this._setNestedValue(data, key, value);
      } else {
        throw new Error('Invalid key type. Must be string or object.');
      }

      this._setData(data);
      return true;
    } catch (error) {
      console.error(`Storage set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove a key from localStorage
   * @param {string} key - The key to remove
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      const data = this._getData();
      this._deleteNestedValue(data, key);
      this._setData(data);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all data for this namespace
   * @returns {boolean} Success status
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} Availability status
   */
  isAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all keys in the storage
   * @returns {string[]} Array of keys
   */
  keys() {
    try {
      const data = this._getData();
      return Object.keys(data);
    } catch {
      return [];
    }
  }

  /**
   * Get the size of stored data in bytes (approximate)
   * @returns {number} Size in bytes
   */
  size() {
    try {
      const data = JSON.stringify(this._getData());
      return new Blob([data]).size;
    } catch {
      return 0;
    }
  }

  // Private methods
  _getData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return { version: CURRENT_VERSION };
      }
      
      const parsed = JSON.parse(raw);
      
      // Handle version migration if needed
      if (!parsed.version || parsed.version < CURRENT_VERSION) {
        return this._migrateData(parsed);
      }
      
      return parsed;
    } catch (error) {
      console.warn('Failed to parse storage data, returning default:', error);
      return { version: CURRENT_VERSION };
    }
  }

  _setData(data) {
    try {
      data.version = CURRENT_VERSION;
      data.lastUpdated = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded');
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  _getNestedValue(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }

  _setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    // Create nested objects as needed
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  }

  _deleteNestedValue(obj, path) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current)) {
        return;
      }
      current = current[key];
    }
    
    delete current[lastKey];
  }

  _migrateData(oldData) {
    // Handle data migration for version changes
    console.log(`Migrating storage data from version ${oldData.version || 0} to ${CURRENT_VERSION}`);
    
    // For now, just add version and preserve existing data
    return {
      ...oldData,
      version: CURRENT_VERSION
    };
  }
}

/**
 * Realm-aware storage manager for room preferences
 */
export class RoomPreferencesStorage extends StorageManager {
  constructor() {
    super('roomPreferences');
  }

  /**
   * Get room preference for a specific realm and room
   * @param {string} realmId - The realm ID
   * @param {string} roomId - The room ID
   * @param {string} preference - The preference key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} The preference value
   */
  getRoomPreference(realmId, roomId, preference, defaultValue = null) {
    if (!realmId || !roomId || !preference) {
      console.warn('Invalid parameters for getRoomPreference');
      return defaultValue;
    }
    
    return this.get(`${realmId}.${roomId}.${preference}`, defaultValue);
  }

  /**
   * Set room preference for a specific realm and room
   * @param {string} realmId - The realm ID
   * @param {string} roomId - The room ID
   * @param {string} preference - The preference key
   * @param {*} value - The preference value
   * @returns {boolean} Success status
   */
  setRoomPreference(realmId, roomId, preference, value) {
    if (!realmId || !roomId || !preference) {
      console.warn('Invalid parameters for setRoomPreference');
      return false;
    }
    
    return this.set(`${realmId}.${roomId}.${preference}`, value);
  }

  /**
   * Get all preferences for a room
   * @param {string} realmId - The realm ID
   * @param {string} roomId - The room ID
   * @returns {object} All room preferences
   */
  getRoomPreferences(realmId, roomId) {
    if (!realmId || !roomId) {
      return {};
    }
    
    return this.get(`${realmId}.${roomId}`, {});
  }

  /**
   * Set multiple preferences for a room
   * @param {string} realmId - The realm ID
   * @param {string} roomId - The room ID
   * @param {object} preferences - Object of preferences to set
   * @returns {boolean} Success status
   */
  setRoomPreferences(realmId, roomId, preferences) {
    if (!realmId || !roomId || !preferences || typeof preferences !== 'object') {
      return false;
    }
    
    return this.set(`${realmId}.${roomId}`, preferences);
  }

  /**
   * Get all preferences for a realm
   * @param {string} realmId - The realm ID
   * @returns {object} All realm preferences
   */
  getRealmPreferences(realmId) {
    if (!realmId) {
      return {};
    }
    
    return this.get(realmId, {});
  }

  /**
   * Remove all preferences for a room
   * @param {string} realmId - The realm ID
   * @param {string} roomId - The room ID
   * @returns {boolean} Success status
   */
  removeRoomPreferences(realmId, roomId) {
    if (!realmId || !roomId) {
      return false;
    }
    
    return this.remove(`${realmId}.${roomId}`);
  }

  /**
   * Remove all preferences for a realm
   * @param {string} realmId - The realm ID
   * @returns {boolean} Success status
   */
  removeRealmPreferences(realmId) {
    if (!realmId) {
      return false;
    }
    
    return this.remove(realmId);
  }
}

// Create and export a default instance
export const roomPreferences = new RoomPreferencesStorage();

// Export the base storage manager for other use cases
export default StorageManager;