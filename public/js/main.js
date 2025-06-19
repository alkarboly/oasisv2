import { SceneManager } from './sceneManager.js';
import { DataManager } from './dataManager.js';
import { RoutePlanner } from './routePlanner.js';
import { RoutePlannerUI } from './routePlannerUI.js';

/**
 * Main Application Class
 * Coordinates all components of the OASIS Community Map
 */
class OASISCommunityMap {
    constructor() {
        this.dataManager = new DataManager();
        this.sceneManager = new SceneManager('scene-canvas');
        this.routePlanner = new RoutePlanner(this.sceneManager);
        this.routePlannerUI = null; // Initialize later after DOM is ready
        
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
            
            // Initialize route planner UI
            this.updateLoadingStatus('Initializing route planner...');
            this.routePlannerUI = new RoutePlannerUI(this.routePlanner, this.sceneManager);
            await this.routePlannerUI.initialize();
            
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

        // Mobile menu toggle button
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const controlsPanel = document.querySelector('.controls-panel');
        
        if (mobileMenuToggle && controlsPanel) {
            mobileMenuToggle.addEventListener('click', () => {
                const isHidden = controlsPanel.classList.contains('mobile-hidden');
                
                if (isHidden) {
                    controlsPanel.classList.remove('mobile-hidden');
                    mobileMenuToggle.textContent = '✕';
                    mobileMenuToggle.title = 'Close Menu';
                } else {
                    controlsPanel.classList.add('mobile-hidden');
                    mobileMenuToggle.textContent = '☰';
                    mobileMenuToggle.title = 'Open Menu';
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
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        // On desktop, show panel by default
        // On mobile, keep it hidden
        if (window.innerWidth > 768 && controlsPanel) {
            controlsPanel.classList.remove('mobile-hidden');
        } else if (controlsPanel) {
            controlsPanel.classList.add('mobile-hidden');
        }
        
        // Update toggle button state based on panel visibility
        if (mobileMenuToggle && controlsPanel) {
            const isHidden = controlsPanel.classList.contains('mobile-hidden');
            if (isHidden) {
                mobileMenuToggle.textContent = '☰';
                mobileMenuToggle.title = 'Open Menu';
            } else {
                mobileMenuToggle.textContent = '✕';
                mobileMenuToggle.title = 'Close Menu';
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
            this.updateStatElement('stat-fleet-carriers', stats.fleetCarriers);
            this.updateStatElement('stat-populated', stats.populated);
            // Active expeditions is static content, already set in HTML
            
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

        // Update coordinates field to show system instead
        const coordsElement = document.getElementById('system-coords');
        if (coordsElement) coordsElement.textContent = fcData.location;
        // Update coordinates label
        const coordsLabel = coordsElement.parentElement.querySelector('.detail-label');
        if (coordsLabel) coordsLabel.textContent = 'System:';

        // Update primary star field to show FC Owner instead
        const starElement = document.getElementById('system-star');
        if (starElement) starElement.textContent = fcData.owner;
        // Update primary star label
        const starLabel = starElement.parentElement.querySelector('.detail-label');
        if (starLabel) starLabel.textContent = 'FC Owner:';

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
        document.getElementById('lore-section').style.display = 'none';
    }

    showRegionInfo(regionData, infoPanel) {
        // Update system name
        const nameElement = document.getElementById('system-name');
        if (nameElement) nameElement.textContent = regionData.name;

        // Update system type
        const typeElement = document.getElementById('system-type');
        if (typeElement) typeElement.textContent = 'Region';

        // Reset labels to default
        const coordsLabel = document.querySelector('#system-coords').parentElement.querySelector('.detail-label');
        if (coordsLabel) coordsLabel.textContent = 'Anchor System:';
        const starLabel = document.querySelector('#system-star').parentElement.querySelector('.detail-label');
        if (starLabel) starLabel.textContent = 'Description:';

        // Update coordinates (anchor system)
        const coordsElement = document.getElementById('system-coords');
        if (coordsElement) coordsElement.textContent = regionData.systemName;

        // Show blurb in primary star field
        const starElement = document.getElementById('system-star');
        if (starElement) starElement.textContent = regionData.blurb;

        // Show lore section with detailed descriptions
        this.showLoreSection(regionData.name);

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

        // Reset labels to default
        const coordsLabel = document.querySelector('#system-coords').parentElement.querySelector('.detail-label');
        if (coordsLabel) coordsLabel.textContent = 'Coordinates:';
        const starLabel = document.querySelector('#system-star').parentElement.querySelector('.detail-label');
        if (starLabel) starLabel.textContent = 'Primary Star:';

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
            
            // Add custom route info if available
            if (systemData.routeInfo.customRoute) {
                const routeName = systemData.routeInfo.routeName || 'Unknown Route';
                const routeId = systemData.routeInfo.routeId || 'N/A';
                status += ` (${routeName} #${routeId})`;
            }
            
            routeStatusElement.textContent = status;
        } else {
            routeInfo.style.display = 'none';
        }

        // Hide lore section for regular systems
        document.getElementById('lore-section').style.display = 'none';
    }

    showLoreSection(regionName) {
        const loreSection = document.getElementById('lore-section');
        const loreImage = document.getElementById('lore-image');
        const loreDescription = document.getElementById('lore-description');
        const loreDiscord = document.getElementById('lore-discord');

        if (!loreSection) return;

        // Clear previous content
        loreImage.innerHTML = '';
        loreDescription.innerHTML = '';
        loreDiscord.innerHTML = '';

        // Get lore data based on region name
        const loreData = this.getLoreData(regionName);
        
        if (loreData) {
            // Add image if available
            if (loreData.image) {
                const imgElement = document.createElement('img');
                imgElement.src = loreData.image;
                imgElement.alt = regionName;
                imgElement.onerror = function() {
                    console.error('Failed to load image:', loreData.image);
                    this.style.display = 'none';
                };
                imgElement.onload = function() {
                    console.log('Successfully loaded image:', loreData.image);
                };
                loreImage.appendChild(imgElement);
            }

            // Add description
            if (loreData.description) {
                loreDescription.innerHTML = loreData.description;
            }

            // Add Discord link if available
            if (loreData.discord) {
                loreDiscord.innerHTML = `<a href="${loreData.discord}" target="_blank" rel="noopener noreferrer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                    </svg>
                    Join ${loreData.discordName || 'Discord'}
                </a>`;
            }

            loreSection.style.display = 'block';
        } else {
            loreSection.style.display = 'none';
        }
    }

    getLoreData(regionName) {
        const loreDatabase = {
            "OASIS": {
                description: `
                    <p><strong>The Orion Alliance of Independent Systems</strong></p>
                    <p>When we began Shoulder of Orion, the goal was clear: create a chain of outposts to Orion and set up the launch system for DW3. Colonization was a tool. A means to an end.</p>
                    <p>But as we have embarked on this historic journey together, things evolved. Became something more. We became a community. Friendships have been made, inside jokes birthed, and most importantly, hopes and aspirations for plans at Orion have been shared.</p>
                    <p><strong>OASIS</strong> is a philanthropic player organization that provides:</p>
                    <ul>
                        <li>Alliance with a core network of eight systems generating colonization commodities</li>
                        <li>Dedicated Fleet Carrier rotation between Orion and the Bubble</li>
                        <li>Community Discord for lore, safe passages, and general chat</li>
                        <li>Support for budding systems with barn-raising kindness and hauling</li>
                    </ul>
                    <p><em>Welcome home to OASIS.</em></p>
                `,
                discord: "https://discord.gg/WDjCDzp5eq",
                discordName: "OASIS Discord"
            },
            "SoO": {
                image: "./images/ShouldOfOrion_thumb.jpg",
                description: `
                    <p><strong>The Shoulder of Orion Colonization Initiative</strong></p>
                    <p>A massive colonization train effort designed to create a chain of outposts from the Bubble to reach OSC I (OASIS). This historic endeavor brought together hundreds of Commanders in a coordinated effort to establish humanity's presence in the Orion Nebula Complex.</p>
                    <p>The initiative successfully established:</p>
                    <ul>
                        <li>407 truckers, architects & fleet carrier commanders on constant rotation</li>
                        <li>90 carriers volunteered to the effort</li>
                        <li>244 systems colonized with 242 outposts and one Ocellus starport</li>
                        <li>4,895,917 tonnes of commodified materials hauled from the bubble</li>
                        <li>6.1 billion credits spent in claims alone</li>
                        <li>19.5 billion credits spent in construction commodities and materials</li>
                    </ul>
                    <p>Facilitated by <strong>FleetCom HQ</strong>, this operation laid the foundation for all future Orion expansion efforts.</p>
                `,
                discord: "https://discord.com/invite/0hKG2qb9ODixa7Iz",
                discordName: "FleetCom HQ"
            },
            "Lambda Orionis": {
                description: `
                    <p><strong>The Second Orion Star Cluster - Dark Wheel Territory</strong></p>
                    <p>The Second Orion Star Cluster has officially been reached and is now colonized! Thanks to the tireless efforts of explorers, fleet carrier captains, and support crews from OASIS, humanity has expanded its reach into yet another breathtaking region of space.</p>
                    <p>This new star cluster, about 300 ly from Orion's Gate, was trailblazed by <strong>Dark Wheel Squadron</strong> who worked tirelessly to reach an area of space connected to key parts of Elite Dangerous history.</p>
                    <p><strong>LAM01 ORIONIS</strong> - A Black Hole system with scan tags from Michael Brookes, author of key lore around Raxxla. Dark Wheel has built a memorial station in his honour.</p>
                    <p>Key achievements:</p>
                    <ul>
                        <li>Stations deployed and key systems secured</li>
                        <li>Infrastructure for long-term colonization established</li>
                        <li>Memorial station built at LAM01 ORIONIS</li>
                        <li>Connection to Elite Dangerous historical lore established</li>
                    </ul>
                    <p>The floodgates are open and anyone can claim any system they want in this historic region.</p>
                `,
                discord: "https://discord.gg/kWEUHkZhpT",
                discordName: "Dark Wheel"
            },
            "OSC III": {
                description: `
                    <p><strong>The Third Orion Star Cluster Initiative</strong></p>
                    <p>OSC III represents the latest colonization train initiative that OASIS is undertaking. This ongoing expansion effort continues humanity's push deeper into the Orion Nebula Complex.</p>
                    <p><strong>Anyone is free to join and coordinate</strong> in our Discord community. Our Fleet Carriers show their location on the map for this initiative, displaying both completed and in-progress systems.</p>
                    <p>Current Initiative Features:</p>
                    <ul>
                        <li>Open participation - all Commanders welcome</li>
                        <li>Real-time Fleet Carrier location tracking</li>
                        <li>Coordination through OASIS Discord</li>
                        <li>Progress tracking of completed and claimed systems</li>
                        <li>Continued expansion of human presence in Orion</li>
                    </ul>
                    <p>Join us as we write the next chapter in Orion's colonization story!</p>
                `,
                discord: "https://discord.gg/WDjCDzp5eq",
                discordName: "OASIS Discord"
            }
        };

        return loreDatabase[regionName] || null;
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