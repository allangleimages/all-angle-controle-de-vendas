import { Sale } from '../types';

/**
 * Clean phone number to digits only.
 * If 11 digits (Brazilian mobile like 12 99999 9999) and doesn't start with 55, pre-pend 55.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && !digits.startsWith('55')) {
    return '55' + digits;
  }
  return digits;
}

/**
 * Replaces dynamic placeholders {nome}, {pousada}, {resumo_compra} in a template text for a sale.
 */
export function buildWhatsAppMessage(template: string, sale: Sale): string {
  if (!template) {
    // Generate a default clean fallback template if not set
    template = 'Olá {nome}, seu lançamento da {pousada} está pronto! Resumo: {resumo_compra}. Agradecemos o contato!';
  }

  const itemsSummary = sale.sacolaItens
    .map(item => {
      if (item.quantidadeFotos && item.quantidadeFotos > 0) {
        return `${item.nome} (${item.quantidadeFotos} fotos: R$ ${item.subtotal.toFixed(2)})`;
      }
      return `${item.nome} (R$ ${item.subtotal.toFixed(2)})`;
    })
    .join(', ');

  const resumo = `${itemsSummary} - Total de R$ ${sale.valorTotal.toFixed(2)}`;

  let text = template;
  text = text.replace(/{nome}/gi, sale.nomeCliente || 'Cliente');
  text = text.replace(/{pousada}/gi, sale.hospedagem || 'Nenhuma');
  text = text.replace(/{resumo_compra}/gi, resumo);

  return text;
}

/**
 * Creates the api.whatsapp.com send link.
 */
export function createWhatsAppLink(phone: string, text: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
}
