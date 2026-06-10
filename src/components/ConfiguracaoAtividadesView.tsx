import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Activity, CustomCommission } from '../types';
import { 
  Plus, Trash2, Settings, MessageSquare, HelpCircle, 
  AlertTriangle, Users, Waves, X, Edit2, Shield, HeartHandshake, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const ConfiguracaoAtividadesView: React.FC = () => {
  const { currentUser, activities, collaborators, partners, addActivity, updateActivity } = useApp();
  const isAdmin = currentUser.cargo === 'Admin';

  const [isOpen, setIsOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form states for Create/Edit Modal
  const [nomeAtividade, setNomeAtividade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [corTag, setCorTag] = useState('#6366f1');
  const [parceiroId, setParceiroId] = useState('');
  const [membrosElegiveis, setMembrosElegiveis] = useState<string[]>([]);

  // Configured Activity state for separate floating Modal
  const [configuringActivityId, setConfiguringActivityId] = useState<string | null>(null);
  
  // Custom commission form state inside rules modal
  const [comTargetAlvoId, setComTargetAlvoId] = useState('');
  const [comTargetTipo, setComTargetTipo] = useState<'vendedor' | 'parceiro'>('vendedor');
  const [comTargetTaxa, setComTargetTaxa] = useState('10');

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Acesso Restrito</h3>
          <p className="text-xs">Este painel de regras operacionais de atividades é restrito a administradores da ALL ANGLE.</p>
        </div>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setEditingActivity(null);
    setNomeAtividade('');
    setDescricao('');
    setCorTag('#6366f1');
    setParceiroId('');
    // By default, make all staff accounts eligible
    const initialEligible = collaborators
      .filter(c => c.email.toLowerCase() !== 'info@allangle.com.br')
      .map(c => c.id);
    setMembrosElegiveis(initialEligible);
    setIsOpen(true);
  };

  const handleOpenEditModal = (act: Activity) => {
    setEditingActivity(act);
    setNomeAtividade(act.nomeAtividade);
    setDescricao(act.descricao || '');
    setCorTag(act.corTag || '#6366f1');
    setParceiroId(act.parceiroId || '');
    setMembrosElegiveis(act.membrosElegiveis || []);
    setIsOpen(true);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeAtividade.trim()) {
      alert('Preencha o nome da atividade!');
      return;
    }

    const payload = {
      nomeAtividade: nomeAtividade.trim(),
      descricao: descricao.trim(),
      corTag,
      parceiroId: parceiroId || undefined,
      membrosElegiveis
    };

    if (editingActivity) {
      updateActivity(editingActivity.id, payload);
    } else {
      addActivity({
        ...payload,
        comissoesCustomizadas: [],
        whatsappTemplate: 'Olá {nome}, seu lançamento da {pousada} está pronto! Código e Resumo: {resumo_compra}. Agradecemos a confiança!'
      });
    }

    setIsOpen(false);
  };

  // Switcher to manage checkboxes in eligibility list
  const toggleEligibility = (collabId: string) => {
    setMembrosElegiveis(prev => {
      if (prev.includes(collabId)) {
        return prev.filter(id => id !== collabId);
      } else {
        return [...prev, collabId];
      }
    });
  };

  const handleSaveTemplate = (id: string, text: string) => {
    updateActivity(id, { whatsappTemplate: text });
  };

  // Commissions overrides triggers inside modal
  const handleAddCustomCommissionLine = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;
    if (!comTargetAlvoId) {
      alert('Selecione um vendedor ou parceiro para vincular a regra!');
      return;
    }

    // Check if duplicate target exists
    const exists = act.comissoesCustomizadas.some(
      c => c.alvoId === comTargetAlvoId && c.tipo === comTargetTipo
    );
    if (exists) {
      alert('Já existe uma regra de comissão cadastrada para este alvo nesta atividade!');
      return;
    }

    const newLine: CustomCommission = {
      alvoId: comTargetAlvoId,
      tipo: comTargetTipo,
      taxa: parseFloat(comTargetTaxa) || 10
    };

    const updatedCollabs = [...act.comissoesCustomizadas, newLine];
    updateActivity(actId, { comissoesCustomizadas: updatedCollabs });

    // Reset selector
    setComTargetAlvoId('');
  };

  const handleRemoveCustomCommissionLine = (actId: string, targetId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    const updatedCollabs = act.comissoesCustomizadas.filter(c => c.alvoId !== targetId);
    updateActivity(actId, { comissoesCustomizadas: updatedCollabs });
  };

  const colorPalette = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#ef4444', // Rose
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
    '#ec4899', // Pink
  ];

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Configurações de Atividades</h1>
          <p className="text-xs text-slate-500">Cadastre novas atividades operacionais, defina elegibilidades e configure canais exclusivos de indicação.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#0e2438] hover:bg-[#1c3a5a] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center gap-1.5 transition hover:scale-[1.01] shadow-sm select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Atividade Operacional
        </button>
      </div>

      {/* Primary Description Info Box */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-2.5 text-indigo-900 leading-normal">
        <HelpCircle className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Fluxo Operacional de Atividades:</strong> Mapeie as atividades realizáveis na ALL ANGLE. Vincule parceiros exclusivos de indicação, restrinja quais colaboradores estão elegíveis para disparar atendimentos e clique em "Regras de Repasse" para configurar templates de WhatsApp e splits de comissões customizadas.
        </div>
      </div>

      {/* Active Activities list area (CLEAN TABLE WITH MARGIN CONTRASTS) */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="bg-white text-center py-16 rounded-3xl border text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
            <Waves className="w-12 h-12 text-slate-300" />
            <p className="text-xs">Nenhuma atividade cadastrada no momento. Crie sua primeira atividade clicando acima!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.map(act => {
              const pairedPartnerObj = partners.find(p => p.id === act.parceiroId);
              const totalEligible = act.membrosElegiveis?.length ?? collaborators.filter(c => c.email.toLowerCase() !== 'info@allangle.com.br').length;

              return (
                <div 
                  key={act.id} 
                  style={{ borderLeft: `8px solid ${act.corTag || '#3b82f6'}` }}
                  className="bg-white rounded-3xl border border-l-0 border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  
                  {/* Category Title Header */}
                  <div className="p-6 space-y-4 pb-1">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        {act.corTag && (
                          <span className="w-4 h-4 rounded-xl border border-white shadow-sm shrink-0 block" style={{ backgroundColor: act.corTag }} />
                        )}
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm uppercase leading-none">{act.nomeAtividade}</span>
                          <span className="text-[9px] uppercase font-bold text-indigo-600 tracking-wider block bg-indigo-50 w-max px-2 py-0.5 rounded-md mt-1.5">
                            {act.comissoesCustomizadas?.length || 0} regras editadas
                          </span>
                        </div>
                      </div>
                    </div>

                    {act.descricao && (
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed normal-case select-none">{act.descricao}</p>
                    )}

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      {/* Badge: Partnership status */}
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                        <span className="text-slate-500 tracking-wider">Status de Parceria:</span>
                        {pairedPartnerObj ? (
                          <span className="text-emerald-800 bg-emerald-50 border border-emerald-250 px-2.5 py-1 rounded-xl flex items-center gap-1 font-extrabold text-[9px]">
                            <HeartHandshake className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            Com parceiro exclusivo ({pairedPartnerObj.nomeParceiro})
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 border border-amber-250 px-2.5 py-1 rounded-xl flex items-center gap-1 font-extrabold text-[9px]">
                            Sem parceiro exclusivo
                          </span>
                        )}
                      </div>

                      {/* Badge: Team credential */}
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold border-t border-slate-100 pt-2.5">
                        <span className="text-slate-500 tracking-wider">Autorização de equipe:</span>
                        <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl font-extrabold text-[9px]">
                          Equipe vinculada ({totalEligible} habilitados)
                        </span>
                      </div>

                      {/* Badge: Custom split regulations active status indicator */}
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold border-t border-slate-100 pt-2.5">
                        <span className="text-slate-500 tracking-wider">Comissão Customizada:</span>
                        {act.comissoesCustomizadas && act.comissoesCustomizadas.length > 0 ? (
                          <span className="text-purple-800 bg-purple-50 border border-purple-250 px-2.5 py-1 rounded-xl font-extrabold text-[9px]">
                            Regras de repasse ({act.comissoesCustomizadas.length} ativas)
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-extrabold text-[9px]">
                            Sem comissão cadastrada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar Footer (STARK HIGHLIGHT INTERFACE CONSTRAST) */}
                  <div className="bg-slate-50/55 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={() => handleOpenEditModal(act)}
                      className="text-xs font-black text-slate-705 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200/80 px-3 py-2 rounded-xl transition cursor-pointer text-[10px]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      EDITAR COMPOSIÇÃO
                    </button>

                    <button
                      onClick={() => setConfiguringActivityId(act.id)}
                      className="text-xs font-black text-slate-90 flex items-center gap-1.5 bg-[#0e2438] hover:bg-[#1c3a5a] text-white px-4 py-2 rounded-xl active:scale-95 transition cursor-pointer text-[10px]"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      REGRAS DE REPASSE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ACTIVITY MODAL via portal */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
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
                {/* Absolute CloseButton */}
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)} 
                  className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all cursor-pointer text-white focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">
                    {editingActivity ? 'Editar Atividade Operacional' : 'Criar Atividade Operacional'}
                  </h2>
                  <p className="text-xs text-white/40 font-bold mt-1.5 uppercase tracking-widest">
                    Mapeamento Logístico, Split de Parcerias e Restrições de Lançamento
                  </p>
                </div>

                <form onSubmit={handleCreateActivity} className="space-y-6">
                  
                  {/* Two-Column Responsive Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* FIELD: Nome da Atividade */}
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">NOME DA ATIVIDADE</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Passeio de Lancha, Trilha, Mergulho..."
                        value={nomeAtividade}
                        onChange={(e) => setNomeAtividade(e.target.value)}
                        className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-bold text-xs"
                      />
                    </div>

                    {/* FIELD: Pre-linked Partner Commercial Split Dropdown */}
                    <div className="col-span-1 space-y-1.5 font-bold">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">PARCEIRO INDICAÇÃO EXCLUSIVO (OPCIONAL)</label>
                      <select
                        value={parceiroId}
                        onChange={(e) => setParceiroId(e.target.value)}
                        className="w-full bg-slate-900 p-4 border border-white/10 rounded-2xl text-white font-extrabold focus:outline-none text-xs"
                      >
                        <option value="" className="bg-slate-900 text-white">-- SEM CANAL FIXO (ROTATIVO / EM CAMPO) --</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.nomeParceiro.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>



                    {/* FIELD: Description */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">DESCRIÇÃO OPERACIONAL</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Passeio náutico operado em bacia fechada guiado por instrutor dedicado..."
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="w-full bg-white/5 p-4 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-white/20 font-semibold text-xs leading-relaxed"
                      />
                    </div>

                    {/* FIELD: Visual Color Tag Selector */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase block tracking-wider pl-2">COR DE CATEGORIZAÇÃO VISUAL</label>
                      <div className="flex flex-wrap gap-2.5 items-center bg-white/5 border border-white/10 p-4 rounded-2xl">
                        {colorPalette.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setCorTag(color)}
                            className="w-7 h-7 rounded-full relative transition hover:scale-110 active:scale-95 border border-white/10 shrink-0 cursor-pointer"
                            style={{ backgroundColor: color }}
                          >
                            {corTag === color && (
                              <span className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-full font-black text-[12px] text-white">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* FIELD: Eligibility Access Matrix Multi-select checklist */}
                    <div className="col-span-2 space-y-2 bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                        <Users className="w-4.5 h-4.5 text-indigo-400" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">MATRIZ DE ELEGIBILIDADE DE TEAMS</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-normal font-semibold mb-4">
                        Selecione exclusivamente quais fotógrafos / colaboradores estão devidamente credenciados para realizar e performar esta atividade de campo:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {collaborators
                          .filter(c => c.email.toLowerCase() !== 'info@allangle.com.br')
                          .map(collab => {
                            const isEligible = membrosElegiveis.includes(collab.id);
                            return (
                              <button
                                type="button"
                                key={collab.id}
                                onClick={() => toggleEligibility(collab.id)}
                                className={`p-3 rounded-xl border flex items-center justify-between text-left transition text-xs font-bold ${
                                  isEligible 
                                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200' 
                                    : 'bg-white/5 border-white/10 text-white/70 hover:opacity-85'
                                }`}
                              >
                                <span>{collab.nomeCompleto}</span>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                  isEligible ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20'
                                }`}>
                                  {isEligible && <Check className="w-3.5 h-3.5" />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      type="submit"
                      className="w-full bg-white text-slate-950 py-4 rounded-3xl font-bold text-sm tracking-wider uppercase hover:bg-slate-100 transition duration-150 cursor-pointer text-center"
                    >
                      {editingActivity ? 'Salvar Modificações' : 'Cadastrar Atividade'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white/80 py-3.5 rounded-3xl font-bold text-xs tracking-wider uppercase transition duration-150 cursor-pointer text-center"
                    >
                      Fechar
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* FLOATING COMMISSIONS AND RULES CONFIG MODAL via portal */}
      {createPortal(
        <AnimatePresence>
          {configuringActivityId && (() => {
            const act = activities.find(a => a.id === configuringActivityId);
            if (!act) return null;

            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
                <motion.div
                  className="absolute inset-0 bg-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfiguringActivityId(null)}
                />

                <motion.div
                  className="relative w-full max-w-4xl bg-slate-950 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col text-white"
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 20, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.45 }}
                >
                  {/* Close button */}
                  <button 
                    type="button"
                    onClick={() => setConfiguringActivityId(null)} 
                    className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition cursor-pointer text-white focus:outline-none"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Header info */}
                  <div className="mb-6">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block mb-1">Repasses & Split de Vendas</span>
                    <h2 className="text-xl font-bold uppercase tracking-wider">{act.nomeAtividade}</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase mt-1">Configuração de WhatsApp de Entrega e Comissões Exclusivas</p>
                  </div>

                  <div className="space-y-6">
                    
                    {/* SECTOR 1: WhatsApp automated template */}
                    <div className="space-y-2 bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <div className="flex items-center gap-1.5 font-extrabold text-white/80 uppercase text-[10px] tracking-wider mb-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>Mensagem Automatizada do WhatsApp (Notificação)</span>
                      </div>
                      
                      <textarea
                        rows={3}
                        value={act.whatsappTemplate}
                        onChange={(e) => handleSaveTemplate(act.id, e.target.value)}
                        placeholder="Escreva a mensagem para o WhatsApp..."
                        className="w-full bg-slate-900 border border-white/10 p-3.5 rounded-xl text-white focus:outline-none focus:border-white/20 font-bold text-xs select-all mt-1 leading-relaxed"
                      />
                      
                      {/* Placeholders */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[9px] text-white/40 font-extrabold uppercase">
                        <span>Hashtags Dinâmicas do Cliente:</span>
                        <code className="bg-white/5 px-2 py-0.5 rounded text-indigo-350 font-mono lower-case leading-none">{`{nome}`}</code>
                        <code className="bg-white/5 px-2 py-0.5 rounded text-indigo-350 font-mono lower-case leading-none">{`{pousada}`}</code>
                        <code className="bg-white/5 px-2 py-0.5 rounded text-indigo-350 font-mono lower-case leading-none">{`{resumo_compra}`}</code>
                      </div>
                    </div>

                    {/* SECTOR 2: Custom commissions overrides */}
                    <div className="space-y-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="font-extrabold uppercase text-[10px] tracking-wider">Regras de Comissionamento Customizado</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
                        Adicione perfis com taxas de repasse editadas exclusivamente para a atividade de <strong>{act.nomeAtividade}</strong>. Se não houver regra cadastrada, nenhuma comissão será aplicada.
                      </p>

                      {/* Inline Adding form with plaintext input (NO numeric arrow spinners) */}
                      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-white">
                        <div className="space-y-1.5 sm:col-span-1">
                          <label className="text-[9px] uppercase font-black text-white/40 block">TIPO ALVO</label>
                          <select
                            value={comTargetTipo}
                            onChange={(e) => {
                              setComTargetTipo(e.target.value as any);
                              setComTargetAlvoId('');
                            }}
                            className="w-full bg-[#1e293b] p-2.5 border border-white/10 rounded-xl text-white font-extrabold select-none cursor-pointer text-xs focus:outline-none"
                          >
                            <option value="vendedor" className="bg-[#1e293b] text-white block">Equipe (Staff/Vendedor)</option>
                            <option value="parceiro" className="bg-[#1e293b] text-white block">Parceria (Pousada/Indicação)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[9px] uppercase font-black text-white/40 block">SELECIONAR INTEGRANTE / PARCEIRO</label>
                          <select
                            value={comTargetAlvoId}
                            onChange={(e) => setComTargetAlvoId(e.target.value)}
                            className="w-full bg-[#1e295b] p-2.5 border border-white/10 rounded-xl text-white font-extrabold select-none cursor-pointer text-xs focus:outline-none"
                          >
                            <option value="" className="text-white bg-[#1e295b]">-- Escolha o Integrante --</option>
                            {comTargetTipo === 'vendedor' 
                              ? collaborators
                                  .filter(c => c.email.toLowerCase() !== 'info@allangle.com.br')
                                  .map(c => <option key={c.id} value={c.id} className="text-white bg-[#1e295b]">{c.nomeCompleto.toUpperCase()} [Equipe]</option>)
                              : partners.map(p => <option key={p.id} value={p.id} className="text-white bg-[#1e295b]">{p.nomeParceiro.toUpperCase()} [Parceiro]</option>)
                            }
                          </select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                          <label className="text-[9px] uppercase font-black text-white/40 block">TAXA REPASSE (%)</label>
                          <div className="flex items-center gap-2">
                            {/* Plain text value input field specifically replaces arrows spinners with typography */}
                            <input
                              type="text"
                              value={comTargetTaxa}
                              onChange={(e) => setComTargetTaxa(e.target.value.replace(/[^0-9.]/g, ''))}
                              className="w-full bg-white/5 border border-white/10 p-2 text-center font-black text-white rounded-xl focus:outline-none font-mono text-sm leading-none"
                              placeholder="e.g. 15"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddCustomCommissionLine(act.id)}
                              className="bg-white text-slate-950 font-bold p-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                              title="Adicionar Regra"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Overrides rows active */}
                      <div className="space-y-2 text-xs">
                        <label className="text-[9px] uppercase font-black text-white/40 block">REGRAS ATIVAS ({act.comissoesCustomizadas?.length || 0})</label>
                        {(!act.comissoesCustomizadas || act.comissoesCustomizadas.length === 0) ? (
                          <div className="text-center py-6 text-white/40 border border-white/10 border-dashed rounded-xl font-bold">
                            Nenhuma regra de split customizada salva nesta atividade.
                          </div>
                        ) : (
                          <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5 font-semibold text-white">
                            {act.comissoesCustomizadas.map((line, ix) => {
                              const targetName = line.tipo === 'vendedor'
                                ? collaborators.find(c => c.id === line.alvoId)?.nomeCompleto
                                : partners.find(p => p.id === line.alvoId)?.nomeParceiro;

                              return (
                                <div key={ix} className="p-3.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[8px] uppercase font-black text-indigo-300 block bg-indigo-950 border border-indigo-900 w-max px-2 py-0.5 rounded leading-none">
                                      {line.tipo === 'vendedor' ? 'VENDEDOR' : 'PARCEIRO'}
                                    </span>
                                    <span className="font-extrabold text-white mt-1.5 block">{targetName || 'Não Identificado'}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-black text-white border border-white/10 px-3 py-1.5 bg-white/5 rounded-xl">{line.taxa}% comissão</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomCommissionLine(act.id, line.alvoId)}
                                      className="text-rose-400 hover:bg-rose-950 hover:text-rose-200 p-2 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-900"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Close trigger */}
                  <button
                    type="button"
                    onClick={() => setConfiguringActivityId(null)}
                    className="w-full bg-white text-slate-950 py-4.5 rounded-3xl font-bold mt-6 tracking-wide text-xs uppercase hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Confirmar e Fechar Configurações
                  </button>

                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
