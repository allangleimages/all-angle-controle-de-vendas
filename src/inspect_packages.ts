import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-154be24f-4843-4080-8438-f0b525634fe2");

async function run() {
  const pkgsCol = collection(db, "packages");
  const pkgsSnap = await getDocs(pkgsCol);
  
  console.log("=== ALL PACKAGES ===");
  pkgsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Package ID: ${doc.id} | Nome: ${data.nomePacote} | tipoPreco: ${data.tipoPreco} | atividadeId: ${data.atividadeId} | arquivado: ${data.arquivado} | vendaDireta: ${data.vendaDireta}`);
  });
  process.exit(0);
}

run().catch(console.error);
