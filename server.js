const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware with updated CSP for Three.js ES modules
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow Three.js ES modules and inline scripts for importmap
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",  // Required for importmap
        "'unsafe-eval'",    // Required for some Three.js operations
        "https://unpkg.com", 
        "https://cdn.jsdelivr.net"
      ],
      // Allow external styles and inline styles
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      // Allow connections to Google Sheets API and Elite Dangerous databases
      connectSrc: [
        "'self'", 
        "https://docs.google.com", 
        "https://sheets.googleapis.com",
        "https://eddb.io",
        "https://www.edsm.net"
      ]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Google Sheets setup
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let sheetsAuth = null;
let cachedVisualizationData = null;


// Load and cache visualization data at startup
async function loadVisualizationData() {
  try {
    console.log('📊 Loading combined visualization data...');
    const vizData = await fs.readFile('data/spansh_colonized_systems.json', 'utf8');
    const parsedData = JSON.parse(vizData);
    
    // Convert systems array to lookup object for efficient access
    const systemsLookup = {};
    let systemsArray = [];
    
    // Handle both array format and object with systems property
    if (Array.isArray(parsedData)) {
      systemsArray = parsedData;
    } else if (parsedData.systems && Array.isArray(parsedData.systems)) {
      systemsArray = parsedData.systems;
    }
    
    if (systemsArray.length > 0) {
      systemsArray.forEach(system => {
        systemsLookup[system.name] = system;
      });
      
      console.log(`🔍 Processed ${systemsArray.length} systems into lookup table`);
      console.log('🔍 Sample system:', systemsArray[0]?.name, systemsArray[0]);
    }
    
    // Cache the processed data in consistent format
    cachedVisualizationData = {
      systems: systemsArray,
      systemsLookup: systemsLookup,
      last_updated: parsedData.last_updated || new Date().toISOString()
    };
    
    return cachedVisualizationData;
  } catch (error) {
    console.error('❌ Failed to load visualization data:', error);
    return null;
  }
}

async function initializeGoogleAuth() {
  try {
    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
      console.warn('Google Sheets credentials not found. Sheet data will be unavailable.');
      return null;
    }

    const auth = new google.auth.JWT(
      SERVICE_ACCOUNT_EMAIL,
      null,
      PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    await auth.authorize();
    sheetsAuth = auth;
    console.log('Google Sheets authentication successful');
    return auth;
  } catch (error) {
    console.error('Google Sheets authentication failed:', error.message);
    return null;
  }
}



// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sheetsAuth: !!sheetsAuth
  });
});


app.get('/api/sheets-data', async (req, res) => {
  if (!sheetsAuth) {
    return res.status(503).json({ error: 'Google Sheets not configured' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
    
    // Define sheet ranges for different data types
    const ranges = [
      
      'setup!A:B',      // Setup configuration
      'hauler-manifest!A:C' // Hauler data
    ];

    const batchResponse = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: ranges
    });

    const [setupData, haulerData] = batchResponse.data.valueRanges;

    // Fleet carrier processing removed

    // Process setup data
    const processedSetup = processSheetData(setupData.values, [
      'expedition_name:', 'osc_iii_'
    ]);

    // Process hauler data
    const processedHauler = processSheetData(haulerData.values, [
      'name', 'tons_hauled', 'last_action'
    ]);

    res.json({
      
      setup: processedSetup,
      haulers: processedHauler,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
});

// Helper function to process sheet data
function processSheetData(values, headers) {
  if (!values || values.length < 2) return [];
  
  const actualHeaders = values[0];
  const rows = values.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

// Serve static files from data directory
app.use('/data', express.static('data'));

// Add API endpoint for special systems CSV
app.get('/api/special-systems', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'special_systems.csv');
    const csvData = fsSync.readFileSync(csvPath, 'utf-8');
    res.type('text/csv');
    res.send(csvData);
  } catch (error) {
    console.error('Error serving special systems:', error);
    res.status(500).json({ error: 'Failed to load special systems data' });
  }
});

// Add API endpoint to serve combined visualization data
app.get('/api/visualization-data', async (req, res) => {
  try {
    // Return cached data if available
    if (cachedVisualizationData) {
      res.json(cachedVisualizationData);
      return;
    }
    
    // If not cached, load it now
    const data = await loadVisualizationData();
    if (data) {
      res.json(data);
    } else {
      res.status(500).json({ error: 'Failed to load visualization data' });
    }
  } catch (error) {
    console.error('❌ Failed to serve visualization data:', error);
    res.status(500).json({ error: 'Failed to serve visualization data' });
  }
});

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
  // Initialize authentication and load data at startup
  await initializeGoogleAuth();
  await loadVisualizationData();

  
  app.listen(PORT, () => {
    console.log(`🚀 OASIS Community Map running on port ${PORT}`);
    console.log(`📊 Google Sheets: ${sheetsAuth ? 'Connected' : 'Not configured'}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`✅ Visualization data cached: ${cachedVisualizationData ? 'Yes' : 'No'}`);

  });
}

startServer(); 