import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Package, PricingTier } from '../types';
import { Plus, Trash2, Tag, Layers, Settings, FileSpreadsheet, EyeOff, ClipboardList, HelpCircle, AlertTriangle, X, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const ValoresPacotesView: React.FC = () => {
  const { currentUser, packages, activities, addPackage, updatePackage, archivePackage, partners, sales, deletePackage } = useApp();
  const isAdmin = currentUser.cargo === 'Admin';

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [renderedSelectedPackage, setRenderedSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    setIsConfirmingDelete(false);
    if (selectedPackage) {
      setRenderedSelectedPackage(selectedPackage);
    }
  }, [selectedPackage]);

  // Form states
  const [atividadeId, setAtividadeId] = useState('');
  const [nomePacote, setNomePacote] = useState('');
  const [tipoPreco, setTipoPreco] = useState<'Standard' | 'Especial' | 'Foto' | 'ProgressivoPessoa'>('Standard');
  const [parceiroId, setParceiroId] = useState('');

  // Pricing fields
  const [precoStandard, setPrecoStandard] = useState('200'); // used for Standard (Per Person) or Foto (Per Photo unit rate)
  const [fotosPacote, setFotosPacote] = useState('15');
  const [maxFotosEnviadas, setMaxFotosEnviadas] = useState('20');
  
  // New pricing & workflow states
  const [vendaDireta, setVendaDireta] = useState(true);
  const [incluirMetricaFotos, setIncluirMetricaFotos] = useState(false);
  const [precoPrimeiraPessoa, setPrecoPrimeiraPessoa] = useState('800');
  const [precoSegundaPessoa, setPrecoSegundaPessoa] = useState('0');
  const [precoAdicionalPessoa, setPrecoAdicionalPessoa] = useState('200');
  const [possuiLimiteFotosPorPessoa, setPossuiLimiteFotosPorPessoa] = useState(false);
  const [limiteFotosPorPessoa, setLimiteFotosPorPessoa] = useState('25');
  const [mensagemAbandono, setMensagemAbandono] = useState('Olá {nomeCliente}! Verificamos que o seu carrinho de fotos da atividade {atividade} está registrado. Para escolher e receber suas fotos, acesse nosso link de seleção. Estamos te esperando!');

  // Metadata/descriptive fields (always editable)
  const [descricao, setDescricao] = useState('');
  const [mediaRef, setMediaRef] = useState('');
  const [corTag, setCorTag] = useState('#2563eb');

  const colorPresets = [
    { value: '#e11d48', label: 'Rose' },
    { value: '#d97706', label: 'Amber' },
    { value: '#059669', label: 'Emerald' },
    { value: '#2563eb', label: 'Blue' },
    { value: '#7c3aed', label: 'Violet' },
    { value: '#db2777', label: 'Pink' },
    { value: '#0891b2', label: 'Cyan' },
    { value: '#4b5563', label: 'Slate' }
  ];

  // specialty pricing tiers (Range Tiers) - fully editable starting range interval structures
  const [tiers, setTiers] = useState<PricingTier[]>([
    { minFotos: 1, maxFotos: 10, precoUnitario: 15 },
    { minFotos: 11, maxFotos: 20, precoUnitario: 12 },
    { minFotos: 21, maxFotos: 999, precoUnitario: 10 }
  ]);

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Acesso Restrito</h3>
          <p className="text-xs">Este catálogo de pautas e valores é restrito a administradores da ALL ANGLE.</p>
        </div>
      </div>
    );
  }

  // Check if a package has active sales records
  const checkPackageHasHistory = (pkgId: string): boolean => {
    return sales.some(sale => sale.sacolaItens?.some(item => item.pacoteId === pkgId));
  };

  // Obtain unique/distinct colors for each package card
  const getPackageColor = (pkg: Package | null | undefined) => {
    if (!pkg) return '#2563eb';
    if (pkg.corTag) return pkg.corTag;
    
    const idx = packages.findIndex(p => p && p.id === pkg.id);
    if (idx !== -1) {
      const presets = [
        '#e11d48', // Rose
        '#d97706', // Amber
        '#059669', // Emerald
        '#2563eb', // Blue
        '#7c3aed', // Violet
        '#db2777', // Pink
        '#0891b2', // Cyan
        '#4b5563', // Slate
        '#6366f1', // Indigo
        '#06b6d4', // Bright Cyan
        '#ec4899', // Bright Pink
        '#f59e0b', // Bright Amber
      ];
      return presets[idx % presets.length];
    }
    return '#2563eb';
  };

  const handleOpenCreateModal = () => {
    setError(null);
    setEditingPackage(null);
    setAtividadeId('');
    setNomePacote('');
    setTipoPreco('Standard');
    setPrecoStandard('200');
    setFotosPacote('15');
    setMaxFotosEnviadas('20');
    setDescricao('');
    setMediaRef('');
    setParceiroId('');
    setCorTag('#2563eb');
    setTiers([
      { minFotos: 1, maxFotos: 10, precoUnitario: 15 },
      { minFotos: 11, maxFotos: 20, precoUnitario: 12 },
      { minFotos: 21, maxFotos: 999, precoUnitario: 10 }
    ]);
    // Resetting new variables
    setVendaDireta(true);
    setIncluirMetricaFotos(false);
    setPrecoPrimeiraPessoa('800');
    setPrecoSegundaPessoa('0');
    setPrecoAdicionalPessoa('200');
    setPossuiLimiteFotosPorPessoa(false);
    setLimiteFotosPorPessoa('25');
    setMensagemAbandono('Olá {nomeCliente}! Verificamos que o seu carrinho de fotos da atividade {atividade} está registrado. Para escolher e receber suas fotos, acesse nosso link de seleção. Estamos te esperando!');
    setIsOpen(true);
  };

  const handleOpenEditModal = (pkg: Package) => {
    setError(null);
    setEditingPackage(pkg);
    setAtividadeId(pkg.atividadeId);
    setNomePacote(pkg.nomePacote);
    setTipoPreco(pkg.tipoPreco);
    setPrecoStandard(pkg.precoStandard?.toString() || '0');
    setFotosPacote(pkg.fotosPacote?.toString() || '0');
    setMaxFotosEnviadas(pkg.maxFotosEnviadas?.toString() || '0');
    setDescricao(pkg.descricao || '');
    setMediaRef(pkg.mediaRef || '');
    setParceiroId(pkg.parceiroId || '');
    setCorTag(pkg.corTag || '#2563eb');
    setTiers(pkg.tiers || [
      { minFotos: 1, maxFotos: 10, precoUnitario: 15 },
      { minFotos: 11, maxFotos: 20, precoUnitario: 12 },
      { minFotos: 21, maxFotos: 999, precoUnitario: 10 }
    ]);
    // Loading new variables
    setVendaDireta(pkg.vendaDireta !== false);
    setIncluirMetricaFotos(pkg.incluirMetricaFotos || false);
    setPrecoPrimeiraPessoa(pkg.precoPrimeiraPessoa?.toString() || '800');
    setPrecoSegundaPessoa(pkg.precoSegundaPessoa !== undefined ? pkg.precoSegundaPessoa.toString() : '0');
    setPrecoAdicionalPessoa(pkg.precoAdicionalPessoa?.toString() || '200');
    setPossuiLimiteFotosPorPessoa(pkg.possuiLimiteFotosPorPessoa || false);
    setLimiteFotosPorPessoa(pkg.limiteFotosPorPessoa?.toString() || '25');
    setMensagemAbandono(pkg.mensagemAbandono || 'Olá {nomeCliente}! Verificamos que o seu carrinho de fotos da atividade {atividade} está registrado. Para escolher e receber suas fotos, acesse nosso link de seleção. Estamos te esperando!');
    setIsOpen(true);
  };

  const handleUpdateTierMin = (index: number, minText: string) => {
    const val = parseInt(minText, 10) || 0;
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, minFotos: val } : t));
  };

  const handleUpdateTierMax = (index: number, maxText: string) => {
    const val = parseInt(maxText, 10) || 0;
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, maxFotos: val } : t));
  };

  const handleUpdateTierPrice = (index: number, priceText: string) => {
    const val = parseFloat(priceText) || 0;
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, precoUnitario: val } : t));
  };

  const handleAddTierRow = () => {
    setTiers(prev => {
      const last = prev[prev.length - 1];
      const nextMin = last ? last.maxFotos + 1 : 1;
      const nextMax = nextMin + 10;
      return [
        ...prev,
        { minFotos: nextMin, maxFotos: nextMax, precoUnitario: 8 }
      ];
    });
  };

  const handleRemoveTierRow = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // 1. Mandatory Fields Validation
      if (!nomePacote.trim()) {
        setError('Por favor, preencha o nome do pacote comercial!');
        return;
      }
      if (!atividadeId) {
        setError('Por favor, selecione uma atividade principal associada para prosseguir!');
        return;
      }

      // 2. Specific Pricing Rule Validation
      if (tipoPreco === 'Standard') {
        if (!precoStandard || isNaN(parseFloat(precoStandard))) {
          setError('Por favor, informe um preço por bilhete válido!');
          return;
        }
        if (!fotosPacote || isNaN(parseInt(fotosPacote, 10))) {
          setError('Por favor, informe a quantidade de fotos inclusas!');
          return;
        }
        if (!maxFotosEnviadas || isNaN(parseInt(maxFotosEnviadas, 10))) {
          setError('Por favor, informe o número máximo de fotos enviadas!');
          return;
        }
      } else if (tipoPreco === 'Foto') {
        if (!precoStandard || isNaN(parseFloat(precoStandard))) {
          setError('Por favor, informe um valor unitário por foto válido!');
          return;
        }
      } else if (tipoPreco === 'ProgressivoPessoa') {
        if (!precoPrimeiraPessoa || isNaN(parseFloat(precoPrimeiraPessoa))) {
          setError('Por favor, informe o valor da 1ª pessoa corretamente!');
          return;
        }
        if (precoSegundaPessoa !== '' && isNaN(parseFloat(precoSegundaPessoa))) {
          setError('Por favor, informe o valor da 2ª pessoa corretamente!');
          return;
        }
        if (!precoAdicionalPessoa || isNaN(parseFloat(precoAdicionalPessoa))) {
          setError('Por favor, informe o valor adicional a partir da 3ª pessoa e diante!');
          return;
        }
      } else if (tipoPreco === 'Especial') {
        if (!tiers || tiers.length === 0) {
          setError('Por favor, adicione pelo menos uma faixa de preço progressivo!');
          return;
        }
        for (let i = 0; i < tiers.length; i++) {
          const t = tiers[i];
          if (t.minFotos === undefined || t.minFotos === null || isNaN(Number(t.minFotos)) ||
              t.maxFotos === undefined || t.maxFotos === null || isNaN(Number(t.maxFotos)) ||
              t.precoUnitario === undefined || t.precoUnitario === null || isNaN(Number(t.precoUnitario))) {
            setError(`Por favor, preencha corretamente todas as faixas do preço progressivo (Faixa ${i + 1})!`);
            return;
          }
        }
      }

      if (possuiLimiteFotosPorPessoa) {
        if (!limiteFotosPorPessoa || isNaN(parseInt(limiteFotosPorPessoa, 10))) {
          setError('Por favor, informe o limite máximo de fotos por pessoa!');
          return;
        }
      }

      const hasHistory = editingPackage ? checkPackageHasHistory(editingPackage.id) : false;

      // Build package payload based on pricing type architecture
      const payload: Partial<Package> = {
        atividadeId,
        nomePacote: nomePacote.trim(),
        parceiroId: parceiroId || undefined,
        descricao: descricao.trim(),
        mediaRef: mediaRef.trim(),
        mensagemAbandono: mensagemAbandono.trim(),
        corTag,
      };

      // If locked by active operational history, do not mutate financial metrics
      if (!hasHistory) {
        payload.tipoPreco = tipoPreco;
        payload.precoStandard = (tipoPreco === 'Standard' || tipoPreco === 'Foto') ? parseFloat(precoStandard) || 0 : undefined;
        payload.fotosPacote = tipoPreco === 'Standard' ? parseInt(fotosPacote, 10) || 0 : undefined;
        payload.maxFotosEnviadas = tipoPreco === 'Standard' ? parseInt(maxFotosEnviadas, 10) || 0 : undefined;
        payload.possuiLimiteFotosPorPessoa = possuiLimiteFotosPorPessoa;
        payload.limiteFotosPorPessoa = possuiLimiteFotosPorPessoa ? parseInt(limiteFotosPorPessoa, 10) || 0 : undefined;
        payload.tiers = tipoPreco === 'Especial' ? tiers : undefined;
        payload.vendaDireta = vendaDireta;
        payload.incluirMetricaFotos = incluirMetricaFotos;
        payload.precoPrimeiraPessoa = tipoPreco === 'ProgressivoPessoa' ? parseFloat(precoPrimeiraPessoa) || 0 : undefined;
        payload.precoSegundaPessoa = tipoPreco === 'ProgressivoPessoa' ? (precoSegundaPessoa === '' ? 0 : parseFloat(precoSegundaPessoa)) : undefined;
        payload.precoAdicionalPessoa = tipoPreco === 'ProgressivoPessoa' ? parseFloat(precoAdicionalPessoa) || 0 : undefined;
      }

      if (editingPackage) {
        updatePackage(editingPackage.id, payload);
      } else {
        addPackage({
          atividadeId,
          nomePacote: nomePacote.trim(),
          tipoPreco,
          precoStandard: (tipoPreco === 'Standard' || tipoPreco === 'Foto') ? parseFloat(precoStandard) || 0 : undefined,
          fotosPacote: tipoPreco === 'Standard' ? parseInt(fotosPacote, 10) || 0 : undefined,
          maxFotosEnviadas: tipoPreco === 'Standard' ? parseInt(maxFotosEnviadas, 10) || 0 : undefined,
          possuiLimiteFotosPorPessoa,
          limiteFotosPorPessoa: possuiLimiteFotosPorPessoa ? parseInt(limiteFotosPorPessoa, 10) || 0 : undefined,
          tiers: tipoPreco === 'Especial' ? tiers : undefined,
          precoPrimeiraPessoa: tipoPreco === 'ProgressivoPessoa' ? parseFloat(precoPrimeiraPessoa) || 0 : undefined,
          precoSegundaPessoa: tipoPreco === 'ProgressivoPessoa' ? (precoSegundaPessoa === '' ? 0 : parseFloat(precoSegundaPessoa)) : undefined,
          precoAdicionalPessoa: tipoPreco === 'ProgressivoPessoa' ? parseFloat(precoAdicionalPessoa) || 0 : undefined,
          vendaDireta,
          incluirMetricaFotos,
          mensagemAbandono: mensagemAbandono.trim(),
          parceiroId: parceiroId || undefined,
          descricao: descricao.trim(),
          mediaRef: mediaRef.trim(),
          corTag,
        });
      }

      setIsOpen(false);
      setSelectedPackage(null);
    } catch (err: any) {
      setError('Ocorreu um erro ao salvar o pacote comercial: ' + (err.message || String(err)));
    }
  };

  // Split packages list
  const activePackages = packages.filter(p => !p.arquivado);
  const archivedPackages = packages.filter(p => p.arquivado);

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tabela de Preços & Pacotes</h1>
          <p className="text-xs text-slate-500">Mapeamento de faturamentos comerciais, comissionamento de pousadas parceiras e limites fotográficos.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          disabled={activities.length === 0}
          className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed transition hover:scale-[1.01] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Pacote Comercial
        </button>
      </div>

      {/* Golden rules explanation */}
      <div className="bg-slate-50 border border-slate-205 p-5 rounded-2xl flex items-start gap-3 text-slate-700 leading-relaxed">
        <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 block mb-1 uppercase tracking-wider text-[10px]">Manual Didático Operacional</strong>
          Nossos pacotes comerciais podem operar sob taxas fixas por pessoa, tabelas progressivas de seleção tardia, ou taxas por foto individual. Clique sobre qualquer pacote para visualizar as regras fiscais vigentes ou aplicar comandos do sistema.
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catálogo Disponível ({activePackages.length})</h3>
        {activePackages.length === 0 ? (
          <div className="bg-white text-center py-12 rounded-3xl border border-slate-200 text-slate-400">
            Sem pacotes ativos para venda. Cadastre um novo pacote comercial para começar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePackages.map(pkg => {
              const act = activities.find(a => a.id === pkg.atividadeId);
              const actName = act?.nomeAtividade || 'Sem Atividade Relacionada';
              const partnerName = partners.find(p => p.id === pkg.parceiroId)?.nomeParceiro;

              // Color-coded left border and text highlights depending on pricing structure
              const pricingVisuals = 
                pkg.tipoPreco === 'Standard' ? {
                  badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  typeName: 'Valor Fixo (Por Pessoa) 👤',
                } : pkg.tipoPreco === 'Foto' ? {
                  badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
                  typeName: 'Valor Fixo (Por Foto Secundária) 📸',
                } : pkg.tipoPreco === 'ProgressivoPessoa' ? {
                  badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                  typeName: 'Valor Progressivo (Por Pessoa) 👥',
                } : {
                  badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
                  typeName: 'Valor Progressivo Multi-faixa 📈',
                };

              return (
                <div 
                  key={pkg.id} 
                  onClick={() => setSelectedPackage(pkg)}
                  style={{ borderLeftColor: getPackageColor(pkg) }}
                  className="bg-white rounded-3xl border border-slate-200/80 border-l-[6px] shadow-xs hover:shadow-md hover:border-slate-350 transition-all duration-200 cursor-pointer p-6 flex flex-col justify-between group active:scale-[0.99]"
                >
                  <div className="space-y-4">
                    
                    {/* Header: Title and Type Badge */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className="inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider transition-all"
                            style={(() => {
                              const pkgColor = getPackageColor(pkg);
                              return {
                                backgroundColor: `${pkgColor}12`,
                                borderColor: `${pkgColor}25`,
                                color: pkgColor
                              };
                            })()}
                          >
                            {actName}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-[#0e2438] block tracking-tight text-sm uppercase leading-tight line-clamp-2">
                          {pkg.nomePacote}
                        </h4>
                      </div>
                    </div>

                    {/* Highly highlighted Pricing Type Indicator */}
                    <div className={`p-2.5 rounded-xl border text-center font-extrabold uppercase text-[9px] tracking-wider ${pricingVisuals.badgeClass}`}>
                      ESTRUTURA: {pricingVisuals.typeName}
                    </div>

                    {/* Financial Value Highlighting */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">PREÇO DO PACOTE</span>
                      {pkg.tipoPreco === 'Standard' && (
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.precoStandard || 0)}
                          </h3>
                          <span className="text-[9px] text-[#0e2438] uppercase font-black tracking-wider block mt-1 bg-[#0e2438]/5 py-0.5 rounded">Cobrança Por Integrante Único</span>
                        </div>
                      )}
                      {pkg.tipoPreco === 'Foto' && (
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.precoStandard || 0)}
                          </h3>
                          <span className="text-[9px] text-blue-800 uppercase font-black tracking-wider block mt-1 bg-blue-50 py-0.5 rounded">Cobrado Individualmente por Foto Extra</span>
                        </div>
                      )}
                      {pkg.tipoPreco === 'Especial' && (
                        <div className="space-y-0.5 font-bold">
                          <h3 className="text-xs font-extrabold text-purple-700 font-sans uppercase">
                            VALOR VARIÁVEL PROGRESSIVO
                          </h3>
                          <span className="text-[9px] text-purple-650 uppercase font-black tracking-widest block mt-1 bg-purple-50 py-1 rounded">
                            {pkg.tiers?.length || 0} Faixas de Volume Customizadas
                          </span>
                        </div>
                      )}
                      {pkg.tipoPreco === 'ProgressivoPessoa' && (
                        <div className="space-y-0.5 font-bold">
                          <h3 className="text-sm font-black text-amber-700 font-mono leading-none">
                            1ª: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.precoPrimeiraPessoa || 0)} • 2ª: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.precoSegundaPessoa ?? 0)}
                          </h3>
                          <span className="text-[9px] text-amber-900 uppercase font-bold tracking-wider block mt-1 bg-amber-50 py-0.5 rounded">
                            + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.precoAdicionalPessoa || 0)} / adicional (a partir da 3ª)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Specifications list (Inclusas & Enviadas) */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <span className="text-slate-400 text-[8px] uppercase font-bold block leading-none mb-1.5">FOTOS INCLUSAS</span>
                        <span className="text-[#0e2438] font-black text-[12px] block font-mono">
                          {pkg.tipoPreco === 'Standard' ? `${pkg.fotosPacote} fotos` : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <span className="text-slate-400 text-[8px] uppercase font-bold block leading-none mb-1.5">MÁXIMO DE FOTOS ENVIADAS</span>
                        <span className="text-rose-700 font-black text-[12px] block font-mono">
                          {pkg.possuiLimiteFotosPorPessoa && pkg.limiteFotosPorPessoa !== undefined ? (
                            `${pkg.limiteFotosPorPessoa} / pessoa`
                          ) : pkg.tipoPreco === 'Standard' ? (
                            `${pkg.maxFotosEnviadas || 0} fotos`
                          ) : (
                            'Sem Limite'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Logistics Connections highlights: Activity and comissioned Partner */}
                    <div className="space-y-1.5 pt-1">
                      <div 
                        className="px-3 py-2 rounded-xl flex items-center justify-between text-[10px] font-bold border transition-colors"
                        style={(() => {
                          const pkgColor = getPackageColor(pkg);
                          return {
                            backgroundColor: `${pkgColor}12`,
                            borderColor: `${pkgColor}25`,
                            color: pkgColor
                          };
                        })()}
                      >
                        <span className="text-slate-400 text-[8px] uppercase font-bold">Atividade Comercial:</span>
                        <span 
                          className="font-extrabold uppercase text-[9px]"
                          style={{ color: getPackageColor(pkg) }}
                        >
                          {actName}
                        </span>
                      </div>

                      {partnerName ? (
                        <div className="bg-emerald-50 text-emerald-850 border border-emerald-150 px-3 py-2 rounded-xl flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400 text-[8px] uppercase font-bold">Parceiro Exclusivo:</span>
                          <span className="font-extrabold uppercase text-[9px] text-emerald-900 truncate max-w-[130px]">{partnerName}</span>
                        </div>
                      ) : (
                        <div className="bg-slate-50 text-slate-500 border border-slate-150 px-3 py-2 rounded-xl flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-400 text-[8px] uppercase font-bold">Distribuição:</span>
                          <span className="font-bold underline text-slate-600">Livre (Qualquer Parceiro)</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* BOTTOM AUDIT TRIGGER */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-900">
                    <span className="group-hover:text-indigo-600 transition-colors">Ver Detalhes do Produto</span>
                    <button className="bg-[#0e2438] hover:bg-[#1a3d5c] text-white px-3 py-1.5 rounded-xl uppercase text-[9px] font-black tracking-tight transition-all">
                      Visualizar →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical logs in list format */}
      {archivedPackages.length > 0 && (
        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contratos Arquivados / Fora de Faturamento ({archivedPackages.length})</h4>
          <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {archivedPackages.map(pkg => {
              const actName = activities.find(a => a.id === pkg.atividadeId)?.nomeAtividade || 'Atividade';
              return (
                <div key={pkg.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] py-2.5 first:pt-0 last:pb-0 opacity-60">
                  <div>
                    <span className="font-extrabold text-slate-800 uppercase block">{pkg.nomePacote} ({pkg.tipoPreco === 'Standard' ? 'Pessoa' : pkg.tipoPreco === 'Foto' ? 'Foto' : 'Progressivo'})</span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Atividade de Repasse: {actName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <span className="text-[9px] bg-slate-200 border border-slate-300 px-2 py-0.5 rounded text-slate-600 font-bold uppercase select-none">Arquivado</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePackage(pkg.id, { arquivado: false });
                      }}
                      className="text-[9px] text-indigo-600 hover:underline font-bold uppercase cursor-pointer"
                    >
                      Reativar Pacote
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED OVERLAY DRAWER / CARDS MODAL OVERLAY */}
      {createPortal(
        <AnimatePresence>
          {selectedPackage && renderedSelectedPackage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
              <motion.div 
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPackage(null)}
              />

              <motion.div
                className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-2xl my-auto flex flex-col font-sans"
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
              >
                {/* Dismiss Button */}
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-slate-800 border border-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header info */}
                <div className="mb-6 space-y-1">
                  <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
                    <ClipboardList className="w-4 h-4" />
                    <span>Módulo de Auditoria de Tabelas</span>
                  </div>
                  <h3 className="text-xl font-bold font-black text-slate-950 uppercase tracking-tight">{renderedSelectedPackage.nomePacote}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                      ID: {renderedSelectedPackage.id.split('-')[1] || renderedSelectedPackage.id}
                    </span>
                    <span 
                      className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border transition-all"
                      style={(() => {
                        const pkgColor = getPackageColor(renderedSelectedPackage);
                        return {
                          backgroundColor: `${pkgColor}12`,
                          borderColor: `${pkgColor}25`,
                          color: pkgColor
                        };
                      })()}
                    >
                      Atividade: {activities.find(a => a.id === renderedSelectedPackage.atividadeId)?.nomeAtividade || 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Pricing Structure breakdowns */}
                <div className="space-y-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 text-slate-800 text-xs leading-relaxed">
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">Estrutura e Regras de Precificação Comercial</h4>
                  
                  {renderedSelectedPackage.tipoPreco === 'Standard' && (
                    <div className="space-y-2 border-t border-slate-200 pt-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Metodologia:</span>
                        <span className="font-bold text-slate-900 uppercase">Preço Fixo por Pessoa (Standard)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Valor por Bilhete/Pessoa:</span>
                        <span className="font-bold text-slate-900">R$ {renderedSelectedPackage.precoStandard?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium font-bold">Fotos Cortesia/Inclusas:</span>
                        <span className="font-semibold text-slate-950">{renderedSelectedPackage.fotosPacote} fotos inclusas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium text-rose-600 font-bold">Alerta de Teto de Descarte:</span>
                        <span className="font-semibold text-rose-600">{renderedSelectedPackage.maxFotosEnviadas} fotos coletadas máximas</span>
                      </div>
                    </div>
                  )}

                  {renderedSelectedPackage.tipoPreco === 'Foto' && (
                    <div className="space-y-2 border-t border-slate-200 pt-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Metodologia:</span>
                        <span className="font-bold text-slate-900 uppercase">Repasse Unitário por Unidade de Foto</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Valor por Unidade Vendida:</span>
                        <span className="font-bold text-slate-900">R$ {renderedSelectedPackage.precoStandard?.toFixed(2)} / foto unitária</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Regra Real-Time fotográfica:</span>
                        <span>Multiplicação matemática de itens no faturamento com desconto opcional.</span>
                      </div>
                    </div>
                  )}

                  {renderedSelectedPackage.tipoPreco === 'Especial' && (
                    <div className="space-y-2 border-t border-slate-200 pt-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Metodologia:</span>
                        <span className="font-bold text-slate-900 uppercase">Tabela Progressiva por Faixa Acumulada</span>
                      </div>
                      
                      <div className="space-y-1.5 mt-2 bg-white border border-slate-200 rounded-xl p-3 divide-y divide-slate-100">
                        {renderedSelectedPackage.tiers?.map((tier, idx) => (
                           <div key={idx} className="flex justify-between py-1.5 first:pt-0 last:pb-0 text-slate-700">
                             <span className="font-bold">De {tier.minFotos} a {tier.maxFotos} fotos vendidas:</span>
                             <span className="font-bold text-indigo-600">R$ {tier.precoUnitario.toFixed(2)} / unidade</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderedSelectedPackage.tipoPreco === 'ProgressivoPessoa' && (
                    <div className="space-y-2 border-t border-slate-200 pt-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Metodologia:</span>
                        <span className="font-bold text-slate-900 uppercase font-bold text-amber-700">Valor Progressivo Por Pessoa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Valor da 1ª Pessoa:</span>
                        <span className="font-bold text-slate-900">R$ {renderedSelectedPackage.precoPrimeiraPessoa?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Valor da 2ª Pessoa:</span>
                        <span className="font-bold text-slate-900">R$ {(renderedSelectedPackage.precoSegundaPessoa ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium font-bold">Valor Adicional (3ª pessoa em diante):</span>
                        <span className="font-bold text-slate-900">R$ {renderedSelectedPackage.precoAdicionalPessoa?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-slate-200 pt-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Fluxo de Venda / Entrega:</span>
                      <span className="font-extrabold text-slate-900 uppercase">{renderedSelectedPackage.vendaDireta !== false ? 'Venda Direta' : 'Depende da Seleção do Cliente'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Incluir no Aproveitamento de Fotos:</span>
                      <span className="font-extrabold text-slate-900 uppercase">{renderedSelectedPackage.incluirMetricaFotos ? 'Sim, ativo' : 'Não'}</span>
                    </div>
                    {renderedSelectedPackage.possuiLimiteFotosPorPessoa && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span className="text-slate-500 font-medium text-rose-600">Limite Máximo de Fotos:</span>
                        <span className="uppercase text-rose-600">{renderedSelectedPackage.limiteFotosPorPessoa} fotos / pessoa</span>
                      </div>
                    )}
                  </div>

                  {renderedSelectedPackage.mensagemAbandono && (
                    <div className="border-t border-slate-250 pt-2 text-[11px]">
                      <span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider mb-1">MENSAGEM DE WHATSAPP PARA CLIENTES ABANDONADOS:</span>
                      <p className="bg-slate-100 p-3 rounded-xl font-medium font-mono text-slate-700 text-[10px] italic">
                        "{renderedSelectedPackage.mensagemAbandono}"
                      </p>
                    </div>
                  )}

                  {renderedSelectedPackage.descricao && (
                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider mb-0.5">Especificidades Contratuais</span>
                      <p className="text-slate-700 font-semibold">{renderedSelectedPackage.descricao}</p>
                    </div>
                  )}

                  {renderedSelectedPackage.mediaRef && (
                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[9px] text-slate-450 uppercase block font-bold tracking-wider mb-0.5">Mídias de Apoio / Pasta do Drive</span>
                      <a 
                        href={renderedSelectedPackage.mediaRef} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-600 hover:underline truncate block font-bold"
                      >
                        {renderedSelectedPackage.mediaRef}
                      </a>
                    </div>
                  )}
                </div>

                {/* History Warning Alert */}
                {checkPackageHasHistory(renderedSelectedPackage.id) ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-2.5 mb-6 text-[11px] leading-relaxed">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Tabela de Valores Bloqueada para Alterações Fiscais:</strong> Este pacote comercial já foi atrelado a saídas/fechamentos vigentes do caixa da empresa de faturamento. Excluir o product é permanentemente bloqueado para impedir corrupção das métricas. Você pode **Arquivar** este plano para desativar vendas futuras. Modificações de rótulos descriptivos (Nome, Referências) são permitidas.
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-2.5 mb-6 text-[11px]">
                    <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <strong>Plano Totalmente Desbloqueado:</strong> Este pacote comercial detém histórico operacional limpo (0 faturamentos registrados). O administrador detém absoluta liberdade para redefinir preços, alterar metodologias ou excluí-lo permanentemente do banco de dados instantaneamente.
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleOpenEditModal(renderedSelectedPackage);
                        setSelectedPackage(null);
                      }}
                      className="flex-1 bg-[#0e2438] hover:bg-[#1c3a5a] text-white border border-[#0e2438] font-bold py-3 px-5 rounded-xl uppercase text-xs transition cursor-pointer text-center"
                    >
                      Editar Dados
                    </button>

                    {checkPackageHasHistory(renderedSelectedPackage.id) ? (
                      <button
                        onClick={() => {
                          archivePackage(renderedSelectedPackage.id);
                          setSelectedPackage(null);
                        }}
                        className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold py-3 px-5 rounded-xl uppercase text-xs transition cursor-pointer"
                      >
                        Arquivar para Vendas
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (isConfirmingDelete) {
                            deletePackage(renderedSelectedPackage.id);
                            setSelectedPackage(null);
                            setIsConfirmingDelete(false);
                          } else {
                            setIsConfirmingDelete(true);
                          }
                        }}
                        className={`flex-1 font-bold py-3 px-5 rounded-xl uppercase text-xs transition-all cursor-pointer text-center ${
                          isConfirmingDelete
                            ? 'bg-rose-800 text-white border border-rose-900 animate-pulse font-extrabold shadow-lg scale-[1.02]'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isConfirmingDelete ? 'Clique novamente para confirmar' : 'Excluir Permanentemente'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedPackage(null)}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-xl text-center uppercase tracking-wider text-[10px] cursor-pointer"
                  >
                    Fechar Mapeador
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* CREATE / EDIT MODAL FOR PACKAGES/PRODUCTS */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl overflow-y-auto font-sans text-xs">
              <motion.div
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col focus:outline-none text-white font-semibold"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              >
                {/* Close X */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-2xl transition text-white border border-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold tracking-widest leading-none text-white uppercase">
                    {editingPackage ? 'Editar Pacote Comercial' : 'Criar Pacote Comercial'}
                  </h2>
                  <p className="text-[10px] text-white/40 font-bold mt-1.5 uppercase pl-0.5 tracking-widest">
                    {editingPackage ? 'Auditoria de Ativos Fiscais Cadastrados' : 'Mapeamento Unificado de Produtos e Planos Editoriais'}
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-200 p-4 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed font-bold uppercase tracking-wide mb-4">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                )}

                {editingPackage && checkPackageHasHistory(editingPackage.id) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-200/90 leading-relaxed text-[11px] mb-4">
                    <strong>Atenção ao Histórico do Produto:</strong> Este produto possui vendas associadas. Os valores comerciais, faixas e metodologias estão travados para evitar retro-corrupção fiscal. Você pode editar as strings de Nome, Descrição e Links de Mídias livremente.
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Nome do Pacote */}
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">NOME DO PRODUTO/PACOTE</label>
                      <input
                        type="text"
                        placeholder="Ex: Prime 30 Fotos, Combo Família"
                        value={nomePacote}
                        onChange={(e) => setNomePacote(e.target.value)}
                        className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs font-bold"
                      />
                    </div>

                    {/* Visual Color Tag picker */}
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">COR DE IDENTIFICAÇÃO VISUAL DO PACOTE</label>
                      <div className="flex flex-wrap gap-2.5 bg-white/5 p-4 border border-white/10 rounded-2xl">
                        {colorPresets.map(preset => {
                          const isSelected = corTag === preset.value;
                          return (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setCorTag(preset.value)}
                              className="w-8 h-8 rounded-full border border-white/15 relative flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-2xs shrink-0"
                              style={{ backgroundColor: preset.value }}
                              title={preset.label}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white animate-fade-in" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Associated Activity */}
                    <div className="space-y-1.5 font-bold">
                      <div className="flex justify-between items-center pl-2 pr-1">
                        <label className="text-[10px] font-extrabold text-white/40 uppercase block tracking-wider">ATIVIDADE PRINCIPAL ASSOCIADA</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'atividades' }));
                          }}
                          className="text-[9px] text-[#38bdf8] hover:underline cursor-pointer"
                        >
                          + Adicionar nova atividade
                        </button>
                      </div>
                      <select
                        value={atividadeId}
                        onChange={(e) => setAtividadeId(e.target.value)}
                        disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                        className="w-full bg-slate-950 p-4 border border-white/10 rounded-2xl text-white font-extrabold focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="" className="bg-slate-950 text-white font-bold">-- Escolher Atividade --</option>
                        {activities.map(act => (
                          <option key={act.id} value={act.id} className="bg-slate-900 text-white font-bold">{act.nomeAtividade.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Associated Partner (Optional) */}
                    <div className="space-y-1.5 font-bold">
                      <div className="flex justify-between items-center pl-2 pr-1">
                        <label className="text-[10px] font-extrabold text-white/40 uppercase block tracking-wider">PARCEIRO RELACIONADO (OPCIONAL)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'parceiros' }));
                          }}
                          className="text-[9px] text-[#38bdf8] hover:underline cursor-pointer"
                        >
                          + Adicionar novo parceiro
                        </button>
                      </div>
                      <select
                        value={parceiroId}
                        onChange={(e) => setParceiroId(e.target.value)}
                        className="w-full bg-slate-950 p-4 border border-white/10 rounded-2xl text-white font-extrabold focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="" className="bg-[#0e2438] text-white font-bold">-- Sem parceria exclusiva vinculada --</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#0e2438] text-white font-bold">{p.nomeParceiro.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Radio Select structure */}
                    <div className="col-span-1 md:col-span-2 space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">ESTRUTURA DE PRECIFICAÇÃO</label>
                      <div className="flex flex-wrap gap-6 mt-1.5">
                        <label className="flex items-center gap-2 font-black text-white/60 hover:text-white cursor-pointer select-none text-[11px] uppercase p-1">
                          <input
                            type="radio"
                            name="pricing_option"
                            checked={tipoPreco === 'Standard'}
                            onChange={() => setTipoPreco('Standard')}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Valor fixo (por pessoa)
                        </label>
                        <label className="flex items-center gap-2 font-black text-white/60 hover:text-white cursor-pointer select-none text-[11px] uppercase p-1">
                          <input
                            type="radio"
                            name="pricing_option"
                            checked={tipoPreco === 'Especial'}
                            onChange={() => setTipoPreco('Especial')}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Valor progressivo por foto
                        </label>
                        <label className="flex items-center gap-2 font-black text-white/60 hover:text-white cursor-pointer select-none text-[11px] uppercase p-1">
                          <input
                            type="radio"
                            name="pricing_option"
                            checked={tipoPreco === 'Foto'}
                            onChange={() => setTipoPreco('Foto')}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Valor fixo (por foto)
                        </label>
                        <label className="flex items-center gap-2 font-black text-white/60 hover:text-white cursor-pointer select-none text-[11px] uppercase p-1">
                          <input
                            type="radio"
                            name="pricing_option"
                            checked={tipoPreco === 'ProgressivoPessoa'}
                            onChange={() => setTipoPreco('ProgressivoPessoa')}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Valor progressivo por pessoa
                        </label>
                      </div>
                    </div>

                    {/* Dynamic Configurations Panels */}
                    <div className="col-span-1 md:col-span-2">
                      {tipoPreco === 'Standard' && (
                        <div className="grid grid-cols-3 gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="space-y-1.5 col-span-3 sm:col-span-1 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">PREÇO POR BILHETE (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 200"
                              value={precoStandard}
                              onChange={(e) => setPrecoStandard(e.target.value.replace(/[^0-9.]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-white/5 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>

                           <div className="space-y-1.5 col-span-3 sm:col-span-1 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">FOTOS INCLUSAS</label>
                            <input
                              type="text"
                              placeholder="e.g. 15"
                              value={fotosPacote}
                              onChange={(e) => setFotosPacote(e.target.value.replace(/[^0-9]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-white/5 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>

                          <div className="space-y-1.5 col-span-3 sm:col-span-1 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">NÚMERO DE FOTOS ENVIADAS</label>
                            <input
                              type="text"
                              placeholder="e.g. 20"
                              value={maxFotosEnviadas}
                              onChange={(e) => setMaxFotosEnviadas(e.target.value.replace(/[^0-9]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-white/5 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>
                        </div>
                      )}

                      {tipoPreco === 'Foto' && (
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 font-bold max-w-sm">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold">Valor Unitário por Foto Extra (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 15.00"
                              value={precoStandard}
                              onChange={(e) => setPrecoStandard(e.target.value.replace(/[^0-9.]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-white/5 p-4 border border-white/10 rounded-xl font-bold font-mono text-white text-xs focus:outline-none focus:border-white/20"
                            />
                          </div>
                        </div>
                      )}

                      {tipoPreco === 'Especial' && (
                        <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                            <span className="font-bold text-white uppercase text-[9px] tracking-widest pl-2">Configuração das Faixas da Tabela Progressiva</span>
                            <button
                              type="button"
                              onClick={handleAddTierRow}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="text-white border border-white/15 hover:bg-white/15 bg-white/5 font-extrabold uppercase text-[8px] px-3.5 py-2 rounded-lg transition"
                            >
                              + Adicionar Faixa
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {tiers.map((tier, index) => (
                              <div key={index} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-[11px] text-white/70">
                                  <span>De:</span>
                                  <input
                                    type="text"
                                    value={tier.minFotos}
                                    onChange={(e) => handleUpdateTierMin(index, e.target.value.replace(/[^0-9]/g, ''))}
                                    disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                                    className="w-16 p-2 bg-slate-950 text-white border border-white/10 text-center rounded focus:outline-none font-bold text-xs font-mono"
                                  />
                                  <span>fotos até:</span>
                                  <input
                                    type="text"
                                    value={tier.maxFotos}
                                    onChange={(e) => handleUpdateTierMax(index, e.target.value.replace(/[^0-9]/g, ''))}
                                    disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                                    className="w-16 p-2 bg-slate-950 text-white border border-white/10 text-center rounded focus:outline-none font-bold text-xs font-mono"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-white/40 font-bold">R$</span>
                                  <input
                                    type="text"
                                    value={tier.precoUnitario}
                                    onChange={(e) => handleUpdateTierPrice(index, e.target.value.replace(/[^0-9.]/g, ''))}
                                    disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                                    className="w-24 p-2 bg-slate-950 border border-white/10 text-white text-center rounded focus:outline-none font-extrabold font-mono text-xs"
                                  />
                                  {tiers.length > 1 && !(editingPackage && checkPackageHasHistory(editingPackage.id)) && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTierRow(index)}
                                      className="text-white bg-rose-700 hover:bg-rose-800 p-2 rounded border border-rose-600 cursor-pointer transition flex items-center justify-center font-bold"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tipoPreco === 'ProgressivoPessoa' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="space-y-1.5 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">VALOR DA 1ª PESSOA (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 800"
                              value={precoPrimeiraPessoa}
                              onChange={(e) => setPrecoPrimeiraPessoa(e.target.value.replace(/[^0-9.]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-slate-950 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>

                          <div className="space-y-1.5 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">VALOR DA 2ª PESSOA (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 0"
                              value={precoSegundaPessoa}
                              onChange={(e) => setPrecoSegundaPessoa(e.target.value.replace(/[^0-9.]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-slate-950 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>

                           <div className="space-y-1.5 font-bold">
                            <label className="text-[9px] font-bold text-white/40 uppercase block tracking-wider pl-2">VALOR ADICIONAL A PARTIR DA 3ª (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 200"
                              value={precoAdicionalPessoa}
                              onChange={(e) => setPrecoAdicionalPessoa(e.target.value.replace(/[^0-9.]/g, ''))}
                              disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                              className="w-full bg-slate-950 p-3.5 border border-white/10 rounded-xl font-bold font-mono text-center text-white focus:outline-none focus:border-white/20"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* FLUXO DE ENTREGA E REGISTRO DE FOTOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-5 rounded-2xl border border-white/10">
                    <div className="space-y-3 font-bold">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">FLUXO DE ENTREGA / COBRANÇA</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 font-black text-white/70 hover:text-white cursor-pointer text-xs uppercase">
                          <input
                            type="radio"
                            name="venda_direta_flow"
                            checked={vendaDireta === true}
                            onChange={() => {
                              setVendaDireta(true);
                              setIncluirMetricaFotos(false);
                            }}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Venda Direta (Cálculo Imediato)
                        </label>
                        <label className="flex items-center gap-2 font-black text-white/70 hover:text-white cursor-pointer text-xs uppercase">
                          <input
                            type="radio"
                            name="venda_direta_flow"
                            checked={vendaDireta === false}
                            onChange={() => {
                              setVendaDireta(false);
                              setIncluirMetricaFotos(true);
                            }}
                            disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                            className="accent-white w-4 h-4 cursor-pointer"
                          />
                          Depende da Seleção do Cliente (Pendente Inicial)
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold">MÉTRICA DE APROVEITAMENTO DE FOTOS</label>
                      <label className="flex items-start gap-2.5 font-bold text-white/70 hover:text-white cursor-pointer text-xs leading-relaxed">
                        <input
                          type="checkbox"
                          checked={incluirMetricaFotos}
                          onChange={(e) => setIncluirMetricaFotos(e.target.checked)}
                          disabled={editingPackage && checkPackageHasHistory(editingPackage.id)}
                          className="accent-white w-4.5 h-4.5 rounded mt-0.5 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="uppercase text-[10px] font-black tracking-wider block">Incluir este pacote na métrica de fotos enviadas x fotos vendidas?</span>
                          <span className="text-[9px] text-white/40 block leading-tight normal-case font-normal pt-0.5">
                            Se marcado, este pacote participará dos cálculos de conversão/fotos entre fotos preparadas e compradas pelo cliente no Dashboard.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* LIMIT PER PERSON SECTION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-5 rounded-2xl border border-white/10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold">LIMITE DE FOTOS POR PESSOA</label>
                      <label className="flex items-start gap-2.5 font-bold text-white/70 hover:text-white cursor-pointer text-xs leading-relaxed">
                        <input
                          type="checkbox"
                          checked={possuiLimiteFotosPorPessoa}
                          onChange={(e) => setPossuiLimiteFotosPorPessoa(e.target.checked)}
                          className="accent-white w-4.5 h-4.5 rounded mt-0.5 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1">
                          <span className="uppercase text-[10px] font-black tracking-wider block">Este produto possui limite máximo de fotos enviadas por pessoa?</span>
                          <span className="text-[9px] text-white/40 block leading-tight normal-case font-normal pt-0.5">
                            Ative esta regra para limitar as fotos preparadas com base no número total de pessoas neste lançamento.
                          </span>
                        </div>
                      </label>
                    </div>

                    {possuiLimiteFotosPorPessoa && (
                      <div className="space-y-1.5 font-bold">
                        <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">MÁXIMO DE FOTOS ENVIADAS POR PESSOA</label>
                        <input
                          type="text"
                          placeholder="e.g. 25"
                          value={limiteFotosPorPessoa}
                          onChange={(e) => setLimiteFotosPorPessoa(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs font-bold font-mono text-center mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* WHATSAPP ABANDON MESSATE TEXTAREA */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold">MENSAGEM DE WHATSAPP PARA COMPRA ABANDONADA</label>
                    <textarea
                      rows={2}
                      placeholder="Variáveis disponíveis: {nomeCliente}, {atividade}, {whatsapp}"
                      value={mensagemAbandono}
                      onChange={(e) => setMensagemAbandono(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs font-bold"
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold">DESCRIÇÃO DETALHADA DO PACOTE COMERCIAL</label>
                    <textarea
                      rows={2}
                      placeholder="Descreva as especificidades contratuais, locação de lentes, etc..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs font-bold"
                    />
                  </div>

                  {/* Media link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2 font-bold select-none font-bold">REFERÊNCIAS DE MÍDIA / ASSETS DIGITAIS (LINK DO DRIVE OU PINTEREST)</label>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={mediaRef}
                      onChange={(e) => setMediaRef(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs font-bold font-mono"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 flex flex-col gap-3 font-semibold text-sm">
                    <button
                      type="submit"
                      className="w-full py-5 rounded-3xl font-extrabold text-lg bg-white text-slate-950 hover:bg-white/90 transition shadow-sm uppercase tracking-wider text-center cursor-pointer"
                    >
                      {editingPackage ? 'Atualizar Contrato Comercial' : 'Salvar Pacote Comercial'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full py-3 rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-white transition cursor-pointer uppercase text-center border border-white/10 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>

                </form>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
