const firebaseConfig = {
  apiKey: "AIzaSyDmNJKs_KaKajr5xr768Q3GQT6512nZy10",
  authDomain: "my-messenger-2cbdf.firebaseapp.com",
  databaseURL: "https://my-messenger-2cbdf-default-rtdb.firebaseio.com",
  projectId: "my-messenger-2cbdf",
  storageBucket: "my-messenger-2cbdf.firebasestorage.app",
  messagingSenderId: "539199363060",
  appId: "1:539199363060:web:6cef7dab36aa58146fcba1"
};

firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.database();