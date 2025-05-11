// server.js - Express server for handling saved passes
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Get data directory from environment variable or use default
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDirExists() {
    try {
        await fs.mkdir(path.join(DATA_DIR, 'savedPasses'), { recursive: true });
        console.log(`Data directory created at: ${DATA_DIR}/savedPasses`);
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

ensureDataDirExists();

// Helper function to get saved passes file path
function getSavedPassesFilePath(datasetName) {
    // Sanitize dataset name (prevent directory traversal)
    const sanitizedName = datasetName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(DATA_DIR, 'savedPasses', `${sanitizedName}_saved_passes.json`);
}

// API Routes

// GET saved passes for a dataset
app.get('/api/savedPasses/:dataset', async (req, res) => {
    try {
        const dataset = req.params.dataset;
        const filePath = getSavedPassesFilePath(dataset);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            // If file doesn't exist, return empty array
            console.log(`No saved passes file found for dataset: ${dataset}`);
            return res.json([]);
        }

        // Read file
        const fileContent = await fs.readFile(filePath, 'utf8');
        const passes = JSON.parse(fileContent);

        res.json(passes);
    } catch (error) {
        console.error('Error reading saved passes:', error);
        res.status(500).json({ error: 'Failed to read saved passes' });
    }
});

// PUT (update) saved passes for a dataset
app.put('/api/savedPasses/:dataset', async (req, res) => {
    try {
        const dataset = req.params.dataset;
        const filePath = getSavedPassesFilePath(dataset);
        const passes = req.body;

        // Validate request body
        if (!Array.isArray(passes)) {
            return res.status(400).json({ error: 'Request body must be an array' });
        }

        // Ensure data directory exists
        await ensureDataDirExists();

        // Write to file
        await fs.writeFile(filePath, JSON.stringify(passes, null, 2), 'utf8');

        res.json({ success: true, message: 'Saved passes updated successfully' });
    } catch (error) {
        console.error('Error updating saved passes:', error);
        res.status(500).json({ error: 'Failed to update saved passes' });
    }
});

// Serve Vite output in production
if (process.env.NODE_ENV === 'production') {
    const DIST_DIR = path.join(__dirname, 'dist');
    app.use(express.static(DIST_DIR));

    // Serve index.html for any other requests
    app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});