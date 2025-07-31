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

 * - Special system visualization from CSV data
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
        
        // Scene center coordinates (calculated from all systems)
        this.sceneCenter = null;
        
        // Object groups for different system types
        this.groups = {
            // Special systems
            keySystem: new THREE.Group(),         // Gold - Key system only
            
            // Population systems
            populated: new THREE.Group(),         // Purple - Has population/economy
        };
        
        // Interactive objects and data storage
        this.interactiveObjects = [];
        this.systemData = new Map();
        this.allSystems = new Map(); // All systems from JSON by name (normalized keys)
        this.systemNameMap = new Map(); // Case-insensitive lookup: normalized -> original
        
        // Label management
        this.systemLabels = []; // System HTML labels
        this.labelVisibility = {
            regionLabels: false  // Off by default
        };
        

        
        // Population scaling not applicable to particle systems
        
        // Animation properties
        this.animationId = null;
        this.time = 0;
        
        // Distance-based opacity fading from center for smooth transitions
        this.fadeDistances = {
            keySystem: { start: 100, end: 200 },    // Start fading at 100, fully transparent at 200
            populated: { start: 80, end: 150 },     // Start fading at 80, fully transparent at 150
            regionLabels: { start: 150, end: 300 }  // Start fading at 150, fully transparent at 300
        };
        this.fadingStats = {
            totalObjects: 0,
            visibleObjects: 0,
            lastLogTime: 0
        };
        
        // Auto-rotation disabled
        
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

        // Add coordinate grid helpers for debugging
        this.addCoordinateHelpers();
        
        // Set initial visibility - all systems visible by default with distance culling
        Object.values(this.groups).forEach(group => {
            group.visible = true;
        });
        
        console.log('🎯 All system groups visible by default with distance-based culling enabled');
        
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
            "Witch Head Nebula": "A reflection nebula illuminated by the bright star Rigel. Its ethereal blue glow makes it one of the most photographed regions in the cluster.",
            "'Goid WH": "The 75 LY bubble area around this system has been identified by the Anti Xeno Initiative to contain Thargoid NHSS (Non Human Signal Sources). You can find and hunt Thargoids here."
        };
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000005); // Deep space blue-black
        this.scene.fog = new THREE.Fog(0x000005, 100, 800);
    }

    setupCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
        this.camera.position.set(50, 30, 80); // Closer view centered on anchor system
        this.camera.lookAt(0, 0, 0); // Look at center (anchor system will be at 0,0,0 after scaling)
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
        this.controls.minDistance = 10;
        this.controls.maxDistance = 2000;  // Adjusted for 0.1 scale factor
        this.controls.maxPolarAngle = Math.PI;
        
        // Auto-rotation disabled
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0; // Disabled
        console.log('🚫 Auto-rotation disabled');
        
        // Listen for user interactions
        this.controls.addEventListener('start', () => {
            console.log('🎮 OrbitControls interaction started');
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

        // Scene center lighting
        const centerLight = new THREE.PointLight(0xFFD700, 3, 100);
        centerLight.position.set(0, 0, 0);
        this.scene.add(centerLight);

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
        
        // Listen for mouse interactions
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
                const systemName = system.name || system.Name; // Handle both cases
                if (systemName) {
                    this.allSystems.set(systemName, system);
                    this.systemNameMap.set(this.normalizeSystemName(systemName), systemName);
                }
            });

            console.log(`✅ Systems loaded into lookup table. Total: ${this.allSystems.size}`);

            // Calculate scene center from all loaded systems
            this.calculateSceneCenterFromSystems(vizData.systems);

            // Load additional data sources
            const [sheetsData, specialData, anchorData] = await Promise.all([
                dataManager.loadSheetsData(),
                this.loadSpecialSystems(dataManager),
                this.loadAnchorSystems(dataManager)
            ]);

            // Process all systems with their roles and status
            await this.processAllSystems(vizData.systems, sheetsData, specialData);
            
            console.log(`✅ Loaded ${vizData.systems.length} systems into OASIS visualization`);
            
        } catch (error) {
            console.error('❌ Failed to load OASIS systems:', error);
        }
    }

    /**
     * Set scene center around the specified anchor system
     */
    calculateSceneCenterFromSystems(systems) {
        // Find the anchor system to center around
        const anchorSystemName = '2MASS J05403931-0226460';
        const anchorSystem = systems.find(s => (s.name || s.Name) === anchorSystemName);
        
        if (anchorSystem) {
            this.sceneCenter = { 
                x: anchorSystem.x || anchorSystem.X || 0, 
                y: anchorSystem.y || anchorSystem.Y || 0, 
                z: anchorSystem.z || anchorSystem.Z || 0 
            };
            console.log(`🎯 Scene centered on ${anchorSystemName} at coordinates:`, this.sceneCenter);
        } else {
            // Fallback to origin if anchor system not found
            this.sceneCenter = { x: 0, y: 0, z: 0 };
            console.log(`⚠️ Anchor system ${anchorSystemName} not found, centering on origin`);
        }
        
        if (systems && systems.length > 0) {
            console.log(`📊 Loaded ${systems.length} systems for visualization`);
            // Log coordinate ranges for debugging
            const xCoords = systems.map(s => (s.x || s.X || 0));
            const yCoords = systems.map(s => (s.y || s.Y || 0)); 
            const zCoords = systems.map(s => (s.z || s.Z || 0));
            console.log(`📊 Coordinate ranges: X(${Math.min(...xCoords).toFixed(0)} to ${Math.max(...xCoords).toFixed(0)}), Y(${Math.min(...yCoords).toFixed(0)} to ${Math.max(...yCoords).toFixed(0)}), Z(${Math.min(...zCoords).toFixed(0)} to ${Math.max(...zCoords).toFixed(0)})`);
        }
    }

    /**
     * Process all systems and categorize them based on their role in the colonization
     */
    async processAllSystems(allSystems, sheetsData, specialData) {
        // Create lookup maps for efficient categorization with case-insensitive keys
        const specialMap = new Map();



        // Build special systems map
        if (specialData) {
            specialData.forEach(special => {
                const normalized = this.normalizeSystemName(special.name || special.system_name);
                specialMap.set(normalized, special);
            });
        }

        // Separate systems for different processing
        const specialSystems = [];
        const populatedSystems = [];

        // Categorize all systems (no background stars - only special and populated)
        for (const system of allSystems) {
            const systemName = system.name || system.Name;
            const normalized = this.normalizeSystemName(systemName);
            
            if (specialMap.has(normalized)) {
                specialSystems.push(system);
            } else if ((system.population && system.population > 0) || 
                      (system.Population && system.Population > 0)) {
                populatedSystems.push(system);
            }
            // Skip unclaimed systems - not displayed for clean visualization
        }

        console.log(`📊 Processing ${specialSystems.length} special systems and ${populatedSystems.length} populated systems`);
        console.log(`📊 Skipping ${allSystems.length - specialSystems.length - populatedSystems.length} background systems for clean visualization`);

        // Process each category
        await this.processSpecialSystems(specialSystems, specialData);
        await this.processPopulatedSystems(populatedSystems);

        console.log(`✅ Visualization complete: ${specialSystems.length} special + ${populatedSystems.length} populated systems displayed`);
    }

    /**
     * Process special systems (key systems) and add region labels
     */
    async processSpecialSystems(specialSystems, specialData) {
        for (const system of specialSystems) {
            const systemName = system.name || system.Name;
            const specialInfo = specialData.find(s => 
                this.normalizeSystemName(s.name || s.system_name) === this.normalizeSystemName(systemName)
            );
            const coords = this.scaleCoordinatesForScene({
                x: system.x || system.X, 
                y: system.y || system.Y, 
                z: system.z || system.Z
            });

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
            
            // Debug sphere positioning
            console.log(`🔍 Positioning sphere for ${system.name}:`, 
                `Raw: (${system.x}, ${system.y}, ${system.z})`,
                `Scene: (${coords.x.toFixed(2)}, ${coords.y.toFixed(2)}, ${coords.z.toFixed(2)})`);
            

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
                name: systemName,
                category: 'keySystem',
                coordinates: coords,
                originalCoordinates: {
                    x: system.x || system.X, 
                    y: system.y || system.Y, 
                    z: system.z || system.Z
                },
                primaryStar: system.primaryStar || {},
                information: {population: system.population || system.Population} || {},
                specialInfo: specialInfo
            });

            this.groups.keySystem.add(sphere);
            this.groups.keySystem.add(glow);
            this.interactiveObjects.push(sphere);
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
        const blurb = regionBlurbs[description] || `Region: ${description}`;
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
            
            // Show system info
            if (this.onSystemClick) {
                this.onSystemClick(regionData);
            }
            
            // Smoothly transition to the clicked system
            if (regionData.systemName) {
                console.log(`🎯 Label clicked: smoothly transitioning to ${regionData.systemName}`);
                this.smoothTransitionToSystem(regionData.systemName);
            }
        });

        document.body.appendChild(label);
        return label;
    }





    /**
     * Process populated systems - now purple
     */
    async processPopulatedSystems(populatedSystems) {
        console.log(`✨ Creating particle system for ${populatedSystems.length} populated systems`);
        
        // Calculate population range for size scaling
        let minPop = Infinity;
        let maxPop = 0;
        
        for (const system of populatedSystems) {
            const pop = system.population || system.Population || 1;
            minPop = Math.min(minPop, pop);
            maxPop = Math.max(maxPop, pop);
        }
        
        const minLogPop = Math.log10(minPop);
        const maxLogPop = Math.log10(maxPop);
        
        console.log(`📊 Population range: ${minPop.toLocaleString()} - ${maxPop.toLocaleString()}`);

        // Prepare particle data
        const positions = [];
        const colors = [];
        const sizes = [];
        const populationData = []; // Store for interaction

        for (const system of populatedSystems) {
            const coords = this.scaleCoordinatesForScene({
                x: system.x || system.X, 
                y: system.y || system.Y, 
                z: system.z || system.Z
            });
            const systemName = system.name || system.Name;
            const population = system.population || system.Population || 1;
            
            // Add position
            positions.push(coords.x, coords.y, coords.z);
            
            // Purple color for populated systems
            const purpleColor = new THREE.Color(0x8000FF);
            colors.push(purpleColor.r, purpleColor.g, purpleColor.b);
            
            // Calculate size based on population (logarithmic scaling)
            const logPop = Math.log10(population);
            let normalizedLogPop = (logPop - minLogPop) / (maxLogPop - minLogPop);
            normalizedLogPop = Math.pow(normalizedLogPop, 1.2); // Slight curve for visibility
            
            // Size range for particles (optimized for performance)
            const minSize = 3.0;
            const maxSize = 12.0;
            const particleSize = minSize + (normalizedLogPop * (maxSize - minSize));
            sizes.push(particleSize);
            
            // Store system data for potential interaction
            populationData.push({
                name: systemName,
                position: new THREE.Vector3(coords.x, coords.y, coords.z),
                population: population,
                originalCoordinates: {
                    x: system.x || system.X, 
                    y: system.y || system.Y, 
                    z: system.z || system.Z
                },
                primaryStar: system.primaryStar,
                information: system.information || {population: population}
            });
        }

        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        // Create particle material with better visual properties
        const material = new THREE.PointsMaterial({
            size: 6.0,
            transparent: true,
            opacity: 0.9,
            vertexColors: true,
            sizeAttenuation: true,
            alphaTest: 0.1,
            blending: THREE.AdditiveBlending  // Nice glow effect
        });

        // Create particle system
        const particles = new THREE.Points(geometry, material);
        particles.userData.isPopulatedParticles = true;
        particles.userData.populationData = populationData; // Store for interaction
        
        this.groups.populated.add(particles);
        
        console.log(`✅ Created high-performance particle system: ${populatedSystems.length} populated systems`);
        console.log(`🚀 Performance boost: ${populatedSystems.length * 2} individual spheres → 1 particle system`);
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
     * Map Elite Dangerous coordinates to Three.js centered around anchor system
     * Top-down view with mirroring fix:
     * ED X (galactic east/west) → Three.js X (screen left/right, INVERTED to fix mirroring)
     * ED Y (galactic up/down) → Three.js Y (screen up/down) 
     * ED Z (galactic north/south) → Three.js Z (forward/back depth)
     */
    scaleCoordinatesForScene(coords) {
        // Scale factor for visualization
        const SCALE_FACTOR = 0.1;
        
        // Center coordinates relative to scene center (anchor system)
        const centeredX = coords.x - this.sceneCenter.x;
        const centeredY = coords.y - this.sceneCenter.y;
        const centeredZ = coords.z - this.sceneCenter.z;
        
        // Add small random offset to spread out systems that share coordinates
        // This helps visualize clustered systems that would otherwise overlap
        const jitter = 0.5; // Small offset range
        const randomOffset = {
            x: (Math.random() - 0.5) * jitter,
            y: (Math.random() - 0.5) * jitter,
            z: (Math.random() - 0.5) * jitter
        };

        // Apply coordinate mapping for top-down view with mirroring fix
        return {
            x: -centeredX * SCALE_FACTOR + randomOffset.x,       // ED X → Screen left/right (INVERTED to fix mirroring)
            y: centeredY * SCALE_FACTOR + randomOffset.y,        // ED Y → Screen up/down (original top-down view)
            z: centeredZ * SCALE_FACTOR + randomOffset.z         // ED Z → Screen depth (original mapping)
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

    /**
     * Load anchor systems from vis_anchor_systems.csv and create labels
     */
    async loadAnchorSystems(dataManager) {
        try {
            console.log('📍 Loading anchor systems for labels...');
            const response = await fetch('/data/vis_anchor_systems.csv');
            if (!response.ok) {
                console.warn('⚠️ Could not load vis_anchor_systems.csv');
                return [];
            }
            
            const csvText = await response.text();
            const anchorSystems = dataManager.parseCSV(csvText);
            console.log(`📍 Found ${anchorSystems.length} anchor systems:`, anchorSystems);
            
            // Create labels for each anchor system
            for (const anchorSystem of anchorSystems) {
                const systemName = anchorSystem.name;
                const label = anchorSystem.label || anchorSystem.description;
                
                console.log(`📍 Looking for system: ${systemName} to add label: ${label}`);
                
                // Look up the system in our loaded data
                const system = this.allSystems.get(systemName);
                if (system) {
                    console.log(`✅ Found system ${systemName} with coordinates:`, {x: system.x || system.X, y: system.y || system.Y, z: system.z || system.Z});
                    
                    // Get coordinates (handle both uppercase and lowercase)
                    const coords = this.scaleCoordinatesForScene({
                        x: system.x || system.X || 0,
                        y: system.y || system.Y || 0,
                        z: system.z || system.Z || 0
                    });
                    
                    // Create a region label for this system
                    const position = new THREE.Vector3(coords.x, coords.y + 5, coords.z); // Offset above the system
                    const labelElement = this.createRegionLabel(label, systemName);
                    
                    this.systemLabels.push({
                        element: labelElement,
                        position: position,
                        type: 'region'
                    });
                    
                    console.log(`🏷️ Created label "${label}" for system ${systemName} at position:`, position);
                } else {
                    console.warn(`⚠️ System "${systemName}" not found in loaded data`);
                    // Log available system names for debugging
                    const availableNames = Array.from(this.allSystems.keys()).slice(0, 5);
                    console.log(`📊 First 5 available system names:`, availableNames);
                }
            }
            
            return anchorSystems;
        } catch (error) {
            console.error('❌ Failed to load anchor systems:', error);
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
        if (filterType === 'regionLabels') {
            this.labelVisibility.regionLabels = enabled;
        }
    }
    
    /**
     * Get system data by name
     */
    getSystemByName(systemName) {
        // Search through all interactive objects for the system
        for (const object of this.interactiveObjects) {
            const data = this.systemData.get(object.id);
            if (data && data.name === systemName) {
                return data;
            }
        }
        return null;
    }

    /**
     * Focus camera on a specific system
     */
    focusOnSystem(systemData) {
        if (!systemData || !systemData.coordinates) return;

        const targetPosition = new THREE.Vector3(
            systemData.coordinates.x,
            systemData.coordinates.y,
            systemData.coordinates.z
        );

        // Calculate a good camera position (offset from the target)
        const offset = new THREE.Vector3(20, 20, 20);
        const cameraPosition = targetPosition.clone().add(offset);

        // Smoothly animate camera to the new position
        this.controls.target.copy(targetPosition);
        this.camera.position.copy(cameraPosition);
        this.controls.update();

        console.log(`🎯 Camera focused on ${systemData.name} at ${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}`);
    }

    /**
     * Recenter the scene around a specific system
     * @param {string} systemName - Name of the system to center on
     */
    async recenterScene(systemName) {
        console.log(`🎯 Recentering scene on system: ${systemName}`);
        
        // Find the system in our data
        const system = this.getSystem(systemName);
        if (!system) {
            console.warn(`⚠️ System "${systemName}" not found for recentering`);
            return;
        }
        
        // Update scene center to the new system's coordinates
        this.sceneCenter = {
            x: system.x || system.X || 0,
            y: system.y || system.Y || 0,
            z: system.z || system.Z || 0
        };
        
        console.log(`🎯 New scene center:`, this.sceneCenter);
        
        // Clear and reload all systems with new center
        this.clearScene();
        
        // Reload all systems - this will use the new scene center
        const dataManager = window.app?.dataManager;
        if (dataManager) {
            await this.loadAllSystems(dataManager);
        }
        
        // Reset camera to look at new center
        this.camera.position.set(50, 30, 80);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        console.log(`✅ Scene successfully recentered on ${systemName}`);
    }

    /**
     * Smoothly transition camera and orbit center to a specific system
     * @param {string} systemName - Name of the system to center on
     */
    async smoothTransitionToSystem(systemName) {
        console.log(`🎯 Starting smooth transition to system: ${systemName}`);
        
        // Find the system in our data
        const system = this.getSystem(systemName);
        if (!system) {
            console.warn(`⚠️ System "${systemName}" not found for transition`);
            return;
        }
        
        // Calculate the new system's position in current coordinate system
        const newSystemCoords = this.scaleCoordinatesForScene({
            x: system.x || system.X || 0,
            y: system.y || system.Y || 0,
            z: system.z || system.Z || 0
        });
        
        // Store starting positions
        const startCameraPos = this.camera.position.clone();
        const startTargetPos = this.controls.target.clone();
        const newTargetPos = new THREE.Vector3(newSystemCoords.x, newSystemCoords.y, newSystemCoords.z);
        
        // Calculate new camera position (maintain relative offset from new target)
        const cameraOffset = startCameraPos.clone().sub(startTargetPos);
        const newCameraPos = newTargetPos.clone().add(cameraOffset);
        
        // Animation parameters
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        
        // Smooth easing function (ease-in-out)
        const easeInOut = (t) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeInOut(progress);
                
                // Interpolate camera position
                this.camera.position.lerpVectors(startCameraPos, newCameraPos, easedProgress);
                
                // Interpolate orbit target
                this.controls.target.lerpVectors(startTargetPos, newTargetPos, easedProgress);
                this.controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Animation complete - now reposition all objects around new center
                    console.log(`✅ Smooth transition complete. Repositioning objects around new center...`);
                    this.repositionAroundNewCenter(system).then(() => {
                        resolve();
                    });
                }
            };
            
            animate();
        });
    }
    
    /**
     * Reposition all existing objects around a new center without reloading
     * @param {Object} newCenterSystem - The system to use as the new center
     */
    async repositionAroundNewCenter(newCenterSystem) {
        // Calculate the offset from current center to new center
        const oldCenter = this.sceneCenter;
        const newCenter = {
            x: newCenterSystem.x || newCenterSystem.X || 0,
            y: newCenterSystem.y || newCenterSystem.Y || 0,
            z: newCenterSystem.z || newCenterSystem.Z || 0
        };
        
        // Calculate the offset in scene coordinates
        const offsetX = (oldCenter.x - newCenter.x) * 0.1; // Apply scale factor
        const offsetY = (oldCenter.y - newCenter.y) * 0.1;
        const offsetZ = (oldCenter.z - newCenter.z) * 0.1;
        
        console.log(`🔄 Repositioning objects with offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}, ${offsetZ.toFixed(2)})`);
        
        // Move all objects in all groups
        Object.values(this.groups).forEach(group => {
            group.children.forEach(object => {
                // Apply corrected coordinate mapping for the offset
                object.position.x += -offsetX;  // X inverted
                object.position.y += offsetY;   // Y normal  
                object.position.z += offsetZ;   // Z normal
            });
        });
        
        // Update scene center
        this.sceneCenter = newCenter;
        
        // Move labels
        this.systemLabels.forEach(labelInfo => {
            if (labelInfo.position) {
                labelInfo.position.x += -offsetX;  // X inverted
                labelInfo.position.y += offsetY;   // Y normal
                labelInfo.position.z += offsetZ;   // Z normal
            }
        });
        
        // Set orbit controls to center on origin (where the new center system now is)
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        console.log(`✅ Successfully repositioned scene around ${newCenterSystem.name || newCenterSystem.Name}`);
    }

    clearScene() {
        Object.values(this.groups).forEach(group => {
            group.clear();
        });
        
        // Clean up HTML labels
        this.systemLabels.forEach(labelInfo => {
            if (labelInfo.element && labelInfo.element.parentNode) {
                labelInfo.element.parentNode.removeChild(labelInfo.element);
            }
        });
        
        this.interactiveObjects.length = 0;
        this.systemData.clear();
        this.allSystems.clear();
        this.systemNameMap.clear();
        this.systemLabels.length = 0;
    }

    /**
     * Handle user interaction (auto-rotation disabled)
     */
    onUserInteraction() {
        // Auto-rotation is permanently disabled, no action needed
    }

    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            this.time += 0.01;
            
            // Auto-rotation permanently disabled
            
            this.controls.update();
            
            // Update distance-based fading for smooth transitions
            this.updateDistanceFading();
            
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
        
        for (let i = 0; i < this.systemLabels.length; i++) {
            const labelInfo = this.systemLabels[i];
            const { element, position, type } = labelInfo;
            
            // Check label visibility based on filter settings
            let shouldShow = true;
            if (type === 'fc') { // Fleet carriers removed
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
        // Fleet carrier collision detection removed - no longer needed
        return;
    }

    /**
     * Update object opacity based on distance from center (smooth fading)
     */
    updateDistanceFading() {
        const sceneCenter = new THREE.Vector3(0, 0, 0); // Center is the anchor system
        
        // Reset stats
        this.fadingStats.totalObjects = 0;
        this.fadingStats.visibleObjects = 0;
        
        // Apply smooth opacity fading based on distance from center
        Object.entries(this.groups).forEach(([groupName, group]) => {
            const fadeConfig = this.fadeDistances[groupName];
            if (!fadeConfig) return;
            
            group.children.forEach(object => {
                this.fadingStats.totalObjects++;
                
                // Handle particle systems differently from individual objects
                if (object.userData.isPopulatedParticles) {
                    // For particle systems, fade the entire system based on its bounding sphere
                    const boundingBox = new THREE.Box3().setFromObject(object);
                    const center = boundingBox.getCenter(new THREE.Vector3());
                    const distance = sceneCenter.distanceTo(center);
                    
                    // Calculate opacity for the entire particle system
                    let opacity = 1.0;
                    if (distance > fadeConfig.start) {
                        if (distance >= fadeConfig.end) {
                            opacity = 0.0;
                        } else {
                            const fadeRange = fadeConfig.end - fadeConfig.start;
                            const fadeProgress = (distance - fadeConfig.start) / fadeRange;
                            opacity = 1.0 - fadeProgress;
                        }
                    }
                    
                    if (opacity > 0.1) {
                        this.fadingStats.visibleObjects++;
                    }
                    
                    // Apply opacity to particle system
                    if (object.material) {
                        if (object.userData.originalOpacity === undefined) {
                            object.userData.originalOpacity = object.material.opacity || 1.0;
                        }
                        
                        const finalOpacity = object.userData.originalOpacity * opacity;
                        object.material.opacity = finalOpacity;
                        object.material.transparent = true;
                        object.visible = opacity > 0.01;
                    }
                } else {
                    // Handle individual objects (like special systems)
                    const distance = sceneCenter.distanceTo(object.position);
                    
                    // Calculate opacity based on distance
                    let opacity = 1.0;
                    if (distance > fadeConfig.start) {
                        if (distance >= fadeConfig.end) {
                            opacity = 0.0;
                        } else {
                            // Smooth fade between start and end distances
                            const fadeRange = fadeConfig.end - fadeConfig.start;
                            const fadeProgress = (distance - fadeConfig.start) / fadeRange;
                            opacity = 1.0 - fadeProgress;
                        }
                    }
                    
                    if (opacity > 0.1) {
                        this.fadingStats.visibleObjects++;
                    }
                    
                    // Apply opacity to the object's material
                    if (object.material) {
                        // Store original opacity if not already stored
                        if (object.userData.originalOpacity === undefined) {
                            object.userData.originalOpacity = object.material.opacity || 1.0;
                        }
                        
                        // Apply distance-based opacity
                        const finalOpacity = object.userData.originalOpacity * opacity;
                        object.material.opacity = finalOpacity;
                        object.material.transparent = true;
                        
                        // Completely hide objects that are too far (performance optimization)
                        object.visible = opacity > 0.01;
                    }
                }
            });
        });
        
        // Update HTML labels based on distance from center
        this.systemLabels.forEach(labelInfo => {
            const distance = sceneCenter.distanceTo(labelInfo.position);
            const fadeConfig = this.fadeDistances.regionLabels;
            
            if (labelInfo.element && this.labelVisibility.regionLabels) {
                let opacity = 1.0;
                if (distance > fadeConfig.start) {
                    if (distance >= fadeConfig.end) {
                        opacity = 0.0;
                    } else {
                        const fadeRange = fadeConfig.end - fadeConfig.start;
                        const fadeProgress = (distance - fadeConfig.start) / fadeRange;
                        opacity = 1.0 - fadeProgress;
                    }
                }
                
                labelInfo.element.style.opacity = opacity;
                labelInfo.element.style.display = opacity > 0.1 ? 'block' : 'none';
            }
        });
        
        // Log performance stats occasionally
        const now = Date.now();
        if (now - this.fadingStats.lastLogTime > 5000) { // Every 5 seconds
            const fadePercent = ((this.fadingStats.totalObjects - this.fadingStats.visibleObjects) / this.fadingStats.totalObjects * 100).toFixed(1);
            console.log(`🌟 Smooth Fading: ${this.fadingStats.visibleObjects}/${this.fadingStats.totalObjects} objects visible (${fadePercent}% faded)`);
            this.fadingStats.lastLogTime = now;
        }
    }

    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    /**
     * Add coordinate system helpers for debugging
     * Top-down view mapping:
     * Red=X (galactic east/west, INVERTED), Green=Y (galactic up/down), Blue=Z (galactic north/south)
     */
    addCoordinateHelpers() {
        // Create axis helper (Red=X, Green=Y, Blue=Z)
        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);

        // Create grid on XZ plane (Y=0) for top-down view
        const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        console.log('🔍 Coordinate helpers: Red=X (gal east/west, INVERTED), Green=Y (gal up/down), Blue=Z (gal north/south), Grid on XZ plane (top-down view)');
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.renderer.dispose();
        this.controls.dispose();
    }
} 