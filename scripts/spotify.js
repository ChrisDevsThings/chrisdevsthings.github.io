// Spotify API Configuration
const clientId = 'c7a07267bb44402d9a8a17c83655dbdf'; // Your Spotify Client ID
const redirectUri = window.location.origin; // This will be your website's URL

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
    const hash = window.location.hash;
    if (hash) {
        const token = hash
            .substring(1)
            .split('&')
            .find(elem => elem.startsWith('access_token'))
            ?.split('=')[1];

        if (token) {
            localStorage.setItem('spotify_token', token);
            window.location.hash = ''; // Clear the hash
            updateNowPlaying(token);
        }
    }

    // If we have a token, start updating the now playing
    const token = localStorage.getItem('spotify_token');
    if (token) {
        updateNowPlaying(token);
        // Update every 30 seconds
        setInterval(() => updateNowPlaying(token), 30000);
    }
};

// Login to Spotify
function loginToSpotify() {
    const authUrl = `${SPOTIFY_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=token`;
    window.location.href = authUrl;
}

// Update the Now Playing section
async function updateNowPlaying(token) {
    try {
        // Try to get currently playing
        const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

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