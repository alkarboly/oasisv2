# OASIS Community Map - Data Sources Documentation

## 📊 **Overview**
The OASIS Community Map uses multiple data sources to create a real-time 3D visualization of the OASIS region in Elite Dangerous.

---

## 🗃️ **Local Data Files**

### 1. `spansh_colonized_systems.json` (7.1MB)
**Primary coordinate database for all Elite Dangerous systems**

**Structure:**
```json
{
  "last_updated": "2025-06-17T17:53:46.670176",
  "systems": [
    {
      "distance": 98.16,
      "bodyCount": 15.0,
      "name": "Trapezium Sector GC-U c3-5",
      "id": 11005914,
      "id64": 1459047076346.0,
      "coords": {
        "x": 462.25,         // Elite Dangerous X coordinate (light years)
        "y": -383.21875,     // Elite Dangerous Y coordinate (light years)  
        "z": -1098.09375     // Elite Dangerous Z coordinate (light years)
      },
      "coordsLocked": true,
      "requirePermit": false,
      "information": {},
      "primaryStar": {
        "type": "K (Yellow-Orange) Star",
        "name": "Trapezium Sector GC-U c3-5 A",
        "isScoopable": true
      },
      "anchor_system": "2MASS J05405172-0226489",
      "anchor_description": "OASIS (OSC I)",
      "permitName": null
    }
  ]
}
```

**Usage:** Primary source for system coordinates and stellar data. Server converts this to a lookup table for O(1) access.

### 2. `vis_anchor_systems.csv` (749B)
**Region definitions and anchor points**

**Structure:**
```csv
name,radius_ly,description
2MASS J05405172-0226489,100,OASIS (OSC I)
LAM01 ORIONIS,100,Lambda Orionis (OSC II)
NGC 2232 Sector CR-L b8-0,100,OSC III
Trapezium Sector GM-U c3-2,100,
```

**Fields:**
- `name`: System name that serves as region center
- `radius_ly`: Region radius in light years  
- `description`: Human-readable region name

**Usage:** Creates yellow region markers in 3D scene

### 3. `special_systems.csv` (75B)
**Special systems requiring different visualization**

**Structure:**
```csv
name,type
SystemName,special
```

**Usage:** Mark systems with red coloring for special status

---

## 🌐 **Google Sheets API Data**

### API Endpoint: `/api/sheets-data`

### 1. **Fleet Carrier Data** (`fc-manifest` sheet)
**Active fleet carrier tracking**

**Structure:**
```json
{
  "callsign": "WNQ-WTW",
  "name": "The Hour",
  "owner_": "mutahadir",
  "status": "Deployed",                    // Deployed, Full, etc.
  "timestamp": "2025-06-17 11:16:15",
  "location": "NGC 2232 Sector GW-W c1-1" // System name for coordinate lookup
}
```

**Visual Mapping:**
- 🔵 Blue rotating octahedron positioned at `location` system
- Size: 1.5 units (larger than regular systems)

### 2. **Setup Configuration** (`setup` sheet)
**Expedition configuration parameters**

**Structure:**
```json
{
  "expedition_name:": "Expedition Keyword (6 characters):",
  "osc_iii_": "osc3"
}
```

**Usage:** Application configuration and expedition settings

### 3. **Hauler Manifest** (`hauler-manifest` sheet)
**Commander activity tracking**

**Structure:**
```json
{
  "name": "mutahadir",
  "tons_hauled": 0,
  "last_action": "Marked completed NGC 2232 Sector LH-V b2-0 @ 2025-06-16T22:39:04.175549"
}
```

**Usage:** Statistics and activity monitoring

### 4. **Admin Manifest** (`admin-manifest` sheet)
**Administrative data**

**Structure:**
```json
{
  "field": "value"
}
```

**Usage:** Administrative configuration

---

## 🔄 **Data Flow Architecture**

### 1. **Application Startup**
```
1. Load vis_anchor_systems.csv → Region markers
2. Load spansh_colonized_systems.json → Coordinate database  
3. Call Google Sheets API → Live status data
4. Cross-reference system names for positioning
```

### 2. **Coordinate Resolution**
```
System Name → spansh_colonized_systems.json → Real ED Coordinates → Scale for Three.js
```

### 3. **Visual Processing**
```
Google Sheets Data + Coordinates → Colored 3D Objects → Scene Rendering
```

---

## 🎯 **Coordinate System**

### Elite Dangerous Coordinates
- **Range**: X: ~400-500 ly, Y: ~-300 to -400 ly, Z: ~-1000 to -1200 ly
- **Units**: Light years from Sol
- **Origin**: Sol system (0, 0, 0)

### Three.js Scene Coordinates  
- **OASIS Center**: (470, -380, -1100) ED → (0, 0, 0) Scene
- **Scale Factor**: 0.1 (1 ED ly = 0.1 Three.js units)
- **Formula**: `(ED_coord - OASIS_CENTER) * 0.1`

---

## 📋 **Reference Files** (`/data/sheets/`)
**DO NOT USE DIRECTLY IN APPLICATION**

These files show the structure of Google Sheets API responses:
- `fc-manifest.json`: Example fleet carrier data  
- `setup.json`: Example configuration data
- `hauler-manifest.json`: Example hauler data
- `admin-manifest.json`: Example admin data

**Purpose**: Developer reference for understanding API response format

---

## ⚠️ **Important Notes**

1. **Primary Coordinate Source**: Always use `spansh_colonized_systems.json`
2. **No External APIs**: Do not call EDDB/EDSM APIs - all data is local
3. **Live Data**: Only Google Sheets provides real-time updates
4. **System Name Matching**: Exact string matching required between sources
5. **Coordinate Scaling**: Essential for proper 3D visualization
6. **Cache Strategy**: 10min cache for JSON, 2min cache for Sheets API

---

## 🔧 **Troubleshooting**

### System Not Found
```javascript
// Check if system exists in coordinate database
const vizData = await dataManager.loadVisualizationData();
const systemExists = vizData.systemsLookup['System Name'];
```

### Coordinate Issues
```javascript
// Verify coordinate scaling
const original = { x: 470, y: -380, z: -1100 };
const scaled = sceneManager.scaleCoordinatesForScene(original);
// Result should be { x: 0, y: 0, z: 0 }
```

### Performance Issues
- Monitor cache hit rates
- Check JSON loading time (7.1MB file)
- Verify system lookup efficiency (O(1) expected) 