export class DataManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async loadAnchorSystems() {
        const cacheKey = 'anchor-systems';
        
        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        try {
            const response = await fetch('/api/anchor-systems');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('Failed to load anchor systems:', error);
            return null;
        }
    }

    async loadSheetsData() {
        const cacheKey = 'sheets-data';
        
        // Check cache first (shorter cache for dynamic data)
        if (this.isCacheValid(cacheKey, 2 * 60 * 1000)) { // 2 minutes
            return this.cache.get(cacheKey).data;
        }

        try {
            const response = await fetch('/api/sheets-data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('Failed to load sheets data:', error);
            return null;
        }
    }

    /**
     * Load Combined Visualization Data
     * Loads the pre-processed JSON file containing all system coordinates and data
     * This file contains Elite Dangerous system data with real coordinates
     * 
     * Expected format: { "SystemName": { "coords": {x, y, z}, ...otherData }, ... }
     * 
     * @returns {Object|null} Complete system database or null if failed
     */
    async loadVisualizationData() {
        const cacheKey = 'visualization-data';
        
        // Check cache first (longer cache for large static file)
        if (this.isCacheValid(cacheKey, 10 * 60 * 1000)) { // 10 minutes
            console.log('📋 Using cached visualization data');
            return this.cache.get(cacheKey).data;
        }
        
        try {
            console.log('📊 Loading combined visualization data from server...');
            const response = await fetch('/api/visualization-data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Loaded visualization data for ${Object.keys(data).length} systems`);
            
            // Cache the data
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Failed to load visualization data:', error);
            return null;
        }
    }

    /**
     * Get System Coordinates from Local Database Only
     * Primary method for getting real Elite Dangerous system coordinates
     * 
     * @param {string} systemName - Name of the star system
     * @returns {Object|null} Coordinates object {x, y, z} or null if not found
     */
    async getSystemCoordinates(systemName) {
        // Only try to get from local visualization database
        const vizData = await this.loadVisualizationData();
        
        if (!vizData || !vizData.systemsLookup) {
            console.error('❌ Visualization data not available');
            return null;
        }
        
        if (vizData.systemsLookup[systemName]) {
            const systemData = vizData.systemsLookup[systemName];
            
            // Extract coordinates from the system data
            if (systemData.coords) {
                console.log(`🎯 Found real ED coordinates for ${systemName}:`, systemData.coords);
                return systemData.coords;
            } else if (systemData.coordinates) {
                console.log(`🎯 Found coordinates for ${systemName}:`, systemData.coordinates);
                return systemData.coordinates;
            } else if (systemData.x !== undefined && systemData.y !== undefined && systemData.z !== undefined) {
                const coords = { x: systemData.x, y: systemData.y, z: systemData.z };
                console.log(`🎯 Found direct coordinates for ${systemName}:`, coords);
                return coords;
            }
        }
        
        // System not found - return null instead of generating mock coordinates
        const totalSystems = Object.keys(vizData.systemsLookup).length;
        console.warn(`⚠️ System "${systemName}" not found in local database (${totalSystems} systems available)`);
        return null;
    }

    isCacheValid(key, customTimeout = null) {
        if (!this.cache.has(key)) {
            return false;
        }
        
        const cached = this.cache.get(key);
        const timeout = customTimeout || this.cacheTimeout;
        const isValid = (Date.now() - cached.timestamp) < timeout;
        
        if (!isValid) {
            this.cache.delete(key);
        }
        
        return isValid;
    }

    clearCache() {
        this.cache.clear();
    }

    async checkConnection() {
        try {
            const response = await fetch('/api/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Utility method for parsing CSV data
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        return data;
    }

    /**
     * Load Custom Routes from CSV files
     * @returns {Object|null} Custom routes data or null if failed
     */
    async loadCustomRoutes() {
        const cacheKey = 'custom-routes';
        
        // Check cache first (5 minutes cache)
        if (this.isCacheValid(cacheKey, 5 * 60 * 1000)) {
            console.log('📍 Using cached custom routes data');
            return this.cache.get(cacheKey).data;
        }
        
        try {
            console.log('📍 Loading custom routes from server...');
            const response = await fetch('/api/custom-routes');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const routeCount = Object.keys(data).length;
            const systemCount = Object.values(data).reduce((sum, route) => sum + route.length, 0);
            
            console.log(`✅ Loaded ${routeCount} custom routes with ${systemCount} total systems`);
            
            // Cache the data
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Failed to load custom routes:', error);
            return null;
        }
    }
} 