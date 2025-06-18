import { SceneManager } from './sceneManager.js';
import { DataManager } from './dataManager.js';
import { UIController } from './uiController.js';

/**
 * Main Application Class
 * Coordinates all components of the OASIS Community Map
 */
class OASISCommunityMap {
    constructor() {
        this.dataManager = new DataManager();
        this.sceneManager = new SceneManager('scene-canvas');
        this.uiController = new UIController();
        
        this.isInitialized = false;
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingStatus = document.getElementById('loading-status');
        
        this.init();
    }

    async init() {
        try {
            this.updateLoadingStatus('Initializing application...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load all data and render scene
            this.updateLoadingStatus('Loading stellar data...');
            await this.sceneManager.loadAllSystems(this.dataManager);
            
            // Update UI with statistics
            this.updateLoadingStatus('Updating interface...');
            await this.updateStatistics();
            
            // Setup filters
            this.setupFilters();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('🚀 OASIS Community Map fully initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize OASIS Community Map:', error);
            this.updateLoadingStatus('Error loading map. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // System interaction events
        this.sceneManager.onSystemClick = (systemData) => {
            this.showSystemInfo(systemData);
        };

        this.sceneManager.onSystemHover = (systemData) => {
            // Could add hover tooltips here
        };

        // Window resize
        window.addEventListener('resize', () => {
            this.sceneManager.handleResize();
        });
    }

    setupFilters() {
        // Map filter checkboxes to scene manager groups
        const filterMappings = {
            'filter-keySystem': 'keySystem',
            'filter-routeCompleted': 'routeCompleted', 
            'filter-routeInProgress': 'routeInProgress',
            'filter-routePlanned': 'routePlanned',
            'filter-populated': 'populated',
            'filter-fleetCarriers': 'fleetCarriers',
            'filter-unclaimedStars': 'unclaimedStars'
        };

        // Setup filter event listeners
        Object.entries(filterMappings).forEach(([filterId, groupName]) => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.sceneManager.toggleFilter(groupName, e.target.checked);
                });
            }
        });
    }

    async updateStatistics() {
        try {
            // Get system counts from scene manager
            const stats = this.calculateStatistics();
            
            // Update UI elements
            this.updateStatElement('stat-total', stats.total);
            this.updateStatElement('stat-route-progress', `${stats.routeProgress}%`);
            this.updateStatElement('stat-fleet-carriers', stats.fleetCarriers);
            this.updateStatElement('stat-populated', stats.populated);
            
        } catch (error) {
            console.error('❌ Failed to update statistics:', error);
        }
    }

    calculateStatistics() {
        const groups = this.sceneManager.groups;
        
        // Count systems in each group
        const routeCompleted = groups.routeCompleted?.children?.length || 0;
        const routeInProgress = groups.routeInProgress?.children?.length || 0;
        const routePlanned = groups.routePlanned?.children?.length || 0;
        const totalRoute = routeCompleted + routeInProgress + routePlanned;
        
        const stats = {
            total: this.sceneManager.allSystems.size,
            routeProgress: totalRoute > 0 ? Math.round((routeCompleted / totalRoute) * 100) : 0,
            fleetCarriers: Math.floor((groups.fleetCarriers?.children?.length || 0) / 2), // Divide by 2 because each FC has octahedron + label
            populated: groups.populated?.children?.length || 0
        };
        
        return stats;
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    showSystemInfo(systemData) {
        const infoPanel = document.getElementById('system-info');
        if (!infoPanel) return;

        // Update system name
        const nameElement = document.getElementById('system-name');
        if (nameElement) nameElement.textContent = systemData.name;

        // Update system type
        const typeElement = document.getElementById('system-type');
        if (typeElement) {
            const typeNames = {
                'keySystem': 'Key System',
                'routeCompleted': 'Complete Expedition Route',
                'routeInProgress': 'In Progress Expedition Route', 
                'routePlanned': 'Planned Expedition Route',
                'populated': 'Populated System',
                'fleetCarrier': 'Fleet Carrier'
            };
            typeElement.textContent = typeNames[systemData.category] || systemData.category;
        }

        // Update coordinates
        const coordsElement = document.getElementById('system-coords');
        if (coordsElement && systemData.originalCoordinates) {
            const coords = systemData.originalCoordinates;
            coordsElement.textContent = `${coords.x.toFixed(2)}, ${coords.y.toFixed(2)}, ${coords.z.toFixed(2)}`;
        }

        // Update primary star
        const starElement = document.getElementById('system-star');
        if (starElement) {
            starElement.textContent = systemData.primaryStar?.type || 'Unknown';
        }

        // Show/hide population info
        const populationInfo = document.getElementById('population-info');
        const populationElement = document.getElementById('system-population');
        if (systemData.information?.population > 0) {
            populationInfo.style.display = 'block';
            populationElement.textContent = systemData.information.population.toLocaleString();
        } else {
            populationInfo.style.display = 'none';
        }

        // Show/hide economy info
        const economyInfo = document.getElementById('economy-info');
        const economyElement = document.getElementById('system-economy');
        if (systemData.information?.economy) {
            economyInfo.style.display = 'block';
            economyElement.textContent = systemData.information.economy;
        } else {
            economyInfo.style.display = 'none';
        }

        // Show/hide route info
        const routeInfo = document.getElementById('route-info');
        const routeStatusElement = document.getElementById('route-status');
        if (systemData.routeInfo) {
            routeInfo.style.display = 'block';
            let status = 'Planned';
            if (systemData.routeInfo['completed?_'] === 'TRUE') {
                status = 'Completed';
            } else if (systemData.routeInfo['claimed?_'] === 'TRUE') {
                status = 'In Progress';
            }
            routeStatusElement.textContent = status;
        } else {
            routeInfo.style.display = 'none';
        }

        // Show the panel
        infoPanel.style.display = 'block';
    }

    updateLoadingStatus(message) {
        if (this.loadingStatus) {
            this.loadingStatus.textContent = message;
        }
        console.log(`📊 ${message}`);
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }
}

// Global function to close system info (called from HTML)
window.closeSystemInfo = function() {
    const infoPanel = document.getElementById('system-info');
    if (infoPanel) {
        infoPanel.style.display = 'none';
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌌 Starting OASIS Community Map...');
    new OASISCommunityMap();
});

// Handle service worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker when available
        // navigator.serviceWorker.register('/sw.js');
    });
} 