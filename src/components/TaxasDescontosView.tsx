import React, { useState } from 'react';
import { useApp } from './AppContext';
import { FeeRule } from '../types';
import { Plus, Trash2, Edit, X, Check, AlertTriangle, Percent, PiggyBank, Briefcase, Users, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const TaxasDescontosView: React.FC = () => {
  const { currentUser, feeRules, addFeeRule, updateFeeRule, deleteFeeRule, sales } = useApp();
  const isAdmin = currentUser.cargo === 'Admin';

  const [isOpen, setIsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [tipoDesconto, setTipoDesconto] = useState<'porcentagem' | 'fixo'>('porcentagem');
  const [aplicarAllAngle, setAplicarAllAngle] = useState(true);
  const [porcentagemAllAngle, setPorcentagemAllAngle] = useState('0.495');
  const [aplicarEquipe, setAplicarEquipe] = useState(true);
  const [porcentagemEquipe, setPorcentagemEquipe] = useState('0.495');
  const [observacao, setObservacao] = useState('');
  const [exibirApenasConsolidado, setExibirApenasConsolidado] = useState(false);
  const [valorConsolidadoRelatorio, setValorConsolidadoRelatorio] = useState('0');
  const [showArchived, setShowArchived] = useState(false);

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center gap-3 font-sans">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Acesso Restrito</h3>
          <p className="text-xs">Esta página é restrita a administradores da ALL ANGLE.</p>
        </div>
      </div>
    );
  }

  const handleOpenNew = () => {
    setNome('');
    setTipoDesconto('porcentagem');
    setAplicarAllAngle(true);
    setPorcentagemAllAngle('0.495');
    setAplicarEquipe(true);
    setPorcentagemEquipe('0.495');
    setObservacao('');
    setExibirApenasConsolidado(false);
    setValorConsolidadoRelatorio('0');
    setEditingRule(null);
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (rule: FeeRule) => {
    setNome(rule.nome);
    setTipoDesconto(rule.tipoDesconto || 'porcentagem');
    setAplicarAllAngle(rule.aplicarAllAngle);
    setPorcentagemAllAngle(rule.porcentagemAllAngle.toString());
    setAplicarEquipe(rule.aplicarEquipe);
    setPorcentagemEquipe(rule.porcentagemEquipe.toString());
    setObservacao(rule.observacao || '');
    setExibirApenasConsolidado(rule.exibirApenasConsolidado || false);
    setValorConsolidadoRelatorio(rule.valorConsolidadoRelatorio !== undefined ? rule.valorConsolidadoRelatorio.toString() : '0');
    setEditingRule(rule);
    setError(null);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('Por favor, informe o nome da taxa.');
      return;
    }

    const valRelatorio = exibirApenasConsolidado ? parseFloat(valorConsolidadoRelatorio) : 0;
    if (exibirApenasConsolidado && (isNaN(valRelatorio) || valRelatorio < 0)) {
      setError('Por favor, insira um valor fixo válido para o relatório.');
      return;
    }

    const pctAllAngle = (!exibirApenasConsolidado && aplicarAllAngle) ? parseFloat(porcentagemAllAngle) : 0;
    const pctEquipe = (!exibirApenasConsolidado && aplicarEquipe) ? parseFloat(porcentagemEquipe) : 0;

    if (!exibirApenasConsolidado) {
      if (aplicarAllAngle && (isNaN(pctAllAngle) || pctAllAngle < 0)) {
        setError(tipoDesconto === 'fixo' ? 'Por favor, insira um valor fixo válido para a All Angle.' : 'Por favor, insira uma porcentagem válida para a All Angle.');
        return;
      }

      if (aplicarEquipe && (isNaN(pctEquipe) || pctEquipe < 0)) {
        setError(tipoDesconto === 'fixo' ? 'Por favor, insira um valor fixo válido para a Equipe.' : 'Por favor, insira uma porcentagem válida para a Equipe.');
        return;
      }

      if (!aplicarAllAngle && !aplicarEquipe) {
        setError('A taxa precisa ser aplicada a pelo menos um dos grupos.');
        return;
      }
    }

    const payload = {
      nome: nome.trim(),
      tipoDesconto: exibirApenasConsolidado ? 'fixo' : tipoDesconto,
      aplicarAllAngle: exibirApenasConsolidado ? false : aplicarAllAngle,
      porcentagemAllAngle: pctAllAngle,
      aplicarEquipe: exibirApenasConsolidado ? false : aplicarEquipe,
      porcentagemEquipe: pctEquipe,
      observacao: observacao.trim() || undefined,
      exibirApenasConsolidado,
      valorConsolidadoRelatorio: exibirApenasConsolidado ? valRelatorio : undefined,
    };

    if (editingRule) {
      updateFeeRule(editingRule.id, payload);
    } else {
      addFeeRule(payload);
    }

    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    // Check if some sale is linked to this tax rule
    const inUse = sales.some(s => s.taxaId === id || (s.pagamentos && s.pagamentos.some(p => p.taxaId === id)));
    if (inUse) {
      // Automatically archive without window.confirm, as requested!
      updateFeeRule(id, { arquivado: true });
      setConfirmingDeleteId(null);
      return;
    }

    if (confirmingDeleteId === id) {
      deleteFeeRule(id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
    }
  };

  const activeRules = feeRules.filter(r => !r.arquivado);
  const archivedRules = feeRules.filter(r => r.arquivado);
  const displayedRules = showArchived ? archivedRules : activeRules;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            <span>Gestão de Taxas e Descontos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre e customize taxas administrativas (como gateway de pagamentos) e suas divisões de descontos.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition hover:scale-[1.01] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Nova Taxa / Desconto</span>
        </button>
      </div>

      {/* TABS FOR ACTIVE AND ARCHIVED */}
      <div className="flex gap-4 border-b border-slate-200 pb-px mb-4">
        <button
          onClick={() => setShowArchived(false)}
          className={`pb-2 px-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            !showArchived ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ativas ({activeRules.length})
        </button>
        {archivedRules.length > 0 && (
          <button
            onClick={() => setShowArchived(true)}
            className={`pb-2 px-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              showArchived ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Arquivadas ({archivedRules.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedRules.map(rule => (
          <div
            key={rule.id}
            className={`bg-white border ${rule.arquivado ? 'border-slate-200 opacity-75' : 'border-slate-200/80'} rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors`}
          >
            <div>
              <div className="flex justify-between items-start gap-4 mb-3">
                <h3 className="font-black text-base text-slate-900 tracking-tight">{rule.nome}</h3>
                <span className={`border font-mono font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  rule.arquivado 
                    ? 'bg-slate-50 border-slate-200 text-slate-500' 
                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                }`}>
                  {rule.arquivado ? 'Arquivada' : 'Ativa'}
                </span>
              </div>

              {rule.observacao && (
                <p className="text-slate-500 text-xs italic mb-3 line-clamp-2">
                  Obs: {rule.observacao}
                </p>
              )}

              {rule.exibirApenasConsolidado ? (
                <div className="space-y-2.5 my-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Valor Fixo do Relatório:</span>
                    <span className="font-mono font-black text-indigo-700 text-sm">
                      R$ {(rule.valorConsolidadoRelatorio || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 my-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>All Angle (Empresa):</span>
                    </div>
                    <span className="font-mono font-black text-slate-900">
                      {rule.aplicarAllAngle 
                        ? (rule.tipoDesconto === 'fixo' ? `R$ ${rule.porcentagemAllAngle.toFixed(2).replace('.', ',')}` : `${rule.porcentagemAllAngle}%`) 
                        : 'Não aplicado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Equipe (Membros):</span>
                    </div>
                    <span className="font-mono font-black text-slate-900">
                      {rule.aplicarEquipe 
                        ? (rule.tipoDesconto === 'fixo' ? `R$ ${rule.porcentagemEquipe.toFixed(2).replace('.', ',')}` : `${rule.porcentagemEquipe}%`) 
                        : 'Não aplicado'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-3.5 mt-2 flex-wrap">
              {rule.arquivado ? (
                <button
                  onClick={() => updateFeeRule(rule.id, { arquivado: false })}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition border border-indigo-200 cursor-pointer"
                >
                  Desarquivar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 rounded-xl transition cursor-pointer font-bold inline-flex items-center"
                    title="Editar taxa"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => updateFeeRule(rule.id, { arquivado: true })}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 border border-amber-700 text-white rounded-xl transition-all cursor-pointer font-black text-xs uppercase flex items-center gap-1.5"
                    title="Arquivar esta taxa para que ela não seja mais exibida nos novos lançamentos."
                  >
                    <Archive className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] text-white font-extrabold">Arquivar</span>
                  </button>

                  {(() => {
                    const isRuleInUse = sales.some(s => s.taxaId === rule.id || (s.pagamentos && s.pagamentos.some(p => p.taxaId === rule.id)));
                    if (!isRuleInUse) {
                      return (
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className={`px-3 py-1.5 border transition-all cursor-pointer rounded-xl font-black text-xs uppercase flex items-center gap-1.5 ${
                            confirmingDeleteId === rule.id
                              ? 'bg-red-900 hover:bg-red-950 border-red-950 text-white animate-pulse'
                              : 'bg-rose-700 hover:bg-rose-800 border-rose-800 text-white font-extrabold'
                          }`}
                          title={confirmingDeleteId === rule.id ? 'Confirmar exclusão definitiva?' : 'Excluir taxa permanentemente'}
                        >
                          {confirmingDeleteId === rule.id ? (
                            <span className="font-extrabold text-white">Confirmar?</span>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                              <span className="text-[10px] text-white font-extrabold">Excluir</span>
                            </>
                          )}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </div>
          </div>
        ))}

        {displayedRules.length === 0 && (
          <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 text-slate-400 py-16 text-center rounded-3xl">
            <PiggyBank className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">Nenhuma taxa encontrada</p>
            <p className="text-xs mt-1">Nenhuma taxa cadastrada nesta aba.</p>
          </div>
        )}
      </div>

      {/* PORTAL MODAL FOR CONFIGURING A FEE RULE */}
      {isOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto">
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2rem] p-6 shadow-2xl my-auto flex flex-col text-slate-800"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Percent className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {editingRule ? 'Editar Taxa / Desconto' : 'Nova Taxa / Desconto'}
                </h3>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-2xl text-xs mb-4 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block mb-1">
                    Nome da Taxa (ex: Alboom Pay) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="ex: Alboom Pay"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-xs font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block mb-1">
                    Observação / Descrição
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Anotações internas sobre esta taxa..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-xs h-16 resize-none font-sans"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exibirApenasConsolidado}
                      onChange={(e) => setExibirApenasConsolidado(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Exibir apenas no Demonstrativo Consolidado</span>
                  </label>
                </div>

                {exibirApenasConsolidado ? (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-wide block">
                      Valor Fixo do Relatório (R$) <span className="text-rose-500">*</span>
                    </span>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 pl-3">
                      <span className="text-xs font-black text-slate-400 uppercase font-sans">Valor:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorConsolidadoRelatorio}
                        onChange={(e) => setValorConsolidadoRelatorio(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-xs font-mono font-black text-slate-900 focus:ring-0 text-right"
                      />
                      <span className="text-xs font-bold text-slate-500 pr-1">R$</span>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold">
                      Este valor fixo não será deduzido de nenhum membro ou parceiro individualmente, servindo apenas para abater o Saldo Líquido Final para a All Angle.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block mb-1">
                        Tipo de Dedução / Desconto
                      </label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setTipoDesconto('porcentagem')}
                          className={`py-1.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                            tipoDesconto === 'porcentagem'
                              ? 'bg-indigo-600 text-white shadow-xs font-black'
                              : 'text-slate-500 hover:text-slate-800 font-bold'
                          }`}
                        >
                          Porcentagem (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoDesconto('fixo')}
                          className={`py-1.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                            tipoDesconto === 'fixo'
                              ? 'bg-indigo-600 text-white shadow-xs font-black'
                              : 'text-slate-500 hover:text-slate-800 font-bold'
                          }`}
                        >
                          Valor Fixo (R$)
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl space-y-4">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block border-b border-slate-100 pb-1.5 mb-2">
                        Regras de Dedução
                      </span>

                      {/* All Angle target config */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={aplicarAllAngle}
                              onChange={(e) => setAplicarAllAngle(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Deduzir da All Angle</span>
                          </label>
                        </div>

                        {aplicarAllAngle && (
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 pl-3">
                            <span className="text-xs font-black text-slate-400 uppercase font-sans">
                              {tipoDesconto === 'fixo' ? 'Valor Fixo:' : 'Porcentagem:'}
                            </span>
                            <input
                              type="number"
                              step="0.001"
                              value={porcentagemAllAngle}
                              onChange={(e) => setPorcentagemAllAngle(e.target.value)}
                              placeholder={tipoDesconto === 'fixo' ? '0,00' : '0.495'}
                              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-xs font-mono font-black text-slate-900 focus:ring-0 text-right"
                            />
                            <span className="text-xs font-bold text-slate-500 pr-1">
                              {tipoDesconto === 'fixo' ? 'R$' : '%'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Collaborator (Equipe) target config */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={aplicarEquipe}
                              onChange={(e) => setAplicarEquipe(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-700">Deduzir da Equipe (Membros)</span>
                          </label>
                        </div>

                        {aplicarEquipe && (
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 pl-3">
                            <span className="text-xs font-black text-slate-400 uppercase font-sans">
                              {tipoDesconto === 'fixo' ? 'Valor Fixo:' : 'Porcentagem:'}
                            </span>
                            <input
                              type="number"
                              step="0.001"
                              value={porcentagemEquipe}
                              onChange={(e) => setPorcentagemEquipe(e.target.value)}
                              placeholder={tipoDesconto === 'fixo' ? '0,00' : '0.495'}
                              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-xs font-mono font-black text-slate-900 focus:ring-0 text-right"
                            />
                            <span className="text-xs font-bold text-slate-500 pr-1">
                              {tipoDesconto === 'fixo' ? 'R$' : '%'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-xs transition hover:scale-[1.01] cursor-pointer"
                  >
                    Salvar Taxa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
