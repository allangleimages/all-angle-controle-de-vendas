export interface SalesItem {
  pacoteId: string;
  nome: string;
  quantidadeFotos?: number; // for Especial packages
  precoUnitario: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  data: string; // YYYY-MM-DD
  pessoas: number;
  nomeCliente: string;
  hospedagem: string;
  whatsapp: string;
  email?: string;
  parceiroId: string; // Partner relation
  atividadeId: string; // Core Activity relation
  fotosEnviadas: number;
  fotosVendidas?: number;
  sacolaItens: SalesItem[];
  descontoManual: number;
  valorBruto: number;
  valorTotal: number;
  formaPagamento: string;
  pagamentos?: Array<{ forma: string; valor: number; alboomPay?: boolean; alboomTax?: number; taxaId?: string }>;
  alboomTax?: number;
  taxaId?: string; // Selected customizable FeeRule ID
  status: 'Pago' | 'Pendente' | 'Abandonada' | 'Archived';
  dataPagamento?: string; // YYYY-MM-DD
  linkedOrderId?: string; // Links Venda B (upsell) to Venda A
  vendedorId: string; // Collaborator relation
  createdAt: string; // ISO date string for auto-aging routine
  notas?: string;
  wasAbandoned?: boolean; // Trace transition from Abandonada to Pago
}

export interface Collaborator {
  id: string;
  nomeCompleto: string;
  email: string;
  cargo: 'Staff' | 'Admin';
  status: 'Ativo' | 'Inativo';
  tipoChavePix: string;
  chavePix: string;
  atividadesPermitidas: string[]; // List of Activity IDs
  telefone?: string;
  corTag?: string;
  semPix?: boolean;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  cargoFuncao?: string;
  foto?: string;
  password?: string; // Securely storing self-generated password upon first-access
}

export interface Partner {
  id: string;
  nomeParceiro: string;
  whatsapp: string;
  email?: string;
  tipoChavePix?: string;
  chavePix?: string;
  status: 'Aprovado' | 'Pendente de Aprovação';
  comissaoPadrao: number; // e.g. 10 (which means 10%)
  corTag?: string;
  semPix?: boolean;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  foto?: string;
}

export interface CustomCommission {
  alvoId: string; // Collaborator or Partner ID
  tipo: 'vendedor' | 'parceiro';
  taxa: number; // e.g. 15 for 15%
}

export interface Activity {
  id: string;
  nomeAtividade: string;
  comissoesCustomizadas: CustomCommission[];
  whatsappTemplate: string; // Custom WhatsApp template with placeholders {nome}, {pousada}, {resumo_compra}
  descricao?: string;
  corTag?: string;
  parceiroId?: string;       // Optional pre-linked Partner relation
  membrosElegiveis?: string[]; // Optional array of eligible Collaborator IDs
}

export interface PricingTier {
  minFotos: number;
  maxFotos: number;
  precoUnitario: number;
}

export interface Package {
  id: string;
  atividadeId: string; // Activity relation
  nomePacote: string;
  tipoPreco: 'Standard' | 'Especial' | 'Foto' | 'ProgressivoPessoa' | 'FixoMaisProgressivo' | 'SemEstrutura';
  precoStandard?: number; // Price per person for standard or price per photo for 'Foto'
  precoFoto?: number; // Price per single photo for 'Foto' if isolated
  fotosPacote?: number; // Number of photos included in package
  maxFotosEnviadas?: number; // Max photos limit to avoid waste
  possuiLimiteFotosPorPessoa?: boolean;
  limiteFotosPorPessoa?: number;
  tiers?: PricingTier[]; // Progressive pricing tiers for Especial packages
  precoPrimeiraPessoa?: number; // For ProgressivoPessoa
  precoSegundaPessoa?: number; // For ProgressivoPessoa
  precoAdicionalPessoa?: number; // For ProgressivoPessoa
  pessoasMinimas?: number; // For FixoMaisProgressivo
  valorPorPessoa?: number; // For FixoMaisProgressivo
  fotosPorPessoa?: number; // For FixoMaisProgressivo
  vendaDireta?: boolean; // True = Venda direta, False = Depende da seleção do cliente
  incluirMetricaFotos?: boolean; // Include in photos metrics
  mensagemAbandono?: string; // Abandoned cart WhatsApp message template custom per package
  arquivado: boolean;
  parceiroId?: string; // Optional relation to specific Partner/Pousada
  sku?: string;
  descricao?: string;
  mediaRef?: string;
  corTag?: string; // Custom visual color for the package
}

export interface FeeRule {
  id: string;
  nome: string;
  tipoDesconto?: 'porcentagem' | 'fixo';
  aplicarAllAngle: boolean;
  porcentagemAllAngle: number;
  aplicarEquipe: boolean;
  porcentagemEquipe: number;
  arquivado?: boolean;
  observacao?: string;
  exibirApenasConsolidado?: boolean;
  valorConsolidadoRelatorio?: number;
  descontarApenasConsolidado?: boolean;
  tipoDescontoConsolidado?: 'porcentagem' | 'fixo';
  valorDescontoConsolidado?: number;
}

