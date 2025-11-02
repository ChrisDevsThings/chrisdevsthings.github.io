// Spotify API Configuration
const clientId = 'c7a07267bb44402d9a8a17c83655dbdf'; // Your Spotify Client ID
const redirectUri = 'https://chrisdevsthings.github.io'; // Your GitHub Pages URL (ensure it's registered in Spotify Dashboard)

// Spotify API endpoints
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
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

// On load: handle Authorization Code return or check saved token
window.onload = async () => {
    console.log('Checking Spotify auth...');

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code) {
        const storedState = localStorage.getItem('spotify_auth_state');
        localStorage.removeItem('spotify_auth_state');

        if (!state || state !== storedState) {
            console.error('State mismatch!');
            window.history.replaceState({}, document.title, window.location.pathname);
            await checkSavedToken();
            return;
        }

        try {
            await exchangeCodeForToken(code);
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
            console.error('Token exchange failed:', err);
        }

        await checkSavedToken();
        return;
    }

    await checkSavedToken();
};

// Check if we have a saved valid token (async because refresh may be required)
async function checkSavedToken() {
    const token = await getValidToken();
    console.log('Checking saved token:', token ? 'Found' : 'Not found');

    if (token) {
        updateNowPlaying(token);
        setInterval(async () => {
            const t = await getValidToken();
            updateNowPlaying(t);
        }, 30000);
    } else {
        console.log('No token found, showing login option');
        trackNameElement.textContent = 'Click to connect Spotify';
        trackNameElement.style.cursor = 'pointer';
        trackNameElement.onclick = loginToSpotify;
    }
}

// Login to Spotify using Authorization Code + PKCE
function loginToSpotify() {
    const state = generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);

    const codeVerifier = generateRandomString(128);
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    generateCodeChallenge(codeVerifier).then(codeChallenge => {
        const authUrl = SPOTIFY_AUTH_URL +
            '?client_id=' + encodeURIComponent(clientId) +
            '&response_type=code' +
            '&redirect_uri=' + encodeURIComponent(redirectUri) +
            '&state=' + encodeURIComponent(state) +
            '&scope=' + encodeURIComponent(scopes.join(' ')) +
            '&code_challenge_method=S256' +
            '&code_challenge=' + encodeURIComponent(codeChallenge);

        console.log('Redirecting to (PKCE):', authUrl);
        window.location.href = authUrl;
    }).catch(err => {
        console.error('Failed to generate code challenge:', err);
    });
}

// Helper: generate random string
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// PKCE helpers
async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64 = arrayBufferToBase64(digest);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

// Exchange authorization code for access token (and refresh token)
async function exchangeCodeForToken(code) {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) throw new Error('Missing code verifier');

    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('redirect_uri', redirectUri);
    body.append('client_id', clientId);
    body.append('code_verifier', codeVerifier);

    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error('Token endpoint returned ' + res.status + ': ' + txt);
    }

    const data = await res.json();
    if (data.access_token) {
        localStorage.setItem('spotify_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        const expiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000);
        localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
        // Clean up verifier
        localStorage.removeItem('spotify_code_verifier');
        console.log('Obtained access token via PKCE');
        return;
    }

    throw new Error('No access_token in token response');
}

// Get a valid token, refreshing if necessary
async function getValidToken() {
    const token = localStorage.getItem('spotify_token');
    const expiresAt = parseInt(localStorage.getItem('spotify_token_expires_at') || '0', 10);

    if (token && Date.now() < (expiresAt - 60000)) { // still valid (with 60s buffer)
        return token;
    }

    // Try to refresh
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (refreshToken) {
        try {
            await refreshTokenRequest(refreshToken);
            return localStorage.getItem('spotify_token');
        } catch (err) {
            console.error('Refresh failed:', err);
            // Clear tokens
            localStorage.removeItem('spotify_token');
            localStorage.removeItem('spotify_refresh_token');
            localStorage.removeItem('spotify_token_expires_at');
            return null;
        }
    }

    return null;
}

// Refresh token request
async function refreshTokenRequest(refreshToken) {
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    body.append('client_id', clientId);

    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error('Refresh endpoint returned ' + res.status + ': ' + txt);
    }

    const data = await res.json();
    if (data.access_token) {
        localStorage.setItem('spotify_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        const expiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000);
        localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
        console.log('Refreshed access token');
        return;
    }

    throw new Error('No access_token in refresh response');
}

// Try to refresh once when a 401 occurs
async function tryRefreshToken() {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return false;
    try {
        await refreshTokenRequest(refreshToken);
        return true;
    } catch (err) {
        console.error('tryRefreshToken failed:', err);
        return false;
    }
}

// Update the Now Playing section
async function updateNowPlaying(currentToken) {
    const token = await getValidToken();
    if (!token) {
        console.log('No token found, showing login option');
        trackNameElement.textContent = 'Click to connect Spotify';
        trackNameElement.style.cursor = 'pointer';
        trackNameElement.onclick = loginToSpotify;
        return;
    }

    console.log('Updating now playing...');
    try {
        const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Spotify API response status:', response.status);

        if (response.status === 401) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                const newToken = localStorage.getItem('spotify_token');
                return updateNowPlaying(newToken);
            } else {
                localStorage.removeItem('spotify_token');
                trackNameElement.textContent = 'Click to connect Spotify';
                trackNameElement.style.cursor = 'pointer';
                trackNameElement.onclick = loginToSpotify;
                return;
            }
        }

        if (response.status === 204) {
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

        if (!response.ok) {
            console.error('Now playing request failed:', response.status);
            return;
        }

        const data = await response.json();
        if (data && data.item) {
            updateTrackInfo(data.item, false);
        }
    } catch (error) {
        console.error('Error fetching Spotify data:', error);
    }
}

// Update the track information in the UI
function updateTrackInfo(track, isRecent) {
    if (!track) return;

    trackNameElement.textContent = track.name;
    artistNameElement.textContent = isRecent ? 'Last played • ' + track.artists[0].name : track.artists[0].name;

    if (track.album && track.album.images && track.album.images.length > 0) {
        trackArtElement.src = track.album.images[0].url;
    }

    // Remove click handler
    trackNameElement.style.cursor = 'default';
    trackNameElement.onclick = null;
}
