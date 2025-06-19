import { SceneManager } from './sceneManager.js';
import { DataManager } from './dataManager.js';

/**
 * Main Application Class
 * Coordinates all components of the OASIS Community Map
 */
class OASISCommunityMap {
    constructor() {
        this.dataManager = new DataManager();
        this.sceneManager = new SceneManager('scene-canvas');
        
        this.isInitialized = false;
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingStatus = document.getElementById('loading-status');
        
        this.init();
    }

    async init() {
        try {
            this.updateLoadingStatus('Initializing application...');
            
                    // Setup mobile defaults
        this.setupMobileDefaults();
        
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
            console.log('🖱️ System clicked:', systemData);
            this.showSystemInfo(systemData);
        };



        // Window resize
        window.addEventListener('resize', () => {
            this.sceneManager.handleResize();
        });

        // System info close button
        const closeBtn = document.getElementById('system-info-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeSystemInfo();
            });
        }

        // Close system info when clicking outside
        document.addEventListener('click', (event) => {
            const systemInfo = document.getElementById('system-info');
            const canvas = document.getElementById('scene-canvas');
            
            if (systemInfo && systemInfo.style.display !== 'none') {
                // If clicking on canvas or outside the system info panel, close it
                if (event.target === canvas || (!systemInfo.contains(event.target) && !event.target.closest('.system-info'))) {
                    console.log('🚫 Closing system info due to outside click');
                    this.closeSystemInfo();
                }
            }
        });

        // Close system info with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeSystemInfo();
            }
        });

        // Mobile toggle button
        const mobileToggle = document.getElementById('mobile-toggle');
        const controlsPanel = document.querySelector('.controls-panel');
        
        if (mobileToggle && controlsPanel) {
            mobileToggle.addEventListener('click', () => {
                const isHidden = controlsPanel.classList.contains('hidden');
                
                if (isHidden) {
                    controlsPanel.classList.remove('hidden');
                    mobileToggle.classList.remove('closed');
                    mobileToggle.textContent = '▶';
                    mobileToggle.title = 'Hide Controls';
                } else {
                    controlsPanel.classList.add('hidden');
                    mobileToggle.classList.add('closed');
                    mobileToggle.textContent = '◀';
                    mobileToggle.title = 'Show Controls';
                }
            });
        }

        // Mobile instructions popup
        const mobileInstructions = document.getElementById('mobile-instructions');
        const instructionsClose = document.getElementById('instructions-close');
        
        // Show instructions on mobile devices on first visit
        if (window.innerWidth <= 768 && !localStorage.getItem('mobile-instructions-seen')) {
            setTimeout(() => {
                if (mobileInstructions) {
                    mobileInstructions.classList.add('show');
                }
            }, 1500); // Show after map loads
        }
        
        if (instructionsClose && mobileInstructions) {
            instructionsClose.addEventListener('click', () => {
                mobileInstructions.classList.remove('show');
                localStorage.setItem('mobile-instructions-seen', 'true');
            });
        }
        
        // Close instructions when clicking outside
        if (mobileInstructions) {
            mobileInstructions.addEventListener('click', (event) => {
                if (event.target === mobileInstructions) {
                    mobileInstructions.classList.remove('show');
                    localStorage.setItem('mobile-instructions-seen', 'true');
                }
            });
        }
    }

    setupMobileDefaults() {
        const controlsPanel = document.querySelector('.controls-panel');
        const mobileToggle = document.getElementById('mobile-toggle');
        
        // On desktop, show panel by default
        // On mobile, keep it hidden (already has 'hidden' class in HTML)
        if (window.innerWidth > 768 && controlsPanel) {
            controlsPanel.classList.remove('hidden');
        }
        
        // Update toggle button state based on panel visibility
        if (mobileToggle && controlsPanel) {
            const isHidden = controlsPanel.classList.contains('hidden');
            if (isHidden) {
                mobileToggle.classList.add('closed');
                mobileToggle.textContent = '◀';
                mobileToggle.title = 'Show Controls';
            } else {
                mobileToggle.classList.remove('closed');
                mobileToggle.textContent = '▶';
                mobileToggle.title = 'Hide Controls';
            }
        }
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
            'filter-unclaimedStars': 'unclaimedStars',
            'filter-regionLabels': 'regionLabels'
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
        
        // Count actual fleet carriers from the fcLabels array (more accurate)
        const fleetCarriers = this.sceneManager.fcLabels ? 
            this.sceneManager.fcLabels.filter(label => label.type === 'fc').length : 
            groups.fleetCarriers?.children?.length || 0;
        
        const stats = {
            total: this.sceneManager.allSystems.size,
            routeProgress: totalRoute > 0 ? Math.round((routeCompleted / totalRoute) * 100) : 0,
            fleetCarriers: fleetCarriers,
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
        console.log('📋 Showing system info for:', systemData);
        const infoPanel = document.getElementById('system-info');
        if (!infoPanel) {
            console.error('❌ System info panel not found!');
            return;
        }

        // Handle different data types (Fleet Carrier, Region, System)
        if (systemData.type === 'fleetCarrier') {
            this.showFleetCarrierInfo(systemData, infoPanel);
        } else if (systemData.type === 'region') {
            this.showRegionInfo(systemData, infoPanel);
        } else {
            this.showRegularSystemInfo(systemData, infoPanel);
        }

        // Show the panel
        console.log('🎯 Setting panel display to block');
        infoPanel.style.display = 'block';
        console.log('✅ Panel display style:', infoPanel.style.display);
        
        // Force a reflow to ensure the style is applied
        infoPanel.offsetHeight;
        console.log('🔄 Forced reflow, final display:', window.getComputedStyle(infoPanel).display);
    }

    showFleetCarrierInfo(fcData, infoPanel) {
        // Update system name
        const nameElement = document.getElementById('system-name');
        if (nameElement) nameElement.textContent = `${fcData.name} (${fcData.callsign})`;

        // Update system type
        const typeElement = document.getElementById('system-type');
        if (typeElement) typeElement.textContent = 'Fleet Carrier';

        // Update coordinates (location)
        const coordsElement = document.getElementById('system-coords');
        if (coordsElement) coordsElement.textContent = fcData.location;

        // Update owner info in primary star field
        const starElement = document.getElementById('system-star');
        if (starElement) starElement.textContent = fcData.owner;

        // Show status in population field
        const populationInfo = document.getElementById('population-info');
        const populationElement = document.getElementById('system-population');
        if (populationInfo && populationElement) {
            populationInfo.style.display = 'block';
            populationElement.textContent = fcData.status;
            // Update label to show "Status" instead of "Population"
            const populationLabel = populationInfo.querySelector('.detail-label');
            if (populationLabel) populationLabel.textContent = 'Status:';
        }

        // Hide other fields
        document.getElementById('economy-info').style.display = 'none';
        document.getElementById('route-info').style.display = 'none';
    }

    showRegionInfo(regionData, infoPanel) {
        // Update system name
        const nameElement = document.getElementById('system-name');
        if (nameElement) nameElement.textContent = regionData.name;

        // Update system type
        const typeElement = document.getElementById('system-type');
        if (typeElement) typeElement.textContent = 'Region';

        // Update coordinates (anchor system)
        const coordsElement = document.getElementById('system-coords');
        if (coordsElement) coordsElement.textContent = regionData.systemName;

        // Show blurb in primary star field
        const starElement = document.getElementById('system-star');
        if (starElement) starElement.textContent = regionData.blurb;

        // Hide other fields
        document.getElementById('population-info').style.display = 'none';
        document.getElementById('economy-info').style.display = 'none';
        document.getElementById('route-info').style.display = 'none';
    }

    showRegularSystemInfo(systemData, infoPanel) {
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
                'populated': 'Populated System'
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
            // Reset label to "Population"
            const populationLabel = populationInfo.querySelector('.detail-label');
            if (populationLabel) populationLabel.textContent = 'Population:';
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
    }

    closeSystemInfo() {
        const infoPanel = document.getElementById('system-info');
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
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