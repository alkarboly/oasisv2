/**
 * OASIS Route Planner UI - Sleek interface for route planning
 */
export class RoutePlannerUI {
    constructor(routePlanner, sceneManager) {
        console.log('🎨 Route Planner UI constructor called');
        this.routePlanner = routePlanner;
        this.sceneManager = sceneManager;
        this.isVisible = false;
        this.currentRoute = null;
        
        this.createUI();
        this.setupEventListeners();
        
        console.log('🎨 Route Planner UI initialized');
    }

    createUI() {
        console.log('🎨 Creating draggable route planner UI...');
        
        // Create draggable route planner panel
        this.panel = document.createElement('div');
        this.panel.className = 'route-planner draggable';
        this.panel.id = 'route-planner';
        this.panel.style.display = 'none';
        
        this.panel.innerHTML = `
            <div class="route-planner-header draggable-handle">
                <h3>🗺️ Route Planner</h3>
                <button class="route-planner-close" id="route-planner-close">×</button>
            </div>
            
            <div class="route-planner-content">
                <!-- Route Input Section -->
                <div class="route-input-section">
                    <div class="input-group">
                        <label for="start-system">Start System:</label>
                        <div class="system-input-container">
                            <input type="text" id="start-system" placeholder="Enter system name..." autocomplete="off">
                            <div class="system-suggestions" id="start-suggestions"></div>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="end-system">Destination System:</label>
                        <div class="system-input-container">
                            <input type="text" id="end-system" placeholder="Enter system name..." autocomplete="off">
                            <div class="system-suggestions" id="end-suggestions"></div>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="jump-range">Jump Range: <span id="jump-range-value">50</span> LY</label>
                        <input type="range" id="jump-range" min="10" max="80" value="50" step="1">
                        <div class="range-labels">
                            <span>10 LY</span>
                            <span>80 LY</span>
                        </div>
                    </div>
                    
                    <div class="route-buttons">
                        <button class="btn btn-primary" id="calculate-route">Calculate Route</button>
                        <button class="btn btn-secondary" id="clear-route">Clear Route</button>
                    </div>
                </div>
                
                <!-- Route Results Section -->
                <div class="route-results" id="route-results" style="display: none;">
                    <h4>Route Information</h4>
                    <div class="route-stats">
                        <div class="stat-row">
                            <span class="stat-label">Distance:</span>
                            <span class="stat-value" id="route-distance">0 LY</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Jumps:</span>
                            <span class="stat-value" id="route-jumps">0</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Fuel Required:</span>
                            <span class="stat-value" id="route-fuel">0 T</span>
                        </div>
                        <div class="stat-row" id="waypoint-info" style="display: none;">
                            <span class="stat-label">Via Waypoint:</span>
                            <span class="stat-value" id="route-waypoint">-</span>
                        </div>
                    </div>
                    
                    <!-- Route Systems List -->
                    <div class="route-systems-section" id="route-systems-section">
                        <h4>Route Systems</h4>
                        <div class="route-systems-list" id="route-systems-list">
                            <!-- Systems will be populated here -->
                        </div>
                    </div>
                    
                    <div class="route-actions">
                        <button class="btn btn-export" id="export-json">Export JSON</button>
                        <button class="btn btn-export" id="export-csv">Export CSV</button>
                    </div>
                </div>
                
                <!-- Loading Indicator -->
                <div class="route-loading" id="route-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Calculating optimal route...</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        // Make the panel draggable
        this.makeDraggable();
        
        // Add route planner toggle button to controls panel
        this.createToggleButton();
    }

    createToggleButton() {
        console.log('🔘 Creating route planner toggle button...');
        const controlsPanel = document.querySelector('.controls-panel');
        if (!controlsPanel) {
            console.error('❌ Controls panel not found');
            return;
        }
        
        const routeSection = document.createElement('div');
        routeSection.className = 'route-planning';
        routeSection.innerHTML = `
            <h3>Route Planning</h3>
            <button class="btn btn-route-planner" id="toggle-route-planner">
                🗺️ Plan Route
            </button>
        `;
        
        // Insert after statistics section
        const statsSection = controlsPanel.querySelector('.statistics');
        if (statsSection) {
            statsSection.insertAdjacentElement('afterend', routeSection);
            console.log('✅ Route planner button added after statistics section');
        } else {
            controlsPanel.appendChild(routeSection);
            console.log('✅ Route planner button added to end of controls panel');
        }
        
        // Verify the button was created
        setTimeout(() => {
            const button = document.getElementById('toggle-route-planner');
            if (button) {
                console.log('✅ Route planner button confirmed in DOM:', button);
            } else {
                console.error('❌ Route planner button NOT found in DOM');
            }
        }, 10);
    }

    setupEventListeners() {
        // Toggle route planner - use event delegation since button is created dynamically
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent is the route planner button
            let target = e.target;
            while (target && target !== document) {
                if (target.id === 'toggle-route-planner') {
                    console.log('🗺️ Route planner button clicked');
                    this.toggle();
                    return;
                }
                target = target.parentElement;
            }
        });
        
        // Close route planner - use event delegation since it's created dynamically
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'route-planner-close') {
                this.hide();
            }
        });
        
        // Use setTimeout to ensure DOM elements are created after the panel is added
        setTimeout(() => {
            // System input with autocomplete
            this.setupSystemAutocomplete('start-system', 'start-suggestions');
            this.setupSystemAutocomplete('end-system', 'end-suggestions');
            
            // Jump range slider
            const jumpRangeSlider = document.getElementById('jump-range');
            const jumpRangeValue = document.getElementById('jump-range-value');
            
            jumpRangeSlider?.addEventListener('input', (e) => {
                const value = e.target.value;
                jumpRangeValue.textContent = value;
                this.routePlanner.updateJumpRange(parseInt(value));
            });
            
            // Route calculation
            document.getElementById('calculate-route')?.addEventListener('click', () => {
                this.calculateRoute();
            });
            
            // Clear route
            document.getElementById('clear-route')?.addEventListener('click', () => {
                this.clearRoute();
            });
            
            // Export buttons
            document.getElementById('export-json')?.addEventListener('click', () => {
                this.exportRoute('json');
            });
            
            document.getElementById('export-csv')?.addEventListener('click', () => {
                this.exportRoute('csv');
            });
            
            // Note: Removed auto-close on outside click - user must use close button
            
            // Close suggestions on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.system-input-container')) {
                    this.hideSuggestions('start-suggestions');
                    this.hideSuggestions('end-suggestions');
                }
            });
            
            console.log('✅ Event listeners setup for draggable route planner');
        }, 100);
    }

    setupSystemAutocomplete(inputId, suggestionsId) {
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        
        if (!input || !suggestions) return;
        
        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                suggestions.style.display = 'none';
                return;
            }
            
            debounceTimer = setTimeout(() => {
                this.showSystemSuggestions(query, suggestions, input);
            }, 200);
        });
        
        input.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                this.showSystemSuggestions(query, suggestions, input);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateSuggestions(suggestions, e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = suggestions.querySelector('.suggestion-item.selected');
                if (selected) {
                    input.value = selected.querySelector('.suggestion-name').textContent;
                    suggestions.style.display = 'none';
                }
            } else if (e.key === 'Escape') {
                suggestions.style.display = 'none';
            }
        });
    }

    showSystemSuggestions(query, suggestionsContainer, input) {
        const systems = this.searchSystems(query);
        
        if (systems.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        suggestionsContainer.innerHTML = '';
        systems.slice(0, 10).forEach((system, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            if (index === 0) item.classList.add('selected');
            
            item.innerHTML = `
                <div class="suggestion-name">${system.name}</div>
                <div class="suggestion-coords">${system.coords.x.toFixed(1)}, ${system.coords.y.toFixed(1)}, ${system.coords.z.toFixed(1)}</div>
            `;
            
            item.addEventListener('click', () => {
                input.value = system.name;
                suggestionsContainer.style.display = 'none';
            });
            
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    }

    searchSystems(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const [name, system] of this.sceneManager.allSystems) {
            if (system.coords && name.toLowerCase().includes(queryLower)) {
                results.push(system);
            }
        }
        
        return results.sort((a, b) => {
            const aIndex = a.name.toLowerCase().indexOf(queryLower);
            const bIndex = b.name.toLowerCase().indexOf(queryLower);
            return aIndex - bIndex;
        });
    }

    navigateSuggestions(suggestionsContainer, direction) {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        const currentSelected = suggestionsContainer.querySelector('.suggestion-item.selected');
        
        if (items.length === 0) return;
        
        let newIndex = 0;
        if (currentSelected) {
            const currentIndex = Array.from(items).indexOf(currentSelected);
            newIndex = currentIndex + direction;
            
            if (newIndex < 0) newIndex = items.length - 1;
            if (newIndex >= items.length) newIndex = 0;
            
            currentSelected.classList.remove('selected');
        }
        
        items[newIndex].classList.add('selected');
        items[newIndex].scrollIntoView({ block: 'nearest' });
    }

    hideSuggestions(suggestionsId) {
        const suggestions = document.getElementById(suggestionsId);
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    async calculateRoute() {
        const startSystem = document.getElementById('start-system').value.trim();
        const endSystem = document.getElementById('end-system').value.trim();
        
        if (!startSystem || !endSystem) {
            this.showError('Please enter both start and destination systems');
            return;
        }
        
        if (startSystem === endSystem) {
            this.showError('Start and destination systems cannot be the same');
            return;
        }
        
        // Show loading
        this.showLoading(true);
        this.hideResults();
        
        try {
            // Small delay to show loading animation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const route = this.routePlanner.findOptimizedRoute(startSystem, endSystem);
            
            if (route) {
                this.currentRoute = route;
                this.routePlanner.visualizeRoute(route);
                this.showResults(route);
                this.showSuccess(`Route calculated: ${route.jumps} jumps, ${route.totalDistance.toFixed(2)} LY`);
            } else {
                this.showError('No route found. Try increasing jump range or check system names.');
            }
        } catch (error) {
            console.error('Route calculation error:', error);
            this.showError('Error calculating route. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    clearRoute() {
        this.routePlanner.clearRouteVisualization();
        this.currentRoute = null;
        this.hideResults();
        
        // Clear input fields
        document.getElementById('start-system').value = '';
        document.getElementById('end-system').value = '';
        
        this.showSuccess('Route cleared');
    }

    showResults(routeData) {
        const resultsSection = document.getElementById('route-results');
        const summary = this.routePlanner.getRouteSummary(routeData);
        
        if (!resultsSection || !summary) return;
        
        document.getElementById('route-distance').textContent = `${summary.totalDistance} LY`;
        document.getElementById('route-jumps').textContent = summary.jumps;
        document.getElementById('route-fuel').textContent = `${summary.fuelRequired} T`;
        
        const waypointInfo = document.getElementById('waypoint-info');
        const waypointValue = document.getElementById('route-waypoint');
        
        if (summary.waypoint) {
            waypointValue.textContent = summary.waypoint;
            waypointInfo.style.display = 'block';
        } else {
            waypointInfo.style.display = 'none';
        }
        
        // Populate systems list
        this.populateSystemsList(routeData);
        
        resultsSection.style.display = 'block';
    }

    populateSystemsList(routeData) {
        console.log('🔍 DEBUG: populateSystemsList called with:', routeData);
        
        const systemsList = document.getElementById('route-systems-list');
        if (!systemsList) {
            console.error('❌ Systems list element not found');
            return;
        }
        
        if (!routeData) {
            console.error('❌ No route data provided');
            return;
        }
        
        console.log('🔍 DEBUG: Route data structure:', Object.keys(routeData));
        console.log('🔍 DEBUG: Route data path:', routeData.path);
        console.log('🔍 DEBUG: Route data route:', routeData.route);
        
        // Try different possible path structures
        const systems = routeData.path || routeData.route || routeData.systems || [];
        console.log('🔍 DEBUG: Systems array:', systems);
        
        if (!systems || systems.length === 0) {
            console.warn('⚠️ No systems found in route data');
            systemsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.6);">No systems found in route</div>';
            return;
        }
        
        let totalDistance = 0;
        
        const systemsHTML = systems.map((system, index) => {
            let distanceFromPrevious = 0;
            if (index > 0) {
                distanceFromPrevious = this.calculateDistance(systems[index - 1], system);
                totalDistance += distanceFromPrevious;
            }
            
            return `
                <div class="route-system-item">
                    <span class="system-number">${index + 1}.</span>
                    <span class="system-name clickable-system-name" data-system-name="${system.name || 'Unknown System'}" title="Click to copy system name">${system.name || 'Unknown System'}</span>
                </div>
            `;
        }).join('');
        
        systemsList.innerHTML = systemsHTML;
        
        // Add click event listeners to copy system names
        const clickableNames = systemsList.querySelectorAll('.clickable-system-name');
        clickableNames.forEach(nameElement => {
            nameElement.addEventListener('click', (e) => {
                const systemName = e.target.getAttribute('data-system-name');
                this.copyToClipboard(systemName);
            });
        });
    }
    

    
    calculateDistance(system1, system2) {
        if (!system1.coords || !system2.coords) return 0;
        
        const dx = system1.coords.x - system2.coords.x;
        const dy = system1.coords.y - system2.coords.y;
        const dz = system1.coords.z - system2.coords.z;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess(`Copied "${text}" to clipboard`);
            console.log('📋 Copied to clipboard:', text);
        } catch (err) {
            console.error('❌ Failed to copy to clipboard:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showSuccess(`Copied "${text}" to clipboard`);
            } catch (fallbackErr) {
                console.error('❌ Fallback copy failed:', fallbackErr);
                this.showError('Failed to copy to clipboard');
            }
            document.body.removeChild(textArea);
        }
    }
    


    hideResults() {
        const resultsSection = document.getElementById('route-results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    showLoading(show) {
        const loadingSection = document.getElementById('route-loading');
        if (loadingSection) {
            loadingSection.style.display = show ? 'block' : 'none';
        }
    }

    exportRoute(format) {
        if (!this.currentRoute) {
            this.showError('No route to export');
            return;
        }
        
        const exportData = this.routePlanner.exportRoute(this.currentRoute, format);
        if (!exportData) {
            this.showError('Failed to export route');
            return;
        }
        
        const blob = new Blob([exportData], { 
            type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oasis-route-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`Route exported as ${format.toUpperCase()}`);
    }

    makeDraggable() {
        const handle = this.panel.querySelector('.draggable-handle');
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;

        // Store current position
        this.dragOffset = { x: 0, y: 0 };

        handle.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on the close button
            if (e.target.classList.contains('route-planner-close')) return;
            
            isDragging = true;
            handle.style.cursor = 'grabbing';
            
            // Get current mouse position relative to current panel position
            initialX = e.clientX - this.dragOffset.x;
            initialY = e.clientY - this.dragOffset.y;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                
                // Calculate new position
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Update stored offset
                this.dragOffset.x = currentX;
                this.dragOffset.y = currentY;

                // Apply the transform
                this.setTranslate(currentX, currentY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'grab';
            }
        });

        // Make handle look draggable
        handle.style.cursor = 'grab';
        handle.style.userSelect = 'none';
    }

    centerPanel() {
        // Reset transform to get natural dimensions
        this.panel.style.transform = '';
        
        const rect = this.panel.getBoundingClientRect();
        const x = (window.innerWidth - rect.width) / 2;
        const y = (window.innerHeight - rect.height) / 2;
        
        // Update drag offset to match centered position
        this.dragOffset = { x, y };
        
        this.setTranslate(x, y);
    }

    setTranslate(xPos, yPos) {
        this.panel.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    show() {
        console.log('👁️ Showing draggable route planner');
        this.panel.style.display = 'block';
        this.isVisible = true;
        
        // Center the panel when showing
        setTimeout(() => {
            this.centerPanel();
            document.getElementById('start-system')?.focus();
        }, 10);
    }

    hide() {
        console.log('🙈 Hiding route planner');
        this.panel.style.display = 'none';
        this.isVisible = false;
        
        // Hide suggestions
        this.hideSuggestions('start-suggestions');
        this.hideSuggestions('end-suggestions');
    }

    toggle() {
        console.log('🔄 Toggling route planner, current visibility:', this.isVisible);
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `route-notification route-notification-${type}`;
        notification.textContent = message;
        
        // Add to the draggable panel
        if (this.panel) {
            this.panel.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public method to set start/end systems programmatically
    setRoute(startSystem, endSystem) {
        document.getElementById('start-system').value = startSystem || '';
        document.getElementById('end-system').value = endSystem || '';
        
        if (startSystem && endSystem) {
            this.calculateRoute();
        }
    }

    // Initialize with system data
    async initialize() {
        console.log('🔧 Initializing route planner UI...');
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if toggle button exists, if not recreate it
        const toggleButton = document.getElementById('toggle-route-planner');
        if (!toggleButton) {
            console.log('⚠️ Toggle button not found, recreating...');
            this.createToggleButton();
        }
        
        await this.routePlanner.loadSystemData();
        
        console.log('✅ Route Planner UI ready');
    }
} 