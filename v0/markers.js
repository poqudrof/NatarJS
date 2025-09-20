
import { signInWithGoogle, signOutGoogle, auth, onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';


let logged_user;

// Working with  1Hz, p 0.4Hz Step, 512 frames


document.getElementById('google-signin-button').addEventListener('click', () => {
  signInWithGoogle();
});

document.getElementById('google-signout-button').addEventListener('click', () => {
  signOutGoogle();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
      logged_user = user;
      document.getElementById('google-signin-button').style.display = 'none';
      document.getElementById('google-signout-button').style.display = 'block';
      document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;


      // Fetch the SVG file and process it
      fetch('./data/markerlist1.svg')
      .then(response => response.text())
      .then(svgContent => {
          const markerPositions = extractMarkerPositions(svgContent);
          displayMarkerPositions(markerPositions);
          setDoc(doc(db, 'users', user.uid), { markerList: markerPositions }, { merge: true });
  
      })
      .catch(error => console.error('Error loading SVG file:', error));

  } else {
      document.getElementById('google-signin-button').style.display = 'block';
      document.getElementById('google-signout-button').style.display = 'none';
      document.getElementById('user-name').innerText = '';
      logged_user = null;
  }
});


// Function to parse the SVG and extract marker positions
function extractMarkerPositions(svgContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgContent, "image/svg+xml");

    // Get the SVG dimensions and units
    const svgElement = xmlDoc.querySelector('svg');
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');
    const width = parseFloat(widthAttr);
    const height = parseFloat(heightAttr);
    const widthUnit = widthAttr.replace(/[0-9.]/g, '').trim();
    const heightUnit = heightAttr.replace(/[0-9.]/g, '').trim();

    // Function to convert to millimeters if necessary
    function toMillimeters(value, unit) {
        if (unit === 'mm') {
            return value; // Already in millimeters
        }
        if (unit === 'cm') {
            return value * 10; // Convert centimeters to millimeters
        }
        if (unit === 'in') {
            return value * 25.4; // Convert inches to millimeters
        }
        if (unit === 'pt') {
            return value * 0.352778; // Convert points to millimeters
        }
        // Add other conversions if needed
        return value; // Default case, assume pixels
    }

    const widthInMM = toMillimeters(width, widthUnit);
    const heightInMM = toMillimeters(height, heightUnit);

    // Helper function to apply transformations
    function applyTransform(x, y, transform) {
        const translate = /translate\(([^,]+),([^)]+)\)/.exec(transform);
        if (translate) {
            x += parseFloat(translate[1]);
            y += parseFloat(translate[2]);
        }
        return { x, y };
    }

    // Find all elements labeled as Markers
    const markers = xmlDoc.querySelectorAll('image[id^="marker"]');
    const markerPositions = [];

    markers.forEach(marker => {
        const id = marker.id;
        let x = parseFloat(marker.getAttribute('x'));
        let y = parseFloat(marker.getAttribute('y'));
        const markerWidth = parseFloat(marker.getAttribute('width'));
        const markerHeight = parseFloat(marker.getAttribute('height'));

        // Traverse up the DOM to apply all transformations
        let parent = marker.parentElement;
        while (parent && parent.nodeName !== 'svg') {
            if (parent.hasAttribute('transform')) {
                const transform = parent.getAttribute('transform');
                const transformedPos = applyTransform(x, y, transform);
                x = transformedPos.x;
                y = transformedPos.y;
            }
            parent = parent.parentElement;
        }

        const positions = {
            id: id,
            topLeft: { x: toMillimeters(x, widthUnit), y: toMillimeters(y, heightUnit) },
            topRight: { x: toMillimeters(x + markerWidth, widthUnit), y: toMillimeters(y, heightUnit) },
            bottomLeft: { x: toMillimeters(x, widthUnit), y: toMillimeters(y + markerHeight, heightUnit) },
            bottomRight: { x: toMillimeters(x + markerWidth, widthUnit), y: toMillimeters(y + markerHeight, heightUnit) }
        };

        markerPositions.push(positions);
    });

    return markerPositions;
}

// Function to display marker positions in the HTML
function displayMarkerPositions(markerPositions) {
    const outputElement = document.getElementById('output');
    outputElement.textContent = JSON.stringify(markerPositions, null, 2);
}


// Fetch the SVG file and process it
fetch('./data/markerlist1.svg')
    .then(response => response.text())
    .then(svgContent => {
        const markerPositions = extractMarkerPositions(svgContent);
        displayMarkerPositions(markerPositions);
        if (logged_user) {
          setDoc(doc(db, 'users', logged_user.uid), { markerList: markerPositions }, { merge: true });
        }
    })
    .catch(error => console.error('Error loading SVG file:', error));
