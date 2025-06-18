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
 * - Fleet carriers (cyan rotating octahedrons with dynamic text labels)
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
        this.allSystems = new Map(); // All systems from JSON by name
        this.fcLabels = []; // Store FC text labels for camera-relative positioning
        
        // Animation properties
        this.animationId = null;
        this.time = 0;
        
        // Event callbacks
        this.onSystemClick = null;
        this.onSystemHover = null;
        
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
        
        this.startAnimation();
        console.log('🎬 OASIS Sci-Fi Scene initialized');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000005); // Deep space blue-black
        this.scene.fog = new THREE.Fog(0x000005, 100, 800);
    }

    setupCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 30, 80);
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

            // Store all systems for lookup
            vizData.systems.forEach(system => {
                this.allSystems.set(system.name, system);
            });

            // Find and set memorial system as scene center
            const memorial = this.allSystems.get(this.memorialSystem);
            if (memorial?.coords) {
                this.memorialCoords = memorial.coords;
                console.log(`🏛️ Memorial system found at:`, this.memorialCoords);
            } else {
                console.warn('⚠️ Memorial system not found, using default center');
                this.memorialCoords = { x: 470, y: -380, z: -1100 };
            }

            // Load additional data sources
            const [routeData, fcData, specialData] = await Promise.all([
                dataManager.loadSheetsData(),
                dataManager.loadSheetsData(), // FC data is part of sheets data
                this.loadSpecialSystems(dataManager)
            ]);

            // Process all systems with their roles and status
            await this.processAllSystems(vizData.systems, routeData, fcData, specialData);
            
            console.log(`✅ Loaded ${vizData.systems.length} systems into OASIS visualization`);
            
        } catch (error) {
            console.error('❌ Failed to load OASIS systems:', error);
        }
    }

    /**
     * Process all systems and categorize them based on their role in the colonization
     */
    async processAllSystems(allSystems, routeData, fcData, specialData) {
        // Create lookup maps for efficient categorization
        const routeMap = new Map();
        const fcMap = new Map();
        const specialMap = new Map();

        // Build route system map
        if (routeData?.route) {
            routeData.route.forEach(system => {
                routeMap.set(system.system_name, system);
            });
        }

        // Build fleet carrier map
        if (fcData?.fleetCarriers) {
            fcData.fleetCarriers.forEach(fc => {
                fcMap.set(fc.location, fc);
            });
        }

        // Build special systems map
        if (specialData) {
            specialData.forEach(special => {
                specialMap.set(special.system_name, special);
            });
        }

        // Separate systems for different processing
        const specialSystems = [];
        const routeSystems = [];
        const populatedSystems = [];
        const unclaimedSystems = [];

        // Categorize all systems
        for (const system of allSystems) {
            if (specialMap.has(system.name)) {
                specialSystems.push(system);
            } else if (routeMap.has(system.name)) {
                routeSystems.push({ system, routeInfo: routeMap.get(system.name) });
            } else if (system.information?.population > 0) {
                populatedSystems.push(system);
            } else {
                unclaimedSystems.push(system);
            }
        }

        // Process each category
        await this.processSpecialSystems(specialSystems, specialData);
        await this.processRouteSystems(routeSystems);
        await this.processPopulatedSystems(populatedSystems);
        await this.processFleetCarriers(fcData);
        this.createUnclaimedStarsParticles(unclaimedSystems);

        console.log(`✅ Processed: ${specialSystems.length} special, ${routeSystems.length} route, ${populatedSystems.length} populated, ${unclaimedSystems.length} unclaimed`);
    }

    /**
     * Process special systems (key systems)
     */
    async processSpecialSystems(specialSystems, specialData) {
        for (const system of specialSystems) {
            const specialInfo = specialData.find(s => s.system_name === system.name);
            const coords = this.scaleCoordinatesForScene(system.coords);

            // Create key system with special effects - smaller size
            const geometry = new THREE.SphereGeometry(1.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
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
     * Process route systems
     */
    async processRouteSystems(routeSystems) {
        for (const { system, routeInfo } of routeSystems) {
            const coords = this.scaleCoordinatesForScene(system.coords);
            let color, category, isPulsing = false;

            // Determine status and appearance
            if (routeInfo['completed?_'] === 'TRUE') {
                color = 0x00ff00; // Bright green
                category = 'routeCompleted';
            } else if (routeInfo['claimed?_'] === 'TRUE') {
                color = 0xff8000; // Orange
                category = 'routeInProgress';
                isPulsing = true;
            } else {
                color = 0xffff00; // Yellow
                category = 'routePlanned';
            }

            // Create neon-style system - smaller size
            const geometry = new THREE.SphereGeometry(0.8, 12, 12);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(coords.x, coords.y, coords.z);
            if (isPulsing) sphere.userData.isPulsing = true;

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
            this.interactiveObjects.push(sphere);
        }
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
                color: 0x8000ff, // Purple
                transparent: true,
                opacity: 0.8
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(coords.x, coords.y, coords.z);

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
            this.interactiveObjects.push(sphere);
        }
    }

    /**
     * Process fleet carriers with dynamic text labels
     */
    async processFleetCarriers(fcData) {
        if (!fcData?.fleetCarriers) return;

        for (const fc of fcData.fleetCarriers) {
            const system = this.allSystems.get(fc.location);
            if (!system?.coords) continue;

            const coords = this.scaleCoordinatesForScene(system.coords);
            coords.y += 2; // Offset above system

            // Create FC octahedron - smaller size
            const geometry = new THREE.OctahedronGeometry(1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff, // Cyan
                transparent: true,
                opacity: 0.9
            });

            const fc3d = new THREE.Mesh(geometry, material);
            fc3d.position.set(coords.x, coords.y, coords.z);
            fc3d.userData.isRotating = true;

            // Create text label using canvas texture
            const label = this.createFCLabel(fc);
            label.position.set(coords.x, coords.y, coords.z);

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
            this.groups.fleetCarriers.add(label);
            this.interactiveObjects.push(fc3d);
            
            // Store label for camera-relative updates
            this.fcLabels.push({
                label: label,
                fc3d: fc3d,
                basePosition: coords
            });
        }
    }

    /**
     * Create dynamic FC text label
     */
    createFCLabel(fc) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Draw text
        context.fillStyle = 'rgba(0, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'black';
        context.font = 'bold 14px Arial';
        context.textAlign = 'left';
        context.fillText(fc.callsign, 8, 20);
        context.font = '12px Arial';
        context.fillText(fc.name, 8, 36);
        context.fillText(`Owner: ${fc.owner_}`, 8, 52);

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
        });

        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 2, 1); // Adjust size

        return sprite;
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
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const systemData = this.systemData.get(object.id);
            
            if (systemData && this.onSystemClick) {
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
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const systemData = this.systemData.get(object.id);
            
            if (systemData && this.onSystemHover) {
                this.onSystemHover(systemData);
            }
        }
    }

    toggleFilter(filterType, enabled) {
        const group = this.groups[filterType];
        if (group) {
            group.visible = enabled;
        }
    }

    clearScene() {
        Object.values(this.groups).forEach(group => {
            group.clear();
        });
        
        this.interactiveObjects.length = 0;
        this.systemData.clear();
        this.allSystems.clear();
        this.fcLabels.length = 0;
    }

    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            this.time += 0.01;
            
            this.controls.update();
            
            // Update FC labels to face camera
            this.updateFCLabels();
            
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
     * Update FC labels to maintain camera-relative positioning
     */
    updateFCLabels() {
        for (const fcLabel of this.fcLabels) {
            const { label, fc3d, basePosition } = fcLabel;
            
            // Calculate offset based on camera direction
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Position label to the left of the FC
            const leftOffset = new THREE.Vector3();
            leftOffset.crossVectors(cameraDirection, this.camera.up).normalize();
            leftOffset.multiplyScalar(3); // Offset distance
            
            label.position.copy(fc3d.position).add(leftOffset);
            
            // Make label face camera
            label.lookAt(this.camera.position);
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