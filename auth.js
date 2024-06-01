import { signInWithGoogle, signOutGoogle, auth, onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';

document.getElementById('google-signin-button').addEventListener('click', () => {
  signInWithGoogle();
});

document.getElementById('google-signout-button').addEventListener('click', () => {
  signOutGoogle();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
      document.getElementById('google-signin-button').style.display = 'none';
      document.getElementById('google-signout-button').style.display = 'block';
      document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;
  } else {
      document.getElementById('google-signin-button').style.display = 'block';
      document.getElementById('google-signout-button').style.display = 'none';
      document.getElementById('user-name').innerText = '';
  }
});

const saveConfigButton = document.getElementById('save-config');
if (saveConfigButton) {

  saveConfigButton.addEventListener('click', async () => {
    const camera = document.getElementById('camera-select').value;
    const resolution = document.getElementById('resolution-select').value;
    const focalLength = document.getElementById('focalLength').value;

    const user = auth.currentUser;

    if(camera && resolution && focalLength) {

    if (user) {
        const userConfig = {
            camera: camera,
            resolution: resolution,
            focalLength: focalLength
        };

        try {
            await setDoc(doc(db, 'users', user.uid), { cameraConfig: userConfig }, { merge: true });
            console.log('Configuration saved successfully');
        } catch (error) {
            console.error('Error saving configuration:', error);
        }
    } else {
        console.log('No user is signed in');
    }
    }
  
  });
}

const loadConfigButton = document.getElementById('load-config');
if (loadConfigButton) {
  loadConfigButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userConfig = docSnap.data().cameraConfig;
          document.getElementById('camera-select').value = userConfig.camera;
          document.getElementById('resolution-select').value = userConfig.resolution;
          document.getElementById('focalLength').value = userConfig.focalLength;
          console.log('Configuration loaded successfully');
        } else {
          console.log('No configuration found for the user');
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
      }
    } else {
      console.log('No user is signed in');
    }
  });
}
