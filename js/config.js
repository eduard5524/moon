// API Configuration
// Update this URL after deploying the backend
const API_BASE_URL = window.MOON_API_URL || '';

// Helper to get the configured API URL
function getApiUrl(path) {
    return `${API_BASE_URL}${path}`;
}
