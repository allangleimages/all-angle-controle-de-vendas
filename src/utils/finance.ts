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

  // Search if the activity overrides commission for this salesperson
  if (activity && activity.comissoesCustomizadas) {
    const custom = activity.comissoesCustomizadas.find(
      c => c.tipo === 'vendedor' && c.alvoId === collaborator.id
    );
    if (custom) {
      return (sale.valorTotal * custom.taxa) / 100;
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

  // 1. Highest priority: custom activity override for this partner id
  if (activity && activity.comissoesCustomizadas) {
    const custom = activity.comissoesCustomizadas.find(
      c => c.tipo === 'parceiro' && c.alvoId === sale.parceiroId
    );
    if (custom) {
      return (sale.valorTotal * custom.taxa) / 100;
    }
  }

  // 2. Second priority: partner's default rate
  if (partner) {
    const rate = partner.comissaoPadrao !== undefined ? partner.comissaoPadrao : 10;
    return (sale.valorTotal * rate) / 100;
  }

  // 3. Fallback: 10% default
  return (sale.valorTotal * 10) / 100;
}

/**
 * Checks if a sale payment date falls inside a given YYYY-MM period.
 * Format for data_pagamento: YYYY-MM-DD
 */
export function isPaymentInPeriod(sale: Sale, periodYearMonth: string): boolean {
  if (sale.status !== 'Pago' || !sale.dataPagamento) return false;
  return sale.dataPagamento.startsWith(periodYearMonth);
}
