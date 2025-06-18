# OASIS Community Map v2.0

An interactive 3D visualization of the OASIS star cluster region in Elite Dangerous, showcasing community colonization progress with stunning sci-fi neon aesthetics.

![OASIS Community Map](https://img.shields.io/badge/Elite%20Dangerous-OASIS%20Cluster-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)
![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen)
![Three.js](https://img.shields.io/badge/Three.js-0.158.0-orange)

## 🌌 Overview

The OASIS Community Map is a real-time 3D visualization tool that displays the colonization progress of the OASIS star cluster region in Elite Dangerous. It features authentic galactic coordinates, dynamic data integration, and beautiful sci-fi aesthetics.

### ✨ Key Features

- **🎯 Real Elite Dangerous Data**: 11,421+ star systems with authentic coordinates
- **🚀 Interactive 3D Visualization**: Powered by Three.js with smooth camera controls
- **📊 Live Data Integration**: Google Sheets API for real-time expedition tracking
- **🎨 Sci-Fi Neon Aesthetics**: Beautiful space-themed lighting and effects
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **⚡ High Performance**: Optimized particle systems for smooth rendering

## 🗺️ System Categories

### 🔑 Key Systems
- **Color**: Gold with pulsing glow
- **Description**: Special memorial and landmark systems
- **Source**: `special_systems.csv`

### 🛣️ Expedition Route Systems
- **Planned**: Yellow - Future colonization targets
- **In Progress**: Orange with pulsing - Currently being developed  
- **Complete**: Bright green - Successfully colonized
- **Source**: Google Sheets expedition tracking

### 🏙️ Populated Systems
- **Color**: Purple with size based on population
- **Description**: Systems with established populations and economies
- **Source**: Elite Dangerous database

### 🚢 Fleet Carriers
- **Color**: Cyan rotating octahedrons
- **Features**: Dynamic text labels showing callsign, name, and owner
- **Source**: Live fleet carrier manifest

### ⭐ Unclaimed Stars
- **Appearance**: Smooth particle system with star-type coloring
- **Performance**: Optimized rendering for 11,000+ background stars

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Sheets API credentials (optional, for live data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/alkarboly/oasisv2.git
   cd oasisv2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp env.example .env
   # Edit .env with your Google Sheets credentials
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Sheets Integration (Optional)
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----"

# Server Configuration
PORT=3000
```

### Data Sources

The application uses multiple data sources:

1. **`data/combined_visualization_systems.json`** - Complete Elite Dangerous systems database
2. **`data/special_systems.csv`** - Key systems and memorials
3. **Google Sheets API** - Live expedition tracking and fleet carrier data
4. **`data/sheets/`** - Cached offline data when Sheets API is unavailable

## 🎮 Controls

### Navigation
- **Mouse Drag**: Rotate camera around the scene
- **Mouse Wheel**: Zoom in/out
- **Right Click + Drag**: Pan the view

### Interaction
- **Click System**: View detailed information
- **Filter Checkboxes**: Show/hide system categories
- **Statistics Panel**: Live counts and progress tracking

## 🏗️ Architecture

### Frontend
- **Three.js**: 3D rendering and scene management
- **ES6 Modules**: Modern JavaScript architecture
- **Responsive CSS**: Mobile-first design approach

### Backend
- **Node.js + Express**: RESTful API server
- **Google Sheets API**: Live data integration
- **Static File Serving**: Efficient asset delivery

### Data Flow
```
Elite Dangerous DB → JSON Files → Scene Manager → Three.js Renderer
Google Sheets API → Data Manager → UI Controller → Statistics Display
```

## 📊 API Endpoints

- `GET /api/visualization-data` - Complete systems database
- `GET /api/special-systems` - Key systems CSV data
- `GET /api/sheets-data` - Live Google Sheets data
- `GET /api/health` - Server health check

## 🎨 Customization

### Visual Themes
The application uses a sci-fi neon color palette:
- **Background**: Deep space gradient (#000005 to #1a1a2e)
- **UI Panels**: Semi-transparent with backdrop blur
- **System Colors**: Semantic color coding for different types

### Performance Tuning
- Particle system optimization for large datasets
- LOD (Level of Detail) for distant objects
- Efficient memory management for 11,000+ systems

## 🤝 Contributing

We welcome contributions to the OASIS Community Map! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Elite Dangerous Community**: For providing the inspiration and data
- **OASIS Expedition Team**: For their ongoing colonization efforts
- **Three.js Team**: For the amazing 3D graphics library
- **Contributors**: Everyone who helped build and improve this visualization

## 📞 Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/alkarboly/oasisv2/issues)
- **Community**: Join the Elite Dangerous OASIS community
- **Documentation**: Check the `/docs` folder for detailed guides

---

**Fly safe, Commanders! o7**

*Built with ❤️ for the Elite Dangerous community* 