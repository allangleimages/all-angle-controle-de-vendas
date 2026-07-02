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
  console.log("Searching for Julia and Breno sales...");
  const salesSnap = await getDocs(collection(db, 'sales'));
  salesSnap.forEach(doc => {
    const data = doc.data();
    const name = (data.nomeCliente || "").toLowerCase();
    const val = data.valorTotal;
    const date = data.dataPagamento || data.data || "";
    
    if (name.includes("julia") || name.includes("breno") || val === 210 || date.startsWith("2026-06")) {
      if (name.includes("julia") || name.includes("breno") || val === 210) {
        console.log(`MATCH -> ID: ${doc.id}`);
        console.log(`  nomeCliente: ${data.nomeCliente}`);
        console.log(`  valorTotal: ${data.valorTotal}`);
        console.log(`  valorBruto: ${data.valorBruto}`);
        console.log(`  data: ${data.data}`);
        console.log(`  dataPagamento: ${data.dataPagamento}`);
        console.log(`  status: ${data.status}`);
        console.log(`  sacolaItens:`, JSON.stringify(data.sacolaItens));
        console.log(`  pessoas: ${data.pessoas}`);
        console.log(`  fotosVendidas: ${data.fotosVendidas}`);
        console.log(`  fotosEnviadas: ${data.fotosEnviadas}`);
      }
    }
  });
}

run();
