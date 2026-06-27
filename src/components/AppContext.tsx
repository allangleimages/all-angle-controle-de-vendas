import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sale, Collaborator, Partner, Activity, Package, FeeRule } from '../types';
import { StoreManager } from '../store';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, setDoc as fstoreSetDoc, deleteDoc } from 'firebase/firestore';
import { compressImageBase64 } from '../utils/image';

// Helper to recursively remove undefined properties from objects so we never trigger Firestore errors
function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const setDoc = (docRef: any, data: any, options?: any) => {
  return fstoreSetDoc(docRef, removeUndefinedFields(data), options);
};

interface AppContextType {
  currentUser: Collaborator;
  currentUserEmail: string;
  originalAdminEmail: string;
  isAuthenticated: boolean;
  sales: Sale[];
  collaborators: Collaborator[];
  partners: Partner[];
  activities: Activity[];
  packages: Package[];
  paidCommissions: Record<string, boolean>; // key: "vendedor-id-year-month" or "partner-id-year-month"
  feeRules: FeeRule[];
  setCurrentUserByEmail: (email: string) => void;
  
  // CRUD Sales
  addSale: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Sale;
  updateSale: (id: string, updated: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  markSaleAsPaid: (id: string) => void;

  // CRUD Team
  addCollaborator: (collab: Omit<Collaborator, 'id'>) => Collaborator;
  updateCollaborator: (id: string, updated: Partial<Collaborator>) => void;
  deleteCollaborator: (id: string) => void;

  // CRUD Partners
  addPartner: (partner: Omit<Partner, 'id' | 'status'> & { status?: 'Aprovado' | 'Pendente de Aprovação' }) => Partner;
  updatePartner: (id: string, updated: Partial<Partner>) => void;
  approvePartner: (id: string) => void;
  deletePartner: (id: string) => void;

  // CRUD Activities
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, updated: Partial<Activity>) => void;

  // CRUD Packages
  addPackage: (pkg: Omit<Package, 'id' | 'arquivado'>) => void;
  updatePackage: (id: string, updated: Partial<Package>) => void;
  archivePackage: (id: string) => void;
  deletePackage: (id: string) => void;

  // CRUD FeeRules
  addFeeRule: (rule: Omit<FeeRule, 'id'>) => void;
  updateFeeRule: (id: string, updated: Partial<FeeRule>) => void;
  deleteFeeRule: (id: string) => void;

  // Financial reconciliation toggles
  toggleRepassePaid: (key: string) => void;

  // Advanced synchronization and clean reboot methods
  forcePushLocalToCloud: () => Promise<void>;
  forcePullCloudToLocal: () => Promise<void>;
  wipeAllSystemData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => StoreManager.getCurrentUserEmail());
  const [originalAdminEmail, setOriginalAdminEmail] = useState<string>(() => {
    const current = StoreManager.getCurrentUserEmail();
    const saved = localStorage.getItem('all_angle_original_admin_email') || '';
    if (current.toLowerCase() === 'info@allangle.com.br') {
      localStorage.setItem('all_angle_original_admin_email', 'info@allangle.com.br');
      return 'info@allangle.com.br';
    }
    return saved;
  });
  const [sales, setSales] = useState<Sale[]>(() => StoreManager.getSales());
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => StoreManager.getCollaborators());
  const [partners, setPartners] = useState<Partner[]>(() => StoreManager.getPartners());
  const [activities, setActivities] = useState<Activity[]>(() => StoreManager.getActivities());
  const [packages, setPackages] = useState<Package[]>(() => StoreManager.getPackages());
  const [paidCommissions, setPaidCommissions] = useState<Record<string, boolean>>(() => StoreManager.getPaidCommissions());
  const [feeRules, setFeeRules] = useState<FeeRule[]>(() => StoreManager.getFeeRules());

  // Background execution for status auto-aging and Firestore sync
  useEffect(() => {
    const today = new Date();
    let changed = false;
    const agedSales = sales.map(sale => {
      if (sale.status === 'Pendente') {
        const saleDate = new Date(sale.data + 'T00:00:00');
        const diffDays = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
          changed = true;
          return { ...sale, status: 'Archived' as const };
        } else if (diffDays >= 7) {
          changed = true;
          return { ...sale, status: 'Abandonada' as const };
        }
      } else if (sale.status === 'Abandonada') {
        const saleDate = new Date(sale.data + 'T00:00:00');
        const diffDays = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
          changed = true;
          return { ...sale, status: 'Archived' as const };
        }
      }
      return sale;
    });

    if (changed) {
      setSales(agedSales);
      // Persist the auto-aged statuses directly to Firestore to prevent remote state overriding them
      agedSales.forEach(s => {
        const original = sales.find(o => o.id === s.id);
        if (original && original.status !== s.status) {
          setDoc(doc(db, "sales", s.id), s).catch(err => {
            console.error(`Error saving aged sale on mount ${s.id}:`, err);
          });
        }
      });
    }

    // Dynamic Sincronização do Firestore
    const syncFirestore = async () => {
      try {
        console.log("Iniciando sincronização com o Firestore de forma segura (Two-Way Merge)...");

        const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const map = new Map<string, T>();
          // Remote values are generally standard
          remote.forEach(item => map.set(item.id, item));
          // Local/Custom values merge over or add missing
          local.forEach(item => {
            if (map.has(item.id)) {
              map.set(item.id, { ...map.get(item.id)!, ...item });
            } else {
              map.set(item.id, item);
            }
          });
          return Array.from(map.values());
        };

        // A. Primeiro, limpa fotos locais pesadas para assegurar conformidade de tamanho do Firestore (limite de 1MB)
        const currentLocalCollabsBeforeSync = StoreManager.getCollaborators();
        let collabsChanged = false;
        const cleanedCollabs = await Promise.all(currentLocalCollabsBeforeSync.map(async (c) => {
          if (c.foto && c.foto.startsWith('data:image/') && c.foto.length > 102400) {
            try {
              console.log(`[Auto-Cleanup] Comprimindo foto pesada do colaborador ${c.nomeCompleto} (${c.foto.length} bytes)...`);
              const compressed = await compressImageBase64(c.foto, 180, 180, 0.7);
              collabsChanged = true;
              return { ...c, foto: compressed };
            } catch (e) {
              console.error("Erro durante auto-compressão de colaborador local:", e);
            }
          }
          return c;
        }));

        if (collabsChanged) {
          StoreManager.saveCollaborators(cleanedCollabs);
          setCollaborators(cleanedCollabs);
        }

        const currentLocalPartnersBeforeSync = StoreManager.getPartners();
        let partnersChanged = false;
        const cleanedPartners = await Promise.all(currentLocalPartnersBeforeSync.map(async (p) => {
          if (p.foto && p.foto.startsWith('data:image/') && p.foto.length > 102400) {
            try {
              console.log(`[Auto-Cleanup] Comprimindo foto pesada do parceiro ${p.nomeParceiro} (${p.foto.length} bytes)...`);
              const compressed = await compressImageBase64(p.foto, 180, 180, 0.7);
              partnersChanged = true;
              return { ...p, foto: compressed };
            } catch (e) {
              console.error("Erro durante auto-compressão de parceiro local:", e);
            }
          }
          return p;
        }));

        if (partnersChanged) {
          StoreManager.savePartners(cleanedPartners);
          setPartners(cleanedPartners);
        }

        // 1. COLLABORATORS (Firestore-First Safe Sync)
        const colSnap = await getDocs(collection(db, "collaborators")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "collaborators");
          return null;
        });
        const remoteCollabs: Collaborator[] = [];
        if (colSnap && !colSnap.empty) {
          colSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remoteCollabs.push(data as Collaborator);
          });
        }

        let finalCollabs: Collaborator[] = [];
        if (remoteCollabs.length > 0) {
          // If Firestore contains data, believe it as the master source of truth. Do not re-upload old local state!
          finalCollabs = remoteCollabs;
        } else {
          // Empty remote database - seed it safely with current local state
          finalCollabs = collabsChanged ? cleanedCollabs : currentLocalCollabsBeforeSync;
          for (const c of finalCollabs) {
            await setDoc(doc(db, "collaborators", c.id), c).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `collaborators/${c.id}`);
            });
          }
        }

        // De-duplicate by lowercased email strictly to avoid duplicates
        const uniqueEmailCollabMap = new Map<string, Collaborator>();
        finalCollabs.forEach(c => {
          if (c && c.email) {
            uniqueEmailCollabMap.set(c.email.toLowerCase().trim(), c);
          }
        });
        const finalUniqueCollabs = Array.from(uniqueEmailCollabMap.values());

        setCollaborators(finalUniqueCollabs);
        StoreManager.saveCollaborators(finalUniqueCollabs);

        // 2. PARTNERS (Firestore-First Safe Sync)
        const partSnap = await getDocs(collection(db, "partners")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "partners");
          return null;
        });
        const remotePartners: Partner[] = [];
        if (partSnap && !partSnap.empty) {
          partSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remotePartners.push(data as Partner);
          });
        }

        let finalPartners: Partner[] = [];
        if (remotePartners.length > 0) {
          finalPartners = remotePartners;
        } else {
          finalPartners = partnersChanged ? cleanedPartners : currentLocalPartnersBeforeSync;
          for (const p of finalPartners) {
            await setDoc(doc(db, "partners", p.id), p).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `partners/${p.id}`);
            });
          }
        }
        setPartners(finalPartners);
        StoreManager.savePartners(finalPartners);

        // 3. ACTIVITIES (Firestore-First Safe Sync)
        const actSnap = await getDocs(collection(db, "activities")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "activities");
          return null;
        });
        const remoteActivities: Activity[] = [];
        if (actSnap && !actSnap.empty) {
          actSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remoteActivities.push(data as Activity);
          });
        }

        let finalActivities: Activity[] = [];
        if (remoteActivities.length > 0) {
          finalActivities = remoteActivities;
        } else {
          finalActivities = StoreManager.getActivities();
          for (const a of finalActivities) {
            await setDoc(doc(db, "activities", a.id), a).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `activities/${a.id}`);
            });
          }
        }
        setActivities(finalActivities);
        StoreManager.saveActivities(finalActivities);

        // 4. PACKAGES (Firestore-First Safe Sync)
        const pkgSnap = await getDocs(collection(db, "packages")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "packages");
          return null;
        });
        const remotePackages: Package[] = [];
        if (pkgSnap && !pkgSnap.empty) {
          pkgSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remotePackages.push(data as Package);
          });
        }

        let finalPackages: Package[] = [];
        if (remotePackages.length > 0) {
          finalPackages = remotePackages;
        } else {
          finalPackages = StoreManager.getPackages();
          for (const pkg of finalPackages) {
            await setDoc(doc(db, "packages", pkg.id), pkg).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `packages/${pkg.id}`);
            });
          }
        }
        setPackages(finalPackages);
        StoreManager.savePackages(finalPackages);

        // 4.5. FEE RULES (Firestore-First Safe Sync)
        const feeSnap = await getDocs(collection(db, "feeRules")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "feeRules");
          return null;
        });
        const remoteFeeRules: FeeRule[] = [];
        if (feeSnap && !feeSnap.empty) {
          feeSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remoteFeeRules.push(data as FeeRule);
          });
        }

        let finalFeeRules: FeeRule[] = [];
        if (remoteFeeRules.length > 0) {
          finalFeeRules = remoteFeeRules;
        } else {
          finalFeeRules = StoreManager.getFeeRules();
          for (const rule of finalFeeRules) {
            await setDoc(doc(db, "feeRules", rule.id), rule).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `feeRules/${rule.id}`);
            });
          }
        }
        setFeeRules(finalFeeRules);
        StoreManager.saveFeeRules(finalFeeRules);

        // 5. SALES (Firestore-First Safe Sync)
        const saleSnap = await getDocs(collection(db, "sales")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "sales");
          return null;
        });
        const remoteSales: Sale[] = [];
        if (saleSnap && !saleSnap.empty) {
          saleSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.id) remoteSales.push(data as Sale);
          });
        }

        let finalSales: Sale[] = [];
        if (remoteSales.length > 0) {
          finalSales = remoteSales;
        } else {
          finalSales = StoreManager.getSales();
          for (const s of finalSales) {
            await setDoc(doc(db, "sales", s.id), s).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `sales/${s.id}`);
            });
          }
        }

        // Automatic Retroactive Audit & Recalculation (Valor Bruto = Valor Total pós-desconto) + Auto-Aging
        let migratedCount = 0;
        finalSales = await Promise.all(finalSales.map(async (s) => {
          let sChanged = false;
          let updatedStatus = s.status;

          if (s.status === 'Pendente') {
            const saleDate = new Date(s.data + 'T00:00:00');
            const diffDays = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= 30) {
              updatedStatus = 'Archived' as const;
              sChanged = true;
            } else if (diffDays >= 7) {
              updatedStatus = 'Abandonada' as const;
              sChanged = true;
            }
          } else if (s.status === 'Abandonada') {
            const saleDate = new Date(s.data + 'T00:00:00');
            const diffDays = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= 30) {
              updatedStatus = 'Archived' as const;
              sChanged = true;
            }
          }

          let updatedSale = { ...s };
          if (sChanged) {
            updatedSale.status = updatedStatus;
          }

          if (updatedSale.valorBruto !== updatedSale.valorTotal) {
            migratedCount++;
            updatedSale.valorBruto = updatedSale.valorTotal;
            sChanged = true;
          }

          if (sChanged) {
            await setDoc(doc(db, "sales", s.id), updatedSale).catch(err => {
              console.error(`Migration/Aging error on sale ${s.id}:`, err);
            });
            return updatedSale;
          }

          return s;
        }));
        if (migratedCount > 0) {
          console.log(`Auditoria Retroativa: ${migratedCount} lançamentos auditados e recalculados com a nova lógica de faturamento.`);
        }
        finalSales.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setSales(finalSales);
        StoreManager.saveSales(finalSales);

        // 6. PAID COMMISSIONS (Firestore-First Safe Sync)
        const commSnap = await getDocs(collection(db, "paidCommissions")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "paidCommissions");
          return null;
        });
        const remoteCommissions: Record<string, boolean> = {};
        if (commSnap && !commSnap.empty) {
          commSnap.forEach(docObj => {
            const data = docObj.data();
            if (data && data.key) {
              remoteCommissions[data.key] = !!data.paid;
            }
          });
        }

        let finalCommissions: Record<string, boolean> = {};
        if (Object.keys(remoteCommissions).length > 0) {
          finalCommissions = remoteCommissions;
        } else {
          finalCommissions = StoreManager.getPaidCommissions();
          for (const key of Object.keys(finalCommissions)) {
            await setDoc(doc(db, "paidCommissions", key), { key, paid: finalCommissions[key] }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `paidCommissions/${key}`);
            });
          }
        }
        setPaidCommissions(finalCommissions);
        StoreManager.savePaidCommissions(finalCommissions);

        console.log("Sincronização com o Firestore concluída com sucesso!");
      } catch (err) {
        console.error("Falha geral na sincronização com o Firestore:", err);
      }
    };

    syncFirestore();
  }, []);

  // Derive Current User Account
  const [currentUser, setCurrentUser] = useState<Collaborator>(() => {
    const list = StoreManager.getCollaborators();
    const found = list.find(c => c.email.toLowerCase() === currentUserEmail.toLowerCase());
    if (found) return found;
    // Fallback if missing
    return list[0] || {
      id: 'admin-root',
      nomeCompleto: 'ALL ANGLE ADMIN',
      email: 'info@allangle.com.br',
      cargo: 'Admin',
      status: 'Ativo',
      tipoChavePix: 'E-mail',
      chavePix: 'info@allangle.com.br',
      atividadesPermitidas: []
    };
  });

  // Keep state sync with active user selection
  useEffect(() => {
    const found = collaborators.find(c => c.email.toLowerCase() === currentUserEmail.toLowerCase());
    if (found) {
      setCurrentUser(found);
    }
  }, [currentUserEmail, collaborators]);

  const setCurrentUserByEmail = (email: string) => {
    setCurrentUserEmail(email);
    StoreManager.setCurrentUserEmail(email);
    if (email.toLowerCase() === 'info@allangle.com.br') {
      setOriginalAdminEmail('info@allangle.com.br');
      localStorage.setItem('all_angle_original_admin_email', 'info@allangle.com.br');
    } else if (!email) {
      setOriginalAdminEmail('');
      localStorage.removeItem('all_angle_original_admin_email');
    }
  };

  // Sync to Storage helpers
  useEffect(() => {
    StoreManager.saveSales(sales);
  }, [sales]);

  useEffect(() => {
    StoreManager.saveCollaborators(collaborators);
  }, [collaborators]);

  useEffect(() => {
    StoreManager.savePartners(partners);
  }, [partners]);

  useEffect(() => {
    StoreManager.saveActivities(activities);
  }, [activities]);

  useEffect(() => {
    StoreManager.savePackages(packages);
  }, [packages]);

  useEffect(() => {
    StoreManager.savePaidCommissions(paidCommissions);
  }, [paidCommissions]);

  useEffect(() => {
    StoreManager.saveFeeRules(feeRules);
  }, [feeRules]);

  // SALES LOGICS
  const addSale = (saleData: Omit<Sale, 'id' | 'createdAt'>): Sale => {
    const newId = `sale-${Math.random().toString(36).substr(2, 9)}`;
    const newSale: Sale = {
      ...saleData,
      id: newId,
      createdAt: new Date().toISOString()
    };
    
    // Auto-stamping paymentDate if marked as Pago
    if (newSale.status === 'Pago') {
      const today = new Date();
      const monthStr = String(today.getMonth() + 1).padStart(2, '0');
      const dayStr = String(today.getDate()).padStart(2, '0');
      newSale.dataPagamento = `${today.getFullYear()}-${monthStr}-${dayStr}`;
    }

    setSales(prev => [newSale, ...prev]);

    setDoc(doc(db, "sales", newId), newSale).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `sales/${newId}`);
    });

    return newSale;
  };

  const updateSale = (id: string, updated: Partial<Sale>) => {
    setSales(prev => prev.map(sale => {
      if (sale.id !== id) return sale;

      const merged = { ...sale, ...updated };

      // Automate payment date registration upon transitioning to "Pago"
      if (updated.status === 'Pago' && sale.status !== 'Pago') {
        const today = new Date();
        const monthStr = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(today.getDate()).padStart(2, '0');
        merged.dataPagamento = `${today.getFullYear()}-${monthStr}-${dayStr}`;
        if (sale.status === 'Abandonada') {
          merged.wasAbandoned = true;
          merged.notas = merged.notas ? `${merged.notas} (Recuperada pós abandono)` : 'Recuperada pós abandono';
        }
      } else if (updated.status && updated.status !== 'Pago') {
        // Clear payment date if revoked
        delete merged.dataPagamento;
      }

      setDoc(doc(db, "sales", id), merged).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `sales/${id}`);
      });

      return merged;
    }));
  };

  const deleteSale = (id: string) => {
    setSales(prev => prev.filter(sale => sale.id !== id));
    deleteDoc(doc(db, "sales", id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `sales/${id}`);
    });
  };

  const markSaleAsPaid = (id: string) => {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const dataPagamento = `${today.getFullYear()}-${monthStr}-${dayStr}`;

    setSales(prev => prev.map(sale => {
      if (sale.id === id) {
        const updated = {
          ...sale,
          status: 'Pago' as const,
          dataPagamento
        };
        setDoc(doc(db, "sales", id), updated).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `sales/${id}`);
        });
        return updated;
      }
      return sale;
    }));
  };

  // COLLABORATORS
  const addCollaborator = (collab: Omit<Collaborator, 'id'>): Collaborator => {
    const id = `collab-${Math.random().toString(36).substr(2, 9)}`;
    const newCollab = { ...collab, id };
    setCollaborators(prev => [...prev, newCollab]);

    const processAndWrite = async () => {
      let finalCollab = { ...newCollab };
      if (collab.foto && collab.foto.startsWith('data:image/') && collab.foto.length > 102400) {
        try {
          const comp = await compressImageBase64(collab.foto, 180, 180, 0.7);
          finalCollab.foto = comp;
          setCollaborators(prev => prev.map(c => c.id === id ? finalCollab : c));
        } catch (e) {
          console.error("Erro ao comprimir foto no addCollaborator:", e);
        }
      }
      await setDoc(doc(db, "collaborators", id), finalCollab).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `collaborators/${id}`);
      });
    };
    processAndWrite();

    return newCollab;
  };

  const updateCollaborator = (id: string, updated: Partial<Collaborator>) => {
    const processAndUpdate = async () => {
      let finalUpdated = { ...updated };
      if (updated.foto && updated.foto.startsWith('data:image/') && updated.foto.length > 102400) {
        try {
          const comp = await compressImageBase64(updated.foto, 180, 180, 0.7);
          finalUpdated.foto = comp;
        } catch (e) {
          console.error("Erro ao comprimir foto no updateCollaborator:", e);
        }
      }

      setCollaborators(prev => {
        const newList = prev.map(collab => {
          if (collab.id === id) {
            const merged = { ...collab, ...finalUpdated };
            setDoc(doc(db, "collaborators", id), merged).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `collaborators/${id}`);
            });
            return merged;
          }
          return collab;
        });
        return newList;
      });
    };

    processAndUpdate();
  };

  const deleteCollaborator = (id: string) => {
    setSales(prev => {
      const remainingSales = prev.filter(sale => sale.vendedorId !== id);
      const deletedSales = prev.filter(sale => sale.vendedorId === id);
      deletedSales.forEach(s => {
        deleteDoc(doc(db, "sales", s.id)).catch(() => {});
      });
      return remainingSales;
    });

    setCollaborators(prev => prev.filter(collab => collab.id !== id));
    deleteDoc(doc(db, "collaborators", id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `collaborators/${id}`);
    });

    setActivities(prev => prev.map(act => {
      const updated = {
        ...act,
        comissoesCustomizadas: act.comissoesCustomizadas ? act.comissoesCustomizadas.filter(rule => rule.alvoId !== id) : [],
        membrosElegiveis: act.membrosElegiveis ? act.membrosElegiveis.filter(mid => mid !== id) : []
      };
      setDoc(doc(db, "activities", act.id), updated).catch(() => {});
      return updated;
    }));
  };

  // PARTNERS (SUPPORTING ON THE FLY CREATION)
  const addPartner = (partner: Omit<Partner, 'id' | 'status'> & { status?: 'Aprovado' | 'Pendente de Aprovação' }): Partner => {
    const newId = `partner-${Math.random().toString(36).substr(2, 9)}`;
    const newPartner: Partner = {
      ...partner,
      id: newId,
      status: partner.status || 'Aprovado'
    };
    setPartners(prev => [...prev, newPartner]);

    const processAndWrite = async () => {
      let finalPartner = { ...newPartner };
      if (partner.foto && partner.foto.startsWith('data:image/') && partner.foto.length > 102400) {
        try {
          const comp = await compressImageBase64(partner.foto, 180, 180, 0.7);
          finalPartner.foto = comp;
          setPartners(prev => prev.map(p => p.id === newId ? finalPartner : p));
        } catch (e) {
          console.error("Erro ao comprimir foto no addPartner:", e);
        }
      }
      await setDoc(doc(db, "partners", newId), finalPartner).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `partners/${newId}`);
      });
    };
    processAndWrite();

    return newPartner;
  };

  const updatePartner = (id: string, updated: Partial<Partner>) => {
    const processAndUpdate = async () => {
      let finalUpdated = { ...updated };
      if (updated.foto && updated.foto.startsWith('data:image/') && updated.foto.length > 102400) {
        try {
          const comp = await compressImageBase64(updated.foto, 180, 180, 0.7);
          finalUpdated.foto = comp;
        } catch (e) {
          console.error("Erro ao comprimir foto no updatePartner:", e);
        }
      }

      setPartners(prev => {
        const newList = prev.map(partner => {
          if (partner.id === id) {
            const merged = { ...partner, ...finalUpdated };
            setDoc(doc(db, "partners", id), merged).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `partners/${id}`);
            });
            return merged;
          }
          return partner;
        });
        return newList;
      });
    };

    processAndUpdate();
  };

  const approvePartner = (id: string) => {
    setPartners(prev => prev.map(partner => {
      if (partner.id === id) {
        const merged = { ...partner, status: 'Aprovado' as const };
        setDoc(doc(db, "partners", id), merged).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `partners/${id}`);
        });
        return merged;
      }
      return partner;
    }));
  };

  const deletePartner = (id: string) => {
    setPartners(prev => prev.filter(partner => partner.id !== id));
    deleteDoc(doc(db, "partners", id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `partners/${id}`);
    });
  };

  // ACTIVITIES
  const addActivity = (activity: Omit<Activity, 'id'>) => {
    const id = `activity-${Math.random().toString(36).substr(2, 9)}`;
    const newActivity = { ...activity, id };
    setActivities(prev => [...prev, newActivity]);

    setDoc(doc(db, "activities", id), newActivity).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `activities/${id}`);
    });
  };

  const updateActivity = (id: string, updated: Partial<Activity>) => {
    setActivities(prev => prev.map(act => {
      if (act.id === id) {
        const merged = { ...act, ...updated };
        setDoc(doc(db, "activities", id), merged).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `activities/${id}`);
        });
        return merged;
      }
      return act;
    }));
  };

  // PACKAGES
  const addPackage = (pkg: Omit<Package, 'id' | 'arquivado'>) => {
    const id = `package-${Math.random().toString(36).substr(2, 9)}`;
    const newPkg = { ...pkg, id, arquivado: false };
    setPackages(prev => [...prev, newPkg]);

    setDoc(doc(db, "packages", id), newPkg).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `packages/${id}`);
    });
  };

  const updatePackage = (id: string, updated: Partial<Package>) => {
    setPackages(prev => prev.map(pkg => {
      if (pkg.id === id) {
        const merged = { ...pkg, ...updated };
        setDoc(doc(db, "packages", id), merged).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `packages/${id}`);
        });
        return merged;
      }
      return pkg;
    }));
  };

  // Gold Rule: archiving to protect historical integrity
  const archivePackage = (id: string) => {
    setPackages(prev => prev.map(pkg => {
      if (pkg.id === id) {
        const merged = { ...pkg, arquivado: true };
        setDoc(doc(db, "packages", id), merged).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `packages/${id}`);
        });
        return merged;
      }
      return pkg;
    }));
  };

  const deletePackage = (id: string) => {
    setPackages(prev => prev.filter(pkg => pkg.id !== id));
    deleteDoc(doc(db, "packages", id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `packages/${id}`);
    });
  };

  // REPASSE QUIET SYSTEM
  const toggleRepassePaid = (key: string) => {
    setPaidCommissions(prev => {
      const updatedValue = !prev[key];
      const updated = {
        ...prev,
        [key]: updatedValue
      };

      setDoc(doc(db, "paidCommissions", key), { key, paid: updatedValue }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `paidCommissions/${key}`);
      });

      return updated;
    });
  };

  // FEE RULES LOGICS
  const addFeeRule = (rule: Omit<FeeRule, 'id'>) => {
    const id = `feerule-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: FeeRule = { ...rule, id, arquivado: false };
    setFeeRules(prev => [...prev, newRule]);
    setDoc(doc(db, "feeRules", id), newRule).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `feeRules/${id}`);
    });
  };

  const updateFeeRule = (id: string, updated: Partial<FeeRule>) => {
    setFeeRules(prev => prev.map(rule => {
      if (rule.id === id) {
        const merged = { ...rule, ...updated };
        setDoc(doc(db, "feeRules", id), merged).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `feeRules/${id}`);
        });
        return merged;
      }
      return rule;
    }));
  };

  const deleteFeeRule = (id: string) => {
    setFeeRules(prev => prev.filter(rule => rule.id !== id));
    deleteDoc(doc(db, "feeRules", id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `feeRules/${id}`);
    });
  };

  // FORCED PUSH: Overwrite Firestore with current client local storage data
  const forcePushLocalToCloud = async () => {
    try {
      console.log("Forçando envio do estado local para a nuvem...");

      // A. Collaborators
      const colSnap = await getDocs(collection(db, "collaborators"));
      if (colSnap && !colSnap.empty) {
        for (const docObj of colSnap.docs) {
          await deleteDoc(doc(db, "collaborators", docObj.id)).catch(() => {});
        }
      }
      for (const c of collaborators) {
        await setDoc(doc(db, "collaborators", c.id), c).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `collaborators/${c.id}`);
        });
      }

      // B. Partners
      const partSnap = await getDocs(collection(db, "partners"));
      if (partSnap && !partSnap.empty) {
        for (const docObj of partSnap.docs) {
          await deleteDoc(doc(db, "partners", docObj.id)).catch(() => {});
        }
      }
      for (const p of partners) {
        await setDoc(doc(db, "partners", p.id), p).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `partners/${p.id}`);
        });
      }

      // C. Activities
      const actSnap = await getDocs(collection(db, "activities"));
      if (actSnap && !actSnap.empty) {
        for (const docObj of actSnap.docs) {
          await deleteDoc(doc(db, "activities", docObj.id)).catch(() => {});
        }
      }
      for (const a of activities) {
        await setDoc(doc(db, "activities", a.id), a).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `activities/${a.id}`);
        });
      }

      // D. Packages
      const pkgSnap = await getDocs(collection(db, "packages"));
      if (pkgSnap && !pkgSnap.empty) {
        for (const docObj of pkgSnap.docs) {
          await deleteDoc(doc(db, "packages", docObj.id)).catch(() => {});
        }
      }
      for (const pkg of packages) {
        await setDoc(doc(db, "packages", pkg.id), pkg).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `packages/${pkg.id}`);
        });
      }

      // D.5. Fee Rules
      const feePushSnap = await getDocs(collection(db, "feeRules"));
      if (feePushSnap && !feePushSnap.empty) {
        for (const docObj of feePushSnap.docs) {
          await deleteDoc(doc(db, "feeRules", docObj.id)).catch(() => {});
        }
      }
      for (const rule of feeRules) {
        await setDoc(doc(db, "feeRules", rule.id), rule).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `feeRules/${rule.id}`);
        });
      }

      // E. Sales
      const saleSnap = await getDocs(collection(db, "sales"));
      if (saleSnap && !saleSnap.empty) {
        for (const docObj of saleSnap.docs) {
          await deleteDoc(doc(db, "sales", docObj.id)).catch(() => {});
        }
      }
      for (const s of sales) {
        await setDoc(doc(db, "sales", s.id), s).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `sales/${s.id}`);
        });
      }

      // F. PaidCommissions
      const commSnap = await getDocs(collection(db, "paidCommissions"));
      if (commSnap && !commSnap.empty) {
        for (const docObj of commSnap.docs) {
          await deleteDoc(doc(db, "paidCommissions", docObj.id)).catch(() => {});
        }
      }
      for (const key of Object.keys(paidCommissions)) {
        await setDoc(doc(db, "paidCommissions", key), { key, paid: paidCommissions[key] }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `paidCommissions/${key}`);
        });
      }

      console.log("Sobrescrita do Firestore efetuada com sucesso!");
    } catch (err) {
      console.error("Falha ao forçar envio para a nuvem:", err);
      throw err;
    }
  };

  // FORCED PULL: Overwrite local storage with exactly what's currently in Firestore database
  const forcePullCloudToLocal = async () => {
    try {
      console.log("Forçando download do estado da nuvem para o local...");

      // A. Collaborators
      const colSnap = await getDocs(collection(db, "collaborators"));
      const freshCollabs: Collaborator[] = [];
      if (colSnap && !colSnap.empty) {
        colSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshCollabs.push(data as Collaborator);
        });
      }
      setCollaborators(freshCollabs);
      StoreManager.saveCollaborators(freshCollabs);

      // B. Partners
      const partSnap = await getDocs(collection(db, "partners"));
      const freshPartners: Partner[] = [];
      if (partSnap && !partSnap.empty) {
        partSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshPartners.push(data as Partner);
        });
      }
      setPartners(freshPartners);
      StoreManager.savePartners(freshPartners);

      // C. Activities
      const actSnap = await getDocs(collection(db, "activities"));
      const freshActivities: Activity[] = [];
      if (actSnap && !actSnap.empty) {
        actSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshActivities.push(data as Activity);
        });
      }
      setActivities(freshActivities);
      StoreManager.saveActivities(freshActivities);

      // D. Packages
      const pkgSnap = await getDocs(collection(db, "packages"));
      const freshPackages: Package[] = [];
      if (pkgSnap && !pkgSnap.empty) {
        pkgSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshPackages.push(data as Package);
        });
      }
      setPackages(freshPackages);
      StoreManager.savePackages(freshPackages);

      // D.5. Fee Rules
      const feePullSnap = await getDocs(collection(db, "feeRules"));
      const freshFeeRules: FeeRule[] = [];
      if (feePullSnap && !feePullSnap.empty) {
        feePullSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshFeeRules.push(data as FeeRule);
        });
      }
      setFeeRules(freshFeeRules);
      StoreManager.saveFeeRules(freshFeeRules);

      // E. Sales
      const saleSnap = await getDocs(collection(db, "sales"));
      const freshSales: Sale[] = [];
      if (saleSnap && !saleSnap.empty) {
        saleSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.id) freshSales.push(data as Sale);
        });
      }
      setSales(freshSales);
      StoreManager.saveSales(freshSales);

      // F. PaidCommissions
      const commSnap = await getDocs(collection(db, "paidCommissions"));
      const freshComms: Record<string, boolean> = {};
      if (commSnap && !commSnap.empty) {
        commSnap.forEach(docObj => {
          const data = docObj.data();
          if (data && data.key) {
            freshComms[data.key] = !!data.paid;
          }
        });
      }
      setPaidCommissions(freshComms);
      StoreManager.savePaidCommissions(freshComms);

      console.log("Download do Firestore concluído!");
    } catch (err) {
      console.error("Falha ao puxar dados da nuvem:", err);
      throw err;
    }
  };

  // FULL WIPE: Wipe both local storage and remote Firestore completely
  const wipeAllSystemData = async () => {
    try {
      console.log("Iniciando limpeza completa dos dados do sistema...");

      const collectionsList = ["sales", "collaborators", "partners", "activities", "packages", "paidCommissions", "feeRules"];
      for (const colName of collectionsList) {
        const snap = await getDocs(collection(db, colName));
        if (snap && !snap.empty) {
          for (const docObj of snap.docs) {
            await deleteDoc(doc(db, colName, docObj.id)).catch(() => {});
          }
        }
      }

      setSales([]);
      setCollaborators([]);
      setPartners([]);
      setActivities([]);
      setPackages([]);
      setFeeRules([]);
      setPaidCommissions({});

      StoreManager.saveSales([]);
      StoreManager.saveCollaborators([]);
      StoreManager.savePartners([]);
      StoreManager.saveActivities([]);
      StoreManager.savePackages([]);
      StoreManager.saveFeeRules([]);
      StoreManager.savePaidCommissions({});

      console.log("Todos os bancos locais e remotos foram totalmente limpos!");
    } catch (err) {
      console.error("Falha ao limpar dados do sistema:", err);
      throw err;
    }
  };

  const isAuthenticated = !!currentUserEmail && collaborators.some(c => c.email.toLowerCase() === currentUserEmail.toLowerCase());

  return (
    <AppContext.Provider value={{
      currentUser,
      currentUserEmail,
      originalAdminEmail,
      isAuthenticated,
      sales,
      collaborators,
      partners,
      activities,
      packages,
      paidCommissions,
      feeRules,
      setCurrentUserByEmail,
      
      addSale,
      updateSale,
      deleteSale,
      markSaleAsPaid,

      addCollaborator,
      updateCollaborator,
      deleteCollaborator,

      addPartner,
      updatePartner,
      approvePartner,
      deletePartner,

      addActivity,
      updateActivity,

      addPackage,
      updatePackage,
      archivePackage,
      deletePackage,

      addFeeRule,
      updateFeeRule,
      deleteFeeRule,

      toggleRepassePaid,

      forcePushLocalToCloud,
      forcePullCloudToLocal,
      wipeAllSystemData
    }}>
      {children}
    </AppContext.Provider>
  );
};
