let lastActivationTime = 0;
const activationCooldown = 5000; // 5 seconds
let markerLinks = {};

async function loadMarkerLinks() {
    const response = await fetch('http://localhost:5000/links');
    const data = await response.json();
    markerLinks = data;
}

    // Activate here
function activateMarkerAction(markerId) {
    const currentTime = Date.now();

    if (currentTime - lastActivationTime >= activationCooldown && markerLinks[markerId]) {
        // Try to open the track in the Spotify app
        const trackId = markerLinks[markerId].split('/').pop();
        window.location.href = `spotify:track:${trackId}`;
        lastActivationTime = currentTime;
    }
}
export { loadMarkerLinks, activateMarkerAction };
