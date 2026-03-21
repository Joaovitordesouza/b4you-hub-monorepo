
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";
import "firebase/compat/storage";

// Configuração validada para o projeto b4you-hub (v6/v7)
const firebaseConfig = {
  apiKey: "AIzaSyBG6FWKdw-OroJDxsmTAJmGEGCrz9t3gRo",
  authDomain: "b4you-hub.firebaseapp.com",
  projectId: "b4you-hub",
  storageBucket: "b4you-hub.firebasestorage.app",
  messagingSenderId: "412916747304",
  appId: "1:412916747304:web:0666af622fb61f035b391d",
  measurementId: "G-8TKJX5MT54"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
// Fix: Atualizado para us-central1 para alinhar com a arquitetura v2 do Backend
export const functions = firebase.app().functions('us-central1');
export const storage = firebase.storage();
export const fieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;

export default firebase;
