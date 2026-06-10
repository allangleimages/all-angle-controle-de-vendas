import { Sale, Collaborator, Partner, Activity, Package } from './types';

// Central State keys
const STATE_KEYS = {
  SALES: 'all_angle_vendas_sales',
  COLLABORATORS: 'all_angle_vendas_collaborators',
  PARTNERS: 'all_angle_vendas_partners',
  ACTIVITIES: 'all_angle_vendas_activities',
  PACKAGES: 'all_angle_vendas_packages',
  CURRENT_USER_EMAIL: 'all_angle_current_user_email',
  PAID_COMMISSIONS: 'all_angle_paid_commissions' // Keeps track of paid out payroll offsets
};

// Root Admin pre-seeded account
const ROOT_ADMIN_EMAIL = 'info@allangle.com.br';
const ROOT_ADMIN: Collaborator = {
  id: 'admin-root',
  nomeCompleto: 'ALL ANGLE ADMIN',
  email: ROOT_ADMIN_EMAIL,
  cargo: 'Admin',
  status: 'Ativo',
  tipoChavePix: 'E-mail',
  chavePix: 'info@allangle.com.br',
  atividadesPermitidas: [] // Admin can manage all
};

// Auto-aging utility routine
// - Any sale entry that remains in "Pendente" status for more than 7 days must automatically be moved in the state engine to "Abandonada" status.
// - Any unresolved sale that remains in the system for more than 30 days must automatically be moved to an "Archived" status.
function runAutoAging(sales: Sale[]): { updatedSales: Sale[]; changed: boolean } {
  const now = new Date();
  let changed = false;

  const updatedSales = sales.map(sale => {
    if (sale.status === 'Archived') return sale;

    const createdDate = new Date(sale.createdAt);
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Rule 1: Pendente for > 7 days -> Abandonada
    if (sale.status === 'Pendente' && diffDays > 7) {
      changed = true;
      return {
        ...sale,
        status: 'Abandonada' as const
      };
    }

    // Rule 2: Unresolved (Pendente or Abandonada) for > 30 days -> Archived
    if ((sale.status === 'Pendente' || sale.status === 'Abandonada') && diffDays > 30) {
      changed = true;
      return {
        ...sale,
        status: 'Archived' as const
      };
    }

    return sale;
  });

  return { updatedSales, changed };
}

// Low level helpers
export function getSavedState<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error: any) {
    console.error("Failed to save state to localStorage:", error);
    if (error.name === 'QuotaExceededError' || error.code === 22 || error.message?.includes('quota')) {
      alert("Aviso: O limite de armazenamento do seu navegador foi atingido! Não é possível guardar mais fotos sem liberar espaço. Por favor, remova a foto de algum membro/parceiro antigo ou remova algumas vendas antigas para liberar espaço.");
    } else {
      alert("Erro ao salvar dados localmente: " + error.message);
    }
  }
}

// Complete Store Manager Class
export class StoreManager {
  static getCollaborators(): Collaborator[] {
    const collabs = getSavedState<Collaborator[]>(STATE_KEYS.COLLABORATORS, []);
    
    // Strict de-duplicate by lowercased email
    const uniqueMap = new Map<string, Collaborator>();
    collabs.forEach(collab => {
      if (collab && collab.email) {
        uniqueMap.set(collab.email.toLowerCase().trim(), collab);
      }
    });
    const uniqueCollabs = Array.from(uniqueMap.values());

    // Ensure Root Admin is ALWAYS present
    const hasRoot = uniqueCollabs.some(c => c.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase());
    if (!hasRoot) {
      const updated = [ROOT_ADMIN, ...uniqueCollabs];
      saveState(STATE_KEYS.COLLABORATORS, updated);
      return updated;
    }
    return uniqueCollabs;
  }

  static saveCollaborators(collabs: Collaborator[]): void {
    // Strict de-duplicate by lowercased email
    const uniqueMap = new Map<string, Collaborator>();
    collabs.forEach(collab => {
      if (collab && collab.email) {
        uniqueMap.set(collab.email.toLowerCase().trim(), collab);
      }
    });
    let uniqueCollabs = Array.from(uniqueMap.values());

    // Keep root admin safe
    const hasRoot = uniqueCollabs.some(c => c.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase());
    if (!hasRoot) {
      uniqueCollabs = [ROOT_ADMIN, ...uniqueCollabs];
    }
    saveState(STATE_KEYS.COLLABORATORS, uniqueCollabs);
  }

  static getPartners(): Partner[] {
    return getSavedState<Partner[]>(STATE_KEYS.PARTNERS, []);
  }

  static savePartners(partners: Partner[]): void {
    saveState(STATE_KEYS.PARTNERS, partners);
  }

  static getActivities(): Activity[] {
    return getSavedState<Activity[]>(STATE_KEYS.ACTIVITIES, []);
  }

  static saveActivities(activities: Activity[]): void {
    saveState(STATE_KEYS.ACTIVITIES, activities);
  }

  static getPackages(): Package[] {
    const list = getSavedState<Package[]>(STATE_KEYS.PACKAGES, []);
    let changed = false;
    const updated = list.map(pkg => {
      if (pkg.nomePacote && (pkg.nomePacote.toLowerCase().includes('avulso') || pkg.nomePacote.toLowerCase().includes('avulsa'))) {
        if (!pkg.possuiLimiteFotosPorPessoa || pkg.limiteFotosPorPessoa !== 25) {
          changed = true;
          return {
            ...pkg,
            possuiLimiteFotosPorPessoa: true,
            limiteFotosPorPessoa: 25
          };
        }
      }
      return pkg;
    });
    if (changed) {
      saveState(STATE_KEYS.PACKAGES, updated);
    }
    return updated;
  }

  static savePackages(packages: Package[]): void {
    saveState(STATE_KEYS.PACKAGES, packages);
  }

  static getSales(): Sale[] {
    const sales = getSavedState<Sale[]>(STATE_KEYS.SALES, []);
    const { updatedSales, changed } = runAutoAging(sales);
    if (changed) {
      saveState(STATE_KEYS.SALES, updatedSales);
    }
    return updatedSales;
  }

  static saveSales(sales: Sale[]): void {
    saveState(STATE_KEYS.SALES, sales);
  }

  static getCurrentUserEmail(): string {
    return getSavedState<string>(STATE_KEYS.CURRENT_USER_EMAIL, '');
  }

  static setCurrentUserEmail(email: string): void {
    saveState(STATE_KEYS.CURRENT_USER_EMAIL, email);
  }

  static getPaidCommissions(): Record<string, boolean> {
    return getSavedState<Record<string, boolean>>(STATE_KEYS.PAID_COMMISSIONS, {});
  }

  static savePaidCommissions(paid: Record<string, boolean>): void {
    saveState(STATE_KEYS.PAID_COMMISSIONS, paid);
  }

  // Calculate progressive pricing for a package
  static calculateEspecialPrice(pkg: Package, qty: number): { subtotal: number; precoUnitarioUsed: number } {
    if (!qty || qty <= 0) {
      return { subtotal: 0, precoUnitarioUsed: 0 };
    }
    if (!pkg.tiers || pkg.tiers.length === 0) {
      return { subtotal: 0, precoUnitarioUsed: 0 };
    }

    // Find the tier that matches the quantity
    // Each tier defines minFotos and maxFotos.
    const matchingTier = pkg.tiers.find(t => qty >= t.minFotos && qty <= t.maxFotos) 
      || pkg.tiers[pkg.tiers.length - 1]; // fallback to last tier if exceeds max

    const precoUnitario = matchingTier ? matchingTier.precoUnitario : 0;
    return {
      subtotal: qty * precoUnitario,
      precoUnitarioUsed: precoUnitario
    };
  }

  static exportBackup(): string {
    const backupData = {
      sales: this.getSales(),
      collaborators: this.getCollaborators(),
      partners: this.getPartners(),
      activities: this.getActivities(),
      packages: this.getPackages(),
      paidCommissions: this.getPaidCommissions(),
      currentUserEmail: this.getCurrentUserEmail()
    };
    return JSON.stringify(backupData, null, 2);
  }

  static importBackup(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data) return false;
      
      if (Array.isArray(data.sales)) {
        this.saveSales(data.sales);
      }
      if (Array.isArray(data.collaborators)) {
        this.saveCollaborators(data.collaborators);
      }
      if (Array.isArray(data.partners)) {
        this.savePartners(data.partners);
      }
      if (Array.isArray(data.activities)) {
        this.saveActivities(data.activities);
      }
      if (Array.isArray(data.packages)) {
        this.savePackages(data.packages);
      }
      if (data.paidCommissions && typeof data.paidCommissions === 'object') {
        this.savePaidCommissions(data.paidCommissions);
      }
      if (data.currentUserEmail && typeof data.currentUserEmail === 'string') {
        this.setCurrentUserEmail(data.currentUserEmail);
      }
      return true;
    } catch (e) {
      console.error("Failed to import backup:", e);
      return false;
    }
  }
}
