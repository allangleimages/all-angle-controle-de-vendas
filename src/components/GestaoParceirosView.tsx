import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import { Partner } from '../types';
import { compressImageBase64 } from '../utils/image';
import { 
  Plus, Edit2, Users, Search, Phone, Mail, CreditCard, Check, X, 
  AlertTriangle, KeyRound, Palette, Landmark, Shield, Camera, Trash2, Building2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const GestaoParceirosView: React.FC = () => {
  const { currentUser, partners, activities, addPartner, updatePartner, updateActivity, deletePartner, sales } = useApp();
  const isAdmin = currentUser.cargo === 'Admin';

  const [isOpen, setIsOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [nomeParceiro, setNomeParceiro] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [comissaoPadrao, setComissaoPadrao] = useState('10');
  const [recebeComissao, setRecebeComissao] = useState(true);

  // PIX or Bank states
  const [semPix, setSemPix] = useState(false);
  const [tipoChavePix, setTipoChavePix] = useState('CNPJ');
  const [chavePix, setChavePix] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Conta Corrente');

  // Photo / Logo state for Partner
  const [foto, setFoto] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Color Tag state
  const [corTag, setCorTag] = useState('#059669');

  // Partner matrix row interface
  const [matrixRows, setMatrixRows] = useState<{ activityId: string; taxa: number }[]>([]);

  // System preset colors
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

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-3xl flex items-center gap-3 font-sans">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold text-xs uppercase font-sans">Acesso Restrito</h3>
          <p className="text-xs mt-1">Este painel de parceiros parceiras é restrito para administradores da ALL ANGLE.</p>
        </div>
      </div>
    );
  }

  // Formatting phone (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.substring(0, 2)}) `;
      if (digits.length > 7) {
        formatted += `${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
      } else {
        formatted += digits.substring(2);
      }
    }
    setWhatsapp(formatted);
  };

  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem de logo deve ter no máximo 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImageBase64(reader.result as string)
          .then(compressed => {
            setFoto(compressed);
          })
          .catch(() => {
            setFoto(reader.result as string);
          });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFoto('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPartner(null);
    setNomeParceiro('');
    setWhatsapp('');
    setEmail('');
    setComissaoPadrao('10');
    setRecebeComissao(true);
    setSemPix(false);
    setTipoChavePix('CNPJ');
    setChavePix('');
    setBanco('');
    setAgencia('');
    setConta('');
    setTipoConta('Conta Corrente');
    setCorTag('#059669');
    setFoto('');
    setMatrixRows([]);
    setIsOpen(true);
  };

  const handleOpenEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setNomeParceiro(partner.nomeParceiro);
    setWhatsapp(partner.whatsapp || '');
    setEmail(partner.email || '');
    const currentComm = partner.comissaoPadrao !== undefined ? partner.comissaoPadrao : 10;
    setComissaoPadrao(String(currentComm));
    setRecebeComissao(currentComm > 0);
    setSemPix(!!partner.semPix);
    setTipoChavePix(partner.tipoChavePix || 'CNPJ');
    setChavePix(partner.chavePix || '');
    setBanco(partner.banco || '');
    setAgencia(partner.agencia || '');
    setConta(partner.conta || '');
    setTipoConta(partner.tipoConta || 'Conta Corrente');
    setCorTag(partner.corTag || '#059669');
    setFoto(partner.foto || '');

    // Populate matrix rows
    const rows: { activityId: string; taxa: number }[] = [];
    activities.forEach(act => {
      const custom = act.comissoesCustomizadas?.find(
        c => c.alvoId === partner.id && c.tipo === 'parceiro'
      );
      if (custom) {
        rows.push({
          activityId: act.id,
          taxa: custom.taxa
        });
      }
    });
    setMatrixRows(rows);
    setIsOpen(true);
  };

  const handleAddMatrixRow = () => {
    setMatrixRows([...matrixRows, { activityId: '', taxa: 10 }]);
  };

  const handleRemoveMatrixRow = (index: number) => {
    setMatrixRows(matrixRows.filter((_, i) => i !== index));
  };

  const handleMatrixRowChange = (index: number, key: 'activityId' | 'taxa', value: any) => {
    const updated = [...matrixRows];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setMatrixRows(updated);
  };

  const handleToggleRecebeComissao = (checked: boolean) => {
    setRecebeComissao(checked);
    if (!checked) {
      setComissaoPadrao('0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeParceiro.trim()) {
      alert('Preencha o nome do parceiro ou canal de indicação!');
      return;
    }

    const payload = {
      nomeParceiro: nomeParceiro.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim() || undefined,
      comissaoPadrao: recebeComissao ? parseFloat(comissaoPadrao) || 0 : 0,
      semPix,
      tipoChavePix,
      chavePix: semPix ? '' : chavePix.trim(),
      banco: semPix ? banco.trim() : '',
      agencia: semPix ? agencia.trim() : '',
      conta: semPix ? conta.trim() : '',
      tipoConta: semPix ? tipoConta : '',
      corTag,
      foto
    };

    let savedPartner: Partner;
    if (editingPartner) {
      updatePartner(editingPartner.id, payload);
      savedPartner = { ...editingPartner, ...payload };
    } else {
      savedPartner = addPartner({
        ...payload,
        status: 'Aprovado'
      });
    }

    const partnerId = savedPartner.id;

    // Update custom commissions on Activities level
    activities.forEach(act => {
      // 1. Remove old custom commissions for this partner
      const otherComms = (act.comissoesCustomizadas || []).filter(
        c => !(c.alvoId === partnerId && c.tipo === 'parceiro')
      );

      // 2. Add row if configured for this activity ID
      const matchingRow = matrixRows.find(r => r.activityId === act.id);
      if (matchingRow) {
        otherComms.push({
          alvoId: partnerId,
          tipo: 'parceiro',
          taxa: Number(matchingRow.taxa)
        });
      }

      // 3. Persist activity payload
      updateActivity(act.id, { comissoesCustomizadas: otherComms });
    });

    setIsOpen(false);
  };

  const filteredPartners = partners.filter(p => {
    if (searchTerm.trim() === '') return true;
    const query = searchTerm.toLowerCase();
    return p.nomeParceiro.toLowerCase().includes(query) || (p.whatsapp && p.whatsapp.includes(query));
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Gestão de Parceiros</h1>
          <p className="text-xs text-slate-500">Mapeie pousadas, hotéis ou operadoras externas vinculando taxas padrões de comissão e rastreadores.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center gap-1.5 transition hover:scale-[1.01] shadow-sm select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Parceiro
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Pesquisar parceiro por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-205 text-xs focus:outline-none focus:border-slate-950 text-slate-900 font-bold"
        />
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map(p => {
          const isAprovado = p.status === 'Aprovado';
          const comissaoInfo = p.comissaoPadrao !== undefined ? p.comissaoPadrao : 10;
          const recebeComm = comissaoInfo > 0;
          
          // Check if payment info is present
          const hasPixInfo = !p.semPix && p.chavePix && p.chavePix.trim().length > 0;
          const hasBankInfo = p.semPix && p.banco && p.banco.trim().length > 0 && p.conta && p.conta.trim().length > 0;
          const hasAnyFinancialInfo = hasPixInfo || hasBankInfo;

          return (
            <div 
              key={p.id} 
              style={{ borderLeft: `8px solid ${p.corTag || '#059669'}` }}
              className={`bg-white rounded-3xl border border-l-0 border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                !isAprovado ? 'ring-1 ring-amber-300 bg-amber-50/5' : ''
              }`}
            >
              {/* Card Content wrapper */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Visual Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    {p.foto ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 shadow-sm">
                        <img 
                          src={p.foto} 
                          alt={p.nomeParceiro} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-2xl text-white font-extrabold flex items-center justify-center shrink-0 uppercase shadow-inner text-sm tracking-widest"
                        style={{ backgroundColor: p.corTag || '#059669' }}
                      >
                        {p.nomeParceiro.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase leading-none">{p.nomeParceiro}</h4>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {recebeComm ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold px-2 py-0.5 rounded uppercase">
                            Recebe Comissão ({comissaoInfo}%)
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded uppercase">
                            Não recebe comissão
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 ${
                    isAprovado 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                  }`}>
                    {p.status || 'Aprovado'}
                  </span>
                </div>

                {/* Details Sections: Contacts, Financial details & custom rules */}
                <div className="space-y-4 text-xs">
                  
                  {/* Part A: Contact Data */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Dados de Contato</span>
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                      {p.whatsapp ? (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-450 font-bold text-[10px]">WhatsApp:</span>
                          <span className="font-extrabold text-slate-900">{p.whatsapp}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px]">WhatsApp:</span>
                          <span className="font-medium text-[10px]">Não informado</span>
                        </div>
                      )}
                      
                      {p.email ? (
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-450 font-bold text-[10px]">E-mail:</span>
                          <span className="font-bold text-slate-800 break-all text-right max-w-[140px] truncate select-all">{p.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px]">E-mail:</span>
                          <span className="font-medium text-[10px]">Não informado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Part B: Financial / Liquidation Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dados Bancários / PIX</span>
                      {!hasAnyFinancialInfo && (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opcional</span>
                      )}
                    </div>

                    {!hasAnyFinancialInfo ? (
                      <div className="bg-slate-50/65 p-2.5 rounded-xl border border-slate-100/70 text-center text-slate-450">
                        <span className="text-[10px] font-bold text-slate-400">Nenhum Pix ou Conta cadastrada</span>
                      </div>
                    ) : p.semPix ? (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[10px] text-slate-705 font-bold space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Banco:</span> 
                          <span className="text-slate-900 font-extrabold">{p.banco || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Agência / Conta:</span> 
                          <span className="text-slate-900 font-extrabold">{p.agencia || '--'} / {p.conta || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tipo:</span> 
                          <span className="text-slate-900 font-black">{p.tipoConta || 'Corrente'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">PIX ({p.tipoChavePix || 'CPF'}):</span>
                        <span className="font-mono font-black text-slate-900 select-all border border-dashed border-slate-200 bg-slate-100/45 px-1.5 py-0.5 rounded">{p.chavePix}</span>
                      </div>
                    )}
                  </div>

                  {/* Part C: Activity overriden commissions */}
                  <div className="space-y-1 pt-1.5">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Regras de Comissão por Atividade</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {activities.map(act => {
                        const custom = act.comissoesCustomizadas?.find(c => c.alvoId === p.id && c.tipo === 'parceiro');
                        if (custom) {
                          return (
                            <span 
                              key={act.id} 
                              className="text-[9px] bg-orange-50 border border-orange-200 text-orange-700 font-black px-2 py-0.5 rounded uppercase"
                            >
                              {act.nomeAtividade}: {custom.taxa}%
                            </span>
                          );
                        }
                        return null;
                      }).filter(Boolean).length === 0 && (
                        <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-505 font-medium px-2 py-0.5 rounded-md uppercase">
                          Sempre comissão base geral ({comissaoInfo}%)
                        </span>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Edit Actions Bottom */}
              <div className="bg-slate-50/85 px-6 py-4 border-t border-slate-100/70 flex items-center justify-end shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirmDeleteId === p.id) {
                        deletePartner(p.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(p.id);
                      }
                    }}
                    className={`text-[10px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer uppercase tracking-tight shadow-xs border ${
                      confirmDeleteId === p.id
                        ? "bg-rose-800 hover:bg-rose-950 text-white border-rose-950 animate-pulse font-bold shadow-md scale-[1.03]"
                        : "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                    }`}
                    title={
                      (sales || []).filter((s: any) => s.parceiroId === p.id).length > 0
                        ? `Atenção: este parceiro possui ${(sales || []).filter((s: any) => s.parceiroId === p.id).length} faturamentos atrelados!`
                        : "Excluir parceiro"
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                    {confirmDeleteId === p.id ? "Confirmar Exclusão" : "Excluir"}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white border border-[#0e2438] text-[10px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer uppercase tracking-tight shadow-xs"
                  >
                    <Edit2 className="w-3" />
                    Editar Parceria
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* PREMIUM BACKDROP-BLUR MODAL WINDOW */}
      {createPortal(
        <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
            {/* Backdrop Blur Overlay */}
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Card Window */}
            <motion.div
              className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col focus:outline-none"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
            >
              {/* Dismiss X Button */}
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all cursor-pointer text-white focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Modal Header */}
              <div className="mb-6 col-span-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">
                  {editingPartner ? 'Editar Parceiro Estratégico' : 'Novo Parceiro Comercial'}
                </h2>
                <p className="text-xs text-white/40 font-bold mt-1.5 uppercase pl-1 tracking-widest">
                  Identidade, Comissões de Parcerias e Dados de Liquidação Financeira
                </p>
              </div>

              {/* Form Body Container strictly utilizing grid layout */}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* PHOTO/LOGO UPLOAD CONTAINER (Full Row span-2) */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2 block">Logotipo / Foto do Parceiro</label>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="relative group cursor-pointer select-none shrink-0" onClick={handleTriggerFile}>
                        {foto ? (
                          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/20 shadow-xs">
                            <img src={foto} alt="Logo" className="w-full h-full object-cover animate-fade-in" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/60 text-[8px] text-center text-white py-0.5 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity">
                          MUDAR
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-grow font-bold">
                        <p className="text-xs text-white/60 leading-normal font-sans">Carregue o logotipo do hotel, pousada ou agência de faturamento (Máx. 2MB).</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerFile}
                            className="bg-white hover:bg-white/95 text-slate-950 font-sans text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition cursor-pointer font-bold border border-white/10"
                          >
                            Carregar Imagem
                          </button>
                          {foto && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-sans text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl border border-rose-500/20 transition cursor-pointer font-bold"
                            >
                              Remover Foto
                            </button>
                          )}
                        </div>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FIELD: Nome do Parceiro */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2 block">Nome Fantasia / Empresa</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pousada Villa Mar"
                      value={nomeParceiro}
                      onChange={(e) => setNomeParceiro(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Email */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2 block">E-mail para Faturamento</label>
                    <input
                      type="email"
                      placeholder="financeiro@empresa.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: WhatsApp */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2 block">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(DDD) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-mono font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Comissão Padrão */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2 block">Repasse / Comissão Base (%)</label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={recebeComissao}
                          onChange={(e) => handleToggleRecebeComissao(e.target.checked)}
                          className="accent-white rounded w-3.5 h-3.5 bg-white/5 border-white/20"
                        />
                        <span className="text-[9px] font-black text-white/50 uppercase">Recebe Comissão</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: 10"
                      required
                      disabled={!recebeComissao}
                      value={comissaoPadrao}
                      onChange={(e) => setComissaoPadrao(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-white/5 disabled:opacity-50 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* NOT SYSTEM ACCOUNT NOTICE */}
                  <div className="col-span-2 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-4 text-white/60 font-semibold leading-relaxed">
                    <Shield className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-black block uppercase text-white tracking-wider pl-1">Parceiro Indicador Sem Usuário</span>
                      <p className="text-[9px] text-white/40 uppercase font-black block mt-0.5 pl-1">Sem Acesso Operacional</p>
                      <p className="text-xs text-white/60 leading-normal font-sans mt-1">Este canal parceiro não possui conta de login ou senha, servindo unicamente para repasses, cálculo de comissionamentos e auditoria de vendas referenciadas.</p>
                    </div>
                  </div>

                  {/* LIQUIDATION / DADOS BANCÁRIOS / PIX */}
                  <div className="col-span-2 space-y-4 pt-2 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block pl-2 font-bold">Liquidação de Comissões</label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={semPix}
                          onChange={(e) => setSemPix(e.target.checked)}
                          className="rounded border-white/20 text-white accent-white cursor-pointer w-4 h-4 bg-white/5"
                        />
                        <span className="text-[10px] font-black text-white/60 uppercase">Não possui PIX / Adicionar Dados Bancários</span>
                      </label>
                    </div>

                    {!semPix ? (
                      <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 animate-fade-in text-xs">
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block">Tipo de Chave PIX</label>
                          <select
                            value={tipoChavePix}
                            onChange={(e) => setTipoChavePix(e.target.value)}
                            className="w-full bg-slate-900 p-3 border border-white/10 rounded-xl text-white font-bold focus:outline-none"
                          >
                            <option value="CNPJ" className="bg-slate-900 text-white">CNPJ</option>
                            <option value="CPF" className="bg-slate-900 text-white">CPF</option>
                            <option value="Celular" className="bg-slate-900 text-white">Celular</option>
                            <option value="E-mail" className="bg-slate-900 text-white">E-mail</option>
                            <option value="Chave Aleatória" className="bg-slate-900 text-white">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block font-bold">Chave PIX (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Insira a chave Pix (opcional)"
                            value={chavePix}
                            onChange={(e) => setChavePix(e.target.value)}
                            className="w-full bg-white/5 p-3 border border-white/10 rounded-xl text-white focus:outline-none font-mono font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 animate-fade-in text-xs font-semibold">
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block">Banco Emissor (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: Banco do Brasil (opcional)"
                            value={banco}
                            onChange={(e) => setBanco(e.target.value)}
                            className="w-full bg-white/5 p-3 border border-white/10 rounded-xl text-white font-bold focus:outline-none shadow-inner"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block">Agência Bancária (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: 0150 (opcional)"
                            value={agencia}
                            onChange={(e) => setAgencia(e.target.value)}
                            className="w-full bg-white/5 p-3 border border-white/10 rounded-xl text-white focus:outline-none font-mono text-center font-bold"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block">Número de Conta (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: 12345-6 (opcional)"
                            value={conta}
                            onChange={(e) => setConta(e.target.value)}
                            className="w-full bg-white/5 p-3 border border-white/10 rounded-xl text-white focus:outline-none font-mono font-black"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 uppercase pl-2 block">Tipo de Conta Bancária</label>
                          <select
                            value={tipoConta}
                            onChange={(e) => setTipoConta(e.target.value)}
                            className="w-full bg-slate-900 p-3 border border-white/10 rounded-xl text-white font-bold focus:outline-none"
                          >
                            <option value="Conta Corrente" className="bg-slate-900 text-white">Conta Corrente</option>
                            <option value="Conta Poupança" className="bg-slate-900 text-white">Conta Poupança</option>
                            <option value="Conta de Pagamento" className="bg-slate-900 text-white">Conta de Pagamento</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Subtle warning banner if receives commission but has no payment info */}
                    {recebeComissao && (
                      ((!semPix && !chavePix.trim()) || (semPix && (!banco.trim() || !conta.trim()))) && (
                        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Aviso: Comissão ativa, mas sem dados bancários/PIX preenchidos. Cadastre-os mais tarde para liquidações automáticas.</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* FIELD: Visual Color Tag Preset Picker */}
                  <div className="col-span-2 space-y-2 border-t border-white/10 pt-4">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2 block">Identificação Visual / Cor do Parceiro</label>
                    <div className="flex flex-wrap gap-2.5 bg-white/5 p-4 border border-white/10 rounded-2xl">
                      {colorPresets.map(preset => {
                        const isSelected = corTag === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setCorTag(preset.value)}
                            className="w-8 h-8 rounded-full border border-white/10 relative flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-95 shadow-2xs shrink-0"
                            style={{ backgroundColor: preset.value }}
                            title={preset.label}
                          >
                            {isSelected && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DYNAMIC COMISSIONS MATRIX GRID AND ROW REPEATERS (Full Row) */}
                  <div className="col-span-2 space-y-4 pt-4 border-t border-white/10">
                    
                    {/* Matrix Headings */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-2">
                      <div>
                        <h3 className="font-extrabold text-white uppercase text-[11px] tracking-wider leading-none">Contrato de Repasse por Atividade</h3>
                        <p className="text-[9px] text-white/40 uppercase font-black mt-1 inline-block">Configure comissões tarifárias diferenciadas para rotas específicas</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMatrixRow}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-sans font-black text-[9px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition cursor-pointer font-bold shrink-0 self-start sm:self-center"
                      >
                        + Mapear Acordo Especial
                      </button>
                    </div>

                    {/* Repeatable elements mapping */}
                    <div className="space-y-3">
                      {matrixRows.length === 0 ? (
                        <div className="bg-white/5 border border-dashed border-white/10 p-6 rounded-2xl text-center text-white/40 font-semibold block leading-relaxed">
                          <p className="text-[10px]">Sem acordos especiais vigentes por atração.</p>
                          <p className="text-[9px] text-white/40 mt-1 uppercase leading-normal font-bold">O comissionamento base geral de {comissaoPadrao}% configurado acima será aplicado automaticamente pelo sistema de repasses.</p>
                        </div>
                      ) : (
                        matrixRows.map((row, index) => (
                          <div key={index} className="flex flex-col sm:flex-row shadow-2xs border border-white/10 bg-white/5 p-4 rounded-2xl items-center gap-4 relative animate-fade-in text-xs font-semibold">
                            
                            <div className="flex-1 w-full space-y-1.5 font-bold">
                              <span className="text-[9px] text-white/40 font-black uppercase">Atividade Operacional Vinculada</span>
                              <select
                                required
                                value={row.activityId}
                                onChange={(e) => handleMatrixRowChange(index, 'activityId', e.target.value)}
                                className="w-full bg-slate-900 p-3 border border-white/10 rounded-xl text-white font-bold focus:outline-none"
                              >
                                <option value="" className="bg-slate-900 text-white">-- SELECIONE A ATIVIDADE --</option>
                                {activities.map(act => (
                                  <option key={act.id} value={act.id} className="bg-slate-900 text-white">{act.nomeAtividade.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>

                            <div className="w-full sm:w-1/4 space-y-1.5 font-bold">
                              <span className="text-[9px] text-white/40 font-black uppercase">Comissão Especial (%)</span>
                              <input
                                type="text"
                                required
                                value={row.taxa}
                                onChange={(e) => handleMatrixRowChange(index, 'taxa', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                className="w-full bg-white/5 p-3 border border-white/10 rounded-xl text-white font-mono text-center font-bold focus:outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMatrixRow(index)}
                              className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-450 border border-transparent hover:border-white/5 p-3 rounded-xl transition shrink-0 cursor-pointer self-stretch sm:self-end text-center flex items-center justify-center font-bold"
                              title="Remover Acordo"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>

                          </div>
                        ))
                      )}
                    </div>

                  </div>

                  {/* STRETCH ACTION BUTTON ACTIONS FOR W-FULL 3XL PY-5 TEXT-LG font-bold */}
                  <div className="col-span-2 pt-4 flex flex-col gap-4">
                    <button
                      type="submit"
                      className="w-full py-5 rounded-3xl font-bold text-lg bg-white text-slate-950 hover:bg-white/90 transition-all cursor-pointer shadow-sm uppercase tracking-wider text-center"
                    >
                      {editingPartner ? 'Salvar Configurações' : 'Confirmar e Cadastrar Parceiro'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full py-4 rounded-3xl font-bold text-base bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer uppercase tracking-wider text-center border border-white/5"
                    >
                      Cancelar
                    </button>
                  </div>

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
