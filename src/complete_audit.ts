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

// Mirror exact React component functions
function calculateEspecialPriceWithAccumulated(pkg: any, startIdx: number, qty: number): { subtotal: number; precoUnitarioUsed: number } {
  if (!qty || qty <= 0) {
    return { subtotal: 0, precoUnitarioUsed: 0 };
  }
  if (!pkg.tiers || pkg.tiers.length === 0) {
    return { subtotal: 0, precoUnitarioUsed: 0 };
  }

  const totalQty = qty + startIdx;
  const tier = pkg.tiers.find((t: any) => totalQty >= t.minFotos && totalQty <= t.maxFotos)
    || pkg.tiers[pkg.tiers.length - 1]; // fallback to last tier
  const precoUnitario = tier ? tier.precoUnitario : 0;

  return {
    subtotal: qty * precoUnitario,
    precoUnitarioUsed: precoUnitario
  };
}

function calculateFixoMaisProgressivoPrice(pkg: any, pplCount: number, qtySold: number): { subtotal: number; precoUnitarioUsed: number } {
  const minPessoas = pkg.pessoasMinimas || 2;
  const basePessoas = Math.max(minPessoas, pplCount);
  const basePrice = basePessoas * (pkg.valorPorPessoa || 120);
  const baseFotos = basePessoas * (pkg.fotosPorPessoa || 3);

  const qtyExtra = Math.max(0, qtySold - baseFotos);
  if (qtyExtra <= 0) {
    return {
      subtotal: basePrice,
      precoUnitarioUsed: qtySold > 0 ? (basePrice / qtySold) : (basePessoas > 0 ? (basePrice / basePessoas) : 0)
    };
  }

  let extraUnitPrice = 0;
  if (pkg.tiers && pkg.tiers.length > 0) {
    const firstTierMin = pkg.tiers[0].minFotos;
    const lookupVal = firstTierMin >= baseFotos ? qtySold : qtyExtra;

    const tier = pkg.tiers.find((t: any) => lookupVal >= t.minFotos && lookupVal <= t.maxFotos)
      || pkg.tiers[pkg.tiers.length - 1];
    extraUnitPrice = tier ? tier.precoUnitario : 0;
  }

  const extraSubtotal = qtyExtra * extraUnitPrice;
  const subtotal = basePrice + extraSubtotal;

  return {
    subtotal,
    precoUnitarioUsed: qtySold > 0 ? (subtotal / qtySold) : 0
  };
}

async function audit() {
  console.log("=== INICIANDO AUDITORIA COMPLETA DE LANÇAMENTOS ===");
  try {
    const salesSnap = await getDocs(collection(db, 'sales'));
    const packagesSnap = await getDocs(collection(db, 'packages'));

    const packagesMap = new Map();
    packagesSnap.forEach(docSnap => {
      packagesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    });

    let totalSales = 0;
    let inconsistentSales: any[] = [];

    salesSnap.forEach(docSnap => {
      totalSales++;
      const sale = docSnap.data();
      const saleId = docSnap.id;
      const sacola = sale.sacolaItens || [];
      const valorTotal = sale.valorTotal || 0;
      const valorBruto = sale.valorBruto || 0;
      const nomeCliente = sale.nomeCliente || "Sem Nome";
      const data = sale.dataPagamento || sale.data || "Sem Data";
      const pessoas = Math.max(1, parseInt(sale.pessoas, 10) || 1);
      const fotosVendidas = parseInt(sale.fotosVendidas, 10) || 0;

      if (sacola.length === 0) {
        inconsistentSales.push({
          id: saleId,
          nomeCliente,
          data,
          valorTotal,
          valorBruto,
          pessoas,
          fotosVendidas,
          reason: "Sem itens na sacola (sacolaItens vazio)"
        });
        return;
      }

      let recalculatedSacola = [];
      let totalCalculated = 0;
      let hasMismatch = false;
      let runningAccumulatedPhotos = 0;

      for (const item of sacola) {
        const pkg = packagesMap.get(item.pacoteId);
        if (!pkg) {
          hasMismatch = true;
          recalculatedSacola.push({ ...item, error: "Pacote não encontrado" });
          continue;
        }

        const isVendaDireta = pkg.vendaDireta !== false;
        let itemSubtotal = 0;
        let itemPrecoUnitario = 0;
        const qty = item.quantidadeFotos || 0;

        // Determine how many photos this item contributes to progressive path
        let itemPhotos = 0;
        if (isVendaDireta) {
          if (pkg.fotosPacote !== undefined && pkg.fotosPacote > 0) {
            itemPhotos = pkg.fotosPacote;
          } else {
            itemPhotos = qty;
          }
        } else {
          itemPhotos = qty;
        }

        if (isVendaDireta) {
          if (pkg.tipoPreco === 'Standard') {
            itemSubtotal = (pkg.precoStandard || 0) * pessoas;
            itemPrecoUnitario = pkg.precoStandard || 0;
          } else if (pkg.tipoPreco === 'ProgressivoPessoa') {
            const p1 = pkg.precoPrimeiraPessoa ?? 0;
            const p2 = pkg.precoSegundaPessoa ?? 0;
            const pAdd = pkg.precoAdicionalPessoa ?? 0;
            if (pessoas === 1) {
              itemSubtotal = p1;
            } else if (pessoas === 2) {
              itemSubtotal = p1 + p2;
            } else if (pessoas >= 3) {
              itemSubtotal = p1 + p2 + ((pessoas - 2) * pAdd);
            }
            itemPrecoUnitario = pessoas > 0 ? (itemSubtotal / pessoas) : 0;
          } else if (pkg.tipoPreco === 'Foto') {
            itemSubtotal = (pkg.precoStandard || 0) * qty;
            itemPrecoUnitario = pkg.precoStandard || 0;
          } else if (pkg.tipoPreco === 'FixoMaisProgressivo') {
            const { subtotal, precoUnitarioUsed } = calculateFixoMaisProgressivoPrice(pkg, pessoas, qty);
            itemSubtotal = subtotal;
            itemPrecoUnitario = precoUnitarioUsed;
          } else if (pkg.tipoPreco === 'Especial') {
            const { subtotal, precoUnitarioUsed } = calculateEspecialPriceWithAccumulated(pkg, runningAccumulatedPhotos, qty);
            itemSubtotal = subtotal;
            itemPrecoUnitario = precoUnitarioUsed;
          }
        } else {
          if (qty <= 0) {
            itemSubtotal = 0;
            itemPrecoUnitario = 0;
          } else {
            if (pkg.tipoPreco === 'Standard') {
              itemSubtotal = (pkg.precoStandard || 0) * pessoas;
              itemPrecoUnitario = pkg.precoStandard || 0;
            } else if (pkg.tipoPreco === 'ProgressivoPessoa') {
              const p1 = pkg.precoPrimeiraPessoa ?? 0;
              const p2 = pkg.precoSegundaPessoa ?? 0;
              const pAdd = pkg.precoAdicionalPessoa ?? 0;
              if (pessoas === 1) {
                itemSubtotal = p1;
              } else if (pessoas === 2) {
                itemSubtotal = p1 + p2;
              } else if (pessoas >= 3) {
                itemSubtotal = p1 + p2 + ((pessoas - 2) * pAdd);
              }
              itemPrecoUnitario = pessoas > 0 ? (itemSubtotal / pessoas) : 0;
            } else if (pkg.tipoPreco === 'Foto') {
              itemSubtotal = (pkg.precoStandard || 0) * qty;
              itemPrecoUnitario = pkg.precoStandard || 0;
            } else if (pkg.tipoPreco === 'FixoMaisProgressivo') {
              const { subtotal, precoUnitarioUsed } = calculateFixoMaisProgressivoPrice(pkg, pessoas, qty);
              itemSubtotal = subtotal;
              itemPrecoUnitario = precoUnitarioUsed;
            } else if (pkg.tipoPreco === 'Especial') {
              const { subtotal, precoUnitarioUsed } = calculateEspecialPriceWithAccumulated(pkg, runningAccumulatedPhotos, qty);
              itemSubtotal = subtotal;
              itemPrecoUnitario = precoUnitarioUsed;
            }
          }
        }

        totalCalculated += itemSubtotal;
        runningAccumulatedPhotos += itemPhotos;

        const diff = Math.abs((item.subtotal || 0) - itemSubtotal);
        if (diff > 0.01) {
          hasMismatch = true;
        }

        recalculatedSacola.push({
          ...item,
          recalculatedSubtotal: itemSubtotal,
          recalculatedPrecoUnitario: itemPrecoUnitario,
          currentSubtotal: item.subtotal || 0,
        });
      }

      const totalDiff = Math.abs(valorTotal - totalCalculated);
      if (hasMismatch || totalDiff > 0.01) {
        inconsistentSales.push({
          id: saleId,
          nomeCliente,
          data,
          valorTotal,
          valorBruto,
          pessoas,
          fotosVendidas,
          currentSacola: sacola,
          recalculatedSacola,
          valorTotalCalculado: totalCalculated,
          reason: `Valor divergente. No faturamento: R$ ${valorTotal} | Calculado: R$ ${totalCalculated}`
        });
      }
    });

    console.log(`\n=== RESULTADOS DA AUDITORIA COMPLETA ===`);
    console.log(`Total de lançamentos analisados: ${totalSales}`);
    console.log(`Lançamentos inconsistentes: ${inconsistentSales.length}`);

    if (inconsistentSales.length > 0) {
      console.log("\nDETALHES DAS DISCREPÂNCIAS:");
      inconsistentSales.forEach((s, index) => {
        console.log(`\n[${index + 1}] ID: ${s.id}`);
        console.log(`   Cliente: ${s.nomeCliente} | Data: ${s.data}`);
        console.log(`   Pessoas: ${s.pessoas} | Fotos: ${s.fotosVendidas}`);
        console.log(`   Valor Registrado: R$ ${s.valorTotal}`);
        console.log(`   Valor Calculado: R$ ${s.valorTotalCalculado}`);
        console.log(`   Razão: ${s.reason}`);
        if (s.recalculatedSacola) {
          s.recalculatedSacola.forEach((item: any) => {
            console.log(`     - Pacote ID: ${item.pacoteId} (${item.nome})`);
            console.log(`       Quantidade: ${item.quantidadeFotos}`);
            console.log(`       Subtotal Registrado: R$ ${item.currentSubtotal}`);
            console.log(`       Subtotal Calculado: R$ ${item.recalculatedSubtotal}`);
          });
        }
      });
    } else {
      console.log(`\n✅ Sucesso absoluto! Nenhum lançamento possui divergências.`);
    }

  } catch (err) {
    console.error("Erro na auditoria:", err);
  }
}

audit();
