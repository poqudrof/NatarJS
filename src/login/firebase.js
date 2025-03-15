// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID, 
  measurementId: process.env.MEASUREMENT_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);


// Configurer le fournisseur Google
const provider = new GoogleAuthProvider();

const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // Ceci donne un jeton d'accès Google. Vous pouvez l'utiliser pour accéder à l'API Google.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;

            // Les informations de l'utilisateur connecté
            const user = result.user;
            console.log('User signed in:', user);
        })
        .catch((error) => {
            // Gérer les erreurs ici.
            const errorCode = error.code;
            const errorMessage = error.message;
            const email = error.email;
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error('Error during sign in:', errorCode, errorMessage, email, credential);
        });
};

const signOutGoogle = () => {
  auth.signOut().then(() => {
      console.log('User signed out');
  }).catch((error) => {
      console.error('Error during sign out:', error);
  });
};


export { auth, db, signInWithGoogle, signOutGoogle, onAuthStateChanged, setDoc, getDoc, doc };