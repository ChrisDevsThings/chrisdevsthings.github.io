// Spotify API Configuration
const clientId = 'c7a07267bb44402d9a8a17c83655dbdf'; // Your Spotify Client ID
const redirectUri = 'https://chrisdevsthings.github.io'; // Your GitHub Pages URL (with trailing slash)

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
    const hash = window.location.hash;
    
    if (hash) {
        console.log('Found hash:', hash);
        // Parse all hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        
        // Check for errors first
        const error = hashParams.get('error');
        if (error) {
            console.error('Auth error:', error);
            localStorage.removeItem('spotify_token');
            return;
        }

        // Look for access token
        const token = hashParams.get('access_token');
        if (token) {
            console.log('Got token from hash, saving...');
            localStorage.setItem('spotify_token', token);
            window.location.hash = ''; // Clear the hash
            updateNowPlaying(token);
        } else {
            console.log('No token found in hash');
        }
    }

    // If we have a token, start updating the now playing
    const token = localStorage.getItem('spotify_token');
    console.log('Stored token:', token ? 'Found' : 'Not found');
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
};

// Login to Spotify
function loginToSpotify() {
    // Generate random state string for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('spotify_auth_state', state);
    
    // Construct the authorization URL
    const authUrl = new URL(SPOTIFY_AUTH_URL);
    
    // Add the query parameters
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('show_dialog', 'true');
    
    // Redirect to Spotify
    console.log('Redirecting to:', authUrl.toString());
    window.location.href = authUrl.toString();
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
