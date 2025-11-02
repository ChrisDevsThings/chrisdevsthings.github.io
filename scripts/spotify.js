// Spotify API Configuration
const clientId = 'c7a07267bb44402d9a8a17c83655dbdf'; // Your Spotify Client ID
const redirectUri = 'https://chrisdevsthings.github.io'; // Your GitHub Pages URL

// Spotify API endpoints
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const SPOTIFY_RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played';

// Scopes we need for the player
const scopes = [
    'user-read-currently-playing',
    'user-read-recently-played'
];

// Elements we'll update
const trackNameElement = document.getElementById('trackName');
const artistNameElement = document.getElementById('artistName');
const trackArtElement = document.getElementById('trackArt');

// Check if we're returning from Spotify auth
window.onload = () => {
    console.log('Checking Spotify auth...');
    
    // Get the hash fragment
    const hash = window.location.hash.substring(1);
    if (!hash) {
        console.log('No hash found');
        checkSavedToken();
        return;
    }
    
    // Parse the hash string into an object
    const result = hash.split('&').reduce(function(result, item) {
        const parts = item.split('=');
        result[parts[0]] = decodeURIComponent(parts[1]);
        return result;
    }, {});
    
    console.log('Auth result:', result);
    
    // Check if there was an error
    if (result.error) {
        console.error('Auth error:', result.error);
        localStorage.removeItem('spotify_token');
        checkSavedToken();
        return;
    }
    
    // Verify state matches
    const storedState = localStorage.getItem('spotify_auth_state');
    if (result.state !== storedState) {
        console.error('State mismatch!');
        checkSavedToken();
        return;
    }
    
    // If we have an access token, store it
    if (result.access_token) {
        console.log('Got access token');
        localStorage.setItem('spotify_token', result.access_token);
        localStorage.removeItem('spotify_auth_state'); // Clean up state
        window.location.hash = '';
        updateNowPlaying(result.access_token);
    } else {
        checkSavedToken();
    }
};

// Check if we have a saved token
function checkSavedToken() {
    const token = localStorage.getItem('spotify_token');
    console.log('Checking saved token:', token ? 'Found' : 'Not found');
    
    if (token) {
        updateNowPlaying(token);
        // Update every 30 seconds
        setInterval(() => updateNowPlaying(token), 30000);
    } else {
        // No token, show login option
        console.log('No token found, showing login option');
        trackNameElement.textContent = 'Click to connect Spotify';
        trackNameElement.style.cursor = 'pointer';
        trackNameElement.onclick = loginToSpotify;
    }
}

// Login to Spotify
function loginToSpotify() {
    // Generate a random state value for security
    const state = generateRandomString(16);
    
    // Build authorization URL
    const params = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        state: state,
        scope: scopes.join(' ')
    };

    // Convert params to URL string
    const searchParams = Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');

    const authUrl = SPOTIFY_AUTH_URL + '?' + searchParams;
    
    // Store state in localStorage to verify when we return
    localStorage.setItem('spotify_auth_state', state);
    
    console.log('Redirecting to:', authUrl);
    window.location = authUrl;
}

// Helper function to generate random string for state
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Update the Now Playing section
async function updateNowPlaying(token) {
    if (!token) {
        console.log('No token found, showing login option');
        trackNameElement.textContent = 'Click to connect Spotify';
        trackNameElement.style.cursor = 'pointer';
        trackNameElement.onclick = loginToSpotify;
        return;
    }

    console.log('Updating now playing...');
    try {
        // Try to get currently playing
        const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Spotify API response status:', response.status);

        if (response.status === 204) {
            // No track currently playing, try to get recently played
            const recentlyPlayed = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const recentData = await recentlyPlayed.json();
            if (recentData.items && recentData.items.length > 0) {
                updateTrackInfo(recentData.items[0].track, true);
            }
            return;
        }

        const data = await response.json();
        if (data.item) {
            updateTrackInfo(data.item, false);
        }
    } catch (error) {
        console.error('Error fetching Spotify data:', error);
        if (error.status === 401) {
            // Token expired, clear it
            localStorage.removeItem('spotify_token');
            // Show login button
            trackNameElement.textContent = 'Click to connect Spotify';
            trackNameElement.style.cursor = 'pointer';
            trackNameElement.onclick = loginToSpotify;
        }
    }
}

// Update the track information in the UI
function updateTrackInfo(track, isRecent) {
    if (!track) return;

    trackNameElement.textContent = track.name;
    artistNameElement.textContent = isRecent ? 'Last played • ' + track.artists[0].name : track.artists[0].name;

    if (track.album.images && track.album.images.length > 0) {
        trackArtElement.src = track.album.images[0].url;
    }

    // Remove any click handler that might have been added
    trackNameElement.style.cursor = 'default';
    trackNameElement.onclick = null;
}
