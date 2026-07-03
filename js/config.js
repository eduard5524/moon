// API Configuration
const API_BASE_URL = window.MOON_API_URL || 'https://b85572719c41-tunnel-whrowvix.devinapps.com';
const TUNNEL_CREDENTIALS = btoa('user:88f436b49d48453f2ec79da8677fa502');

// Helper to get the configured API URL
function getApiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

// Wrapper around fetch that adds tunnel basic auth
async function apiFetch(path, options = {}) {
    const url = getApiUrl(path);
    const headers = new Headers(options.headers || {});
    
    // Store JWT token in X-Auth-Token to avoid conflicting with tunnel's Basic auth
    if (headers.has('Authorization')) {
        const bearerToken = headers.get('Authorization');
        headers.set('X-Auth-Token', bearerToken);
    }
    
    // Set tunnel basic auth on Authorization header
    headers.set('Authorization', 'Basic ' + TUNNEL_CREDENTIALS);
    
    return fetch(url, { ...options, headers });
}
