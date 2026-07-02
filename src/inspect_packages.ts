import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCj0l_-6uaPWvY5YWwjvlPNf2u0TjUlvyo",
  authDomain: "gen-lang-client-0024621320.firebaseapp.com",
  projectId: "gen-lang-client-0024621320",
  storageBucket: "gen-lang-client-0024621320.firebasestorage.app",
  messagingSenderId: "37949699282",
  appId: "1:37949699282:web:ce0c14e57b661b8f3aa90b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-154be24f-4843-4080-8438-f0b525634fe2");

async function run() {
  console.log("=== LISTING ALL PACKAGES ===");
  const packagesSnap = await getDocs(collection(db, 'packages'));
  packagesSnap.forEach(doc => {
    console.log(`Package ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run();
