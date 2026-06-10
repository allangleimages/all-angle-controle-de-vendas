import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import { Collaborator } from '../types';
import { calculateCollaboratorCommission } from '../utils/finance';
import { compressImageBase64 } from '../utils/image';
import { 
  Plus, Edit2, Shield, User, Check, X, AlertTriangle, 
  KeyRound, CreditCard, Camera, Trash2, Mail, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const GestaoEquipeView: React.FC = () => {
  const { currentUser, collaborators, activities, sales, addCollaborator, updateCollaborator, updateActivity, deleteCollaborator } = useApp();
  const isAdmin = currentUser.cargo === 'Admin';

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Success modal and details
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  // Form states
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cargoFuncao, setCargoFuncao] = useState('');
  const [cargo, setCargo] = useState<'Staff' | 'Admin'>('Staff');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  
  // PIX or Bank states
  const [semPix, setSemPix] = useState(false);
  const [tipoChavePix, setTipoChavePix] = useState('CPF');
  const [chavePix, setChavePix] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Conta Corrente');

  // Photo / Avatar state
  const [foto, setFoto] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Color Tag state
  const [corTag, setCorTag] = useState('#2563eb');

  // Repeatable matrix state
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
      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-3xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-sans font-black uppercase text-xs">Acesso Restrito</h3>
          <p className="text-xs mt-1">Este painel de gerenciamento de colaboradores é restrito a administradores da ALL ANGLE.</p>
        </div>
      </div>
    );
  }

  // Format phone (XX) XXXXX-XXXX
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
    setTelefone(formatted);
  };

  // Avatar Upload Handlers
  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB");
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
    setEditingCollab(null);
    setNomeCompleto('');
    setEmail('');
    setTelefone('');
    setCargoFuncao('');
    setCargo('Staff');
    setStatus('Ativo');
    setSemPix(false);
    setTipoChavePix('CPF');
    setChavePix('');
    setBanco('');
    setAgencia('');
    setConta('');
    setTipoConta('Conta Corrente');
    setCorTag('#2563eb');
    setFoto('');
    setMatrixRows([]);
    setIsOpen(true);
  };

  const handleOpenEditModal = (collab: Collaborator) => {
    setEditingCollab(collab);
    setNomeCompleto(collab.nomeCompleto);
    setEmail(collab.email);
    setTelefone(collab.telefone || '');
    setCargoFuncao(collab.cargoFuncao || '');
    setCargo(collab.cargo);
    setStatus(collab.status);
    setSemPix(!!collab.semPix);
    setTipoChavePix(collab.tipoChavePix || 'CPF');
    setChavePix(collab.chavePix || '');
    setBanco(collab.banco || '');
    setAgencia(collab.agencia || '');
    setConta(collab.conta || '');
    setTipoConta(collab.tipoConta || 'Conta Corrente');
    setCorTag(collab.corTag || '#2563eb');
    setFoto(collab.foto || '');

    // Populate matrix rows
    const rows: { activityId: string; taxa: number }[] = [];
    activities.forEach(act => {
      const custom = act.comissoesCustomizadas?.find(
        c => c.alvoId === collab.id && c.tipo === 'vendedor'
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
    setMatrixRows([...matrixRows, { activityId: '', taxa: 5 }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!nomeCompleto.trim() || !email.trim()) {
        alert('Preencha os campos obrigatórios!');
        return;
      }

      const isAdminRole = cargo === 'Admin';

      const payload = {
        nomeCompleto: nomeCompleto.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        cargoFuncao: cargoFuncao.trim(),
        cargo,
        status,
        semPix: isAdminRole ? true : semPix,
        tipoChavePix: isAdminRole ? '' : tipoChavePix,
        chavePix: isAdminRole ? '' : (semPix ? '' : chavePix.trim()),
        banco: isAdminRole ? '' : (semPix ? banco.trim() : ''),
        agencia: isAdminRole ? '' : (semPix ? agencia.trim() : ''),
        conta: isAdminRole ? '' : (semPix ? conta.trim() : ''),
        tipoConta: isAdminRole ? '' : (semPix ? tipoConta : ''),
        corTag,
        foto,
        atividadesPermitidas: isAdminRole ? [] : matrixRows.map(r => r.activityId).filter(Boolean)
      };

      let savedCollab: Collaborator;
      if (editingCollab) {
        updateCollaborator(editingCollab.id, payload);
        savedCollab = { ...editingCollab, ...payload };
      } else {
        savedCollab = addCollaborator(payload);
        setRegisteredName(savedCollab.nomeCompleto);
        setRegisteredEmail(savedCollab.email);
        setShowSuccessModal(true);
      }

      const collabId = savedCollab.id;

      // Update custom commissions on Activities level
      activities.forEach(act => {
        // 1. Remove old custom commissions for this collaborator
        const otherComms = (act.comissoesCustomizadas || []).filter(
          c => !(c.alvoId === collabId && c.tipo === 'vendedor')
        );

        if (!isAdminRole) {
          // 2. Add row if configured for this activity ID
          const matchingRow = matrixRows.find(r => r.activityId === act.id);
          if (matchingRow) {
            otherComms.push({
              alvoId: collabId,
              tipo: 'vendedor',
              taxa: Number(matchingRow.taxa)
            });
          }
        }

        // 3. Persist activity payload
        updateActivity(act.id, { comissoesCustomizadas: otherComms });
      });

      setIsOpen(false);
    } catch (err) {
      console.error("Erro ao salvar cadastro de colaborador:", err);
      alert("Houve um erro técnico inesperado ao salvar os dados: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Gestão de Equipe</h1>
          <p className="text-xs text-slate-500">Mapeie integrantes do time, configure perfis, taxas de comissões por atividades e credenciais bancárias.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center gap-1.5 transition hover:scale-[1.01] shadow-sm select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collaborators.map(collab => {
          const isAtivo = collab.status === 'Ativo';
          const isAdmUser = collab.cargo === 'Admin';
          
          // Full Name & Initials
          const initials = collab.nomeCompleto
            ? collab.nomeCompleto.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : '--';

          return (
            <div 
              key={collab.id} 
              style={{ borderLeft: `8px solid ${collab.corTag || '#2563eb'}` }}
              className={`bg-white border border-l-0 border-slate-250/80 rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between group min-h-[460px] ${
                !isAtivo ? 'opacity-65 grayscale bg-slate-50' : ''
              }`}
            >
              <div className="space-y-4">
                
                {/* Header Block: Avatar + Name + Cargo Badge */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-[#0e2438] text-white rounded-full flex items-center justify-center font-black text-sm shadow-xs shrink-0 select-none relative">
                    {collab.foto ? (
                      <img 
                        src={collab.foto} 
                        alt={collab.nomeCompleto} 
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : initials}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isAtivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>

                  <div className="text-left overflow-hidden">
                    <h4 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase truncate">{collab.nomeCompleto}</h4>
                    <span className={`inline-block text-[8px] uppercase font-black px-2.5 py-0.5 rounded-full border mt-1 shrink-0 ${
                      isAdmUser 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-150' 
                        : 'bg-purple-50 text-purple-700 border-purple-150'
                    }`}>
                      {collab.cargoFuncao ? collab.cargoFuncao.toUpperCase() : (isAdmUser ? 'ADMINISTRADOR' : 'FOTÓGRAFO')}
                    </span>
                  </div>
                </div>

                {/* 1. DADOS DE CONTATO (EMAIL / WHATSAPP) */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Dados de Contato</span>
                  <div className="text-[10px] text-slate-600 font-semibold space-y-1.5 pl-1.5 text-left">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                      <span className="truncate select-all text-slate-900">{collab.email}</span>
                    </div>
                    {collab.telefone ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://wa.me/${collab.telefone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                          <span>WhatsApp: {collab.telefone}</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Nenhum WhatsApp cadastrado</span>
                    )}
                  </div>
                </div>

                {/* 2. CHAVE PIX & BANCO */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Chave Pix & Banco</span>
                  <div className="bg-slate-50/70 border border-slate-200/50 p-3 rounded-2xl text-[10px] text-slate-700 text-left">
                    {collab.semPix ? (
                      <div className="space-y-1 font-bold">
                        <p className="text-slate-900 block truncate">
                          Banco: <span className="font-extrabold text-indigo-700">{collab.banco || '--'}</span>
                        </p>
                        <p className="text-slate-500 block truncate text-[9px] font-semibold">
                          Agência: <span className="font-extrabold font-mono text-slate-800">{collab.agencia || '--'}</span> • Conta: <span className="font-extrabold font-mono text-slate-800">{collab.conta || '--'}</span> ({collab.tipoConta || 'C/C'})
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-mono text-slate-900 block truncate font-bold">
                          PIX ({collab.tipoChavePix}): <span className="text-indigo-600 font-extrabold select-all">{collab.chavePix || '--'}</span>
                        </p>
                        {collab.banco ? (
                          <p className="text-slate-450 text-[9px] block">
                            Banco Resgate: {collab.banco}
                          </p>
                        ) : (
                          <p className="text-slate-400 text-[9px] block font-medium italic">
                            Chave direta para depósitos e liquidações instantâneas
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. COMISSIONAMENTO */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Comissionamento</span>
                  <div className="flex flex-wrap gap-1 mt-1 pl-1 text-left justify-start">
                    {collab.cargo === 'Admin' ? (
                      <span className="text-[8px] bg-slate-900 text-white font-extrabold px-2 py-1 rounded-md uppercase tracking-wider">
                        Acesso Total Administrativo (N/A)
                      </span>
                    ) : (
                      <>
                        {activities.map(act => {
                          const custom = act.comissoesCustomizadas?.find(c => c.alvoId === collab.id && c.tipo === 'vendedor');
                          if (custom) {
                            return (
                              <span key={act.id} className="text-[8px] bg-indigo-50 border border-indigo-200/50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded uppercase">
                                {act.nomeAtividade}: {custom.taxa}%
                              </span>
                            );
                          }
                          return null;
                        }).filter(Boolean).length === 0 ? (
                          <span className="text-[8px] bg-slate-100 text-slate-600 border border-slate-200 font-extrabold px-2 py-0.5 rounded uppercase">
                            Sem comissão cadastrada
                          </span>
                        ) : (
                          activities.map(act => {
                            const custom = act.comissoesCustomizadas?.find(c => c.alvoId === collab.id && c.tipo === 'vendedor');
                            if (custom) {
                              return (
                                <span key={act.id} className="text-[8px] bg-indigo-50 border border-indigo-250 text-indigo-700 font-extrabold px-2 py-0.5 rounded uppercase">
                                  {act.nomeAtividade}: {custom.taxa}%
                                </span>
                              );
                            }
                            return null;
                          })
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Buttons nested within the card footer */}
              <div className="flex items-center justify-end w-full mt-5 pt-3 border-t border-slate-100 text-slate-500 font-bold">
                <div className="flex items-center gap-3">
                  {collab.email.toLowerCase() !== 'info@allangle.com.br' && (
                    <button
                      onClick={() => {
                        if (confirmDeleteId === collab.id) {
                          deleteCollaborator(collab.id);
                          setConfirmDeleteId(null);
                        } else {
                          setConfirmDeleteId(collab.id);
                        }
                      }}
                      className={`text-[10px] font-black flex items-center gap-1 cursor-pointer uppercase transition-all px-3 py-1.5 rounded-xl border ${
                        confirmDeleteId === collab.id
                          ? "bg-rose-800 text-white border-rose-900 animate-pulse font-bold shadow-sm"
                          : "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === collab.id ? 'Confirmar Exclusão' : 'Excluir'}
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEditModal(collab)}
                    className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white border border-[#0e2438] text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer uppercase transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
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
              className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
            >
              {/* Dismiss X button */}
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer text-white focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Modal Header */}
              <div className="mb-6 col-span-2">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase">
                  {editingCollab ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h2>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">
                  Cadastro de Perfil, Repasse de Comissão e Liquidações de Equipe
                </p>
              </div>

              {/* Form Body Container strictly utilizing grid layout */}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* PHOTO UPLOAD CONTAINER (Full Row span-2) */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Foto Representativa (Profissional)</label>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="relative group cursor-pointer select-none shrink-0" onClick={handleTriggerFile}>
                        {foto ? (
                          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/25 shadow-xs">
                            <img src={foto} alt="Avatar" className="w-full h-full object-cover animate-fade-in" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[8px] text-center text-white py-0.5 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity">
                          MUDAR
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-grow">
                        <p className="text-xs text-white/60 font-semibold leading-normal">Carregue um arquivo fotográfico do operador (Máx. 2MB).</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerFile}
                            className="bg-white/5 hover:bg-white/10 text-white font-sans text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-white/10 transition cursor-pointer font-bold"
                          >
                            Carregar Foto
                          </button>
                          {foto && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-rose-500/20 transition cursor-pointer font-bold"
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

                  {/* FIELD: Nome Completo */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Silva de Souza"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Email / Login */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">E-mail / Login de Acesso</label>
                    <input
                      type="email"
                      required
                      placeholder="nome@allangle.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Telefone */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Telefone de Contato</label>
                    <input
                      type="text"
                      placeholder="(DDD) 99999-9999"
                      value={telefone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-mono font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Cargo Técnico */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Cargo / Atuação Técnica</label>
                    <input
                      type="text"
                      placeholder="Ex: Fotógrafo Sênior"
                      value={cargoFuncao}
                      onChange={(e) => setCargoFuncao(e.target.value)}
                      className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                    />
                  </div>

                  {/* FIELD: Alçada Operacional */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Nível de Alçada Operacional</label>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setCargo('Staff')}
                        className={`flex-1 py-3 text-center text-xs font-bold rounded-xl uppercase tracking-wider transition-all select-none cursor-pointer ${
                          cargo === 'Staff' 
                            ? 'bg-white text-slate-950 shadow-sm font-bold' 
                            : 'text-white/40 hover:text-white/70 font-bold'
                        }`}
                      >
                        [Equipe / Staff]
                      </button>
                      <button
                        type="button"
                        onClick={() => setCargo('Admin')}
                        className={`flex-1 py-3 text-center text-xs font-bold rounded-xl uppercase tracking-wider transition-all select-none cursor-pointer ${
                          cargo === 'Admin' 
                            ? 'bg-white text-slate-950 shadow-sm font-bold' 
                            : 'text-white/40 hover:text-white/70 font-bold'
                        }`}
                      >
                        [ADM / Gestor]
                      </button>
                    </div>
                  </div>

                  {/* FIELD: Status */}
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Status Inicial</label>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setStatus('Ativo')}
                        className={`flex-1 py-3 text-center text-xs font-bold rounded-xl uppercase tracking-wider transition-all select-none cursor-pointer ${
                          status === 'Ativo' 
                            ? 'bg-emerald-600 text-white shadow-sm font-bold' 
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('Inativo')}
                        className={`flex-1 py-3 text-center text-xs font-bold rounded-xl uppercase tracking-wider transition-all select-none cursor-pointer ${
                          status === 'Inativo' 
                            ? 'bg-rose-600 text-white shadow-sm font-bold' 
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Inativo
                      </button>
                    </div>
                  </div>

                  {/* NO PASSWORD EXCLUSION FORM FIELD NOTICE */}
                  <div className="col-span-2 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-4 text-white/60 font-semibold leading-relaxed">
                    <Shield className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block uppercase tracking-wider pl-1">Chave de Segurança Integrada</span>
                      <p className="text-[10px] text-white/40 font-black block mt-0.5 uppercase">Primeiro Acesso Seguro</p>
                      <p className="text-xs text-white/60 font-sans mt-1">Ao entrar no sistema com seu e-mail corporativo cadastrado, a plataforma o reconhecerá e permitirá criar sua senha pessoal no primeiro acesso instantaneamente.</p>
                    </div>
                  </div>

                  {/* LIQUIDATION / DADOS BANCÁRIOS / PIX */}
                  <div className="col-span-2 space-y-4 pt-2 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2 font-bold">Liquidação de Recebimentos</label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={semPix}
                          onChange={(e) => setSemPix(e.target.checked)}
                          className="rounded border-white/20 text-white accent-white cursor-pointer w-4 h-4 bg-white/5"
                        />
                        <span className="text-xs font-bold text-white/60 uppercase">Não possui PIX / Adicionar Dados Bancários</span>
                      </label>
                    </div>

                    {!semPix ? (
                      <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 animate-fade-in text-xs">
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Tipo de Chave PIX</label>
                          <select
                            value={tipoChavePix}
                            onChange={(e) => setTipoChavePix(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-bold"
                          >
                            <option value="CPF" className="bg-slate-900 text-white">CPF</option>
                            <option value="CNPJ" className="bg-slate-900 text-white">CNPJ</option>
                            <option value="Celular" className="bg-slate-900 text-white">Celular</option>
                            <option value="E-mail" className="bg-slate-900 text-white">E-mail</option>
                            <option value="Chave Aleatória" className="bg-slate-900 text-white">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Chave PIX</label>
                          <input
                            type="text"
                            required={!semPix}
                            placeholder="Insira a chave Pix"
                            value={chavePix}
                            onChange={(e) => setChavePix(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-mono font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 animate-fade-in text-xs font-bold">
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Banco Emissor</label>
                          <input
                            type="text"
                            required={semPix}
                            placeholder="Ex: Itaú (341)"
                            value={banco}
                            onChange={(e) => setBanco(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-bold"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Agência Bancária</label>
                          <input
                            type="text"
                            required={semPix}
                            placeholder="Ex: 0150"
                            value={agencia}
                            onChange={(e) => setAgencia(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-mono text-center font-bold"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Número da Conta</label>
                          <input
                            type="text"
                            required={semPix}
                            placeholder="Ex: 12345-6"
                            value={conta}
                            onChange={(e) => setConta(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-2">Tipo de Conta Bancária</label>
                          <select
                            value={tipoConta}
                            onChange={(e) => setTipoConta(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none w-full font-bold"
                          >
                            <option value="Conta Corrente" className="bg-slate-900 text-white">Conta Corrente</option>
                            <option value="Conta Poupança" className="bg-slate-900 text-white">Conta Poupança</option>
                            <option value="Conta de Pagamento" className="bg-slate-900 text-white">Conta de Pagamento</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FIELD: Visual Color Tag dots picker */}
                  <div className="col-span-2 space-y-2 border-t border-white/10 pt-4">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2 font-bold">Cor de Identificação Visual (Tag Cor)</label>
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
                              <Check className="w-4 h-4 text-white animate-fade-in" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* REPEATABLE MATRIX RULES FOR FINANCIAL AND ACTIVITIES DEFINITIONS (Full Row) */}
                  <div className="col-span-2 space-y-4 pt-4 border-t border-white/10">
                    
                    {/* Matrix Headings */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-2">
                      <div>
                        <h3 className="font-extrabold text-white uppercase text-xs tracking-wider leading-none">Regra Financeira e Atividades</h3>
                        <p className="text-[9px] text-white/40 uppercase font-black mt-1 inline-block">Configure taxas personalizadas de remuneração por atração operacional</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMatrixRow}
                        className="bg-white/10 hover:bg-white/20 text-white font-sans text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer font-bold shrink-0 self-start sm:self-center border border-white/10"
                      >
                        + Adicionar Regra
                      </button>
                    </div>

                    {/* Matrix Body elements */}
                    <div className="space-y-3">
                      {cargo === 'Admin' ? (
                        <div className="bg-white/5 border border-white/10 text-white/80 p-4 rounded-2xl leading-relaxed">
                          <span className="font-extrabold text-white uppercase text-[9px] tracking-wide block">Regras para Administrador (Mapeadas)</span>
                          <p className="text-xs text-white/60 mt-1">Colaboradores de grau de faturamento Administrador detêm acesso global a relatórios estatísticos Gerais, substituindo matrizes parciais pelo controle faturário amplo.</p>
                        </div>
                      ) : matrixRows.length === 0 ? (
                        <div className="bg-white/5 border border-dashed border-white/10 p-6 rounded-2xl text-center text-white/40 font-semibold block leading-relaxed">
                          <p className="text-xs">Sem taxas especiais vinculadas por passeio.</p>
                          <p className="text-[9px] text-white/30 mt-1 uppercase leading-normal font-bold">Sem taxas cadastradas, nenhuma comissão será cobrada ou gerada para este integrador.</p>
                        </div>
                      ) : (
                        matrixRows.map((row, index) => (
                          <div key={index} className="flex flex-col sm:flex-row border border-white/10 bg-white/5 p-4 rounded-2xl items-center gap-4 relative animate-fade-in text-xs font-semibold font-bold">
                            
                            <div className="flex-grow w-full space-y-1.5">
                              <span className="text-[9px] text-white/40 font-black uppercase tracking-wider pl-2">Atividade Operacional Associada</span>
                              <select
                                required
                                value={row.activityId}
                                onChange={(e) => handleMatrixRowChange(index, 'activityId', e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none w-full font-bold"
                              >
                                <option value="" className="bg-slate-900 text-white">-- SELECIONE A ATIVIDADE --</option>
                                {activities.map(act => (
                                  <option key={act.id} value={act.id} className="bg-slate-900 text-white">{act.nomeAtividade.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>

                            <div className="w-full sm:w-1/4 space-y-1.5">
                              <span className="text-[9px] text-white/40 font-black uppercase tracking-wider pl-2">Taxa Editada (%)</span>
                              <input
                                type="text"
                                required
                                value={row.taxa}
                                onChange={(e) => {
                                  const text = e.target.value.replace(/[^0-9.]/g, '');
                                  handleMatrixRowChange(index, 'taxa', parseFloat(text) || 0);
                                }}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none text-center font-bold font-mono w-full"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMatrixRow(index)}
                              className="bg-rose-550/10 hover:bg-rose-550/20 text-rose-450 border border-white/5 p-3 rounded-xl transition shrink-0 cursor-pointer self-stretch sm:self-end text-center flex items-center justify-center font-bold"
                              title="Remover Regra"
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
                      className="w-full bg-white text-slate-950 py-5 rounded-3xl font-bold text-lg hover:bg-white/90 transition-all cursor-pointer shadow-sm uppercase tracking-wider text-center"
                    >
                      {editingCollab ? 'Salvar Alterações' : 'Gravar Cadastro e Credenciar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-3xl font-bold text-base transition-all cursor-pointer uppercase tracking-wider text-center"
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

      {/* SUCCESS CONFIRMATION MODAL */}
      {createPortal(
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
              <motion.div
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSuccessModal(false)}
              />
              <motion.div
                className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
              >
                <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Cadastro Concluído com Sucesso!</h3>
                <p className="text-white/60 text-xs leading-relaxed mb-6">
                  O colaborador <strong className="text-white font-extrabold">{registeredName}</strong> foi cadastrado de forma consolidada no sistema.
                  Ele já pode realizar o primeiro acesso utilizando diretamente o e-mail cadastrado:<br/>
                  <span className="font-mono bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl inline-block mt-3 text-white select-all">{registeredEmail}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-white text-slate-900 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider hover:bg-slate-100 transition cursor-pointer"
                >
                  Confirmar e Voltar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
