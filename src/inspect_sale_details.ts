import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { calculateCollaboratorCommission, calculatePartnerCommission, calculateSaleTaxes } from './utils/finance';

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
  const collabSnap = await getDocs(collection(db, 'collaborators'));
  const collabs = collabSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const partnerSnap = await getDocs(collection(db, 'partners'));
  const partners = partnerSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const activitySnap = await getDocs(collection(db, 'activities'));
  const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const salesSnap = await getDocs(collection(db, 'sales'));
  const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  console.log("=== CALCULATING FOR SEM_ESTRUTURA SALES ===");
  for (const sale of sales) {
    const isSemEstrutura = sale.sacolaItens?.some((item: any) => {
      return item.pacoteId === "package-75mxzrxuo" || item.pacoteId === "package-dsv9v19t9" || item.pacoteId === "package-h9myoy0sa";
    });

    if (isSemEstrutura) {
      const collab = collabs.find(c => c.id === sale.vendedorId);
      const partner = partners.find(p => p.id === sale.parceiroId);
      const act = activities.find(a => a.id === sale.atividadeId);

      const rawVComm = calculateCollaboratorCommission(sale, collab, act);
      const pComm = calculatePartnerCommission(sale, partner, act);

      console.log(`\nSale ID: ${sale.id} | Cliente: ${sale.nomeCliente}`);
      console.log(`  vendedorId: ${sale.vendedorId} (${collab?.nomeCompleto || 'Desconhecido'})`);
      console.log(`  atividadeId: ${sale.atividadeId} (${act?.nomeAtividade || 'Nenhuma/Inválida'})`);
      console.log(`  parceiroId: ${sale.parceiroId} (${partner?.nomeParceiro || 'Nenhum'})`);
      console.log(`  valorTotal: ${sale.valorTotal}`);
      console.log(`  calculatedTeamComm: ${rawVComm}`);
      console.log(`  calculatedPartnerComm: ${pComm}`);
    }
  }
}

run().catch(console.error);
