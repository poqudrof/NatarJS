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

    console.log(" Looking for Spotify ?!! markerId: ", markerId);
    console.log(" Looking for Spotify ?!! markerLinks: ", markerLinks);

    let markerLink = markerLinks.find(markerLink => markerLink.id === markerId);

    if (currentTime - lastActivationTime >= activationCooldown && markerLink) {
        
        if(markerLink.info.type === "track"){
    
          // Try to open the track in the Spotify app
          const trackId = markerLink.uri.split('/').pop();

        // console.log(" Loading  ", trackId);


          window.location.href = `spotify:track:${trackId}`;
          lastActivationTime = currentTime
        }
  
    }
}
export { loadMarkerLinks, activateMarkerAction };
