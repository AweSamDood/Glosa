// src/services/FileBasedSavedPassesService.js
/**
 * Service for managing saved passes with JSON file persistence
 * This uses a REST-like API running alongside the application
 */

// Helper to get the current dataset identifier from environment variables
const getCurrentDataset = () => {
    // Get dataset name from env variable or use 'default'
    return import.meta.env.VITE_INSTANCE_NAME ||
        import.meta.env.VITE_DATA_URL?.split('/').pop()?.replace('.json', '') ||
        'default';
};

// API base URL - configurable via env var, defaults to current origin (for dev server)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Construct the URL for the saved passes JSON file
 * @returns {string} URL for the saved passes file
 */
const getSavedPassesUrl = () => {
    const dataset = getCurrentDataset();
    return `${API_BASE_URL}/api/savedPasses/${dataset}`;
};

/**
 * Get all saved passes from the JSON file
 * @returns {Promise<Array>} Promise resolving to array of saved passes
 */
export const getSavedPasses = async () => {
    try {
        // Use fetch to get the saved passes
        const response = await fetch(getSavedPassesUrl(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
        });

        // If file doesn't exist yet, return empty array
        if (response.status === 404) {
            console.log('No saved passes file found, starting with empty array');
            return [];
        }

        // Handle other errors
        if (!response.ok) {
            console.error(`Error loading saved passes: ${response.status} ${response.statusText}`);
            return [];
        }

        const savedPasses = await response.json();
        return Array.isArray(savedPasses) ? savedPasses : [];
    } catch (error) {
        console.error('Error loading saved passes:', error);
        // Fallback to localStorage if API fails
        return getLocalStorageSavedPasses();
    }
};

/**
 * Save the full list of passes to the JSON file
 * @param {Array} passes - The complete list of passes to save
 * @returns {Promise<boolean>} Promise resolving to true if saved successfully
 */
export const savePassesToFile = async (passes) => {
    try {
        const response = await fetch(getSavedPassesUrl(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(passes),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error saving passes to file:', error);
        // Fallback to localStorage
        savePassesToLocalStorage(passes);
        return false;
    }
};

/**
 * Save a pass to the JSON file
 * @param {Object} passData - The pass data to save
 * @returns {Promise<Object|null>} Promise resolving to the saved pass or null
 */
export const savePass = async (passData) => {
    try {
        // Get existing passes
        const savedPasses = await getSavedPasses();

        // Check if pass already exists
        const existing = savedPasses.find(p => p.passIndex === passData.passIndex);
        if (existing) {
            return existing;
        }

        // Generate a unique ID for the saved pass
        const newPass = {
            ...passData,
            id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            savedAt: new Date().toISOString()
        };

        // Add to the array and save
        const updatedPasses = [...savedPasses, newPass];
        const saved = await savePassesToFile(updatedPasses);

        if (!saved) {
            throw new Error('Failed to save passes to file');
        }

        return newPass;
    } catch (error) {
        console.error('Error saving pass:', error);
        // If API fails, try localStorage as fallback
        return savePassToLocalStorage(passData);
    }
};

/**
 * Remove a saved pass from the JSON file
 * @param {string} passId - The ID of the pass to remove
 * @returns {Promise<boolean>} Promise resolving to true if removed successfully
 */
export const removeSavedPass = async (passId) => {
    try {
        // Get existing passes
        const savedPasses = await getSavedPasses();

        // Remove the pass
        const updatedPasses = savedPasses.filter(p => p.id !== passId);

        // If no change, pass wasn't found
        if (updatedPasses.length === savedPasses.length) {
            return false;
        }

        // Save updated list
        const saved = await savePassesToFile(updatedPasses);
        return saved;
    } catch (error) {
        console.error('Error removing saved pass:', error);
        // Try localStorage fallback
        return removePassFromLocalStorage(passId);
    }
};

/**
 * Update the note on a saved pass
 * @param {string} passId - The ID of the pass to update
 * @param {string} note - The new note text
 * @returns {Promise<Object|null>} Promise resolving to the updated pass or null
 */
export const updatePassNote = async (passId, note) => {
    try {
        // Get existing passes
        const savedPasses = await getSavedPasses();

        // Find pass index
        const passIndex = savedPasses.findIndex(p => p.id === passId);

        // If not found
        if (passIndex === -1) {
            return null;
        }

        // Update the note
        const updatedPass = {
            ...savedPasses[passIndex],
            note: note,
            updatedAt: new Date().toISOString()
        };

        // Update the list
        savedPasses[passIndex] = updatedPass;

        // Save updated list
        const saved = await savePassesToFile(savedPasses);

        if (!saved) {
            throw new Error('Failed to save updated passes');
        }

        return updatedPass;
    } catch (error) {
        console.error('Error updating pass note:', error);
        // Try localStorage fallback
        return updatePassNoteInLocalStorage(passId, note);
    }
};

// ----- LocalStorage Fallback Methods -----

const STORAGE_KEY = 'glosa_saved_passes';

export const getLocalStorageSavedPasses = () => {
    try {
        const savedPassesJson = localStorage.getItem(STORAGE_KEY);
        if (!savedPassesJson) return [];

        const savedPasses = JSON.parse(savedPassesJson);
        return Array.isArray(savedPasses) ? savedPasses : [];
    } catch (error) {
        console.error('Error loading saved passes from localStorage:', error);
        return [];
    }
};

export const savePassesToLocalStorage = (passes) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
        return true;
    } catch (error) {
        console.error('Error saving passes to localStorage:', error);
        return false;
    }
};

export const savePassToLocalStorage = (passData) => {
    try {
        const savedPasses = getLocalStorageSavedPasses();

        // Check if pass already exists
        const existing = savedPasses.find(p => p.passIndex === passData.passIndex);
        if (existing) {
            return existing;
        }

        // Create new pass
        const newPass = {
            ...passData,
            id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            savedAt: new Date().toISOString()
        };

        // Save updated list
        const updatedPasses = [...savedPasses, newPass];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPasses));

        return newPass;
    } catch (error) {
        console.error('Error saving pass to localStorage:', error);
        return null;
    }
};

export const removePassFromLocalStorage = (passId) => {
    try {
        const savedPasses = getLocalStorageSavedPasses();

        // Remove pass
        const updatedPasses = savedPasses.filter(p => p.id !== passId);

        // If no change
        if (updatedPasses.length === savedPasses.length) {
            return false;
        }

        // Save updated list
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPasses));

        return true;
    } catch (error) {
        console.error('Error removing pass from localStorage:', error);
        return false;
    }
};

export const updatePassNoteInLocalStorage = (passId, note) => {
    try {
        const savedPasses = getLocalStorageSavedPasses();

        // Find pass
        const passIndex = savedPasses.findIndex(p => p.id === passId);

        // If not found
        if (passIndex === -1) {
            return null;
        }

        // Update note
        const updatedPass = {
            ...savedPasses[passIndex],
            note: note,
            updatedAt: new Date().toISOString()
        };

        // Update list
        savedPasses[passIndex] = updatedPass;

        // Save updated list
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPasses));

        return updatedPass;
    } catch (error) {
        console.error('Error updating pass note in localStorage:', error);
        return null;
    }
};

export default {
    getSavedPasses,
    savePass,
    removeSavedPass,
    updatePassNote,
};