// Modern Three.js ES Module Imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * OASIS Community Map - SceneManager
 * Sci-fi neon visualization of Elite Dangerous OASIS region colonization
 * 
 * Features:
 * - Key systems (special golden system from CSV)
 * - Route systems (yellow planned, orange in-progress, green completed)
 * - Populated systems (purple with size based on population)
 * - Fleet carriers (cyan rotating octahedrons with dynamic HTML labels)
 * - Region labels from anchor systems CSV
 * - Unclaimed stars (smooth particle system)
 * - Sci-fi neon lighting and effects
 */
export class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = null;
        
        // Memorial system coordinates (scene center)
        this.memorialSystem = "2MASS J05405172-0226489";
        this.memorialCoords = null;
        
        // Object groups for different system types
        this.groups = {
            // Special systems
            keySystem: new THREE.Group(),         // Gold - Key system only
            
            // Route systems
            routePlanned: new THREE.Group(),      // Yellow - Planned expedition route
            routeInProgress: new THREE.Group(),   // Orange - In-progress expedition route
            routeCompleted: new THREE.Group(),    // Green - Completed expedition route
            
            // Population systems
            populated: new THREE.Group(),         // Purple - Has population/economy
            
            // Fleet carriers
            fleetCarriers: new THREE.Group(),     // Cyan - Mobile bases
            
            // Background particle systems
            unclaimedStars: new THREE.Group()     // White particles - All other systems
        };
        
        // Interactive objects and data storage
        this.interactiveObjects = [];
        this.systemData = new Map();
        this.allSystems = new Map(); // All systems from JSON by name (normalized keys)
        this.systemNameMap = new Map(); // Case-insensitive lookup: normalized -> original
        
        // Label management
        this.fcLabels = []; // Fleet carrier and region HTML labels
        this.labelVisibility = {
            fleetCarriers: true,
            regionLabels: false  // Off by default
        };
        
        // Animation properties
        this.animationId = null;
        this.time = 0;
        
        // Auto-rotation settings
        this.lastInteraction = Date.now();
        this.interactionTimeout = 3000; // Resume auto-rotation after 3 seconds of no interaction
        
        // Event callback
        this.onSystemClick = null;
        
        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupSciFiLighting();
        this.setupInteraction();
        this.setupSpaceBackground();
        
        // Add groups to scene
        Object.values(this.groups).forEach(group => {
            this.scene.add(group);
        });
        
        // Set initial visibility for filters that are off by default
        this.groups.unclaimedStars.visible = false;  // Unclaimed stars off by default
        
        this.startAnimation();
        console.log('🎬 OASIS Sci-Fi Scene initialized');
    }

    /**
     * Normalize system name for case-insensitive comparison
     */
    normalizeSystemName(name) {
        return name.toLowerCase().trim();
    }

    /**
     * Get system with case-insensitive lookup
     */
    getSystem(systemName) {
        const normalized = this.normalizeSystemName(systemName);
        const originalName = this.systemNameMap.get(normalized);
        return originalName ? this.allSystems.get(originalName) : null;
    }

    /**
     * Get custom blurbs for different regions
     */
    getRegionBlurbs() {
        return {
            "OASIS": "The heart of the Orion Star Cluster colonization effort. This memorial system serves as the primary hub and staging area for all expedition activities in the region.",
            "Lambda Orionis": "Also known as the Golden Chain, this region has been successfully stabilized by The Dark Wheel. Resources are flowing and this serves as the launching point for Operation Laden Swallow.",
            "OSC III": "Orion Star Cluster Phase III expansion zone. The current frontier of active colonization efforts, pushing deeper into the Orion region.",
            "SoO": "Shoulder of Orion region, marking the outer boundaries of the primary colonization zone. A strategic waypoint for deep space operations.",
            "Horsehead Nebula": "The eastern objective of Operation Laden Swallow. This dark nebula silhouetted against bright emission regions represents The Dark Wheel's next major expansion target, requiring a secure route of civilian outposts.",
            "Orion Core": "The heart of the Orion Star Cluster, containing the densest concentration of systems and the primary colonization hub. This region serves as the main staging area for expeditions.",
            "Orion Nebula": "The spectacular stellar nursery region where new stars are born. Rich in rare materials and exotic phenomena, this area presents unique exploration opportunities.",
            "Trapezium Cluster": "A young, hot star cluster within the Orion Nebula, known for its brilliant blue giants and active stellar formation. Home to some of the most luminous stars in the region.",
            "Orion Belt": "The iconic three-star alignment visible from Earth, serving as a navigational landmark for pilots. These massive blue supergiants are among the most recognizable features in human space.",
            "Flame Nebula": "A bright emission nebula illuminated by the nearby star Alnitak. Known for its distinctive reddish glow and active star formation regions.",
            "Orion Outer Rim": "The frontier regions of the Orion Cluster, where brave explorers push the boundaries of known space. Less populated but rich in discovery potential.",
            "Barnard's Loop": "A large arc of ionized gas surrounding much of the Orion constellation. This ancient supernova remnant creates a spectacular backdrop for deep space operations.",
            "Rosette Nebula": "A skull-shaped emission nebula known for its distinctive appearance and active stellar nursery. Popular among both researchers and tourists.",
            "Witch Head Nebula": "A reflection nebula illuminated by the bright star Rigel. Its ethereal blue glow makes it one of the most photographed regions in the cluster."
        };
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000005); // Deep space blue-black
        this.scene.fog = new THREE.Fog(0x000005, 100, 800);
    }

    setupCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 60, 200); // Zoom out even more for better cluster overview
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false; // Disable shadows for space scene
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2; // Brighter for neon effects
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI;
        
        // Enable smooth auto-rotation
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5; // Degrees per second
        console.log('🔄 Auto-rotation enabled at', this.controls.autoRotateSpeed, 'degrees/second');
        
        // Listen for user interactions to pause auto-rotation
        this.controls.addEventListener('start', () => {
            console.log('🎮 OrbitControls interaction started - pausing auto-rotation');
            this.onUserInteraction();
        });
        
        this.controls.addEventListener('end', () => {
            console.log('🎮 OrbitControls interaction ended');
        });
    }

    setupSciFiLighting() {
        // Ambient light for basic visibility
        const ambientLight = new THREE.AmbientLight(0x0a0a2a, 0.3);
        this.scene.add(ambientLight);

        // Memorial system glow (will be positioned when memorial is found)
        const memorialLight = new THREE.PointLight(0xFFD700, 3, 100);
        memorialLight.position.set(0, 0, 0);
        this.scene.add(memorialLight);

        // Directional light from "sun" - cold blue
        const sunLight = new THREE.DirectionalLight(0x4080ff, 0.5);
        sunLight.position.set(100, 50, 50);
        this.scene.add(sunLight);

        // Accent lights for sci-fi atmosphere
        const accentLight1 = new THREE.PointLight(0x00ffff, 1, 50);
        accentLight1.position.set(-30, 20, -30);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0xff0080, 0.8, 40);
        accentLight2.position.set(40, -20, 20);
        this.scene.add(accentLight2);
    }

    setupInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.canvas.addEventListener('click', (event) => this.handleClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        
        // Listen for mouse interactions to pause auto-rotation
        this.canvas.addEventListener('mousedown', () => this.onUserInteraction());
        this.canvas.addEventListener('wheel', () => this.onUserInteraction());
        this.canvas.addEventListener('touchstart', () => this.onUserInteraction());
        this.canvas.addEventListener('touchmove', () => this.onUserInteraction());
    }

    setupSpaceBackground() {
        // Create distant starfield with better distribution
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: false
        });

        const starsVertices = [];
        for (let i = 0; i < 5000; i++) {
            // Create spherical distribution for more realistic starfield
            const radius = 800 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const distantStars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(distantStars);
    }

    /**
     * Load and visualize all systems from the combined JSON data
     */
    async loadAllSystems(dataManager) {
        console.log('🌌 Loading complete OASIS stellar data...');
        
        try {
            // Load the complete systems database
            const vizData = await dataManager.loadVisualizationData();
            if (!vizData?.systems) {
                console.error('❌ No systems data available');
                return;
            }

            console.log(`📊 Loading ${vizData.systems.length} systems into lookup table...`);

            // Store all systems for lookup with case-insensitive mapping
            vizData.systems.forEach(system => {
                this.allSystems.set(system.name, system);
                this.systemNameMap.set(this.normalizeSystemName(system.name), system.name);
            });

            console.log(`✅ Systems loaded into lookup table. Total: ${this.allSystems.size}`);

            // Calculate scene center from average of all anchor point locations
            await this.calculateSceneCenterFromAnchors();

            // Load additional data sources
            const [sheetsData, specialData, customRoutesData] = await Promise.all([
                dataManager.loadSheetsData(),
                this.loadSpecialSystems(dataManager),
                dataManager.loadCustomRoutes()
            ]);

            // Process all systems with their roles and status
            await this.processAllSystems(vizData.systems, sheetsData, specialData, customRoutesData);
            
            console.log(`✅ Loaded ${vizData.systems.length} systems into OASIS visualization`);
            
        } catch (error) {
            console.error('❌ Failed to load OASIS systems:', error);
            // Ensure we have a fallback center even if there's an error
            this.useFallbackCenter();
        }
    }

    /**
     * Calculate scene center from average of all anchor point locations
     */
    async calculateSceneCenterFromAnchors() {
        try {
            console.log(`🔍 Systems in lookup table: ${this.allSystems.size}`);
            
            const response = await fetch('/api/anchor-systems');
            if (!response.ok) {
                console.warn('⚠️ Could not load anchor systems, using memorial system as fallback');
                this.useFallbackCenter();
                return;
            }
            
            const anchorSystems = await response.json();
            console.log(`📍 Calculating scene center from ${anchorSystems.length} anchor systems`);

            const validAnchors = [];
            
            // Find all anchor systems that exist in our main systems data
            for (const anchor of anchorSystems) {
                console.log(`🔍 Looking for anchor system: "${anchor.name}"`);
                const system = this.getSystem(anchor.name);
                if (system?.coords) {
                    validAnchors.push(system.coords);
                    console.log(`✅ Found anchor system: ${anchor.name} at`, system.coords);
                } else {
                    console.warn(`❌ Anchor system "${anchor.name}" not found in main systems data`);
                }
            }

            if (validAnchors.length === 0) {
                console.warn('⚠️ No valid anchor systems found, using memorial system as fallback');
                this.useFallbackCenter();
                return;
            }

            // Calculate average position
            const sum = validAnchors.reduce((acc, coords) => ({
                x: acc.x + coords.x,
                y: acc.y + coords.y,
                z: acc.z + coords.z
            }), { x: 0, y: 0, z: 0 });

            this.memorialCoords = {
                x: sum.x / validAnchors.length,
                y: sum.y / validAnchors.length,
                z: sum.z / validAnchors.length
            };

            console.log(`🎯 Scene center calculated from ${validAnchors.length} anchor systems:`, this.memorialCoords);
            
        } catch (error) {
            console.warn('⚠️ Error calculating scene center from anchors:', error);
            this.useFallbackCenter();
        }
    }

    /**
     * Use fallback center (memorial system or default)
     */
    useFallbackCenter() {
        const memorial = this.getSystem(this.memorialSystem);
        if (memorial?.coords) {
            this.memorialCoords = memorial.coords;
            console.log(`🏛️ Using memorial system as scene center:`, this.memorialCoords);
        } else {
            console.warn('⚠️ Memorial system not found, using default center');
            this.memorialCoords = { x: 470, y: -380, z: -1100 };
        }
    }

    /**
     * Process all systems and categorize them based on their role in the colonization
     */
    async processAllSystems(allSystems, sheetsData, specialData, customRoutesData) {
        // Create lookup maps for efficient categorization with case-insensitive keys
        const routeMap = new Map();
        const fcMap = new Map();
        const specialMap = new Map();
        const customRouteMap = new Map();

        // Build route system map
        if (sheetsData?.route) {
            sheetsData.route.forEach(system => {
                const normalized = this.normalizeSystemName(system.system_name);
                routeMap.set(normalized, system);
            });
        }

        // Build custom routes map
        if (customRoutesData) {
            Object.entries(customRoutesData).forEach(([routeName, routeSystems]) => {
                routeSystems.forEach(routeSystem => {
                    const normalized = this.normalizeSystemName(routeSystem.system_name);
                    customRouteMap.set(normalized, { ...routeSystem, routeName });
                });
            });
        }

        // Build fleet carrier map
        if (sheetsData?.fleetCarriers) {
            sheetsData.fleetCarriers.forEach(fc => {
                const normalized = this.normalizeSystemName(fc.location);
                fcMap.set(normalized, fc);
            });
        }

        // Build special systems map
        if (specialData) {
            specialData.forEach(special => {
                const normalized = this.normalizeSystemName(special.system_name || special.name);
                specialMap.set(normalized, special);
            });
        }

        // Separate systems for different processing
        const specialSystems = [];
        const routeSystems = [];
        const customRouteSystems = [];
        const populatedSystems = [];
        const unclaimedSystems = [];

        // Categorize all systems - prioritize populated over route completion
        for (const system of allSystems) {
            const normalized = this.normalizeSystemName(system.name);
            
            if (specialMap.has(normalized)) {
                specialSystems.push(system);
            } else if (system.information?.population > 0) {
                // Prioritize populated systems over route status
                populatedSystems.push(system);
            } else if (routeMap.has(normalized)) {
                routeSystems.push({ system, routeInfo: routeMap.get(normalized) });
            } else if (customRouteMap.has(normalized)) {
                customRouteSystems.push({ system, routeInfo: customRouteMap.get(normalized) });
            } else {
                unclaimedSystems.push(system);
            }
        }

        // Process each category
        await this.processSpecialSystems(specialSystems, specialData);
        await this.processRouteSystems(routeSystems);
        await this.processCustomRoutes(customRouteSystems);
        await this.processPopulatedSystems(populatedSystems);
        await this.processFleetCarriers(sheetsData);
        await this.processRegionLabels(); // Add region labels
        this.createUnclaimedStarsParticles(unclaimedSystems);

        console.log(`✅ Processed: ${specialSystems.length} special, ${routeSystems.length} route, ${customRouteSystems.length} custom route, ${populatedSystems.length} populated, ${unclaimedSystems.length} unclaimed`);
    }

    /**
     * Process special systems (key systems) and add region labels
     */
    async processSpecialSystems(specialSystems, specialData) {
        for (const system of specialSystems) {
            const specialInfo = specialData.find(s => 
                this.normalizeSystemName(s.system_name || s.name) === this.normalizeSystemName(system.name)
            );
            const coords = this.scaleCoordinatesForScene(system.coords);

            // Create key system with special effects - smaller size
            const geometry = new THREE.SphereGeometry(1.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFD700, // Gold (#FFD700) - matches legend
                transparent: true,
                opacity: 0.9
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(coords.x, coords.y, coords.z);
            sphere.userData.isPulsing = true;

            // Add glow effect - smaller
            const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.2
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);

            // Store system data
            this.systemData.set(sphere.id, {
                name: system.name,
                category: 'keySystem',
                coordinates: coords,
                originalCoordinates: system.coords,
                primaryStar: system.primaryStar,
                information: system.information,
                specialInfo: specialInfo
            });

            this.groups.keySystem.add(sphere);
            this.groups.keySystem.add(glow);
            this.interactiveObjects.push(sphere);
        }
    }

    /**
     * Process region labels from anchor systems CSV
     */
    async processRegionLabels() {
        try {
            const response = await fetch('/api/anchor-systems');
            if (!response.ok) {
                console.warn('Could not load anchor systems for region labels');
                return;
            }
            
            const anchorSystems = await response.json();
            console.log(`🏷️ Processing ${anchorSystems.length} anchor systems for region labels`);

            for (const anchor of anchorSystems) {
                // Skip systems without descriptions
                if (!anchor.description || !anchor.description.trim()) {
                    continue;
                }

                // Find this system in all systems using case-insensitive lookup
                const system = this.getSystem(anchor.name);
                if (!system?.coords) {
                    console.warn(`❌ Anchor system "${anchor.name}" not found in main systems data`);
                    continue;
                }

                const coords = this.scaleCoordinatesForScene(system.coords);
                console.log(`📍 Adding region label: "${anchor.description}" for system: ${anchor.name}`);
                
                const label = this.createRegionLabel(anchor.description, anchor.name);
                
                // Position label well above the system to avoid crowded star areas
                this.fcLabels.push({
                    element: label,
                    position: new THREE.Vector3(coords.x, coords.y + 15, coords.z),
                    type: 'region'
                });
            }
        } catch (error) {
            console.warn('Could not process region labels:', error);
        }
    }

    /**
     * Create HTML region label - just the region name
     */
    createRegionLabel(description, systemName) {
        const label = document.createElement('div');
        label.className = 'system-label region-label';
        
        // Use CSV description as the primary label text
        label.textContent = description;
        
        // Add custom blurbs for regions
        const regionBlurbs = this.getRegionBlurbs();
        const blurb = regionBlurbs[description] || `Region: ${description}\nAnchor System: ${systemName}`;
        label.title = blurb;
        
        // Store region data for click handling - use CSV description for lore lookups
        label.dataset.regionData = JSON.stringify({
            name: description,  // Use CSV description as name
            systemName: systemName,
            blurb: blurb,
            type: 'region'
        });
        
        // Add styles
        label.style.cssText = `
            position: absolute;
            background: rgba(255, 215, 0, 0.95);
            color: #000;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            border: 1px solid rgba(255, 215, 0, 0.8);
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
            pointer-events: all;
            z-index: 1000;
            white-space: nowrap;
            transform: translate(-50%, -50%);
        `;

        // Add click handler
        label.addEventListener('click', (event) => {
            event.stopPropagation();
            const regionData = JSON.parse(label.dataset.regionData);
            if (this.onSystemClick) {
                this.onSystemClick(regionData);
            }
        });

        document.body.appendChild(label);
        return label;
    }

    /**
     * Process route systems
     */
    async processRouteSystems(routeSystems) {
        // Sort systems by order for proper route line connection
        const sortedRouteSystems = [...routeSystems].sort((a, b) => {
            const orderA = parseInt(a.routeInfo['#']) || 0;
            const orderB = parseInt(b.routeInfo['#']) || 0;
            return orderA - orderB;
        });

        // Create route lines connecting all expedition systems
        if (sortedRouteSystems.length > 1) {
            this.createExpeditionRouteLines(sortedRouteSystems);
        }

        for (const { system, routeInfo } of routeSystems) {
            const coords = this.scaleCoordinatesForScene(system.coords);
            let color, category, isPulsing = false;

            // Determine status and appearance - colors match legend exactly
            if (routeInfo['completed?_'] === 'TRUE') {
                color = 0x00FF00; // Green (#00FF00) - matches legend
                category = 'routeCompleted';
            } else if (routeInfo['claimed?_'] === 'TRUE') {
                color = 0xFF8000; // Orange (#FF8000) - matches legend
                category = 'routeInProgress';
                isPulsing = true;
            } else {
                color = 0xFFFF00; // Yellow (#FFFF00) - matches legend
                category = 'routePlanned';
            }

            // Create neon-style system with glow effect
            const geometry = new THREE.SphereGeometry(0.8, 12, 12);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(coords.x, coords.y, coords.z);
            if (isPulsing) sphere.userData.isPulsing = true;

            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(2, 12, 12);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);

            // Store system data
            this.systemData.set(sphere.id, {
                name: system.name,
                category: category,
                coordinates: coords,
                originalCoordinates: system.coords,
                primaryStar: system.primaryStar,
                information: system.information,
                routeInfo: routeInfo
            });

            this.groups[category].add(sphere);
            this.groups[category].add(glow);
            this.interactiveObjects.push(sphere);
        }
    }

    /**
     * Process custom route systems with route line visualization
     */
    async processCustomRoutes(customRouteSystems) {
        if (customRouteSystems.length === 0) return;

        // Group systems by route name
        const routeGroups = {};
        customRouteSystems.forEach(({ system, routeInfo }) => {
            if (!routeGroups[routeInfo.routeName]) {
                routeGroups[routeInfo.routeName] = [];
            }
            routeGroups[routeInfo.routeName].push({ system, routeInfo });
        });

        console.log(`📍 Processing ${customRouteSystems.length} custom route systems in ${Object.keys(routeGroups).length} routes`);

        // Process each route
        Object.entries(routeGroups).forEach(([routeName, routeSystems]) => {
            // Sort systems by ID for proper route order
            routeSystems.sort((a, b) => {
                const idA = parseInt(a.routeInfo.id) || 0;
                const idB = parseInt(b.routeInfo.id) || 0;
                return idA - idB;
            });

            // Create route line
            this.createRouteLines(routeSystems, routeName);

            // Create system markers
            routeSystems.forEach(({ system, routeInfo }) => {
                const coords = this.scaleCoordinatesForScene(system.coords);
                let color, opacity;

                // Color based on status - match legend exactly
                switch (routeInfo.status?.toUpperCase()) {
                    case 'DONE':
                        color = 0x00FF00; // Green (#00FF00) - matches legend
                        opacity = 1.0;
                        break;
                    case 'IN PROGRESS':
                        color = 0xFF8000; // Orange (#FF8000) - matches legend
                        opacity = 0.8;
                        break;
                    default:
                        color = 0xFFFF00; // Yellow (#FFFF00) - matches legend
                        opacity = 0.6;
                        break;
                }

                // Create custom route system sphere with glow
                const geometry = new THREE.SphereGeometry(1.2, 12, 12);
                const material = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: opacity
                });

                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(coords.x, coords.y, coords.z);

                // Add glow effect
                const glowGeometry = new THREE.SphereGeometry(2.8, 12, 12);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.copy(sphere.position);
                
                // Store system data for interaction - treat as planned route
                sphere.userData = {
                    name: system.name,
                    category: 'routePlanned',
                    coordinates: coords,
                    originalCoordinates: system.coords,
                    primaryStar: system.primaryStar,
                    information: system.information,
                    routeInfo: {
                        'claimed?_': 'FALSE',
                        'completed?_': routeInfo.status?.toUpperCase() === 'DONE' ? 'TRUE' : 'FALSE',
                        'architect?_': '',
                        'assigned_fc': '',
                        system_name: system.name,
                        // Custom route specific info
                        customRoute: true,
                        routeName: routeInfo.routeName,
                        routeStatus: routeInfo.status,
                        routeId: routeInfo.id
                    }
                };

                // Add to planned routes group instead of custom routes
                this.groups.routePlanned.add(sphere);
                this.groups.routePlanned.add(glow);
                this.interactiveObjects.push(sphere);
                this.systemData.set(sphere.id, sphere.userData);
            });

            console.log(`✅ Created custom route "${routeName}" with ${routeSystems.length} systems`);
        });
    }

    /**
     * Create expedition route lines connecting main route systems in order
     */
    createExpeditionRouteLines(routeSystems) {
        if (routeSystems.length < 2) return;

        const points = routeSystems.map(({ system }) => {
            const coords = this.scaleCoordinatesForScene(system.coords);
            return new THREE.Vector3(coords.x, coords.y, coords.z);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xFFFF00, // Yellow (#FFFF00) - matches legend
            opacity: 0.7,
            transparent: true,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);
        line.userData = {
            type: 'expeditionRouteLine',
            routeName: 'Main Expedition Route'
        };

        this.groups.routePlanned.add(line);
        console.log(`📍 Created expedition route line connecting ${points.length} systems`);
    }

    /**
     * Create route lines connecting systems in order
     */
    createRouteLines(routeSystems, routeName) {
        if (routeSystems.length < 2) return;

        const points = routeSystems.map(({ system }) => {
            const coords = this.scaleCoordinatesForScene(system.coords);
            return new THREE.Vector3(coords.x, coords.y, coords.z);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xFFFF00, // Yellow (#FFFF00) - matches legend
            opacity: 0.7,
            transparent: true,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);
        line.userData = {
            type: 'routeLine',
            routeName: routeName
        };

        this.groups.routePlanned.add(line);
        console.log(`📍 Created yellow route line for "${routeName}" connecting ${points.length} systems`);
    }

    /**
     * Process populated systems - now purple
     */
    async processPopulatedSystems(populatedSystems) {
        for (const system of populatedSystems) {
            const coords = this.scaleCoordinatesForScene(system.coords);
            const size = 0.5 + Math.min(Math.log10(system.information.population) / 10, 1.5);

            const geometry = new THREE.SphereGeometry(size, 10, 10);
            const material = new THREE.MeshBasicMaterial({
                color: 0x8000FF, // Purple (#8000FF) - matches legend
                transparent: true,
                opacity: 0.8
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(coords.x, coords.y, coords.z);

            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(size + 1, 10, 10);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x8000FF,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);

            // Store system data
            this.systemData.set(sphere.id, {
                name: system.name,
                category: 'populated',
                coordinates: coords,
                originalCoordinates: system.coords,
                primaryStar: system.primaryStar,
                information: system.information
            });

            this.groups.populated.add(sphere);
            this.groups.populated.add(glow);
            this.interactiveObjects.push(sphere);
        }
    }

    /**
     * Process fleet carriers with dynamic HTML labels
     */
    async processFleetCarriers(sheetsData) {
        if (!sheetsData?.fleetCarriers) return;

        for (const fc of sheetsData.fleetCarriers) {
            const system = this.getSystem(fc.location);
            if (!system?.coords) {
                console.warn(`❌ Fleet carrier location "${fc.location}" not found`);
                continue;
            }

            const coords = this.scaleCoordinatesForScene(system.coords);
            coords.y += 2; // Offset above system

            // Create FC octahedron with glow effect
            const geometry = new THREE.OctahedronGeometry(1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00FFFF, // Cyan (#00FFFF) - matches legend
                transparent: true,
                opacity: 0.9
            });

            const fc3d = new THREE.Mesh(geometry, material);
            fc3d.position.set(coords.x, coords.y, coords.z);
            fc3d.userData.isRotating = true;

            // Add glow effect
            const glowGeometry = new THREE.OctahedronGeometry(2.5);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.2
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(fc3d.position);
            glow.userData.isRotating = true;

            // Create HTML text label for better visibility
            const label = this.createFCLabel(fc);

            // Store FC data
            this.systemData.set(fc3d.id, {
                name: fc.name,
                callsign: fc.callsign,
                owner: fc.owner_,
                status: fc.status,
                location: fc.location,
                type: 'fleetCarrier',
                coordinates: coords,
                originalCoordinates: system.coords
            });

            this.groups.fleetCarriers.add(fc3d);
            this.groups.fleetCarriers.add(glow);
            this.interactiveObjects.push(fc3d);
            
            // Store label for screen-space updates
            this.fcLabels.push({
                element: label,
                position: new THREE.Vector3(coords.x, coords.y + 5, coords.z), // Higher above FC
                type: 'fc'
            });
        }
    }

    /**
     * Create HTML FC label for better visibility
     */
    createFCLabel(fc) {
        const label = document.createElement('div');
        label.className = 'system-label fc-label';
        label.textContent = fc.callsign; // Just the short callsign
        label.title = `Fleet Carrier: ${fc.name}\nOwner: ${fc.owner_}\nStatus: ${fc.status}\nLocation: ${fc.location}`;
        
        // Make clickable and add FC data
        label.dataset.fcData = JSON.stringify({
            name: fc.name,
            callsign: fc.callsign,
            owner: fc.owner_,
            status: fc.status,
            location: fc.location,
            type: 'fleetCarrier'
        });
        
        // Compact, ergonomic styling
        label.style.cssText = `
            position: absolute;
            background: rgba(0, 255, 255, 0.95);
            color: #000;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            border: 1px solid rgba(0, 255, 255, 0.8);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            pointer-events: all;
            z-index: 1000;
            white-space: nowrap;
            transform: translate(-50%, -50%);
            min-width: 30px;
            line-height: 1.2;
        `;

        // Add click handler
        label.addEventListener('click', (event) => {
            event.stopPropagation();
            const fcData = JSON.parse(label.dataset.fcData);
            if (this.onSystemClick) {
                this.onSystemClick(fcData);
            }
        });

        document.body.appendChild(label);
        return label;
    }

    /**
     * Create smooth particle system for unclaimed stars
     */
    createUnclaimedStarsParticles(unclaimedSystems) {
        const positions = [];
        const colors = [];
        const sizes = [];

        for (const system of unclaimedSystems) {
            const coords = this.scaleCoordinatesForScene(system.coords);
            positions.push(coords.x, coords.y, coords.z);

            // Color by star type with softer tones
            const starColor = this.getStarTypeColor(system.primaryStar?.type);
            const color = new THREE.Color(starColor);
            // Reduce intensity for easier viewing
            color.multiplyScalar(0.7);
            colors.push(color.r, color.g, color.b);

            // Smaller, more consistent sizes
            sizes.push(0.3 + Math.random() * 0.2);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        // Smoother particle material
        const material = new THREE.PointsMaterial({
            size: 0.8,
            transparent: true,
            opacity: 0.6, // Reduced opacity for easier viewing
            vertexColors: true,
            sizeAttenuation: true,
            alphaTest: 0.1 // Helps with rendering performance
        });

        const particles = new THREE.Points(geometry, material);
        this.groups.unclaimedStars.add(particles);

        console.log(`✨ Created smooth particle system with ${unclaimedSystems.length} unclaimed stars`);
    }

    /**
     * Get color for star type
     */
    getStarTypeColor(starType) {
        if (!starType) return 0xffffff;
        
        const type = starType.toLowerCase();
        if (type.includes('o') || type.includes('blue')) return 0x9bb0ff;
        if (type.includes('b') || type.includes('blue-white')) return 0xaabfff;
        if (type.includes('a') || type.includes('white')) return 0xcad7ff;
        if (type.includes('f') || type.includes('yellow-white')) return 0xf8f7ff;
        if (type.includes('g') || type.includes('yellow')) return 0xfff4ea;
        if (type.includes('k') || type.includes('orange')) return 0xffd2a1;
        if (type.includes('m') || type.includes('red')) return 0xffad51;
        if (type.includes('t tauri')) return 0xff6b6b;
        
        return 0xffffff; // Default white
    }

    /**
     * Scale Elite Dangerous coordinates for Three.js scene
     */
    scaleCoordinatesForScene(coords) {
        if (!this.memorialCoords) {
            console.warn('⚠️ Memorial coordinates not set, using default');
            this.memorialCoords = { x: 470, y: -380, z: -1100 };
        }

        const SCALE_FACTOR = 0.2;

        return {
            x: (coords.x - this.memorialCoords.x) * SCALE_FACTOR,
            y: (coords.y - this.memorialCoords.y) * SCALE_FACTOR,
            z: (coords.z - this.memorialCoords.z) * SCALE_FACTOR
        };
    }

    /**
     * Load special systems from CSV
     */
    async loadSpecialSystems(dataManager) {
        try {
            const response = await fetch('/api/special-systems');
            if (!response.ok) return [];
            
            const csvText = await response.text();
            return dataManager.parseCSV(csvText);
        } catch (error) {
            console.warn('⚠️ Could not load special systems:', error);
            return [];
        }
    }

    // Event handlers and utility methods...
    handleClick(event) {
        console.log('🖱️ Canvas clicked');
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);
        
        console.log('🎯 Intersections found:', intersects.length);
        console.log('📊 Interactive objects count:', this.interactiveObjects.length);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const systemData = this.systemData.get(object.id);
            
            console.log('🔍 System data retrieved:', systemData);
            console.log('🔗 onSystemClick callback exists:', !!this.onSystemClick);
            
            if (systemData && this.onSystemClick) {
                // Prevent event bubbling to avoid immediate close
                event.stopPropagation();
                this.onSystemClick(systemData);
            }
        }
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);
        
        this.canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
        
        // Just update cursor, no hover callbacks needed
    }

    toggleFilter(filterType, enabled) {
        const group = this.groups[filterType];
        if (group) {
            group.visible = enabled;
        }
        
        // Handle label visibility
        if (filterType === 'fleetCarriers') {
            this.labelVisibility.fleetCarriers = enabled;
        } else if (filterType === 'regionLabels') {
            this.labelVisibility.regionLabels = enabled;
        }
    }

    clearScene() {
        Object.values(this.groups).forEach(group => {
            group.clear();
        });
        
        // Clean up HTML labels
        this.fcLabels.forEach(labelInfo => {
            if (labelInfo.element && labelInfo.element.parentNode) {
                labelInfo.element.parentNode.removeChild(labelInfo.element);
            }
        });
        
        this.interactiveObjects.length = 0;
        this.systemData.clear();
        this.allSystems.clear();
        this.systemNameMap.clear();
        this.fcLabels.length = 0;
    }

    /**
     * Handle user interaction - pause auto-rotation
     */
    onUserInteraction() {
        this.lastInteraction = Date.now();
        this.controls.autoRotate = false;
        console.log('🚫 Auto-rotation paused due to user interaction');
    }

    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            this.time += 0.01;
            
            // Check if we should resume auto-rotation
            const timeSinceInteraction = Date.now() - this.lastInteraction;
            if (!this.controls.autoRotate && timeSinceInteraction > this.interactionTimeout) {
                this.controls.autoRotate = true;
                console.log('🔄 Auto-rotation resumed after', timeSinceInteraction, 'ms of inactivity');
            }
            
            this.controls.update();
            
            // Update FC and region labels to face camera
            this.updateLabels();
            
            // Animate objects
            this.scene.traverse((object) => {
                if (object.userData.isPulsing) {
                    const scale = 1 + Math.sin(this.time * 4) * 0.3;
                    object.scale.setScalar(scale);
                }
                
                if (object.userData.isRotating) {
                    object.rotation.x += 0.01;
                    object.rotation.y += 0.02;
                    object.rotation.z += 0.005;
                }
            });
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }

    /**
     * Update HTML labels with smart collision avoidance
     */
    updateLabels() {
        // First pass: calculate base positions
        const labelPositions = [];
        
        for (let i = 0; i < this.fcLabels.length; i++) {
            const labelInfo = this.fcLabels[i];
            const { element, position, type } = labelInfo;
            
            // Check label visibility based on filter settings
            let shouldShow = true;
            if (type === 'fc' && !this.labelVisibility.fleetCarriers) {
                shouldShow = false;
            } else if (type === 'region' && !this.labelVisibility.regionLabels) {
                shouldShow = false;
            }
            
            if (!shouldShow) {
                element.style.display = 'none';
                continue;
            }
            
            // Project 3D position to screen coordinates
            const screenPosition = position.clone().project(this.camera);
            
            // Check if behind camera
            if (screenPosition.z > 1) {
                element.style.display = 'none';
                continue;
            }
            
            // Convert to screen coordinates
            let x = (screenPosition.x * 0.5 + 0.5) * this.canvas.clientWidth;
            let y = ((-screenPosition.y * 0.5 + 0.5) * this.canvas.clientHeight);
            
            labelPositions.push({
                index: i,
                element,
                originalX: x,
                originalY: y,
                x: x,
                y: y,
                type: type,
                distance: position.distanceTo(this.camera.position)
            });
        }
        
        // Second pass: resolve collisions for FC labels using ergonomic spacing
        this.resolveCollisions(labelPositions);
        
        // Third pass: apply final positions
        for (const labelPos of labelPositions) {
            const { element, x, y, type, distance } = labelPos;
            
            element.style.display = 'block';
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            element.style.transform = 'translate(-50%, -50%)';
            
            // Distance-based opacity for FC labels
            if (type === 'fc') {
                const opacity = Math.max(0.8, Math.min(1, 1 - (distance - 20) / 100));
                element.style.opacity = opacity;
            }
        }
    }
    
    /**
     * Resolve label collisions using human-centered design principles
     */
    resolveCollisions(labelPositions) {
        const fcLabels = labelPositions.filter(l => l.type === 'fc');
        const COLLISION_DISTANCE = 50; // Minimum distance between FC labels
        const MAX_ITERATIONS = 10;
        
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            let hadCollision = false;
            
            for (let i = 0; i < fcLabels.length; i++) {
                for (let j = i + 1; j < fcLabels.length; j++) {
                    const label1 = fcLabels[i];
                    const label2 = fcLabels[j];
                    
                    const dx = label1.x - label2.x;
                    const dy = label1.y - label2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < COLLISION_DISTANCE && distance > 0) {
                        hadCollision = true;
                        
                        // Calculate separation vector
                        const separationDistance = (COLLISION_DISTANCE - distance) * 0.5;
                        const separationX = (dx / distance) * separationDistance;
                        const separationY = (dy / distance) * separationDistance;
                        
                        // Move labels apart in a natural, readable pattern
                        // Prefer horizontal separation for better readability
                        const horizontalBias = 1.5;
                        label1.x += separationX * horizontalBias;
                        label1.y += separationY;
                        label2.x -= separationX * horizontalBias;
                        label2.y -= separationY;
                        
                        // Keep labels within screen bounds
                        label1.x = Math.max(30, Math.min(this.canvas.clientWidth - 30, label1.x));
                        label1.y = Math.max(20, Math.min(this.canvas.clientHeight - 20, label1.y));
                        label2.x = Math.max(30, Math.min(this.canvas.clientWidth - 30, label2.x));
                        label2.y = Math.max(20, Math.min(this.canvas.clientHeight - 20, label2.y));
                    }
                }
            }
            
            if (!hadCollision) break;
        }
    }

    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.renderer.dispose();
        this.controls.dispose();
    }
} 