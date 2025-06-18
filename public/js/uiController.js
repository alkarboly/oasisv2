/**
 * OASIS Community Map - UI Controller
 * Handles user interface interactions and updates
 */
export class UIController {
    constructor() {
        this.notifications = [];
        this.notificationContainer = null;
        
        this.init();
    }

    init() {
        this.setupNotifications();
        console.log('🎛️ UI Controller initialized');
    }

    setupNotifications() {
        // Create notification container if it doesn't exist
        this.notificationContainer = document.getElementById('notification-container');
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notification-container';
            this.notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 3000;
                pointer-events: none;
            `;
            document.body.appendChild(this.notificationContainer);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 4px solid ${this.getNotificationColor(type)};
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        
        // Add click to dismiss
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        this.notificationContainer.appendChild(notification);
        this.notifications.push(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        return notification;
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }

    getNotificationColor(type) {
        const colors = {
            'info': '#2196F3',
            'success': '#4CAF50',
            'warning': '#FF9800',
            'error': '#F44336'
        };
        return colors[type] || colors.info;
    }

    // Utility method for showing loading states
    showLoadingOverlay(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 18px;
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #333;
                    border-top: 4px solid #fff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div>${message}</div>
            </div>
        `;
        
        // Add CSS animation if not already present
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Helper method to update statistics in the UI
    updateStatistics(stats) {
        // Update stat elements if they exist
        const elements = {
            'stat-total': stats.total,
            'stat-route-progress': `${stats.routeProgress}%`,
            'stat-fleet-carriers': stats.fleetCarriers,
            'stat-populated': stats.populated
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Helper method to show simple alerts
    showAlert(message, type = 'info') {
        // Use browser alert as fallback for critical messages
        if (type === 'error') {
            alert(`Error: ${message}`);
        } else {
            this.showNotification(message, type, 5000);
        }
    }
} 