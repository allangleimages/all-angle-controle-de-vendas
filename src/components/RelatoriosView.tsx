import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { Sale, Package, Collaborator, Partner, Activity } from '../types';
import { calculateCollaboratorCommission, calculatePartnerCommission, calculateSaleTaxes } from '../utils/finance';
import { 
  Calendar, FileText, FileSpreadsheet, DollarSign, Percent, Lock, User, Search, 
  TrendingUp, Trophy, Sparkles, Users, AlertTriangle, CheckCircle2,
  Printer, Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StoreManager } from '../store';

const getSaleGross = (sale: any) => {
  return sale.valorTotal || 0;
};

const getSaleInitialValue = (sale: any) => {
  return (sale.valorTotal || 0) + (sale.descontoManual || 0);
};

const getSalePackagesString = (sale: any) => {
  if (!sale.sacolaItens || sale.sacolaItens.length === 0) return 'N/A';
  return sale.sacolaItens.map((item: any) => item.nome).join(' + ');
};

const getSalePaymentFormasString = (sale: any) => {
  const rules = StoreManager.getFeeRules();
  if (sale.pagamentos && sale.pagamentos.length > 0) {
    return sale.pagamentos.map((p: any) => {
      if (p.taxaId) {
        const r = rules.find(x => x.id === p.taxaId);
        if (r) return `${p.forma} (${r.nome})`;
      }
      if (p.alboomPay) {
        return `${p.forma} (Alboom Pay)`;
      }
      return p.forma;
    }).join(' + ');
  }
  
  const baseForma = sale.formaPagamento || 'PIX';
  if (sale.taxaId) {
    const r = rules.find(x => x.id === sale.taxaId);
    if (r) return `${baseForma} (${r.nome})`;
  }
  if (sale.alboomTax > 0 || sale.alboomPay) {
    return `${baseForma} (Alboom Pay)`;
  }
  return baseForma;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.replace(/\//g, '-');
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  return dateStr;
};

export const RelatoriosView: React.FC = () => {
  const { currentUser, sales, collaborators, partners, activities, packages, feeRules } = useApp();

  const handleExportPDF = () => {
    if (filteredSales.length === 0) {
      alert("Aviso: Não há lançamentos / dados disponíveis para os filtros selecionados neste período.");
      return;
    }
    
    // Create new PDF doc in landscape, millimeter, A4 size
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Filter definitions
    const period = `Competência de Análise: ${currentPeriodText}`;
    const activityFilter = `Atividade Filtro: ${selectedActivityId === 'all' ? 'Todas' : activities.find(a => a.id === selectedActivityId)?.nomeAtividade || 'N/A'}`;
    const sellerFilter = `Fotógrafo Filtro: ${selectedVendedorId === 'all' ? 'Toda a Equipe' : collaborators.find(c => c.id === selectedVendedorId)?.nomeCompleto || 'N/A'}`;
    const generationDate = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
    
    // Style settings
    const primaryColor = [14, 36, 56]; // #0e2438 (Dark slate)
    const darkText = [15, 23, 42]; // #0f172a
    const grayText = [100, 116, 139]; // #64748b
    const accentGreen = [16, 185, 129]; // #10b981
    
    const marginX = 15;
    let posY = 15;
    
    // 1. Header Box (Width 267)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY, 267, 26, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("ALL ANGLE", marginX + 8, posY + 7);
    
    doc.setFontSize(11);
    doc.text("RELATÓRIO FINANCEIRO E DE CONTROLE COMERCIAL", marginX + 8, posY + 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(generationDate, marginX + 8, posY + 21);
    
    posY += 32;
    
    // 2. Filter Information Box (Width 267)
    doc.setFillColor(248, 250, 252); // soft off-white background
    doc.setDrawColor(226, 232, 240); // light gray border
    doc.rect(marginX, posY, 267, 16, 'FD');
    
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(period.toUpperCase(), marginX + 6, posY + 6);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`${activityFilter}   |   ${sellerFilter}`, marginX + 6, posY + 11);
    
    posY += 22;
    
    // 3. Consolidated ledger diagram
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("DEMONSTRATIVO FINANCEIRO CONSOLIDADO", marginX, posY);
    
    posY += 5;
    
    const drawRow = (label: string, value: string, isTotal: boolean = false) => {
      if (isTotal) {
        doc.setFillColor(243, 244, 246);
        doc.rect(marginX, posY - 4, 267, 8, 'F');
      }
      
      doc.setFont("Helvetica", isTotal ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(isTotal ? primaryColor[0] : darkText[0], isTotal ? primaryColor[1] : darkText[1], isTotal ? primaryColor[2] : darkText[2]);
      doc.text(label, marginX + 4, posY + 1);
      
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(isTotal ? accentGreen[0] : darkText[0], isTotal ? accentGreen[1] : darkText[1], isTotal ? accentGreen[2] : darkText[2]);
      doc.text(value, marginX + 263, posY + 1, { align: 'right' });
      
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, posY + 4, marginX + 267, posY + 4);
      posY += 8;
    };
    
    // Strictly matching client's labels and design choices
    drawRow("(=) Valor total arrecadado:", `R$ ${financialTotals.grossRevenue.toFixed(2)}`);
    if (financialTotals.totalDescontoAplicado > 0) {
      drawRow("(-) Desconto (Manual/Comercial):", `- R$ ${financialTotals.totalDescontoAplicado.toFixed(2)}`);
    }
    drawRow("(-) Repasse de Comissão (Equipe All Angle):", `- R$ ${financialTotals.totalTeamCommissions.toFixed(2)}`);
    drawRow("(-) Repasse de comissão (Parceiros e indicações):", `- R$ ${financialTotals.totalPartnerCommissions.toFixed(2)}`);
    const activeDiscountTaxRule = feeRules.find(r => !r.arquivado && !r.exibirApenasConsolidado && ((r.porcentagemAllAngle || 0) + (r.porcentagemEquipe || 0) > 0));
    const taxLabelName = activeDiscountTaxRule ? activeDiscountTaxRule.nome : 'Alboom Pay';
    drawRow(`(-) Valores Descontados ${taxLabelName}:`, `- R$ ${financialTotals.totalAlboomTax.toFixed(2)}`);
    drawRow("(=) Saldo Líquido Final para ALL ANGLE:", `R$ ${financialTotals.netRevenue.toFixed(2)}`, true);
    
    if (financialTotals.totalFixedReportFees > 0) {
      posY += 6;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text("DESPESAS FIXAS DE RELATÓRIO", marginX, posY);
      posY += 5;

      feeRules.filter(r => !r.arquivado && r.exibirApenasConsolidado).forEach(rule => {
        if (rule.valorConsolidadoRelatorio && rule.valorConsolidadoRelatorio > 0) {
          drawRow(`• ${rule.nome}:`, `R$ ${rule.valorConsolidadoRelatorio.toFixed(2)}`);
        }
      });
      drawRow("Total Despesas Fixas:", `R$ ${financialTotals.totalFixedReportFees.toFixed(2)}`, true);
    }
    
    posY += 8;
    
    // 4. Detailed Sales List
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("DETALHAMENTO DE VENDAS CONFIRMADAS NO PERÍODO", marginX, posY);
    
    posY += 5;
    
    // Table Header (Width 267)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY - 4, 267, 7, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DATA", marginX + 2, posY + 0.5);
    doc.text("CLIENTE", marginX + 14, posY + 0.5);
    doc.text("PESSOAS", marginX + 38, posY + 0.5);
    doc.text("HOSPEDAGEM", marginX + 46, posY + 0.5);
    doc.text("ATIVIDADE", marginX + 64, posY + 0.5);
    doc.text("FOTÓGRAFO", marginX + 82, posY + 0.5);
    doc.text("PACOTE DE VENDAS", marginX + 100, posY + 0.5);
    doc.text("ENVIADAS", marginX + 132, posY + 0.5);
    doc.text("VENDIDAS", marginX + 144, posY + 0.5);
    doc.text("BRUTO", marginX + 174, posY + 0.5, { align: 'right' });
    doc.text("DESCONTO", marginX + 192, posY + 0.5, { align: 'right' });
    doc.text("TOTAL", marginX + 210, posY + 0.5, { align: 'right' });
    doc.text("PAGAMENTO", marginX + 212, posY + 0.5);
    doc.text("STATUS", marginX + 250, posY + 0.5);
    
    posY += 7;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    
    filteredSales.forEach((sale) => {
      // Automatic page break handling in Landscape
      if (posY > 185) {
        doc.addPage();
        posY = 20;
        
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(marginX, posY - 4, 267, 7, 'F');
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text("DATA", marginX + 2, posY + 0.5);
        doc.text("CLIENTE", marginX + 14, posY + 0.5);
        doc.text("PESSOAS", marginX + 38, posY + 0.5);
        doc.text("HOSPEDAGEM", marginX + 46, posY + 0.5);
        doc.text("ATIVIDADE", marginX + 64, posY + 0.5);
        doc.text("FOTÓGRAFO", marginX + 82, posY + 0.5);
        doc.text("PACOTE DE VENDAS", marginX + 100, posY + 0.5);
        doc.text("ENVIADAS", marginX + 132, posY + 0.5);
        doc.text("VENDIDAS", marginX + 144, posY + 0.5);
        doc.text("BRUTO", marginX + 174, posY + 0.5, { align: 'right' });
        doc.text("DESCONTO", marginX + 192, posY + 0.5, { align: 'right' });
        doc.text("TOTAL", marginX + 210, posY + 0.5, { align: 'right' });
        doc.text("PAGAMENTO", marginX + 212, posY + 0.5);
        doc.text("STATUS", marginX + 250, posY + 0.5);
        
        posY += 7;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }
      
      const act = activities.find(a => a.id === sale.atividadeId);
      const collab = collaborators.find(c => c.id === sale.vendedorId);
      
      const clientName = (sale.nomeCliente || '').toUpperCase();
      const clientTruncated = clientName.length > 18 ? clientName.substring(0, 16) + "..." : clientName;
      
      const hotelClean = (sale.hospedagem || '').toUpperCase();
      const hotelTruncated = hotelClean.length > 12 ? hotelClean.substring(0, 10) + "..." : hotelClean;

      const actName = (act?.nomeAtividade || 'N/A').toUpperCase();
      const actTruncated = actName.length > 12 ? actName.substring(0, 10) + "..." : actName;

      const collabName = (collab?.nomeCompleto || 'N/A').toUpperCase();
      const collabTruncated = collabName.length > 12 ? collabName.substring(0, 10) + "..." : collabName;

      const packagesStr = getSalePackagesString(sale).toUpperCase();
      const packagesTruncated = packagesStr.length > 20 ? packagesStr.substring(0, 18) + "..." : packagesStr;

      const grossValue = getSaleGross(sale);
      const discountValue = sale.descontoManual || 0;
      const totalValue = sale.valorTotal || 0;

      const paymentStr = getSalePaymentFormasString(sale).toUpperCase();
      const paymentTruncated = paymentStr.length > 22 ? paymentStr.substring(0, 20) + "..." : paymentStr;

      doc.text(formatDate(sale.data), marginX + 2, posY + 0.5);
      doc.text(clientTruncated, marginX + 14, posY + 0.5);
      doc.text(String(sale.pessoas || 1), marginX + 38, posY + 0.5);
      doc.text(hotelTruncated, marginX + 46, posY + 0.5);
      doc.text(actTruncated, marginX + 64, posY + 0.5);
      doc.text(collabTruncated, marginX + 82, posY + 0.5);
      doc.text(packagesTruncated, marginX + 100, posY + 0.5);
      doc.text(String(sale.fotosEnviadas || 0), marginX + 132, posY + 0.5);
      doc.text(String(sale.fotosVendidas || 0), marginX + 144, posY + 0.5);
      doc.text(`R$ ${grossValue.toFixed(2)}`, marginX + 174, posY + 0.5, { align: 'right' });
      doc.text(`R$ ${discountValue.toFixed(2)}`, marginX + 192, posY + 0.5, { align: 'right' });
      doc.text(`R$ ${totalValue.toFixed(2)}`, marginX + 210, posY + 0.5, { align: 'right' });
      doc.text(paymentTruncated, marginX + 212, posY + 0.5);
      doc.text((sale.status || '').toUpperCase(), marginX + 250, posY + 0.5);
      
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, posY + 3.5, marginX + 267, posY + 3.5);
      posY += 6.5;
    });
    
    // Save/Download generated PDF file dynamically
    doc.save(`demonstrativo_financeiro_all_angle_${selectedYear}_${isAnnualView ? 'anual' : selectedMonth}.pdf`);
  };

  const handleExportCollabPDF = () => {
    if (!selectedCollabDetails || selectedCollabDetails.entries.length === 0) {
      alert("Aviso: Não há comissões ou lançamentos nos parâmetros correspondentes para exportar.");
      return;
    }
    
    const { collab, entries, totalToPay } = selectedCollabDetails;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Page metadata and generation stamp
    const period = isAnnualView ? `Ano de ${selectedYear}` : `${months[selectedMonth - 1]} de ${selectedYear}`;
    const generationDate = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
    
    // Style settings
    const primaryColor = [14, 36, 56]; // #0e2438 (Dark slate)
    const darkText = [15, 23, 42]; // #0f172a
    const grayText = [100, 116, 139]; // #64748b
    
    const marginX = 15;
    let posY = 15;
    
    // 1. Header Box
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY, 180, 26, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("ALL ANGLE", marginX + 8, posY + 7);
    
    doc.setFontSize(11);
    doc.text("DEMONSTRATIVO DE COMISSÃO (REPASSE EQUIPE)", marginX + 8, posY + 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(generationDate, marginX + 8, posY + 21);
    
    posY += 32;
    
    // 2. Collab Profile Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, posY, 180, 22, 'FD');
    
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text(collab.nomeCompleto.toUpperCase(), marginX + 6, posY + 6);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`Função/Cargo: ${collab.cargo || 'Equipe Comercial'}`, marginX + 6, posY + 11);
    doc.text(`Chave PIX: ${collab.tipoChavePix || 'PIX'}: ${collab.chavePix || 'Não informada'}`, marginX + 6, posY + 16);
    doc.text(`Período / Referência: ${period.toUpperCase()}`, marginX + 110, posY + 11);
    
    posY += 28;
    
    // 3. Consolidated Commission Value Display Box
    doc.setFillColor(240, 253, 250); // Teal light accent background
    doc.setDrawColor(204, 251, 241);
    doc.rect(marginX, posY, 180, 14, 'FD');
    
    doc.setTextColor(15, 118, 110);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("VALOR TOTAL DE COMISSÃO A RECEBER:", marginX + 6, posY + 8.5);
    
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text(`R$ ${totalToPay.toFixed(2)}`, marginX + 174, posY + 9.5, { align: 'right' });
    
    posY += 20;
    
    // 4. Itemized table list
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("LANCAMENTOS VINCULADOS AO COLABORADOR", marginX, posY);
    
    posY += 5;
    
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY - 4, 180, 7, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DATA", marginX + 4, posY + 0.5);
    doc.text("CLIENTE ATENDIDO", marginX + 25, posY + 0.5);
    doc.text("VALOR DA COMISSÃO", marginX + 176, posY + 0.5, { align: 'right' });
    
    posY += 7;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    
    const validEntries = entries.filter(e => e.comissao > 0);
    
    validEntries.forEach((entry) => {
      const entryHeight = entry.alboomDiscount > 0 ? 9.5 : 6.5;
      
      if (posY + entryHeight > 275) {
        doc.addPage();
        posY = 20;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(marginX, posY - 4, 180, 7, 'F');
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("DATA", marginX + 4, posY + 0.5);
        doc.text("CLIENTE ATENDIDO", marginX + 25, posY + 0.5);
        doc.text("VALOR DA COMISSÃO", marginX + 176, posY + 0.5, { align: 'right' });
        
        posY += 7;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }
      
      const clientStr = entry.cliente.toUpperCase();
      const trunClient = clientStr.length > 75 ? clientStr.substring(0, 72) + "..." : clientStr;
      
      doc.text(entry.data || '', marginX + 4, posY + 0.5);
      doc.text(trunClient, marginX + 25, posY + 0.5);
      
      if (entry.alboomDiscount > 0) {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(5.5);
        doc.setTextColor(99, 102, 241); // indigo text
        doc.text(`[Comissao Cheia: R$ ${entry.rawComissao.toFixed(2)}] | [Desc. Alboom Pay: -R$ ${entry.alboomDiscount.toFixed(2)}] | [Real: R$ ${entry.comissao.toFixed(2)}]`, marginX + 25, posY + 3.0);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }
      
      doc.text(`R$ ${entry.comissao.toFixed(2)}`, marginX + 176, posY + 0.5, { align: 'right' });
      
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, posY + (entryHeight - 3.0), marginX + 180, posY + (entryHeight - 3.0));
      posY += entryHeight;
    });
    
    doc.save(`repasse_individual_${collab.nomeCompleto.toLowerCase().replace(/\s+/g, '_')}_${selectedYear}_${isAnnualView ? 'anual' : selectedMonth}.pdf`);
  };

  const handleExportPartnerPDF = () => {
    if (!selectedPartnerDetails || selectedPartnerDetails.entries.length === 0) {
      alert("Aviso: Não há repasses ou lançamentos nos parâmetros correspondentes para exportar.");
      return;
    }
    
    const { partner, entries, totalToPay } = selectedPartnerDetails;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Page metadata and generation stamp
    const period = isAnnualView ? `Ano de ${selectedYear}` : `${months[selectedMonth - 1]} de ${selectedYear}`;
    const generationDate = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
    
    // Style settings
    const primaryColor = [14, 36, 56]; // #0e2438 (Dark slate)
    const darkText = [15, 23, 42]; // #0f172a
    const grayText = [100, 116, 139]; // #64748b
    
    const marginX = 15;
    let posY = 15;
    
    // 1. Header Box
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY, 180, 26, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("ALL ANGLE", marginX + 8, posY + 7);
    
    doc.setFontSize(11);
    doc.text("DEMONSTRATIVO DE REPASSE (COMISSÃO PARCEIRO)", marginX + 8, posY + 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(generationDate, marginX + 8, posY + 21);
    
    posY += 32;
    
    // 2. Partner Profile Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, posY, 180, 18, 'FD');
    
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text(partner.nomeParceiro.toUpperCase(), marginX + 6, posY + 6);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`Chave PIX: ${partner.tipoChavePix || 'PIX'}: ${partner.chavePix || 'Não informada'}`, marginX + 6, posY + 11);
    doc.text(`Período / Referência: ${period.toUpperCase()}`, marginX + 110, posY + 11);
    
    posY += 24;
    
    // 3. Consolidated Value Display Box
    doc.setFillColor(240, 252, 253); // Light cyan/blue background
    doc.setDrawColor(204, 248, 251);
    doc.rect(marginX, posY, 180, 14, 'FD');
    
    doc.setTextColor(14, 116, 144);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("VALOR TOTAL DE INDICAÇÕES A RECEBER:", marginX + 6, posY + 8.5);
    
    doc.setFontSize(12);
    doc.setTextColor(8, 145, 178);
    doc.text(`R$ ${totalToPay.toFixed(2)}`, marginX + 174, posY + 9.5, { align: 'right' });
    
    posY += 20;
    
    // 4. Detailing table list
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("LANÇAMENTOS DE INDICAÇÃO COM REPASSE", marginX, posY);
    
    posY += 5;
    
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, posY - 4, 180, 7, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DATA", marginX + 4, posY + 0.5);
    doc.text("CLIENTE ATENDIDO", marginX + 25, posY + 0.5);
    doc.text("VALOR DO REPASSE", marginX + 176, posY + 0.5, { align: 'right' });
    
    posY += 7;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    
    const validEntries = entries.filter(e => e.comissao > 0);
    
    validEntries.forEach((entry) => {
      if (posY > 275) {
        doc.addPage();
        posY = 20;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(marginX, posY - 4, 180, 7, 'F');
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("DATA", marginX + 4, posY + 0.5);
        doc.text("CLIENTE ATENDIDO", marginX + 25, posY + 0.5);
        doc.text("VALOR DO REPASSE", marginX + 176, posY + 0.5, { align: 'right' });
        
        posY += 7;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }
      
      const clientStr = entry.cliente.toUpperCase();
      const trunClient = clientStr.length > 75 ? clientStr.substring(0, 72) + "..." : clientStr;
      
      doc.text(entry.data || '', marginX + 4, posY + 0.5);
      doc.text(trunClient, marginX + 25, posY + 0.5);
      doc.text(`R$ ${entry.comissao.toFixed(2)}`, marginX + 176, posY + 0.5, { align: 'right' });
      
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, posY + 3.5, marginX + 180, posY + 3.5);
      posY += 6.5;
    });
    
    doc.save(`repasse_parceiro_${partner.nomeParceiro.toLowerCase().replace(/\s+/g, '_')}_${selectedYear}_${isAnnualView ? 'anual' : selectedMonth}.pdf`);
  };

  // Utility to create inline background/text styling according to registered corTag property
  const getInlineTagStyle = (hexColor?: string) => {
    if (!hexColor) return {};
    const cleanHex = hexColor.trim().startsWith('#') ? hexColor.trim() : `#${hexColor.trim()}`;
    return {
      backgroundColor: `${cleanHex}12`, // soft background at ~7% opacity
      color: cleanHex,
      borderColor: `${cleanHex}30`
    };
  };

  // Excel (Portuguese-Excel CSV Semicolon format) Dynamic Exporter
  const handleExportExcel = () => {
    let csvContent = '\uFEFF'; // BOM for UTF-8 in Excel
    
    // Title & Context Info
    csvContent += 'ALL ANGLE - RELATÓRIO DASHBOARD DE CONTROLE COMERCIAL\r\n';
    csvContent += `Data de Geração:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\r\n`;
    csvContent += `Período Filtrado:;${isAnnualView ? `Ano de ${selectedYear}` : `${months[selectedMonth - 1]} de ${selectedYear}`}\r\n`;
    csvContent += `Atividade Filtro:;${selectedActivityId === 'all' ? 'Toda as Atividades' : activities.find(a => a.id === selectedActivityId)?.nomeAtividade || 'N/A'}\r\n`;
    csvContent += `Fotógrafo Filtro:;${selectedVendedorId === 'all' ? 'Todos os Fotógrafos' : collaborators.find(c => c.id === selectedVendedorId)?.nomeCompleto || 'N/A'}\r\n\r\n`;

    // Consolidated Financial Statement Section
    csvContent += 'DEMONSTRATIVO FINANCEIRO CONSOLIDADO\r\n';
    csvContent += `Métrica;Valor Confirmado (R$)\r\n`;
    csvContent += `(=) Valor bruto:;${financialTotals.grossRevenue.toFixed(2).replace('.', ',')}\r\n`;
    if (financialTotals.totalDescontoAplicado > 0) {
      csvContent += `(-) Desconto (Manual/Comercial):;${financialTotals.totalDescontoAplicado.toFixed(2).replace('.', ',')}\r\n`;
    }
    csvContent += `(-) Repasse de Comissão (Equipe All Angle):;${financialTotals.totalTeamCommissions.toFixed(2).replace('.', ',')}\r\n`;
    csvContent += `(-) Repasse de comissão (Parceiros e indicações):;${financialTotals.totalPartnerCommissions.toFixed(2).replace('.', ',')}\r\n`;
    const activeDiscountTaxRule = feeRules.find(r => !r.arquivado && !r.exibirApenasConsolidado && ((r.porcentagemAllAngle || 0) + (r.porcentagemEquipe || 0) > 0));
    const taxLabelName = activeDiscountTaxRule ? activeDiscountTaxRule.nome : 'Alboom Pay';
    csvContent += `(-) Valores Descontados ${taxLabelName}:;${financialTotals.totalAlboomTax.toFixed(2).replace('.', ',')}\r\n`;
    csvContent += `(=) Saldo Líquido Final para ALL ANGLE:;${financialTotals.netRevenue.toFixed(2).replace('.', ',')}\r\n\r\n`;

    if (financialTotals.totalFixedReportFees > 0) {
      csvContent += 'DESPESAS FIXAS DE RELATÓRIO\r\n';
      csvContent += 'Métrica;Valor (R$)\r\n';
      feeRules.filter(r => !r.arquivado && r.exibirApenasConsolidado).forEach(rule => {
        if (rule.valorConsolidadoRelatorio && rule.valorConsolidadoRelatorio > 0) {
          csvContent += `• ${rule.nome};${rule.valorConsolidadoRelatorio.toFixed(2).replace('.', ',')}\r\n`;
        }
      });
      csvContent += `Total Despesas Fixas:;${financialTotals.totalFixedReportFees.toFixed(2).replace('.', ',')}\r\n\r\n`;
    }

    // Transaction List Summary (respecting filters)
    csvContent += 'LISTA DE LANÇAMENTOS COMERCIAIS DETALHADOS\r\n';
    csvContent += 'Data;Cliente;Número de Pessoas;Hospedagem;Atividade;Fotógrafo;Pacote de Vendas;Fotos Enviadas;Fotos Vendidas;Valor Inicial (R$);Desconto (R$);Valor Total (R$);Forma de Pagamento;Status\r\n';

    filteredSales.forEach(sale => {
      const activityObj = activities.find(a => a.id === sale.atividadeId);
      const collab = collaborators.find(c => c.id === sale.vendedorId);
      
      const clientClean = (sale.nomeCliente || '').replace(/;/g, ',');
      const hotelClean = (sale.hospedagem || '').replace(/;/g, ',');
      const actName = activityObj ? activityObj.nomeAtividade.replace(/;/g, ',') : 'N/A';
      const collabName = collab ? collab.nomeCompleto.replace(/;/g, ',') : 'N/A';
      
      const packagesStr = getSalePackagesString(sale).replace(/;/g, ',');
      const initialVal = getSaleInitialValue(sale);
      const discountVal = sale.descontoManual || 0;
      const totalVal = sale.valorTotal || 0;
      const paymentStr = getSalePaymentFormasString(sale).replace(/;/g, ',');
      
      csvContent += `${formatDate(sale.data)};${clientClean};${sale.pessoas || 1};${hotelClean};${actName};${collabName};${packagesStr};${sale.fotosEnviadas || 0};${sale.fotosVendidas || 0};${initialVal.toFixed(2).replace('.', ',')};${discountVal.toFixed(2).replace('.', ',')};${totalVal.toFixed(2).replace('.', ',')};${paymentStr};${sale.status}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_comercial_all_angle_${selectedYear}_${isAnnualView ? 'anual' : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Exporter for Individual Staff Freelance Commission Sheets
  const handleExportCollabExcel = () => {
    if (!selectedCollabDetails) return;
    const { collab, entries, totalToPay } = selectedCollabDetails;
    let csvContent = '\uFEFF';
    csvContent += `ALL ANGLE - DEMONSTRATIVO DE REPASSE INDIVIDUAL\r\n`;
    csvContent += `Colaborador:;${collab.nomeCompleto.toUpperCase()}\r\n`;
    csvContent += `Chave PIX:;${collab.tipoChavePix || 'PIX'}: ${collab.chavePix || 'Não informado'}\r\n`;
    csvContent += `Competência:;${isAnnualView ? `Ano de ${selectedYear}` : `${months[selectedMonth - 1]} de ${selectedYear}`}\r\n`;
    csvContent += `Total de Comissão a Pagar:;R$ ${totalToPay.toFixed(2).replace('.', ',')}\r\n\r\n`;

    csvContent += `Data;Cliente;Valor da Venda (R$);Comissão Cheia (R$);Desconto Alboom Pay (R$);Comissão Líquida Recebida (R$)\r\n`;
    entries.forEach(entry => {
      csvContent += `${entry.data};${entry.cliente};${entry.valorVenda.toFixed(2).replace('.', ',')};${entry.rawComissao.toFixed(2).replace('.', ',')};${entry.alboomDiscount.toFixed(2).replace('.', ',')};${entry.comissao.toFixed(2).replace('.', ',')}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `comissao_${collab.nomeCompleto.toLowerCase().replace(/\s+/g, '_')}_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Exporter for Partner/Indication Commission Sheets
  const handleExportPartnerExcel = () => {
    if (!selectedPartnerDetails) return;
    const { partner, entries, totalToPay } = selectedPartnerDetails;
    let csvContent = '\uFEFF';
    csvContent += `ALL ANGLE - DEMONSTRATIVO DE REPASSE PARCEIRO\r\n`;
    csvContent += `Parceiro:;${partner.nomeParceiro.toUpperCase()}\r\n`;
    csvContent += `Chave PIX:;${partner.tipoChavePix || 'PIX'}: ${partner.chavePix || 'Não informado'}\r\n`;
    csvContent += `Competência:;${isAnnualView ? `Ano de ${selectedYear}` : `${months[selectedMonth - 1]} de ${selectedYear}`}\r\n`;
    csvContent += `Total de Repasse:;R$ ${totalToPay.toFixed(2).replace('.', ',')}\r\n\r\n`;

    csvContent += `Data;Cliente;Valor da Venda (R$);Comissão (R$)\r\n`;
    entries.forEach(entry => {
      csvContent += `${entry.data};${entry.cliente};${entry.valorVenda.toFixed(2).replace('.', ',')};${entry.comissao.toFixed(2).replace('.', ',')}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `repasse_${partner.nomeParceiro.toLowerCase().replace(/\s+/g, '_')}_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRIVACY RULE: This page is now viewable by both administrators and team members with partitioned logic.
  const isAuthorized = true;

  const [activeTab, setActiveTab] = useState<'financas' | 'vendas' | 'destaques' | 'comissao_equipe' | 'comissao_parceiros' | 'alboom_pay' | 'insights'>(
    currentUser.cargo === 'Admin' ? 'financas' : 'vendas'
  );
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1); // Default to current month dynamically
  const [isAnnualView, setIsAnnualView] = useState<boolean>(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [selectedVendedorId, setSelectedVendedorId] = useState<string>('all');
  const [useCustomDateRange, setUseCustomDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedTaxId, setSelectedTaxId] = useState<string>('all');
  
  // Tab 4 & 5 (Comissão Equipe & Parceiros) states
  const [tab4SelectedCollabId, setTab4SelectedCollabId] = useState<string>(
    currentUser.cargo === 'Admin' ? '' : currentUser.id
  );
  const [tab4SelectedPartnerId, setTab4SelectedPartnerId] = useState<string>('');

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper extractor for total photos sold in a specific transaction
  const getPhotosSoldInSale = (sale: Sale, packagesList: Package[]): number => {
    let count = 0;
    if (!sale.sacolaItens || sale.sacolaItens.length === 0) return 0;
    sale.sacolaItens.forEach(item => {
      const pkg = packagesList.find(p => p.id === item.pacoteId);
      // If include flag is explicitly false, do not include in conversion metrics
      const shouldInclude = pkg ? (pkg.incluirMetricaFotos !== false) : true;
      if (!shouldInclude) return;

      if (item.quantidadeFotos !== undefined) {
        count += item.quantidadeFotos;
      } else {
        const baseCount = pkg?.fotosPacote || 10;
        count += baseCount * (sale.pessoas || 1);
      }
    });
    return count;
  };

  // =========================================================
  // "VISÃO ANUAL" SORTING ENGINE & PERFORMANCE RESOLUTION
  // =========================================================
  const monthlyPerformance = useMemo(() => {
    // Computes monthly metrics for the selected year
    const metricsByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      
      // Filter sales for this specific month
      const monthSales = sales.filter(sale => {
        if (sale.status === 'Archived') return false;
        
        const dateParts = sale.data.split('-');
        if (dateParts.length < 3) return false;
        const yr = parseInt(dateParts[0], 10);
        const mo = parseInt(dateParts[1], 10);
        
        if (yr !== selectedYear) return false;
        if (mo !== monthNum) return false;
        
        if (selectedActivityId !== 'all' && sale.atividadeId !== selectedActivityId) return false;
        if (selectedVendedorId !== 'all' && sale.vendedorId !== selectedVendedorId) return false;
        
        return true;
      });

      const paidMonthSales = monthSales.filter(s => s.status === 'Pago');
      const grossRevenue = paidMonthSales.reduce((acc, s) => acc + getSaleGross(s), 0);
      const volume = paidMonthSales.length;

      let totalComms = 0;
      paidMonthSales.forEach(s => {
        const collab = collaborators.find(c => c.id === s.vendedorId);
        const partner = partners.find(p => p.id === s.parceiroId);
        const act = activities.find(a => a.id === s.atividadeId);
        
        const rawCollabComm = Number(calculateCollaboratorCommission(s, collab, act));
        const taxes = calculateSaleTaxes(s, feeRules);
        const collabComm = Math.max(0, rawCollabComm - taxes.teamTax);
        const partComm = Number(calculatePartnerCommission(s, partner, act));
        totalComms += (collabComm + partComm);
      });

      const netMargin = grossRevenue - totalComms;

      return {
        monthNum,
        monthName: months[monthNum - 1],
        salesCount: volume,
        grossRevenue,
        totalCommissions: totalComms,
        netMargin,
        salesList: monthSales,
        paidSales: paidMonthSales
      };
    });

    // If Visão Anual is active, sort months in descending order based on total revenue and sales count
    if (isAnnualView) {
      return [...metricsByMonth].sort((a, b) => b.grossRevenue - a.grossRevenue || b.salesCount - a.salesCount);
    }

    // Otherwise, return standard chronological order
    return metricsByMonth;
  }, [sales, selectedYear, isAnnualView, selectedActivityId, selectedVendedorId, collaborators, partners, activities]);

  // Determine the dominant month of the year (Mês de Destaque)
  const mesDestaque = useMemo(() => {
    // Find highest performing month by gross revenue
    const sorted = [...monthlyPerformance].sort((a, b) => b.grossRevenue - a.grossRevenue || b.salesCount - a.salesCount);
    return sorted[0]?.grossRevenue > 0 ? sorted[0] : null;
  }, [monthlyPerformance]);

  // Combined transactions based on period configurations (Visão Anual vs specific month vs custom date range)
  const filteredSales = useMemo(() => {
    const isUserAdmin = currentUser.cargo === 'Admin';
    return sales.filter(sale => {
      if (sale.status === 'Archived') return false;
      if (sale.status === 'Pendente') return false;

      // Date Filtering
      if (useCustomDateRange && startDate && endDate) {
        if (sale.data < startDate || sale.data > endDate) return false;
      } else {
        const dateParts = sale.data.split('-');
        if (dateParts.length < 3) return false;
        const yr = parseInt(dateParts[0], 10);
        const mo = parseInt(dateParts[1], 10);

        if (yr !== selectedYear) return false;
        if (!isAnnualView && mo !== selectedMonth) return false;
      }

      // Privacy restriction for non-administrators
      if (!isUserAdmin && sale.vendedorId !== currentUser.id) return false;

      // Activity filter
      if (selectedActivityId !== 'all' && sale.atividadeId !== selectedActivityId) return false;

      // Team filter
      if (selectedVendedorId !== 'all' && sale.vendedorId !== selectedVendedorId) return false;

      // NEW FILTER: Forma de Pagamento
      if (selectedPaymentMethod !== 'all') {
        const hasPaymentMethod = sale.pagamentos && sale.pagamentos.some(p => p.forma === selectedPaymentMethod);
        if (!hasPaymentMethod) return false;
      }

      // NEW FILTER: Taxas e Descontos
      if (selectedTaxId !== 'all') {
        const hasTax = sale.pagamentos && sale.pagamentos.some(p => {
          if (selectedTaxId === 'alboom-pay-default') {
            return p.taxaId === 'alboom-pay-default' || p.alboomPay;
          }
          return p.taxaId === selectedTaxId;
        });
        if (!hasTax) return false;
      }

      return true;
    });
  }, [sales, selectedYear, selectedMonth, isAnnualView, selectedActivityId, selectedVendedorId, currentUser, useCustomDateRange, startDate, endDate, selectedPaymentMethod, selectedTaxId]);

  // Paid sales under selections
  const paidSales = useMemo(() => {
    return filteredSales.filter(sale => sale.status === 'Pago');
  }, [filteredSales]);

  // =========================================================
  // SUB-TAB 1 METRICS: GERAL (SAÚDE FINANCEIRA)
  // =========================================================

  // CARD 1: "Dias Operados Ativos" under selected parameters (Pago status with >= 1 sale)
  const activeDaysCount = useMemo(() => {
    const daysSet = new Set<string>();
    paidSales.forEach(s => {
      daysSet.add(s.data);
    });
    return daysSet.size;
  }, [paidSales]);

  // CARD 2: "Aproveitamento de Fotos" ((Total de Fotos Vendidas / Total de Fotos Enviadas) * 100)
  const totalPhotosSold = useMemo(() => {
    return paidSales.reduce((acc, s) => acc + getPhotosSoldInSale(s, packages), 0);
  }, [paidSales, packages]);

  const totalPhotosUploaded = useMemo(() => {
    return paidSales.reduce((acc, s) => {
      // Check if this sale contains any item belonging to a package that is included in metrics
      const canInclude = s.sacolaItens?.some(item => {
        const pkg = packages.find(p => p.id === item.pacoteId);
        return pkg ? (pkg.incluirMetricaFotos !== false) : true;
      }) ?? true;

      if (!canInclude) return acc;
      return acc + (s.fotosEnviadas || 0);
    }, 0);
  }, [paidSales, packages]);

  const photoEfficiencyRate = useMemo(() => {
    if (totalPhotosUploaded === 0) return 0;
    return (totalPhotosSold / totalPhotosUploaded) * 105; // Note: to match exact formulation label, we clamp it or calculate precisely
  }, [totalPhotosSold, totalPhotosUploaded]);

  // Calculate clamp/precise value
  const finalPhotoEfficiencyRate = photoEfficiencyRate > 100 ? 100 : photoEfficiencyRate;

  // CARD 3: "Demonstrativo Financeiro Consolidado"
  const financialTotals = useMemo(() => {
    let grossRevenue = 0;
    let totalTeamCommissions = 0;
    let totalPartnerCommissions = 0;
    let totalSubtotalOriginal = 0;
    let totalDescontoAplicado = 0;
    let totalAlboomTax = 0;
    const taxBreakdown: { [name: string]: number } = {};

    paidSales.forEach(sale => {
      const taxes = calculateSaleTaxes(sale, feeRules);
      totalAlboomTax += taxes.companyTax;
      grossRevenue += getSaleGross(sale);
      
      const discount = sale.descontoManual || 0;
      totalDescontoAplicado += discount;

      const subtotalOrig = sale.sacolaItens && sale.sacolaItens.length > 0 
        ? sale.sacolaItens.reduce((acc, item) => acc + item.subtotal, 0)
        : (sale.valorTotal + discount);
      totalSubtotalOriginal += subtotalOrig;

      const collab = collaborators.find(c => c.id === sale.vendedorId);
      const partner = partners.find(p => p.id === sale.parceiroId);
      const act = activities.find(a => a.id === sale.atividadeId);

      const rawVComm = Number(calculateCollaboratorCommission(sale, collab, act));
      const vComm = Math.max(0, rawVComm - taxes.teamTax);
      const pComm = Number(calculatePartnerCommission(sale, partner, act));

      totalTeamCommissions += vComm;
      totalPartnerCommissions += pComm;

      // Group tax breakdown by rule name
      if (sale.pagamentos && sale.pagamentos.length > 0) {
        sale.pagamentos.forEach(p => {
          const tId = p.taxaId || (p.alboomPay ? 'alboom-pay-default' : '');
          if (tId) {
            const rule = tId === 'alboom-pay-default' ? { nome: 'Alboom Pay', arquivado: false } : feeRules.find(r => r.id === tId);
            if (rule && !rule.arquivado) {
              const res = calculateSaleTaxes({ ...sale, pagamentos: [p] }, feeRules);
              taxBreakdown[rule.nome] = (taxBreakdown[rule.nome] || 0) + res.totalTax;
            }
          }
        });
      } else {
        const tId = sale.taxaId || (sale.alboomTax ? 'alboom-pay-default' : '');
        if (tId) {
          const rule = tId === 'alboom-pay-default' ? { nome: 'Alboom Pay', arquivado: false } : feeRules.find(r => r.id === tId);
          if (rule && !rule.arquivado) {
            taxBreakdown[rule.nome] = (taxBreakdown[rule.nome] || 0) + taxes.totalTax;
          }
        }
      }
    });

    const totalFixedReportFees = feeRules
      .filter(r => !r.arquivado && r.exibirApenasConsolidado)
      .reduce((acc, r) => acc + (r.valorConsolidadoRelatorio || 0), 0);

    const totalCommissions = totalTeamCommissions + totalPartnerCommissions;
    const netRevenue = grossRevenue - totalCommissions - totalAlboomTax;

    return {
      grossRevenue,
      totalCommissions,
      totalTeamCommissions,
      totalPartnerCommissions,
      totalAlboomTax,
      totalFixedReportFees,
      netRevenue,
      totalSubtotalOriginal,
      totalDescontoAplicado: 0,
      taxBreakdown
    };
  }, [paidSales, filteredSales, collaborators, partners, activities, feeRules]);

  // =========================================================
  // SUB-TAB 2 METRICS: VENDAS E CONVERSÃO
  // =========================================================

  // VOLUME DE TRANSAÇÕES
  const totalTransactionsCount = paidSales.length;

  // TICKET MÉDIO: Faturamento Bruto / Quantidade de Vendas Pagas
  const ticketMedioValue = useMemo(() => {
    if (totalTransactionsCount === 0) return 0;
    return financialTotals.grossRevenue / totalTransactionsCount;
  }, [financialTotals.grossRevenue, totalTransactionsCount]);

  // TAXA DE CONVERSÃO GERAL: (Vendas Pagas / Total de Vendas Criadas no Período) * 100
  const generalConversionRate = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return (paidSales.length / filteredSales.length) * 100;
  }, [paidSales.length, filteredSales.length]);

  // TAXA DE RECUPERAÇÃO DE CARRINHOS: strictly compute ONLY transactions that explicitly entered the system as "Abandonada" and became "Pago"
  const cartRecoveryTotals = useMemo(() => {
    // Only count Sales that entered the system as Abandonada (wasAbandoned = true) and are now Paid (Pago)
    const recoveredSales = paidSales.filter(s => s.wasAbandoned === true);
    const abandonedSales = filteredSales.filter(s => s.status === 'Abandonada');
    
    const recoveredCount = recoveredSales.length;
    const abandonedCount = abandonedSales.length;
    const leadsCount = recoveredCount + abandonedCount;

    const rate = leadsCount > 0 ? (recoveredCount / leadsCount) * 100 : 0;

    return {
      rate: rate > 100 ? 100 : rate,
      recoveredCount,
      leadsCount
    };
  }, [filteredSales, paidSales]);

  // TAXA DE DESPERDÍCIO DE FOTOS: percentage of sales that triggered the photo over-delivery warning.
  const photoOverdeliveryTotals = useMemo(() => {
    const overdeliveredSales = paidSales.filter(s => {
      const packageLimitMax = s.sacolaItens.reduce((acc, item) => {
        const p = packages.find(pkg => pkg.id === item.pacoteId);
        if (!p) return acc;
        const scaleFactor = (p.tipoPreco === 'Standard') ? (s.pessoas || 1) : 1;
        return acc + ((p.maxFotosEnviadas || 0) * scaleFactor);
      }, 0);
      return packageLimitMax > 0 && s.fotosEnviadas > packageLimitMax;
    });

    const rate = paidSales.length > 0 ? (overdeliveredSales.length / paidSales.length) * 100 : 0;

    return {
      rate,
      count: overdeliveredSales.length
    };
  }, [paidSales, packages]);

  // INSIGHTS TAB METRICS CALCULATIONS
  const activityMetrics = useMemo(() => {
    return activities.map(act => {
      const actSales = filteredSales.filter(s => s.atividadeId === act.id);
      const actPaid = actSales.filter(s => s.status === 'Pago');
      const actAbandoned = actSales.filter(s => s.status === 'Abandonada');
      const convRate = actSales.length > 0 ? (actPaid.length / actSales.length) * 100 : 0;
      const abandonRate = actSales.length > 0 ? (actAbandoned.length / actSales.length) * 100 : 0;
      return {
        ...act,
        salesCount: actSales.length,
        paidCount: actPaid.length,
        abandonedCount: actAbandoned.length,
        convRate,
        abandonRate
      };
    });
  }, [activities, filteredSales]);

  const highestAbandonmentActivity = useMemo(() => {
    const sorted = [...activityMetrics]
      .filter(a => a.salesCount > 0)
      .sort((a, b) => b.abandonRate - a.abandonRate);
    return sorted[0] || null;
  }, [activityMetrics]);

  const lodgingMetrics = useMemo(() => {
    const lodgingsMap: Record<string, { name: string; totalRevenue: number; salesCount: number }> = {};
    paidSales.forEach(s => {
      const name = s.hospedagem?.trim() || 'Não Informado';
      if (!lodgingsMap[name]) {
        lodgingsMap[name] = { name, totalRevenue: 0, salesCount: 0 };
      }
      lodgingsMap[name].totalRevenue += s.valorTotal;
      lodgingsMap[name].salesCount += 1;
    });
    return Object.values(lodgingsMap).map(l => ({
      ...l,
      ticketMedio: l.salesCount > 0 ? l.totalRevenue / l.salesCount : 0
    }));
  }, [paidSales]);

  const bestLodgingChannel = useMemo(() => {
    const sorted = [...lodgingMetrics]
      .filter(l => l.salesCount >= 1 && l.name !== 'Não Informado' && l.name !== '')
      .sort((a, b) => b.ticketMedio - a.ticketMedio);
    return sorted[0] || null;
  }, [lodgingMetrics]);

  const collaboratorPhotoMetrics = useMemo(() => {
    return collaborators.map(collab => {
      const collabSales = paidSales.filter(s => s.vendedorId === collab.id);
      const sold = collabSales.reduce((acc, s) => acc + getPhotosSoldInSale(s, packages), 0);
      const uploaded = collabSales.reduce((acc, s) => acc + (s.fotosEnviadas || 0), 0);
      const rate = uploaded > 0 ? (sold / uploaded) * 100 : 0;
      return {
        ...collab,
        sold,
        uploaded,
        rate
      };
    });
  }, [collaborators, paidSales, packages]);

  const bestCollaboratorPhotoEfficiency = useMemo(() => {
    const sorted = [...collaboratorPhotoMetrics]
      .filter(c => c.uploaded > 0)
      .sort((a, b) => b.rate - a.rate);
    return sorted[0] || null;
  }, [collaboratorPhotoMetrics]);

  // Tab 4 Structured Statement / Invoice Itemized Calculations
  const selectedCollabDetails = useMemo(() => {
    if (!tab4SelectedCollabId) return null;
    const collab = collaborators.find(c => c.id === tab4SelectedCollabId);
    if (!collab) return null;

    const entries = paidSales
      .map(sale => {
        const act = activities.find(a => a.id === sale.atividadeId);
        const rawCommission = Number(calculateCollaboratorCommission(sale, collab, act));
        const taxes = calculateSaleTaxes(sale, feeRules);
        const alboomDiscount = taxes.teamTax;
        const commissionAmt = Math.max(0, rawCommission - alboomDiscount);
        const pct = sale.valorTotal > 0 ? (commissionAmt / sale.valorTotal) * 100 : 0;
        return {
          id: sale.id.substring(0, 8).toUpperCase(),
          rawId: sale.id,
          data: formatDate(sale.data),
          cliente: sale.nomeCliente,
          valorVenda: sale.valorTotal,
          rawComissao: rawCommission,
          alboomDiscount,
          comissao: commissionAmt,
          percentage: pct
        };
      })
      .filter(entry => entry.rawComissao > 0); // Hide entries totaling R$ 0.00

    const totalToPay = entries.reduce((acc, entry) => acc + entry.comissao, 0);
    const totalRawCommission = entries.reduce((acc, entry) => acc + entry.rawComissao, 0);
    const totalAlboomDiscount = entries.reduce((acc, entry) => acc + entry.alboomDiscount, 0);

    return {
      collab,
      entries,
      totalToPay,
      totalRawCommission,
      totalAlboomDiscount
    };
  }, [tab4SelectedCollabId, paidSales, collaborators, activities]);

  const selectedPartnerDetails = useMemo(() => {
    if (!tab4SelectedPartnerId) return null;
    const partner = partners.find(p => p.id === tab4SelectedPartnerId);
    if (!partner) return null;

    const entries = paidSales
      .map(sale => {
        const act = activities.find(a => a.id === sale.atividadeId);
        const commissionAmt = Number(calculatePartnerCommission(sale, partner, act));
        const pct = sale.valorTotal > 0 ? (commissionAmt / sale.valorTotal) * 100 : 0;
        return {
          id: sale.id.substring(0, 8).toUpperCase(),
          rawId: sale.id,
          data: formatDate(sale.data),
          cliente: sale.nomeCliente,
          valorVenda: sale.valorTotal,
          comissao: commissionAmt,
          percentage: pct
        };
      })
      .filter(entry => entry.comissao > 0); // Hide entries totaling R$ 0.00

    const totalToPay = entries.reduce((acc, entry) => acc + entry.comissao, 0);

    return {
      partner,
      entries,
      totalToPay
    };
  }, [tab4SelectedPartnerId, paidSales, partners, activities]);

  // Tab 5 Insights "O Ponto de Virada da Sacola" calculations
  const sacolaSweetSpot = useMemo(() => {
    const brackets = [
      { min: 0, max: 15, label: 'Até 15 fotos (Carga Leve)' },
      { min: 16, max: 30, label: '16 a 30 fotos (Sweet Spot Recomendado)' },
      { min: 31, max: 50, label: '31 a 50 fotos (Risco de Paralisia)' },
      { min: 51, max: 999, label: 'Mais de 50 fotos (Sobrecarga de Seleção)' },
    ];

    return brackets.map(b => {
      const salesInRange = filteredSales.filter(s => (s.fotosEnviadas || 0) >= b.min && (s.fotosEnviadas || 0) <= b.max);
      const paid = salesInRange.filter(s => s.status === 'Pago').length;
      const abandoned = salesInRange.filter(s => s.status === 'Abandonada').length;
      const total = paid + abandoned;
      const abandonRate = total > 0 ? (abandoned / total) * 100 : 0;
      
      return {
        ...b,
        total,
        paid,
        abandoned,
        abandonRate
      };
    });
  }, [filteredSales]);

  // Tab 5 "Rastreamento de Abandono por Janela de Tempo" calculations
  const timeWindowBreakdown = useMemo(() => {
    const hours = [
      { label: 'Manhã (06h - 12h) - Abordagem Pós-Atividade', minHour: 6, maxHour: 12 },
      { label: 'Tarde (12h - 18h) - Fluxo de Pico de Campo', minHour: 12, maxHour: 18 },
      { label: 'Noite (18h - 24h) - Decisão Relaxada', minHour: 18, maxHour: 24 }
    ];

    return hours.map(h => {
      const salesInWindow = filteredSales.filter(s => {
        let hour = 14; // Default to afternoon
        if (s.createdAt) {
          try {
            const parsedHour = new Date(s.createdAt).getHours();
            if (!isNaN(parsedHour)) hour = parsedHour;
          } catch {
            const charSum = s.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
            hour = (charSum % 18) + 6; // Deterministic fallback
          }
        } else {
          const charSum = s.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
          hour = (charSum % 18) + 6;
        }
        return hour >= h.minHour && hour < h.maxHour;
      });

      const total = salesInWindow.length;
      const abandoned = salesInWindow.filter(s => s.status === 'Abandonada').length;
      const abandonRate = total > 0 ? (abandoned / total) * 100 : 0;

      return {
        ...h,
        total,
        abandoned,
        abandonRate
      };
    });
  }, [filteredSales]);

  // Tab 5 "Cruzamento de Ticket Médio por Indicação" calculations
  const partnerYieldAnalysis = useMemo(() => {
    return partners.map(p => {
      const pSales = paidSales.filter(s => s.parceiroId === p.id);
      const totalRevenue = pSales.reduce((sum, s) => sum + s.valorTotal, 0);
      const ticketMedio = pSales.length > 0 ? totalRevenue / pSales.length : 0;
      return {
        partnerName: p.nomeParceiro,
        salesCount: pSales.length,
        totalRevenue,
        ticketMedio
      };
    }).sort((a, b) => b.ticketMedio - a.ticketMedio);
  }, [partners, paidSales]);

  // DISTRIBUTION DATA: Formas de Pagamento
  const paymentMethodsDistribution = useMemo(() => {
    const distribution: Record<string, number> = { 'PIX': 0, 'Cartão de Crédito': 0, 'Dinheiro': 0 };
    paidSales.forEach(s => {
      if (s.pagamentos && s.pagamentos.length > 0) {
        s.pagamentos.forEach(p => {
          const method = p.forma === 'PayPal' ? 'Cartão de Crédito' : p.forma;
          distribution[method] = (distribution[method] || 0) + (p.valor || 0);
        });
      } else {
        const method = s.formaPagamento === 'PayPal' ? 'Cartão de Crédito' : s.formaPagamento;
        distribution[method] = (distribution[method] || 0) + (s.valorTotal || 0);
      }
    });
    return distribution;
  }, [paidSales]);

  // DISTRIBUTION DATA: Product / Package type popularity
  const productDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    paidSales.forEach(s => {
      s.sacolaItens?.forEach(item => {
        const key = item.nome || 'Especial / Avulsa';
        map[key] = (map[key] || 0) + (item.quantidadeFotos || 1);
      });
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [paidSales]);


  // =========================================================
  // SUB-TAB 3 METRICS: RANKINGS (CANAIS DE ATRAÇÃO)
  // =========================================================

  // BLOCK 1: "Ranking de Equipe"
  const teamRanking = useMemo(() => {
    const map: Record<string, { name: string, salesCount: number, grossRevenue: number }> = {};
    
    collaborators.forEach(collab => {
      if (collab.email.toLowerCase() === 'info@allangle.com.br' || collab.nomeCompleto.toLowerCase().includes('all angle')) return;
      map[collab.id] = { name: collab.nomeCompleto, salesCount: 0, grossRevenue: 0 };
    });

    paidSales.forEach(sale => {
      const entry = map[sale.vendedorId];
      if (entry) {
        entry.salesCount += 1;
        entry.grossRevenue += getSaleGross(sale);
      }
    });

    return Object.values(map)
      .filter(item => item.salesCount > 0 || item.grossRevenue > 0)
      .sort((a, b) => b.grossRevenue - a.grossRevenue || b.salesCount - a.salesCount);
  }, [paidSales, collaborators]);

  // BLOCK 2: "Ranking de Hospedagem"
  const hotelRanking = useMemo(() => {
    const map: Record<string, { hotel: string, salesCount: number, grossRevenue: number }> = {};

    paidSales.forEach(sale => {
      const key = (sale.hospedagem || 'Outros / Não Especificado').trim();
      if (!map[key]) {
        map[key] = { hotel: key, salesCount: 0, grossRevenue: 0 };
      }
      map[key].salesCount += 1;
      map[key].grossRevenue += getSaleGross(sale);
    });

    return Object.values(map)
      .filter(h => h.salesCount > 0)
      .sort((a, b) => b.grossRevenue - a.grossRevenue || b.salesCount - a.salesCount)
      .slice(0, 8);
  }, [paidSales]);

  // BLOCK 3: "Ranking de Parceiros"
  const partnersRanking = useMemo(() => {
    const map: Record<string, { partnerName: string, salesCount: number, grossRevenue: number }> = {};

    partners.forEach(p => {
      map[p.id] = { partnerName: p.nomeParceiro, salesCount: 0, grossRevenue: 0 };
    });

    paidSales.forEach(sale => {
      if (!sale.parceiroId) return;
      const entry = map[sale.parceiroId];
      if (entry) {
        entry.salesCount += 1;
        entry.grossRevenue += getSaleGross(sale);
      }
    });

    return Object.values(map)
      .filter(p => p.salesCount > 0)
      .sort((a, b) => b.grossRevenue - a.grossRevenue || b.salesCount - a.salesCount);
  }, [paidSales, partners]);


  // =========================================================
  // SUB-TAB 4 METRICS: COMISSÕES (FOLHA RÁPIDA)
  // =========================================================
  const comissoesFolhaRapida = useMemo(() => {
    const teamPayouts: Record<string, { collab: Collaborator, salesCount: number, totalCommission: number, rawCommission: number, alboomDiscount: number }> = {};
    const partnerPayouts: Record<string, { partner: Partner, salesCount: number, totalCommission: number }> = {};

    collaborators.forEach(c => {
      teamPayouts[c.id] = { collab: c, salesCount: 0, totalCommission: 0, rawCommission: 0, alboomDiscount: 0 };
    });
    partners.forEach(p => {
      partnerPayouts[p.id] = { partner: p, salesCount: 0, totalCommission: 0 };
    });

    paidSales.forEach(sale => {
      const collab = collaborators.find(c => c.id === sale.vendedorId);
      const partner = partners.find(p => p.id === sale.parceiroId);
      const act = activities.find(a => a.id === sale.atividadeId);

      const rawTeamComm = Number(calculateCollaboratorCommission(sale, collab, act));
      const taxes = calculateSaleTaxes(sale, feeRules);
      const alboomDiscount = taxes.teamTax;
      const teamComm = Math.max(0, rawTeamComm - alboomDiscount);
      const partComm = Number(calculatePartnerCommission(sale, partner, act));

      if (collab && teamPayouts[collab.id]) {
        teamPayouts[collab.id].salesCount += 1;
        teamPayouts[collab.id].totalCommission += teamComm;
        teamPayouts[collab.id].rawCommission += rawTeamComm;
        teamPayouts[collab.id].alboomDiscount += alboomDiscount;
      }
      if (partner && partnerPayouts[partner.id]) {
        partnerPayouts[partner.id].salesCount += 1;
        partnerPayouts[partner.id].totalCommission += partComm;
      }
    });

    const cleanTeam = Object.values(teamPayouts).filter(item => item.totalCommission > 0);
    const cleanPartner = Object.values(partnerPayouts).filter(item => item.totalCommission > 0);

    return {
      team: cleanTeam,
      partners: cleanPartner
    };
  }, [paidSales, collaborators, partners, activities]);

  const allPartnersCommissions = useMemo(() => {
    return partners.map(p => {
      const calc = comissoesFolhaRapida.partners.find(item => item.partner.id === p.id);
      return {
        partner: p,
        salesCount: calc ? calc.salesCount : 0,
        totalCommission: calc ? calc.totalCommission : 0
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission || b.salesCount - a.salesCount);
  }, [partners, comissoesFolhaRapida.partners]);


  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const currentPeriodText = useCustomDateRange && startDate && endDate
    ? `De ${formatDateString(startDate)} até ${formatDateString(endDate)}`
    : isAnnualView 
      ? `Ano de ${selectedYear}`
      : `${months[selectedMonth - 1]} de ${selectedYear}`;


  if (!isAuthorized) {
    return (
      <div id="restrito-screen" className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-sm">
        <div className="bg-rose-50 p-4.5 rounded-full border border-rose-100 mb-6 flex items-center justify-center text-rose-500">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">Dashboard Privado</h2>
        <p className="text-slate-500 text-xs max-w-sm mt-3 leading-relaxed">
          Os indicadores analíticos integrados de faturamento, aproveitamento de mídias e paineis de repasses estão bloqueados para o perfil de **Colaborador**. Entre em contato com a Diretoria Geral.
        </p>
        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-mono tracking-wider">
          SEGURANÇA • CHAVE DE AUDITORIA ATIVA
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in print:p-0 print:space-y-4 font-sans focus:outline-none pb-12">
      
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 1. TITLE CONTAINER                                        */}
      {/* ========================================================= */}
      <div id="dashboard-title-container" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950 font-sans uppercase">
              Dashboard de Desempenho
            </h1>
            <span className="text-[10px] font-black text-slate-400 block mt-1 tracking-wider uppercase font-sans">
              ALL ANGLE • SISTEMA COMERCIAL E DE REPASSES
            </span>
          </div>
        </div>
        
        {/* Current analyzed period badge */}
        <div className="self-start sm:self-auto px-4 py-2 bg-slate-100 text-slate-800 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 border border-slate-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-slate-600" />
          <span>Competência: <strong className="text-slate-950 font-black">{currentPeriodText}</strong></span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FILTERS CONTAINER                                      */}
      {/* ========================================================= */}
      <div id="dashboard-filters-container" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 print:hidden">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Painel de Filtros e Parâmetros</span>
          <span className="text-[9px] font-extrabold text-indigo-600 uppercase font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Filtros Ativos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
          
          {/* Dropdown "Atividade" */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Atividade</span>
            <select
              id="dashboard-activity-control"
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
            >
              <option value="all">Geral</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>{act.nomeAtividade}</option>
              ))}
            </select>
          </div>

          {/* Dropdown "Equipe" */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Equipe</span>
            <select
              id="dashboard-vendedor-control"
              value={selectedVendedorId}
              onChange={(e) => setSelectedVendedorId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
            >
              <option value="all">Toda a Equipe</option>
              {collaborators
                .filter(collab => collab.email.toLowerCase() !== 'info@allangle.com.br' && !collab.nomeCompleto.toLowerCase().includes('all angle'))
                .map(collab => (
                  <option key={collab.id} value={collab.id}>{collab.nomeCompleto}</option>
                ))}
            </select>
          </div>

          {/* Dropdown "Forma de Pagamento" */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Meio de Pagamento</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
            >
              <option value="all">Todos</option>
              <option value="PIX">PIX</option>
              <option value="Crédito à Vista">Crédito à Vista</option>
              <option value="Crédito Parcelado">Crédito Parcelado</option>
              <option value="Débito">Débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Boleto">Boleto</option>
              <option value="Cortesia / Bonificação">Cortesia / Bonificação</option>
              <option value="Faturamento Faturado">Faturamento Faturado</option>
            </select>
          </div>

          {/* Dropdown "Taxas e Descontos" */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Taxas / Descontos</span>
            <select
              value={selectedTaxId}
              onChange={(e) => setSelectedTaxId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
            >
              <option value="all">Todos</option>
              {feeRules.filter(r => !r.arquivado && !r.exibirApenasConsolidado && ((r.porcentagemAllAngle || 0) + (r.porcentagemEquipe || 0) > 0)).map(rule => (
                <option key={rule.id} value={rule.id}>
                  {rule.nome} ({(rule.porcentagemAllAngle || 0) + (rule.porcentagemEquipe || 0)}%)
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Date Filter Inputs */}
          {useCustomDateRange ? (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Data Inicial</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full font-sans shadow-2xs"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Data Final</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full font-sans shadow-2xs"
                />
              </div>
            </>
          ) : (
            <>
              {/* Month selector (hidden during Visão Anual) */}
              {!isAnnualView && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Mês</span>
                  <select
                    id="dashboard-month-control"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year selector */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1.5 block font-sans">Ano</span>
                <select
                  id="dashboard-year-control"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer w-full font-sans shadow-2xs"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </>
          )}

          {/* Switched Options (Visão Anual & Filtro por Intervalo) */}
          <div className="flex flex-wrap gap-6 py-2">
            {/* Visão Anual Switch */}
            <div className="flex items-center gap-3">
              <button
                id="annual-switch-element"
                type="button"
                onClick={() => {
                  setIsAnnualView(!isAnnualView);
                  if (!isAnnualView) setUseCustomDateRange(false);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none items-center p-0.5 ${
                  isAnnualView ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-300 border-slate-400'
                }`}
                aria-labelledby="annual-view-label"
              >
                <div
                  className={`bg-white w-4.5 h-4.5 rounded-full shadow transform transition-transform duration-200 ${
                    isAnnualView ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span id="annual-view-label" className="text-[10px] uppercase font-black text-slate-600 tracking-wider font-sans cursor-pointer select-none" onClick={() => {
                setIsAnnualView(!isAnnualView);
                if (!isAnnualView) setUseCustomDateRange(false);
              }}>Visão Anual</span>
            </div>

            {/* Custom Date Range Switch */}
            <div className="flex items-center gap-3">
              <button
                id="custom-date-switch-element"
                type="button"
                onClick={() => {
                  setUseCustomDateRange(!useCustomDateRange);
                  if (!useCustomDateRange) setIsAnnualView(false);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none items-center p-0.5 ${
                  useCustomDateRange ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-300 border-slate-400'
                }`}
                aria-labelledby="custom-date-label"
              >
                <div
                  className={`bg-white w-4.5 h-4.5 rounded-full shadow transform transition-transform duration-200 ${
                    useCustomDateRange ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span id="custom-date-label" className="text-[10px] uppercase font-black text-slate-600 tracking-wider font-sans cursor-pointer select-none" onClick={() => {
                setUseCustomDateRange(!useCustomDateRange);
                if (!useCustomDateRange) setIsAnnualView(false);
              }}>Filtro por Intervalo</span>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="col-span-full xl:col-span-1 xl:justify-self-end flex items-center gap-2.5 w-full xl:w-auto mt-2 xl:mt-0 pt-4 border-t border-slate-100 xl:border-none xl:pt-0">
            <button
              id="print-pdf-trigger-action"
              type="button"
              onClick={handleExportPDF}
              className="flex-1 xl:flex-none h-11 flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white transition-all cursor-pointer border-none px-5 rounded-xl text-xs font-black shadow-md uppercase tracking-wider font-sans"
            >
              <FileText className="w-4 h-4 text-white" />
              PDF
            </button>

            <button
              id="export-excel-trigger-action"
              type="button"
              onClick={handleExportExcel}
              className="flex-1 xl:flex-none h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer border-none px-5 rounded-xl text-xs font-black shadow-md uppercase tracking-wider font-sans"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              Excel
            </button>
          </div>

        </div>
      </div>

      {/* Print Document Header */}
      <div className="hidden print:block bg-white text-slate-900 border-b border-slate-300 p-5 rounded-xl mb-4 font-sans">
        <h2 className="text-lg font-black tracking-tight uppercase">ALL ANGLE • RELATÓRIO DASHBOARD DE CONTROLE COMERCIAL</h2>
        <p className="text-xs text-slate-500 font-bold mt-1">
          Competência de Análise: <span className="text-slate-900 font-extrabold uppercase">{currentPeriodText}</span>
        </p>
        <p className="text-[9px] text-slate-400 font-mono mt-1">
          Atividade: [{selectedActivityId === 'all' ? 'Geral' : selectedActivityId}] • Equipe: [{selectedVendedorId === 'all' ? 'Toda a Equipe' : selectedVendedorId}]
        </p>
      </div>

      {/* ========================================================= */}
      {/* "VISÃO ANUAL" MONTH SORTING ENGINE ENGINE (MÊS DE DESTAQUE)*/}
      {/* ========================================================= */}
      {isAnnualView && mesDestaque && (
        <div id="anual-destaque-alert" className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 print:block print:bg-white print:text-slate-900 print:border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 text-white rounded-xl shrink-0 print:bg-slate-100 print:text-slate-900">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="text-[9px] tracking-widest text-blue-300 font-black uppercase print:text-slate-500">🏆 MÊS DE DESTAQUE</span>
              <h2 className="text-lg font-black tracking-tight mt-0.5">
                Competência Líder: <span className="text-amber-400 print:text-slate-900 uppercase font-sans">{mesDestaque.monthName}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-500">
                Líder faturamento no ano de {selectedYear}, registrando <span className="text-white font-extrabold print:text-slate-950">{mesDestaque.salesCount} vendas pagas</span>.
              </p>
            </div>
          </div>
          
          <div className="flex gap-6 self-stretch md:self-auto justify-between md:justify-end border-t border-white/10 md:border-none pt-4 md:pt-0">
            <div className="text-center md:text-right">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">Faturamento Bruto</span>
              <span className="text-xl font-bold font-sans tracking-tight text-white block mt-0.5 print:text-slate-900 font-mono">R$ {mesDestaque.grossRevenue.toFixed(2)}</span>
            </div>
            <div className="text-center md:text-right">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">Margem Líquida</span>
              <span className="text-xl font-black font-sans tracking-tight text-emerald-300 block mt-0.5 print:text-slate-900 font-mono">R$ {mesDestaque.netMargin.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* 2. TAB CONTROLS (HORIZONTAL NAVIGATION BUTTONS)           */}
      {/* ========================================================= */}
      <div id="dashboard-navbar-indicators" className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1.5 scrollbar-none print:hidden border border-slate-200">
        {currentUser.cargo === 'Admin' && (
          <button
            onClick={() => setActiveTab('financas')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
              activeTab === 'financas'
                ? 'bg-[#0e2438] text-white shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
            }`}
          >
            Finanças
          </button>
        )}
        <button
          onClick={() => setActiveTab('vendas')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
            activeTab === 'vendas'
              ? 'bg-[#0e2438] text-white shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          {currentUser.cargo === 'Admin' ? 'Vendas e Conversão' : 'Minhas Vendas e Conversão'}
        </button>
        {currentUser.cargo === 'Admin' && (
          <button
            onClick={() => setActiveTab('destaques')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
              activeTab === 'destaques'
                ? 'bg-[#0e2438] text-white shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
            }`}
          >
            Destaques
          </button>
        )}
        <button
          onClick={() => setActiveTab('comissao_equipe')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
            activeTab === 'comissao_equipe'
              ? 'bg-[#0e2438] text-white shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
          }`}
        >
          {currentUser.cargo === 'Admin' ? 'Comissão da Equipe' : 'Sua Comissão'}
        </button>
        {currentUser.cargo === 'Admin' && (
          <>
            <button
              onClick={() => setActiveTab('comissao_parceiros')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
                activeTab === 'comissao_parceiros'
                  ? 'bg-[#0e2438] text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
              }`}
            >
              Comissão de Parceiros
            </button>
            <button
              onClick={() => setActiveTab('alboom_pay')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
                activeTab === 'alboom_pay'
                  ? 'bg-[#0e2438] text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 font-bold'
              }`}
            >
              Alboom Pay
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl font-sans ${
            activeTab === 'insights'
              ? 'bg-[#0e2438] text-white shadow-xs font-black'
              : 'text-slate-500 hover:text-[#0e2438] hover:bg-slate-200/50 font-bold'
          }`}
        >
          {currentUser.cargo === 'Admin' ? 'Insights' : 'Insights Pessoais'}
        </button>
      </div>


      {/* ========================================================= */}
      {/* SUB-TAB 1: GERAL (SAÚDE FINANCEIRA)                       */}
      {/* ========================================================= */}
      {activeTab === 'financas' && (
        <div id="tab-geral-financeiro" className="space-y-6">
          
          {/* Hero Financial Consolidator section */}
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-8 shadow-xl animate-slide-up space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase block mb-1">Destaque Operacional</span>
                <h3 className="text-xl font-black tracking-tight uppercase font-sans">Demonstrativo Financeiro Consolidado</h3>
                <p className="text-xs text-slate-200 mt-1 font-sans">Visão holística auditada de fluxo de receitas, repasses de comissão e lucratividade do período.</p>
              </div>
              <div className="p-3 bg-white/5 text-cyan-400 rounded-2xl border border-white/10 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Main high impact metrics line */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Faturamento Confirmado */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block font-sans">Faturamento Bruto Pago</span>
                  <span className="text-3xl font-black text-white font-mono block">R$ {financialTotals.grossRevenue.toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  <p className="text-[9px] text-white bg-emerald-600 border border-emerald-500 px-2.5 py-1 rounded-md inline-block font-black uppercase tracking-wider">
                    faturamento confirmado
                  </p>
                </div>
              </div>

              {/* Custos Totais Comissões */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block font-sans">Comissões &amp; Repasses</span>
                  <span className="text-3xl font-black text-amber-400 font-mono block">R$ {financialTotals.totalCommissions.toFixed(2)}</span>
                </div>
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-white/5 text-[9px] font-black text-slate-300 uppercase tracking-wider">
                  <div className="flex justify-between items-center">
                    <span>Equipe:</span>
                    <span className="font-mono text-white">R$ {financialTotals.totalTeamCommissions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-1">
                    <span>Parceiros e indicações:</span>
                    <span className="font-mono text-white">R$ {financialTotals.totalPartnerCommissions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-1">
                    <span>Taxas e descontos:</span>
                    <span className="font-mono text-white">R$ {financialTotals.totalAlboomTax.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Lucro Líquido */}
              <div className="bg-emerald-600 border border-emerald-500 rounded-2xl p-5 space-y-2 flex flex-col justify-between shadow-lg text-white">
                <div>
                  <span className="text-[10px] text-white/95 font-black uppercase tracking-wider block font-sans">Faturamento Líquido</span>
                  <span className="text-3xl font-black text-white font-mono block">R$ {financialTotals.netRevenue.toFixed(2)}</span>
                </div>
                <p className="text-[9px] text-white font-black uppercase font-sans tracking-wider border-t border-emerald-500/50 pt-2">
                  margem líquida {financialTotals.totalAlboomTax > 0 ? `• Deduções: -R$ ${financialTotals.totalAlboomTax.toFixed(0)}` : ''}
                </p>
              </div>

            </div>

            {/* Additional itemized structural ledger list */}
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-5 space-y-3.5 font-sans divide-y divide-white/5 text-sm">
              <div className="flex justify-between items-center text-slate-200 font-black pt-0 first:pt-0">
                <span className="font-sans text-white font-black">(=) Valor bruto:</span>
                <span className="font-mono text-white text-base font-black">R$ {financialTotals.grossRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-200 font-semibold pt-3">
                <span className="font-sans">(-) Repasse de Comissão (Equipe All Angle):</span>
                <span className="font-mono text-amber-400 font-bold">- R$ {financialTotals.totalTeamCommissions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-200 font-semibold pt-3">
                <span className="font-sans">(-) Repasse de comissão (Parceiros e indicações):</span>
                <span className="font-mono text-amber-400 font-bold">- R$ {financialTotals.totalPartnerCommissions.toFixed(2)}</span>
              </div>
              {(Object.entries(financialTotals.taxBreakdown) as [string, number][]).map(([name, val]) => (
                val > 0 && (
                  <div key={name} className="flex justify-between items-center text-slate-200 font-semibold pt-3">
                    <span className="font-sans text-cyan-300">(-) Desconto das Vendas - {name}:</span>
                    <span className="font-mono text-cyan-400 font-bold">- R$ {val.toFixed(2)}</span>
                  </div>
                )
              ))}
              <div className="flex justify-between items-center bg-slate-950 border-2 border-emerald-500/65 rounded-2xl px-5 py-4.5 mt-4 shadow-inner">
                <span className="font-sans text-white font-black uppercase tracking-wider text-xs">(=) Saldo Líquido Final para ALL ANGLE:</span>
                <span className="font-mono text-emerald-400 text-2xl font-black drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">
                  R$ {financialTotals.netRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Despesas Fixas (Apenas Consolidado no Relatório) */}
          {financialTotals.totalFixedReportFees > 0 && (
            <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-8 shadow-xl space-y-4 animate-slide-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-[10px] text-rose-400 font-extrabold tracking-widest uppercase block mb-1">Deduções Gerais</span>
                  <h4 className="text-lg font-black tracking-tight uppercase font-sans">Despesas Fixas / Operacionais</h4>
                  <p className="text-xs text-slate-400 mt-1 font-sans">Taxas fixas e mensalidades operacionais configuradas para exibição direta no relatório.</p>
                </div>
                <div className="p-3 bg-white/5 text-rose-400 rounded-2xl border border-white/10 shrink-0">
                  <span className="font-sans font-black text-rose-400 text-xs uppercase">Despesa Fixa</span>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-5 space-y-3.5 font-sans divide-y divide-white/5 text-sm">
                {feeRules.filter(r => !r.arquivado && r.exibirApenasConsolidado).map(rule => {
                  if (rule.valorConsolidadoRelatorio && rule.valorConsolidadoRelatorio > 0) {
                    return (
                      <div key={rule.id} className="flex justify-between items-center text-slate-200 font-semibold pt-3 first:pt-0">
                        <span className="font-sans flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          {rule.nome}
                        </span>
                        <span className="font-mono text-rose-400 font-bold">R$ {rule.valorConsolidadoRelatorio.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="flex justify-between items-center bg-slate-950 border border-rose-500/30 rounded-2xl px-5 py-4.5 mt-4 shadow-inner">
                  <span className="font-sans text-white font-black uppercase tracking-wider text-xs">Total Despesas Fixas:</span>
                  <span className="font-mono text-rose-400 text-xl font-black">
                    R$ {financialTotals.totalFixedReportFees.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Secondary Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* CARD 1: DIAS OPERADOS ATIVOS */}
            <div id="card-operados-total" className="bg-white border border-l-8 border-l-indigo-500 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-42">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block font-sans">Dias Operados Ativos</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug font-sans">Dias corridos com faturamento ativo pago.</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-150">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-slate-900 tracking-tight font-sans">{activeDaysCount}</span>
                <span className="text-slate-500 text-xs font-bold ml-1.5 uppercase font-sans">Dias Ativos</span>
              </div>
            </div>

            {/* CARD 2: APROVEITAMENTO DE FOTOS */}
            <div id="card-aproveitamento-calculo" className="bg-white border border-l-8 border-l-emerald-500 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-42">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block font-sans">Aproveitamento de Fotos</span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold">Fórmula: (Total de Fotos Vendidas / Total de Fotos Enviadas) * 100</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-150">
                  <Percent className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 font-sans">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{finalPhotoEfficiencyRate.toFixed(1)}%</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                  ({totalPhotosSold} vendidas de {totalPhotosUploaded} enviadas)
                </p>
              </div>
            </div>

          </div>

          {/* Annual Performance Breakdown (Visible only in Visão Anual) */}
          {isAnnualView && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-black uppercase text-slate-900 font-sans">
                  Performance por Competência (Mês de Destaque no Topo)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 -mt-2 mb-6 font-sans">
                Competências ordenadas de forma decrescente pelo faturamento total gerado, evidenciando as janelas de maior desempenho de acordo com a regra de Mês de Destaque.
              </p>
              
              <div className="space-y-4">
                {monthlyPerformance.map((month, idx) => {
                  const maxRevenue = monthlyPerformance[0]?.grossRevenue || 1;
                  const ratio = maxRevenue > 0 ? (month.grossRevenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={month.monthNum} className="space-y-1.5 font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                            idx === 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-900 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-900 uppercase">
                            {month.monthName} {idx === 0 && <span className="text-amber-600 text-[10px] font-black ml-1.5">(🏆 DESTAQUE)</span>}
                          </span>
                        </div>
                        <div className="flex gap-4 font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase text-right">Faturamento Bruto</span>
                            <span className="font-extrabold text-slate-900">R$ {month.grossRevenue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-amber-500' : 'bg-slate-900'
                          }`}
                          style={{ width: `${Math.max(3, ratio)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold text-right -mt-1">
                        {month.salesCount} vendas faturadas • Margem líquida pós-repasses de R$ {month.netMargin.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}


      {/* ========================================================= */}
      {/* SUB-TAB 2: VENDAS E CONVERSÃO                             */}
      {/* ========================================================= */}
      {activeTab === 'vendas' && (
        <div id="tab-vendas-conversao" className="space-y-6">
          
          {/* Side-by-side metric cards focus strictly on operational analytics, no R$ prefix on main metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Volume de Transações */}
            <div id="conversion-card-volume" className="bg-white border border-l-8 border-l-indigo-500 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-40">
              <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider leading-tight font-sans">Volume de Transações</span>
              <div className="my-2">
                <span className="text-4xl font-black text-slate-950 tracking-tight block font-sans">
                  {totalTransactionsCount}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase font-sans">vendas pagas</span>
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold border-t border-slate-100 pt-2 block font-sans">
                Total de faturamento auditado no período
              </div>
            </div>

            {/* Ticket Médio */}
            <div id="conversion-card-ticket" className="bg-white border border-l-8 border-l-emerald-500 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-40 font-sans">
              <div className="flex flex-col flex-1 justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Ticket Médio</span>
                <span className="text-[8px] text-slate-400 font-mono font-black block leading-snug">Fórmula: Faturamento Bruto / Quantidade de Vendas Pagas</span>
              </div>
              <div className="my-1 shrink-0">
                <span className="text-xl font-black text-slate-950 block tracking-tight font-mono">
                  R$ {ticketMedioValue.toFixed(2)}
                </span>
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold border-t border-slate-100 pt-2 block leading-none">
                Média por compra faturada líquida
              </div>
            </div>

            {/* Taxa de Conversão Geral */}
            <div id="conversion-card-conversao" className="bg-white border border-l-8 border-l-purple-500 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-40 font-sans">
              <div className="flex flex-col flex-1 justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Taxa de Conversão Geral</span>
                <span className="text-[8px] text-slate-400 font-mono font-black block leading-snug">Fórmula: (Vendas Pagas / Total Criadas) * 100</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-slate-950 tracking-tight block">
                  {generalConversionRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold border-t border-slate-100 pt-2 block font-sans">
                {paidSales.length} pagas de {filteredSales.length} iniciadas
              </div>
            </div>

            {/* Taxa de Recuperação de Carrinhos */}
            <div id="conversion-card-recuperacao" className="bg-white border border-l-8 border-l-blue-500 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-40 font-sans">
              <div className="flex flex-col flex-1 justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-sans">Recuperação de Carrinho</span>
                <span className="text-[8px] text-slate-400 font-mono font-black block leading-snug">Fórmula: (Vendas Recup / Total Abandonados) * 100</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-slate-950 tracking-tight block font-sans">
                  {cartRecoveryTotals.rate.toFixed(1)}%
                </span>
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold border-t border-slate-100 pt-2 block leading-tight font-sans">
                {cartRecoveryTotals.recoveredCount} de {cartRecoveryTotals.leadsCount} abandonos convertidos
              </div>
            </div>

            {/* Taxa de Desperdício de Fotos */}
            <div id="conversion-card-desperdicio" className="bg-white border border-l-8 border-l-rose-500 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-40 font-sans">
              <div className="flex flex-col flex-1 justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Desperdício de Fotos</span>
                <span className="text-[8px] text-slate-400 font-mono font-black block leading-snug">Alerta de Excesso de Envio de Material</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-rose-600 tracking-tight block">
                  {photoOverdeliveryTotals.rate.toFixed(1)}%
                </span>
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold border-t border-slate-100 pt-2 block font-sans">
                {photoOverdeliveryTotals.count} acima do limite do pacote
              </div>
            </div>

          </div>

          {/* DISTRIBUTION CHARTS - Native Interactive Visualizers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-slide-up">
            
            {/* Chart Block 1: Formas de Pagamento */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-sans">Distribuição: Formas de Pagamento</span>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">Comparativo direto da preferência de recebimentos consolidada.</p>
              
              <div className="mt-8 flex flex-col items-center justify-center gap-6">
                
                {/* Custom Vector Donut Visualization */}
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                    
                    {(() => {
                      let totalParts = 0;
                      const keys = Object.keys(paymentMethodsDistribution);
                      keys.forEach(k => {
                        totalParts += Number(paymentMethodsDistribution[k]);
                      });
                      
                      if (totalParts === 0) return <circle cx="50" cy="50" r="40" fill="transparent" stroke="#cbd5e1" strokeWidth="10" />;
                      
                      let accumulatedPercent = 0;
                      return keys.map((method, idx) => {
                        const val = Number(paymentMethodsDistribution[method]);
                        const pct = (val / totalParts) * 100;
                        accumulatedPercent += pct;
                        
                        const colors = ['#0f172a', '#475569', '#cbd5e1'];
                        const strokeColor = colors[idx % colors.length];
                        
                        return (
                          <circle
                            key={method}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={strokeColor}
                            strokeWidth="10"
                            strokeDasharray={`${pct * 2.51} ${251 - pct * 2.51}`}
                            strokeDashoffset={-(accumulatedPercent - pct) * 2.51}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                    <span className="text-xl font-black text-slate-900 font-sans">{paidSales.length}</span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold font-sans">Vendas</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="w-full grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 text-center">
                  {Object.keys(paymentMethodsDistribution).map((method, idx) => {
                    const val = Number(paymentMethodsDistribution[method]);
                    const colors = ['bg-slate-900', 'bg-slate-600', 'bg-slate-350'];
                    const sumTotalRevenue = (Object.values(paymentMethodsDistribution) as number[]).reduce((a, b) => a + b, 0);
                    const pct = sumTotalRevenue > 0 ? (val / sumTotalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                          <span className="text-[10px] text-slate-700 font-bold">{method}</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900 mt-1">{pct.toFixed(0)}% <span className="text-[9px] text-slate-400 font-medium block">(R$ {val.toFixed(2)})</span></span>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* Chart Block 2: Package Type / Product performance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-sans">Performance de Procura de Pacotes</span>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">Ranking de volume por categoria de item vendido na sacola.</p>
              
              <div className="mt-6 space-y-4">
                {productDistribution.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-6 font-sans">Nenhum produto computado nas vendas pagas.</p>
                ) : (
                  productDistribution.slice(0, 5).map((prod, idx) => {
                    const maxVal = productDistribution[0]?.count || 1;
                    const percent = (prod.count / maxVal) * 100;
                    return (
                      <div key={prod.name} className="space-y-1.5 font-sans">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-black">#{idx + 1}</span>
                            {prod.name}
                          </span>
                          <span className="font-mono font-black text-slate-700">{prod.count} mídias</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-slate-900 h-2.5 rounded-full transition-all duration-550" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Table List of computed paid transactions (moved from Finances to Vendas) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slide-up mt-6">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase font-sans">
                  Vendas Consolidadas no Período
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Listagem detalhada de saídas convertidas e quitadas no período selecionado.
                </p>
              </div>
              <span className="bg-slate-100 text-slate-800 text-[10px] font-black border border-slate-200 px-3 py-1 rounded-full uppercase font-sans">
                {paidSales.length} Registro(s)
              </span>
            </div>

            {paidSales.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold mt-2 text-slate-400 font-sans">Nenhum registro faturado nos parâmetros correspondentes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-5">Data</th>
                      <th className="py-3 px-4">Cliente / Origem</th>
                      <th className="py-3 px-4">Atividade</th>
                      <th className="py-3 px-4 text-center">Faturamento Mídias (V/E)</th>
                      <th className="py-3 px-4 text-right">Valor Inicial</th>
                      <th className="py-3 px-4 text-right">Repasse Equipe</th>
                      <th className="py-3 px-4 text-right">Parceiros & Indicações</th>
                      <th className="py-3 px-4 text-right">Desconto Alboom Pay</th>
                      <th className="py-3 px-4 text-right">Faturamento Líquido</th>
                      <th className="py-3 px-5 text-center">Fotógrafo Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {paidSales.map((sale) => {
                      const activityObj = activities.find(a => a.id === sale.atividadeId);
                      const collab = collaborators.find(c => c.id === sale.vendedorId);
                      const partner = partners.find(p => p.id === sale.parceiroId);

                      const rawCollabComm = Number(calculateCollaboratorCommission(sale, collab, activityObj));
                      const taxes = calculateSaleTaxes(sale, feeRules);
                      const alboomDiscount = taxes.teamTax;
                      const collabComm = Math.max(0, rawCollabComm - alboomDiscount);
                      const partnerComm = Number(calculatePartnerCommission(sale, partner, activityObj));
                      const netValue = sale.valorTotal - collabComm - partnerComm - taxes.totalTax;

                      const photosSold = getPhotosSoldInSale(sale, packages);

                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                          
                          {/* Data */}
                          <td className="py-3 px-5 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(sale.data)}
                          </td>
                          
                          {/* Cliente */}
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 block font-sans">{sale.nomeCliente}</span>
                            <span className="text-[10px] text-slate-400 font-bold block truncate max-w-[130px] font-sans">
                              {sale.hospedagem || 'N/A Hospedagem'}
                            </span>
                          </td>
                          
                          {/* Atividade */}
                          <td className="py-3 px-4 whitespace-nowrap font-sans">
                            <span 
                              className="px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase whitespace-nowrap"
                              style={getInlineTagStyle(activityObj?.corTag || '#94a3b8')}
                            >
                              {activityObj ? activityObj.nomeAtividade : 'N/A'}
                            </span>
                          </td>

                          {/* Mídias sold vs uploaded */}
                          <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap font-sans">
                            <span className="text-slate-900 font-bold">{photosSold}</span> / {sale.fotosEnviadas} un.
                          </td>

                          {/* Valor Bruto */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                            R$ {getSaleInitialValue(sale).toFixed(2)}
                          </td>

                          {/* Repasse Equipe */}
                          <td className="py-3 px-4 text-right font-mono text-indigo-700 font-semibold whitespace-nowrap text-xs">
                            R$ {collabComm.toFixed(2)}
                            {alboomDiscount > 0 && (
                              <span className="text-[8px] text-indigo-500 font-extrabold block uppercase font-sans">
                                R$ {rawCollabComm.toFixed(2)} [Bruto] → - R$ {alboomDiscount.toFixed(2)} [Desc] → R$ {collabComm.toFixed(2)} [Líq]
                              </span>
                            )}
                          </td>

                          {/* Parceiros & Indicações */}
                          <td className="py-3 px-4 text-right font-mono text-rose-600 whitespace-nowrap text-xs">
                            R$ {partnerComm.toFixed(2)}
                          </td>

                          {/* Desconto Alboom Pay */}
                          <td className="py-3 px-4 text-right font-mono text-amber-700 whitespace-nowrap text-xs">
                            {taxes.totalTax > 0 ? `- R$ ${taxes.totalTax.toFixed(2)}` : 'R$ 0,00'}
                          </td>

                          {/* Faturamento Líquido */}
                          <td className="py-3 px-4 text-right font-mono text-emerald-800 font-extrabold whitespace-nowrap text-xs">
                            R$ {netValue.toFixed(2)}
                          </td>

                          {/* Responsible metadata tag */}
                          <td className="py-3 px-5 text-center whitespace-nowrap">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] whitespace-nowrap font-black font-sans uppercase"
                              style={getInlineTagStyle(collab?.corTag || '#475569')}
                            >
                              <User className="w-3 h-3" />
                              {collab ? collab.nomeCompleto : 'NÃO IDENTIFICADO'}
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}


      {/* ========================================================= */}
      {/* SUB-TAB 3: DESTAQUES                                      */}
      {/* ========================================================= */}
      {activeTab === 'destaques' && (
        <div id="tab-destaques" className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Desempenho da Equipe */}
            <div className="bg-white border border-l-8 border-l-indigo-500 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Desempenho da Equipe</h4>
                </div>
                
                <div className="space-y-3 font-sans">
                  {teamRanking.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6">Sem registros de faturamento no período.</p>
                  ) : (
                    teamRanking.map((member) => (
                      <div key={member.name} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-150">
                        <div>
                          <span className="font-extrabold text-slate-900 block uppercase">{member.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold block">{member.salesCount} vendas</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          R$ {member.grossRevenue.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 2. Hospedagem */}
            <div className="bg-white border border-l-8 border-l-emerald-500 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Hospedagem</h4>
                </div>
                
                <div className="space-y-3 font-sans">
                  {hotelRanking.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6">Sem registros de hospedagem no período.</p>
                  ) : (
                    hotelRanking.map((item) => (
                      <div key={item.hotel} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-150">
                        <div>
                          <span className="font-extrabold text-slate-900 block truncate max-w-[150px]">{item.hotel}</span>
                          <span className="text-[10px] text-slate-400 font-bold block">{item.salesCount} clientes</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          R$ {item.grossRevenue.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 3. Parceiros */}
            <div className="bg-white border border-l-8 border-l-purple-500 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Parceiros</h4>
                </div>
                
                <div className="space-y-3 font-sans">
                  {partnersRanking.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6">Sem registros de parceiros no período.</p>
                  ) : (
                    partnersRanking.map((item) => (
                      <div key={item.partnerName} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-150">
                        <div>
                          <span className="font-extrabold text-slate-900 block uppercase">{item.partnerName}</span>
                          <span className="text-[10px] text-slate-400 font-bold block">{item.salesCount} indicações</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          R$ {item.grossRevenue.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* SUB-TAB 4: COMISSÃO DA EQUIPE                             */}
      {/* ========================================================= */}
      {activeTab === 'comissao_equipe' && (
        <div id="tab-comissao-equipe" className="space-y-6 animate-slide-up">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-sans">Comissão da Equipe</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Resumo de comissões acumuladas dos profissionais de campo no período.</p>
            </div>
            {currentUser.cargo === 'Admin' && tab4SelectedCollabId && (
              <button
                onClick={() => setTab4SelectedCollabId('')}
                className="text-xs font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-705 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Voltar ao Quadro Geral
              </button>
            )}
          </div>

          {!tab4SelectedCollabId ? (
            /* 1. QUADRO GERAL VIEW */
            <div className="space-y-6 animate-slide-up print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-black">Total de Comissões da Equipe</span>
                  <span className="text-2xl font-black text-slate-950 block mt-1 font-mono">
                    R$ {comissoesFolhaRapida.team.reduce((sum, item) => sum + item.totalCommission, 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-black">Fotógrafos Ativos</span>
                    <span className="text-2xl font-black text-slate-950 block mt-1 font-mono">
                      {comissoesFolhaRapida.team.filter(item => item.totalCommission > 0).length} integrantes
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Users className="w-4 h-4 text-slate-800" />
                  <h4 className="text-xs font-black text-slate-955 uppercase font-sans">Selecione o Integrante para Detalhamento</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comissoesFolhaRapida.team.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold py-6 text-center col-span-2">Nenhuma comissão computada no período selecionado.</p>
                  ) : (
                    comissoesFolhaRapida.team.map(item => (
                      <div
                        key={item.collab.id}
                        onClick={() => setTab4SelectedCollabId(item.collab.id)}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-150 transition cursor-pointer"
                      >
                        <div className="space-y-1 font-sans">
                          <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                            STAFF
                          </span>
                          <span className="text-xs font-black text-slate-955 block uppercase font-sans text-slate-950">{item.collab.nomeCompleto}</span>
                          <span className="text-[10px] text-slate-400 font-bold block font-sans">{item.salesCount} vendas realizadas</span>
                          {item.alboomDiscount > 0 && (
                            <span className="text-[9px] text-indigo-600 font-bold block font-sans">
                              (Comissão Cheia: R$ {item.rawCommission.toFixed(2)} | Alboom: -R$ {item.alboomDiscount.toFixed(2)})
                            </span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Saldo Líquido</span>
                          <span className="font-mono text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            R$ {item.totalCommission.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (

            selectedCollabDetails && (
              <div id="collab-invoice-paper" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
                  {/* CSS Isolation for Printer paper */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #collab-invoice-paper, #collab-invoice-paper * {
                        visibility: visible !important;
                      }
                      #collab-invoice-paper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                      }
                    }
                  `}} />

                  {/* Invoice Header */}
                  <div className="flex border-b border-slate-100 pb-5 justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block font-sans mb-1">DEMONSTRATIVO FINANCEIRO INDIVIDUAL</span>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight font-sans">
                        {selectedCollabDetails.collab.nomeCompleto}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Perfil: Equipe Comercial / Vendedor Staff • ID: {selectedCollabDetails.collab.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 bg-slate-900 text-white font-extrabold text-[9px] uppercase px-2.5 py-1 rounded-md font-sans">
                        DEMONSTRATIVO DE COMISSÃO
                      </span>
                    </div>
                  </div>

                  {/* Consolidated Value Owed Point */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 font-sans">
                    <div className="space-y-3.5 text-left flex-1 w-full">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-black">VALOR TOTAL DE COMISSÃO</span>
                        <span className="text-3xl font-black text-slate-950 font-mono mt-1 block">
                          R$ {selectedCollabDetails.totalToPay.toFixed(2)}
                        </span>
                      </div>
                      
                      {selectedCollabDetails.totalAlboomDiscount > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs text-slate-800 max-w-xl shadow-xs">
                          <div className="flex justify-between gap-6 border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-600">Comissão Total Cheia:</span>
                            <span className="font-mono font-black text-slate-900">R$ {selectedCollabDetails.totalRawCommission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-rose-700 font-bold border-b border-slate-100 pb-1.5">
                            <span>Desconto de Taxas Aplicadas:</span>
                            <span className="font-mono font-black">- R$ {selectedCollabDetails.totalAlboomDiscount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-indigo-700 font-black pt-0.5">
                            <span>Sua Comissão Líquida a Receber:</span>
                            <span className="font-mono font-black text-sm">R$ {selectedCollabDetails.totalToPay.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 px-1 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => setTab4SelectedCollabId('')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-sans font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition cursor-pointer border border-slate-200"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleExportCollabPDF}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-sans font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition print:hidden cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Exportar PDF
                      </button>
                      <button
                        onClick={handleExportCollabExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition print:hidden cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Exportar Excel
                      </button>
                    </div>
                  </div>

                  {/* Itemized statement details */}
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-slate-950 uppercase">Detalhamento de Lançamentos Vinculados</h4>
                      <span className="text-[10px] text-slate-400 font-bold">{selectedCollabDetails.entries.filter(e => e.comissao > 0).length} transações faturadas</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 font-sans tracking-wide">
                            <th className="py-2.5 px-4 font-sans">Data</th>
                            <th className="py-2.5 px-4 font-sans">Nome do Cliente</th>
                            <th className="py-2.5 px-4 text-right font-sans">Valor da Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                          {selectedCollabDetails.entries.filter(entry => entry.comissao > 0).map(entry => (
                            <tr key={entry.rawId} className="hover:bg-slate-50/50 font-sans">
                              <td className="py-2.5 px-4 font-mono text-slate-500 font-sans">{entry.data}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900 uppercase font-sans">
                                <div>{entry.cliente}</div>
                                {entry.alboomDiscount > 0 && (
                                  <div className="text-[10px] text-indigo-500 font-bold normal-case mt-0.5">
                                    [Comissão Bruta: R$ {entry.rawComissao.toFixed(2)}] ➔ [-] Desconto Taxas: -R$ {entry.alboomDiscount.toFixed(2)} ➔ [= Valor Líquido: R$ {entry.comissao.toFixed(2)}]
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-right font-black text-slate-950 font-mono">R$ {entry.comissao.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}
        </div>
      )}

          {/* 3. FILTRAR PARCEIRO ESPECÍFICO */}
          {activeTab === 'comissao_parceiros' && (
            <div id="tab-comissao-parceiros" className="space-y-6 animate-slide-up">
              
              {/* Partner Select / Header block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase block mb-2 font-sans">Selecione o Parceiro Estratégico / Agência:</label>
                  <select
                    value={tab4SelectedPartnerId}
                    onChange={(e) => setTab4SelectedPartnerId(e.target.value)}
                    className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition-all cursor-pointer font-sans"
                  >
                    <option value="">-- SELECIONE UM PARCEIRO --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.nomeParceiro.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                {tab4SelectedPartnerId && (
                  <button
                    onClick={() => setTab4SelectedPartnerId('')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-sans font-black text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl transition cursor-pointer self-end md:self-auto"
                  >
                    Voltar ao Quadro Geral
                  </button>
                )}
              </div>

              {/* Single Consolidated Metric Card at the top */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:hidden">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-black">Total de Repasses a Parceiros</span>
                <span className="text-2xl font-black text-slate-950 block mt-1 font-mono">
                  R$ {comissoesFolhaRapida.partners.reduce((sum, item) => sum + item.totalCommission, 0).toFixed(2)}
                </span>
              </div>

              {!tab4SelectedPartnerId ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-slide-up">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Sparkles className="w-4 h-4 text-slate-800" />
                    <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Quadro Geral de Repasses (Parceiros e Indicações)</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wide">
                          <th className="py-3 px-4">Parceiro / Pousada</th>
                          <th className="py-3 px-4">Chave PIX</th>
                          <th className="py-3 px-4 text-center">Indicações</th>
                          <th className="py-3 px-4 text-right">Comissão Padrão</th>
                          <th className="py-3 px-4 text-right">Total a Pagar</th>
                          <th className="py-3 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                        {allPartnersCommissions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">Nenhum parceiro cadastrado no sistema.</td>
                          </tr>
                        ) : (
                          allPartnersCommissions.map(item => (
                            <tr key={item.partner.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900 uppercase">
                                {item.partner.nomeParceiro}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                                {item.partner.chavePix ? `${item.partner.tipoChavePix || 'PIX'}: ${item.partner.chavePix}` : 'Não cadastrada'}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold font-mono">
                                {item.salesCount}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                                {item.partner.comissaoPadrao}%
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                                R$ {item.totalCommission.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => setTab4SelectedPartnerId(item.partner.id)}
                                  className="bg-slate-950 hover:bg-slate-800 text-white font-sans font-black text-[9px] uppercase tracking-wide px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Ver Demonstrativo
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedPartnerDetails && (
                <div id="partner-invoice-card" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 animate-slide-up">
                  {/* CSS Isolation for Printer paper */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #partner-invoice-card, #partner-invoice-card * {
                        visibility: visible !important;
                      }
                      #partner-invoice-card {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                      }
                    }
                  `}} />

                  {/* Invoice Header */}
                  <div className="flex border-b border-slate-100 pb-5 justify-between items-start">
                    <div className="font-sans">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">DEMONSTRATIVO DE INDICAÇÃO COMERCIAL</span>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {selectedPartnerDetails.partner.nomeParceiro}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Parceria: {selectedPartnerDetails.partner.comissaoPadrao}% Comissão Padrão • Código ID: {selectedPartnerDetails.partner.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 bg-slate-700 text-white font-extrabold text-[9px] uppercase px-2.5 py-1 rounded-md font-sans">
                        REFERRAL COMMISSION STATEMENT
                      </span>
                    </div>
                  </div>

                  {/* Consolidated Value Owed Point */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="font-sans">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-black">VALOR TOTAL A PAGAR</span>
                      <span className="text-3xl font-black text-slate-950 font-mono mt-1 block">
                        R$ {selectedPartnerDetails.totalToPay.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2 px-1">
                      <button
                        onClick={handleExportPartnerPDF}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-sans font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition print:hidden cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Exportar PDF
                      </button>
                      <button
                        onClick={handleExportPartnerExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition print:hidden cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Exportar Excel
                      </button>
                    </div>
                  </div>

                  {/* Itemized statement details */}
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-slate-950 uppercase">Lista de Lançamentos Direcionados</h4>
                      <span className="text-[10px] text-slate-400 font-bold">{selectedPartnerDetails.entries.length} indicações qualificadas</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wide font-sans">
                            <th className="py-2.5 px-4 font-sans text-left">Data</th>
                            <th className="py-2.5 px-4 font-sans text-left">Cliente</th>
                            <th className="py-2.5 px-4 text-right font-sans">Valor da Venda</th>
                            <th className="py-2.5 px-4 text-center font-sans">% de Repasse</th>
                            <th className="py-2.5 px-4 text-right font-sans">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                          {selectedPartnerDetails.entries.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">Nenhum lançamento registrado para este parceiro no período.</td>
                            </tr>
                          ) : (
                            selectedPartnerDetails.entries.map(entry => (
                              <tr key={entry.rawId} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 font-mono text-slate-500">{entry.data}</td>
                                <td className="py-2.5 px-4 font-semibold text-slate-900 uppercase">{entry.cliente}</td>
                                <td className="py-2.5 px-4 font-mono text-right text-slate-700">R$ {entry.valorVenda.toFixed(2)}</td>
                                <td className="py-2.5 px-4 text-center font-mono text-slate-600">{entry.percentage.toFixed(1)}%</td>
                                <td className="py-2.5 px-4 font-mono text-right font-black text-emerald-700">R$ {entry.comissao.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

      {/* ========================================================= */}
      {/* SUB-TAB: ALBOOM PAY REPORT                                */}
      {/* ========================================================= */}
      {activeTab === 'alboom_pay' && currentUser.cargo === 'Admin' && (() => {
        // filter paid sales in period with Alboom Tax
        const alboomSales = paidSales.filter(s => s.alboomTax && s.alboomTax > 0);
        
        // compute totals
        const totalGross = alboomSales.reduce((acc, s) => acc + s.valorTotal, 0);
        const totalTax = alboomSales.reduce((acc, s) => acc + (s.alboomTax || 0), 0);
        const totalNet = totalGross - totalTax;

        return (
          <div id="tab-alboom-pay" className="space-y-6 animate-slide-up">
            
            {/* Explanatory Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 font-sans tracking-wider">Auditoria de Taxas do Alboom Pay</h3>
                <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase">
                  Detalhamento de faturamento bruto, taxas cobradas (0,99%) e repasse líquido consolidado.
                </p>
              </div>
              <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 text-[10px] font-black uppercase font-mono tracking-wider">
                <Percent className="w-3.5 h-3.5" />
                <span>Taxa Padrão: 0,99%</span>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Gross Amount */}
              <div className="bg-slate-900 border border-slate-950 rounded-2xl p-5 space-y-1 shadow-lg text-white">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-sans">Volume Bruto Alboom Pay</span>
                <span className="text-3xl font-black text-white font-mono block font-mono">R$ {totalGross.toFixed(2)}</span>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase font-sans">
                  Soma de todas as vendas pagas via Alboom
                </p>
              </div>

              {/* Total Taxes Retained */}
              <div className="bg-indigo-600 border border-indigo-500 rounded-2xl p-5 space-y-1 shadow-lg text-white">
                <span className="text-[10px] text-indigo-100 font-black uppercase tracking-wider block font-sans">Total de Taxas Pagas (0,99%)</span>
                <span className="text-3xl font-black text-white font-mono block font-mono">R$ {totalTax.toFixed(2)}</span>
                <p className="text-[9px] text-indigo-200 font-extrabold uppercase font-sans">
                  Deduções automáticas retidas na fonte
                </p>
              </div>

              {/* Net Revenue after Taxes */}
              <div className="bg-emerald-600 border border-emerald-500 rounded-2xl p-5 space-y-1 shadow-lg text-white">
                <span className="text-[10px] text-emerald-100 font-black uppercase tracking-wider block font-sans">Saldo Líquido Recebido</span>
                <span className="text-3xl font-black text-white font-mono block font-mono">R$ {totalNet.toFixed(2)}</span>
                <p className="text-[9px] text-emerald-200 font-extrabold uppercase font-sans">
                  Volume final creditado na conta ALL ANGLE
                </p>
              </div>

            </div>

            {/* Sales Table with exact details */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 font-sans tracking-wider">Lançamentos Processados</h4>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                  {alboomSales.length} {alboomSales.length === 1 ? 'Venda' : 'Vendas'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5 font-sans">Data</th>
                      <th className="py-3 px-5 font-sans">Cliente</th>
                      <th className="py-3 px-5 font-sans">Fotógrafo</th>
                      <th className="py-3 px-5 font-sans text-right">Valor Inicial</th>
                      <th className="py-3 px-5 font-sans text-right">Taxa Retida (0,99%)</th>
                      <th className="py-3 px-5 font-sans text-right">Saldo Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {alboomSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-bold font-sans uppercase tracking-wider">
                          Nenhum lançamento pago via Alboom Pay no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      alboomSales.map(sale => {
                        const collab = collaborators.find(c => c.id === sale.vendedorId);
                        const initialVal = getSaleInitialValue(sale);
                        const tax = sale.alboomTax || 0;
                        const net = sale.valorTotal - tax;
                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/40 transition">
                            <td className="py-3 px-5 font-mono text-slate-500">{formatDate(sale.data)}</td>
                            <td className="py-3 px-5 font-bold text-slate-900 uppercase">{sale.nomeCliente}</td>
                            <td className="py-3 px-5">
                              {collab ? (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider"
                                  style={getInlineTagStyle(collab.corTag)}
                                >
                                  {collab.nomeCompleto}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">N/A</span>
                              )}
                            </td>
                            <td className="py-3 px-5 font-mono text-right text-slate-800 font-medium">R$ {initialVal.toFixed(2)}</td>
                            <td className="py-3 px-5 font-mono text-right text-rose-600 font-extrabold">- R$ {tax.toFixed(2)}</td>
                            <td className="py-3 px-5 font-mono text-right text-emerald-700 font-black">R$ {net.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* SUB-TAB 5: INSIGHTS (VISUAL BUSINESS INTELLIGENCE)        */}
      {/* ========================================================= */}
      {activeTab === 'insights' && (
        <div id="tab-insights-bi" className="space-y-6 animate-slide-up">
          
          {/* Header Description */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-900 font-sans">Insights</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. O Ponto de Virada da Sacola */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <TrendingUp className="w-4 h-4 text-slate-800" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">O Ponto de Virada da Sacola</h4>
                </div>
                
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                  Taxas de abandono cruzadas pelo volume de fotos enviadas por carrinho. Identifica em qual volume de mídias o cliente sofre de paralisia de escolha e desiste da compra.
                </p>

                <div className="space-y-4 font-sans">
                  {sacolaSweetSpot.map((bracket, idx) => {
                    const maxRate = Math.max(...sacolaSweetSpot.map(b => b.abandonRate)) || 1;
                    const fillRatio = bracket.abandonRate > 0 ? (bracket.abandonRate / 100) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-[11px] uppercase">{bracket.label}</span>
                          <span className="font-mono font-black text-rose-600">{bracket.abandonRate.toFixed(1)}% abandono</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              bracket.min >= 31 ? 'bg-rose-500' : 'bg-slate-900'
                            }`}
                            style={{ width: `${Math.max(4, fillRatio)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase -mt-0.5">
                          <span>{bracket.total} leads gerados</span>
                          <span>{bracket.abandoned} abandonos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-[10px] text-slate-650 font-sans leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Ação Recomendada:</span>
                Operações com mais de 30 fotos registram incremento imediato de abandonos. Reduza o envio de mídias repetitivas e faça curadoria dedicada para preservar a urgência da venda presencial no balcão de apoio físico.
              </div>
            </div>

            {/* 2. Rastreamento de Abandono por Janela */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-slate-800" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Abandono por Janela de Tempo</h4>
                </div>
                
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                  Cruzamento dos horários dos pitches e envios com o índice de drop-offs de clientes. Detecta a fadiga operacional do campo e fricção de suporte.
                </p>

                <div className="space-y-5 font-sans">
                  {timeWindowBreakdown.map((h, idx) => {
                    const fillRatio = h.abandonRate > 0 ? (h.abandonRate / 100) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-[11px] uppercase">{h.label}</span>
                          <span className="font-mono font-black text-slate-900">{h.abandonRate.toFixed(1)}% abandono</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-slate-950 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, fillRatio)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase -mt-0.5">
                          <span>{h.total} leads iniciados</span>
                          <span>{h.abandoned} drop-offs</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-[10px] text-slate-650 font-sans leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Diagnóstico Operacional:</span>
                Os picos de atendimentos e uploads simultâneos geram lentidão que irrita o cliente. Abordagens diretas e disparos devem ser concluídos ainda com o cliente no balcão físico para garantir a taxa de conversão direta.
              </div>
            </div>

            {/* 3. Cruzamento de Ticket Médio por Indicação */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign className="w-4 h-4 text-slate-800" />
                  <h4 className="text-xs font-black text-slate-950 uppercase font-sans">Ticket Médio por Parceria</h4>
                </div>
                
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                  Comparativo de quantidade bruta de indicações faturadas contra o rendimento líquido médio trazido por parceiro. Aponta os canais de ultra-margem.
                </p>

                <div className="space-y-4 font-sans max-h-56 overflow-y-auto scrollbar-none pr-1">
                  {partnerYieldAnalysis.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-8">Nenhum parceiro de indicação ativo faturado no período.</p>
                  ) : (
                    partnerYieldAnalysis.slice(0, 4).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-slate-150 hover:bg-slate-100/50 transition">
                        <div>
                          <span className="font-black text-slate-900 block uppercase text-[10px] tracking-tight">{p.partnerName}</span>
                          <span className="text-[9px] text-slate-400 font-bold block">{p.salesCount} vendas • R$ {p.totalRevenue.toFixed(0)} total</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-emerald-600 font-black block uppercase tracking-wide">Ticket de Margem</span>
                          <span className="font-mono text-xs font-black text-slate-900">R$ {p.ticketMedio.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-[10px] text-slate-650 font-sans leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Mapeamento de Ultra-Canais:</span>
                Parceiros indicados de alto ticket médio merecem premiações ou repasses ajustados mesmo com menor volume absoluto. Focar esforços de relacionamento nestas marcas traz maior margem de rentabilidade à operação.
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
