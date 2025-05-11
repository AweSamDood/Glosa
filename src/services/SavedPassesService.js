// src/services/SavedPassesService.js

/**
 * Service for managing saved passes with localStorage persistence
 */
const STORAGE_KEY = 'glosa_saved_passes';

/**
 * Get all saved passes from localStorage
 * @returns {Array} Array of saved passes
 */
export const getSavedPasses = () => {
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

/**
 * Save a pass to localStorage
 * @param {Object} passData - The pass data to save
 * @returns {Object} The saved pass with ID
 */
export const savePass = (passData) => {
    try {
        const savedPasses = getSavedPasses();

        // Check if the pass is already saved
        const existing = savedPasses.find(p => p.passIndex === passData.passIndex);
        if (existing) {
            return existing; // Pass already saved
        }

        // Generate a unique ID for the saved pass
        const newPass = {
            ...passData,
            id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            savedAt: new Date().toISOString()
        };

        // Add the new pass to the saved passes
        const updatedPasses = [...savedPasses, newPass];

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPasses));

        return newPass;
    } catch (error) {
        console.error('Error saving pass to localStorage:', error);
        return null;
    }
};

/**
 * Remove a saved pass from localStorage
 * @param {string} passId - The ID of the pass to remove
 * @returns {boolean} True if the pass was removed successfully
 */
export const removeSavedPass = (passId) => {
    try {
        const savedPasses = getSavedPasses();

        // Remove the pass with the specified ID
        const updatedPasses = savedPasses.filter(p => p.id !== passId);

        // If the length hasn't changed, the pass wasn't found
        if (updatedPasses.length === savedPasses.length) {
            return false;
        }

        // Save the updated list to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPasses));

        return true;
    } catch (error) {
        console.error('Error removing saved pass from localStorage:', error);
        return false;
    }
};

/**
 * Update the note on a saved pass
 * @param {string} passId - The ID of the pass to update
 * @param {string} note - The new note text
 * @returns {Object|null} The updated pass or null if not found
 */
export const updatePassNote = (passId, note) => {
    try {
        const savedPasses = getSavedPasses();

        // Find the index of the pass with the specified ID
        const passIndex = savedPasses.findIndex(p => p.id === passId);

        // If the pass wasn't found, return null
        if (passIndex === -1) {
            return null;
        }

        // Update the note
        const updatedPass = {
            ...savedPasses[passIndex],
            note: note,
            updatedAt: new Date().toISOString()
        };

        // Update the pass in the list
        savedPasses[passIndex] = updatedPass;

        // Save the updated list to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPasses));

        return updatedPass;
    } catch (error) {
        console.error('Error updating saved pass note in localStorage:', error);
        return null;
    }
};

/**
 * Check if a pass is saved
 * @param {number} passIndex - The index of the pass to check
 * @returns {boolean} True if the pass is saved
 */
export const isPassSaved = (passIndex) => {
    try {
        const savedPasses = getSavedPasses();
        return savedPasses.some(p => p.passIndex === passIndex);
    } catch (error) {
        console.error('Error checking if pass is saved:', error);
        return false;
    }
};

export default {
    getSavedPasses,
    savePass,
    removeSavedPass,
    updatePassNote,
    isPassSaved
};