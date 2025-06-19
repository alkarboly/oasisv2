import * as THREE from 'three';

/**
 * OASIS Route Planner - Advanced pathfinding for Elite Dangerous systems
 * Uses A* algorithm with jump range constraints and fuel considerations
 */
export class RoutePlanner {
    constructor(sceneManager) {
        console.log('🗺️ Route Planner constructor called');
        this.sceneManager = sceneManager;
        this.allSystems = new Map(); // All available systems with coordinates
        this.anchors = new Map(); // Anchor systems for waypoint routing
        this.currentRoute = null;
        this.routeVisualization = null;
        
        // Route visualization group
        this.routeGroup = new THREE.Group();
        this.sceneManager.scene.add(this.routeGroup);
        
        // Default jump range (can be customized by user)
        this.maxJumpRange = 50; // Light years
        this.fuelCapacity = 32; // Tons (typical for exploration ships)
        this.fuelPerJump = 2; // Tons per jump (conservative estimate)
        
        console.log('🗺️ Route Planner initialized');
    }

    /**
     * Load system data for route planning
     */
    async loadSystemData() {
        try {
            // Get all systems from the scene manager
            this.allSystems = new Map(this.sceneManager.allSystems);
            
            // Load anchor systems for waypoint routing
            const response = await fetch('/api/anchor-systems');
            if (response.ok) {
                const anchorData = await response.json();
                anchorData.forEach(anchor => {
                    const system = this.sceneManager.getSystem(anchor.name);
                    if (system?.coords) {
                        this.anchors.set(anchor.name, {
                            ...system,
                            radius: anchor.radius_ly,
                            description: anchor.description
                        });
                    }
                });
                console.log(`📍 Loaded ${this.anchors.size} anchor systems for routing`);
            }
            
            console.log(`🌟 Route planner has access to ${this.allSystems.size} systems`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load system data for route planning:', error);
            return false;
        }
    }

    /**
     * Calculate 3D distance between two systems in light years
     */
    calculateDistance(system1, system2) {
        const dx = system1.coords.x - system2.coords.x;
        const dy = system1.coords.y - system2.coords.y;
        const dz = system1.coords.z - system2.coords.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Find systems within jump range of a given system
     */
    findSystemsInRange(centerSystem, range = this.maxJumpRange) {
        const systemsInRange = [];
        
        for (const [name, system] of this.allSystems) {
            if (name === centerSystem.name) continue;
            
            const distance = this.calculateDistance(centerSystem, system);
            if (distance <= range) {
                systemsInRange.push({
                    system,
                    distance
                });
            }
        }
        
        return systemsInRange.sort((a, b) => a.distance - b.distance);
    }

    /**
     * A* pathfinding algorithm for route calculation
     */
    findRoute(startSystemName, endSystemName, maxJumpRange = this.maxJumpRange) {
        const startSystem = this.sceneManager.getSystem(startSystemName);
        const endSystem = this.sceneManager.getSystem(endSystemName);
        
        if (!startSystem || !endSystem) {
            console.error('❌ Start or end system not found');
            return null;
        }
        
        if (!startSystem.coords || !endSystem.coords) {
            console.error('❌ System coordinates not available');
            return null;
        }
        
        console.log(`🎯 Planning route from ${startSystemName} to ${endSystemName}`);
        console.log(`📏 Direct distance: ${this.calculateDistance(startSystem, endSystem).toFixed(2)} LY`);
        
        // Check if direct jump is possible
        const directDistance = this.calculateDistance(startSystem, endSystem);
        if (directDistance <= maxJumpRange) {
            console.log('✅ Direct jump possible');
            return {
                route: [startSystem, endSystem],
                totalDistance: directDistance,
                jumps: 1,
                fuelRequired: this.fuelPerJump
            };
        }
        
        // A* algorithm implementation
        const openSet = new Set([startSystemName]);
        const closedSet = new Set();
        const gScore = new Map(); // Cost from start to current node
        const fScore = new Map(); // gScore + heuristic
        const cameFrom = new Map(); // For path reconstruction
        
        gScore.set(startSystemName, 0);
        fScore.set(startSystemName, this.calculateDistance(startSystem, endSystem));
        
        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops
        
        while (openSet.size > 0 && iterations < maxIterations) {
            iterations++;
            
            // Find node with lowest fScore
            let current = null;
            let lowestFScore = Infinity;
            
            for (const systemName of openSet) {
                const score = fScore.get(systemName) || Infinity;
                if (score < lowestFScore) {
                    lowestFScore = score;
                    current = systemName;
                }
            }
            
            if (!current) break;
            
            // Check if we reached the destination
            if (current === endSystemName) {
                console.log(`✅ Route found in ${iterations} iterations`);
                return this.reconstructPath(cameFrom, current, gScore);
            }
            
            openSet.delete(current);
            closedSet.add(current);
            
            const currentSystem = this.sceneManager.getSystem(current);
            if (!currentSystem) continue;
            
            // Find neighbors within jump range
            const neighbors = this.findSystemsInRange(currentSystem, maxJumpRange);
            
            for (const { system: neighbor, distance } of neighbors) {
                if (closedSet.has(neighbor.name)) continue;
                
                const tentativeGScore = (gScore.get(current) || 0) + distance;
                
                if (!openSet.has(neighbor.name)) {
                    openSet.add(neighbor.name);
                } else if (tentativeGScore >= (gScore.get(neighbor.name) || Infinity)) {
                    continue;
                }
                
                // This path is the best so far
                cameFrom.set(neighbor.name, current);
                gScore.set(neighbor.name, tentativeGScore);
                
                const heuristic = this.calculateDistance(neighbor, endSystem);
                fScore.set(neighbor.name, tentativeGScore + heuristic);
            }
        }
        
        console.log(`❌ No route found after ${iterations} iterations`);
        return null;
    }

    /**
     * Reconstruct the path from A* algorithm results
     */
    reconstructPath(cameFrom, current, gScore) {
        const path = [current];
        let totalDistance = 0;
        
        while (cameFrom.has(current)) {
            const previous = cameFrom.get(current);
            path.unshift(previous);
            
            const prevSystem = this.sceneManager.getSystem(previous);
            const currSystem = this.sceneManager.getSystem(current);
            if (prevSystem && currSystem) {
                totalDistance += this.calculateDistance(prevSystem, currSystem);
            }
            
            current = previous;
        }
        
        const route = path.map(systemName => this.sceneManager.getSystem(systemName)).filter(s => s);
        const jumps = route.length - 1;
        const fuelRequired = jumps * this.fuelPerJump;
        
        return {
            route,
            totalDistance,
            jumps,
            fuelRequired,
            pathNames: path
        };
    }

    /**
     * Enhanced route finding with waypoint optimization
     * Uses anchor systems as intermediate waypoints for better routes
     */
    findOptimizedRoute(startSystemName, endSystemName, maxJumpRange = this.maxJumpRange) {
        // First try direct A* route
        const directRoute = this.findRoute(startSystemName, endSystemName, maxJumpRange);
        
        if (directRoute && directRoute.jumps <= 10) {
            // Direct route is reasonable, return it
            return directRoute;
        }
        
        console.log('🔄 Attempting waypoint-optimized routing...');
        
        // Try routing through anchor systems as waypoints
        const startSystem = this.sceneManager.getSystem(startSystemName);
        const endSystem = this.sceneManager.getSystem(endSystemName);
        
        if (!startSystem || !endSystem) return directRoute;
        
        let bestRoute = directRoute;
        let bestDistance = directRoute ? directRoute.totalDistance : Infinity;
        
        // Try each anchor as an intermediate waypoint
        for (const [anchorName, anchorSystem] of this.anchors) {
            if (anchorName === startSystemName || anchorName === endSystemName) continue;
            
            const routeToAnchor = this.findRoute(startSystemName, anchorName, maxJumpRange);
            const routeFromAnchor = this.findRoute(anchorName, endSystemName, maxJumpRange);
            
            if (routeToAnchor && routeFromAnchor) {
                const combinedDistance = routeToAnchor.totalDistance + routeFromAnchor.totalDistance;
                const combinedJumps = routeToAnchor.jumps + routeFromAnchor.jumps;
                
                if (combinedDistance < bestDistance) {
                    bestDistance = combinedDistance;
                    bestRoute = {
                        route: [...routeToAnchor.route, ...routeFromAnchor.route.slice(1)],
                        totalDistance: combinedDistance,
                        jumps: combinedJumps,
                        fuelRequired: combinedJumps * this.fuelPerJump,
                        waypoint: anchorName
                    };
                }
            }
        }
        
        if (bestRoute && bestRoute.waypoint) {
            console.log(`✅ Optimized route found via waypoint: ${bestRoute.waypoint}`);
        }
        
        return bestRoute;
    }

    /**
     * Visualize route in 3D scene
     */
    visualizeRoute(routeData) {
        this.clearRouteVisualization();
        
        if (!routeData || !routeData.route || routeData.route.length < 2) {
            console.warn('⚠️ No valid route to visualize');
            return;
        }
        
        const { route } = routeData;
        
        // Create route line
        const points = [];
        route.forEach(system => {
            if (system.coords) {
                const scaledCoords = this.sceneManager.scaleCoordinatesForScene(system.coords);
                points.push(new THREE.Vector3(scaledCoords.x, scaledCoords.y, scaledCoords.z));
            }
        });
        
        if (points.length < 2) return;
        
        // Create the route line
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00FFFF, // Cyan for planned route
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        const routeLine = new THREE.Line(geometry, material);
        this.routeGroup.add(routeLine);
        
        // Create waypoint markers
        route.forEach((system, index) => {
            if (!system.coords) return;
            
            const scaledCoords = this.sceneManager.scaleCoordinatesForScene(system.coords);
            const isStart = index === 0;
            const isEnd = index === route.length - 1;
            const isWaypoint = !isStart && !isEnd;
            
            let color, size;
            if (isStart) {
                color = 0x00FF00; // Green for start
                size = 1.2;
            } else if (isEnd) {
                color = 0xFF0000; // Red for end
                size = 1.2;
            } else {
                color = 0x00FFFF; // Cyan for waypoints
                size = 0.6;
            }
            
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });
            
            const marker = new THREE.Mesh(geometry, material);
            marker.position.set(scaledCoords.x, scaledCoords.y, scaledCoords.z);
            
            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(size * 1.5, 8, 8);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(scaledCoords.x, scaledCoords.y, scaledCoords.z);
            
            this.routeGroup.add(marker);
            this.routeGroup.add(glow);
        });
        
        this.currentRoute = routeData;
        console.log('✅ Route visualization created');
    }

    /**
     * Clear current route visualization
     */
    clearRouteVisualization() {
        this.routeGroup.clear();
        this.currentRoute = null;
    }

    /**
     * Get route summary for display
     */
    getRouteSummary(routeData) {
        if (!routeData) return null;
        
        const { route, totalDistance, jumps, fuelRequired, waypoint } = routeData;
        
        return {
            startSystem: route[0]?.name || 'Unknown',
            endSystem: route[route.length - 1]?.name || 'Unknown',
            totalDistance: totalDistance.toFixed(2),
            jumps,
            fuelRequired: fuelRequired.toFixed(1),
            waypoint: waypoint || null,
            systemCount: route.length
        };
    }

    /**
     * Export route data for external use
     */
    exportRoute(routeData, format = 'json') {
        if (!routeData) return null;
        
        const routeExport = {
            timestamp: new Date().toISOString(),
            startSystem: routeData.route[0]?.name,
            endSystem: routeData.route[routeData.route.length - 1]?.name,
            totalDistance: routeData.totalDistance,
            jumps: routeData.jumps,
            fuelRequired: routeData.fuelRequired,
            maxJumpRange: this.maxJumpRange,
            waypoint: routeData.waypoint || null,
            systems: routeData.route.map(system => ({
                name: system.name,
                coordinates: system.coords
            }))
        };
        
        if (format === 'json') {
            return JSON.stringify(routeExport, null, 2);
        } else if (format === 'csv') {
            const header = 'System Name,X,Y,Z,Distance from Previous\n';
            let csv = header;
            
            routeExport.systems.forEach((system, index) => {
                let distanceFromPrevious = 0;
                if (index > 0) {
                    const prev = routeExport.systems[index - 1];
                    const dx = system.coordinates.x - prev.coordinates.x;
                    const dy = system.coordinates.y - prev.coordinates.y;
                    const dz = system.coordinates.z - prev.coordinates.z;
                    distanceFromPrevious = Math.sqrt(dx * dx + dy * dy + dz * dz);
                }
                
                csv += `"${system.name}",${system.coordinates.x},${system.coordinates.y},${system.coordinates.z},${distanceFromPrevious.toFixed(2)}\n`;
            });
            
            return csv;
        }
        
        return routeExport;
    }

    /**
     * Update jump range and recalculate current route if exists
     */
    updateJumpRange(newRange) {
        this.maxJumpRange = newRange;
        console.log(`🚀 Jump range updated to ${newRange} LY`);
        
        // If there's a current route, recalculate it with new range
        if (this.currentRoute && this.currentRoute.route.length >= 2) {
            const startSystem = this.currentRoute.route[0].name;
            const endSystem = this.currentRoute.route[this.currentRoute.route.length - 1].name;
            
            console.log('🔄 Recalculating route with new jump range...');
            const newRoute = this.findOptimizedRoute(startSystem, endSystem, newRange);
            if (newRoute) {
                this.visualizeRoute(newRoute);
                return newRoute;
            }
        }
        
        return null;
    }

    /**
     * Find nearest systems to a given coordinate
     */
    findNearestSystems(targetCoords, count = 10, maxDistance = 100) {
        const nearestSystems = [];
        
        for (const [name, system] of this.allSystems) {
            if (!system.coords) continue;
            
            const dx = system.coords.x - targetCoords.x;
            const dy = system.coords.y - targetCoords.y;
            const dz = system.coords.z - targetCoords.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance <= maxDistance) {
                nearestSystems.push({
                    system,
                    distance
                });
            }
        }
        
        return nearestSystems
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
    }
} 