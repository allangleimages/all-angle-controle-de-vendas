import { Sale, Collaborator, Partner, Activity } from '../types';

/**
 * Calculates the collaborator commission for a given sale.
 * Looks for custom activity commissions, otherwise defaults to 5%.
 */
export function calculateCollaboratorCommission(
  sale: Sale,
  collaborator: Collaborator | undefined,
  activity: Activity | undefined
): number {
  if (sale.status !== 'Pago') return 0; // Only paid sales generate commissions
  
  if (!collaborator) return 0;

  const baseValue = sale.valorTotal;

  // Search if the activity overrides commission for this salesperson
  if (activity && activity.comissoesCustomizadas) {
    const custom = activity.comissoesCustomizadas.find(
      c => c.tipo === 'vendedor' && c.alvoId === collaborator.id
    );
    if (custom) {
      return (baseValue * custom.taxa) / 100;
    }
  }

  // Default collaborator commission: 0 (no fallback)
  return 0;
}

/**
 * Calculates referral partner commission for a given sale.
 * Custom activity rate has highest priority, then partner's own custom default, then 10% global fallback.
 */
export function calculatePartnerCommission(
  sale: Sale,
  partner: Partner | undefined,
  activity: Activity | undefined
): number {
  if (sale.status !== 'Pago') return 0; // Only paid sales generate commissions
  if (sale.parceiroId === 'none' || !sale.parceiroId) return 0;

  const baseValue = sale.valorTotal;

  // 1. Highest priority: custom activity override for this partner id
  if (activity && activity.comissoesCustomizadas) {
    const custom = activity.comissoesCustomizadas.find(
      c => c.tipo === 'parceiro' && c.alvoId === sale.parceiroId
    );
    if (custom) {
      return (baseValue * custom.taxa) / 100;
    }
  }

  // 2. Second priority: partner's default rate
  if (partner) {
    const rate = partner.comissaoPadrao !== undefined ? partner.comissaoPadrao : 10;
    return (baseValue * rate) / 100;
  }

  // 3. Fallback: 10% default
  return (baseValue * 10) / 100;
}

/**
 * Calculates the exact tax/discount breakdowns for a sale using custom fee rules.
 */
export function calculateSaleTaxes(
  sale: Sale,
  feeRules: any[]
): { totalTax: number; companyTax: number; teamTax: number; activeRuleName: string } {
  let totalTax = 0;
  let companyTax = 0;
  let teamTax = 0; // Represents the collaborator discount (subtracted from photographer's commission)
  let activeRuleName = '';

  const calculateForPayment = (val: number, tId: string) => {
    if (tId === 'alboom-pay-default') {
      // Alboom Pay Padrão (0.99%):
      // - Company pays the full 0.99% (deducted from net profit)
      // - Team discount is 0 (as per Requirement 5 note: "não haverá taxa destinada à equipe neste momento")
      return {
        comp: val * 0.0099,
        teamDisc: 0,
        tot: val * 0.0099,
        name: 'Alboom Pay'
      };
    }
    const rule = feeRules.find(r => r.id === tId);
    if (rule) {
      const isFixo = rule.tipoDesconto === 'fixo';
      const compPct = rule.aplicarAllAngle ? (rule.porcentagemAllAngle || 0) : 0;
      const teamPct = rule.aplicarEquipe ? (rule.porcentagemEquipe || 0) : 0;
      
      const compVal = isFixo ? compPct : val * (compPct / 100);
      const teamVal = isFixo ? teamPct : val * (teamPct / 100);
      
      const teamDiscount = (!rule.exibirApenasConsolidado) ? teamVal : 0;
      const totalRuleTax = compVal + teamVal;
      
      return {
        comp: compVal,
        teamDisc: teamDiscount,
        tot: totalRuleTax,
        name: rule.nome
      };
    }
    return { comp: 0, teamDisc: 0, tot: 0, name: '' };
  };

  if (sale.pagamentos && sale.pagamentos.length > 0) {
    sale.pagamentos.forEach(p => {
      const val = p.valor || 0;
      const tId = p.taxaId || (p.alboomPay ? 'alboom-pay-default' : '');
      if (tId) {
        const res = calculateForPayment(val, tId);
        companyTax += res.comp;
        teamTax += res.teamDisc;
        totalTax += res.tot;
        if (res.name) {
          activeRuleName = res.name;
        }
      }
    });
  } else {
    const val = sale.valorTotal;
    const tId = sale.taxaId || (sale.alboomTax ? 'alboom-pay-default' : '');
    if (tId) {
      const res = calculateForPayment(val, tId);
      companyTax = res.comp;
      teamTax = res.teamDisc;
      totalTax = res.tot;
      activeRuleName = res.name;
    }
  }

  return { totalTax, companyTax, teamTax, activeRuleName };
}

/**
 * Checks if a sale payment date falls inside a given YYYY-MM period.
 * Format for data_pagamento: YYYY-MM-DD
 */
export function isPaymentInPeriod(sale: Sale, periodYearMonth: string): boolean {
  if (sale.status !== 'Pago' || !sale.dataPagamento) return false;
  return sale.dataPagamento.startsWith(periodYearMonth);
}
