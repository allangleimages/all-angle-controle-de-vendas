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
  const colSnap = await getDocs(collection(db, 'packages'));
  const packagesMap = new Map();
  colSnap.forEach(doc => {
    packagesMap.set(doc.id, doc.data());
    console.log(`Pacote: ID=${doc.id} | Nome=${doc.data().nomePacote} | tipoPreco=${doc.data().tipoPreco}`);
  });

  const salesSnap = await getDocs(collection(db, 'sales'));
  salesSnap.forEach(doc => {
    const sale = doc.data();
    const hasSemEstrutura = sale.sacolaItens?.some((item: any) => {
      const pkg = packagesMap.get(item.pacoteId);
      return pkg?.tipoPreco === 'SemEstrutura';
    });

    if (hasSemEstrutura || !sale.sacolaItens || sale.sacolaItens.length === 0) {
      console.log(`\n=== SALE WITH SEM_ESTRUTURA OR EMPTY SACOLA ===`);
      console.log(`ID: ${doc.id}`);
      console.log(`Cliente: ${sale.nomeCliente}`);
      console.log(`Status: ${sale.status}`);
      console.log(`Data Lançamento: ${sale.data}`);
      console.log(`Data Pagamento: ${sale.dataPagamento}`);
      console.log(`Valor Total: ${sale.valorTotal}`);
      console.log(`Sacola Itens: ${JSON.stringify(sale.sacolaItens)}`);
    }
  });
}

run().catch(console.error);
