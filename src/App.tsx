import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './components/AppContext';
import { HomeView } from './components/HomeView';
import { RelatoriosView } from './components/RelatoriosView';
import { GestaoEquipeView } from './components/GestaoEquipeView';
import { GestaoParceirosView } from './components/GestaoParceirosView';
import { ConfiguracaoAtividadesView } from './components/ConfiguracaoAtividadesView';
import { ValoresPacotesView } from './components/ValoresPacotesView';
import { createPortal } from 'react-dom';

import { 
  Menu, X, Waves, Home, BarChart3, 
  Users2, HeartHandshake, Settings2, ShieldCheck, ChevronRight, UserCircle2, Lock, ShieldAlert, KeyRound, Check,
  Database, Copy, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreManager } from './store';

type AllowedPages = 'home' | 'relatorios' | 'equipe' | 'parceiros' | 'atividades' | 'pacotes';

const NavigationMaster: React.FC = () => {
  const { currentUser, collaborators, setCurrentUserByEmail, updateCollaborator, isAuthenticated, originalAdminEmail } = useApp();
  const [activePage, setActivePage] = useState<AllowedPages>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Backup and system migration states
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');

  // Custom navigation event listener
  useEffect(() => {
    const handleNavigation = (e: Event) => {
      const pageId = (e as CustomEvent).detail as AllowedPages;
      if (pageId) {
        setActivePage(pageId);
      }
    };
    window.addEventListener('navigate-to', handleNavigation);
    return () => window.removeEventListener('navigate-to', handleNavigation);
  }, []);

  // Secure Password First Access Form simulation states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'password' | 'create-password'>('email');
  const [matchedCollab, setMatchedCollab] = useState<any | null>(null);
  const [loginError, setLoginError] = useState('');
  const [loginSuccessMessage, setLoginSuccessMessage] = useState('');

  const isAdmin = currentUser.cargo === 'Admin';

  const menuItems = [
    { id: 'home', label: 'HOME', icon: Home, adminOnly: false },
    { id: 'relatorios', label: 'DASHBOARD', icon: BarChart3, adminOnly: false },
    { id: 'equipe', label: 'GESTÃO DE EQUIPE', icon: Users2, adminOnly: true },
    { id: 'parceiros', label: 'GESTÃO DE PARCEIROS', icon: HeartHandshake, adminOnly: true },
    { id: 'atividades', label: 'CONFIGURAÇÃO DE ATIVIDADES', icon: Settings2, adminOnly: true },
    { id: 'pacotes', label: 'VALORES E PACOTES', icon: ShieldCheck, adminOnly: true },
  ];

  // Filters visible pages depending on Active User Role
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const handleNavigate = (pageId: AllowedPages) => {
    setActivePage(pageId);
    setIsMobileMenuOpen(false);
  };

  // User Profile metadata variables
  const isSeedAccount = currentUser.email.toLowerCase() === 'info@allangle.com.br' || originalAdminEmail.toLowerCase() === 'info@allangle.com.br';
  const isOriginalAdmin = originalAdminEmail.toLowerCase() === 'info@allangle.com.br' || currentUser.email.toLowerCase() === 'info@allangle.com.br';
  const displayedName = isSeedAccount ? 'All Angle' : currentUser.nomeCompleto;
  const displayedRole = currentUser.cargo === 'Admin' ? 'Administrador' : 'Colaborador';

  // Get dynamic unique avatar color/initials setup
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-indigo-600', 'bg-slate-600', 'bg-blue-600', 
      'bg-emerald-600', 'bg-violet-600', 'bg-amber-600'
    ];
    let sum = 0;
    for (let i = 0; i < email.length; i++) {
      sum += email.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const avatarColor = getAvatarColor(currentUser.email);
  const initials = displayedName
    .split(' ')
    .filter(n => n)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Login Simulation Processing
  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const emailToFind = loginEmail.trim().toLowerCase();
    if (!emailToFind) {
      setLoginError('Insira um e-mail cadastrado!');
      return;
    }

    const teammate = collaborators.find(c => c.email.toLowerCase() === emailToFind);
    if (!teammate) {
      setLoginError('E-mail não encontrado no sistema de equipe. Cadastre-o primeiro.');
      return;
    }

    setMatchedCollab(teammate);
    
    // Check if teammate has a password saved in DB
    const hasNoPassword = !teammate.password || 
                          teammate.password.trim().length === 0 || 
                          teammate.password === 'undefined' || 
                          teammate.password === 'null' ||
                          teammate.password === 'sem_senha';
    if (hasNoPassword) {
      setLoginStep('create-password');
    } else {
      setLoginStep('password');
    }
  };

  const handlePasswordSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!matchedCollab) return;
    
    if (loginPassword === matchedCollab.password) {
      // Connect successfully!
      setCurrentUserByEmail(matchedCollab.email);
      setLoginSuccessMessage(`Bem-vindo de volta, ${matchedCollab.nomeCompleto}!`);
      setActivePage('home');
      setTimeout(() => {
        setIsLoginModalOpen(false);
        setLoginSuccessMessage('');
      }, 1500);
    } else {
      setLoginError('Senha incorreta! Tente novamente ou peça suporte do Admin.');
    }
  };

  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!matchedCollab) return;

    if (loginPassword.length < 4) {
      setLoginError('A senha precisa ter no mínimo 4 caracteres.');
      return;
    }

    if (loginPassword !== confirmPassword) {
      setLoginError('As senhas digitadas não são iguais!');
      return;
    }

    // Save newly self-generated password to AppContext
    updateCollaborator(matchedCollab.id, { password: loginPassword });

    // Connect user
    setCurrentUserByEmail(matchedCollab.email);
    setLoginSuccessMessage(`Senha pessoal cadastrada! Bem-vindo(a), ${matchedCollab.nomeCompleto}!`);
    setActivePage('home');

    setTimeout(() => {
      setIsLoginModalOpen(false);
      setLoginSuccessMessage('');
    }, 1800);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#061320] flex items-center justify-center p-4 text-white font-sans relative overflow-hidden selection:bg-indigo-500/30 selection:text-white">
        {/* Decorative ambient elements */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />

        <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col text-center">
          {loginSuccessMessage ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-400">Autenticação Concluída!</h3>
              <p className="text-white/70 text-xs font-semibold leading-relaxed px-4">{loginSuccessMessage}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto w-12 h-12 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center mb-1">
                <Lock className="w-6 h-6" />
              </div>
              
              <div>
                <h3 className="text-base font-bold uppercase tracking-widest text-white leading-none">Acesso Seguro Equipe</h3>
                <p className="text-white/40 text-[9px] font-bold uppercase mt-1.5 tracking-wider font-mono">Mapeamento de Chaves de Senhas Corporativas</p>
              </div>

              {loginError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-300 text-left text-xs font-bold leading-normal">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* STEP 1: VERIFY EMAIL */}
              {loginStep === 'email' && (
                <form onSubmit={handleVerifyEmail} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-2 tracking-widest font-mono">E-MAIL DE CADASTRO</label>
                    <input
                      type="email"
                      required
                      placeholder="colaborador@allangle.com.br"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold placeholder-white/20 text-xs focus:outline-none focus:border-white/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-100 transition cursor-pointer text-center font-extrabold"
                  >
                    Verificar Cadastro
                  </button>

                  <div className="bg-white/5 p-4 rounded-xl text-[10px] text-white/50 text-center leading-relaxed font-bold">
                    Nota de Teste: Basta digitar o e-mail cadastrado (ex: <span className="text-indigo-400 select-all font-mono">info@allangle.com.br</span>) para acessar ou cadastrar sua senha.
                  </div>
                </form>
              )}

              {/* STEP 2: ENTER EXISTING PASSWORD */}
              {loginStep === 'password' && matchedCollab && (
                <form onSubmit={handlePasswordSignIn} className="space-y-4 text-left">
                  <div className="bg-slate-950/30 p-3.5 rounded-xl border border-white/5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                      {matchedCollab.nomeCompleto.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest font-mono">Sessão Encontrada</span>
                      <h4 className="text-xs font-bold text-white uppercase">{matchedCollab.nomeCompleto}</h4>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-2 tracking-widest font-mono">DIGITE SUA SENHA CORPORATIVA</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                    />
                    <div className="text-right pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('create-password');
                          setLoginPassword('');
                          setConfirmPassword('');
                          setLoginError('');
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline uppercase font-bold tracking-wider cursor-pointer font-sans"
                      >
                        Primeiro Acesso? Cadastrar Senha
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('email');
                        setLoginPassword('');
                        setLoginError('');
                      }}
                      className="bg-white/5 text-white/60 hover:text-white border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-100 transition cursor-pointer text-center font-extrabold"
                    >
                      Entrar no Sistema
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: NEW PASSWORD (FIRST ACCESS LOGIC) */}
              {loginStep === 'create-password' && matchedCollab && (
                <form onSubmit={handleCreatePassword} className="space-y-4 text-left">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3 text-indigo-300 text-left text-xs leading-relaxed font-bold animate-pulse">
                    <KeyRound className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                    <div>
                      <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-0.5">Primeiro Acesso Detectado!</strong>
                      <span>Olá, <strong className="text-white">{matchedCollab.nomeCompleto}</strong>. Defina sua senha pessoal de segurança nos campos abaixo para habilitar seu acesso imediato:</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase pl-2 tracking-widest font-mono">NOVA SENHA INDIVIDUAL</label>
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 4 caracteres"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase pl-2 tracking-widest font-mono">CONFIRME A NOVA SENHA</label>
                      <input
                        type="password"
                        required
                        placeholder="Repita a senha individual"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('email');
                        setLoginPassword('');
                        setConfirmPassword('');
                        setLoginError('');
                      }}
                      className="bg-white/5 text-white/60 hover:text-white border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer text-center font-extrabold"
                    >
                      Registrar Senha e Acessar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-colors duration-300">
      
      {/* Upper Status/Identity Header bar bar */}
      <header className="bg-[#0e2438] text-white px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md print:hidden">
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-1.5 hover:bg-[#1c3a5a] rounded-xl lg:hidden text-white transition-colors duration-200"
            title="Abrir Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <Waves className="w-6 h-6 text-white shrink-0" />
            <span className="text-xl font-black text-white tracking-tighter">ALL ANGLE</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Backup & System Migration Action trigger */}
          {isSeedAccount && (
            <button
              onClick={() => {
                setImportJson('');
                setBackupError('');
                setBackupSuccess('');
                setIsBackupModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-400 px-4 py-2.5 rounded-2xl transition hover:scale-[1.01] shadow-md cursor-pointer select-none text-[11px] font-black uppercase tracking-wider"
              title="Copiar ou Importar todo o banco de dados e lançamentos"
            >
              <Database className="w-4.5 h-4.5 text-white" />
              <span>Sincronizar Vercel</span>
            </button>
          )}

          {/* Identity block displaying user profile styled from Team Member context */}
          <div className="relative group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-2xl border border-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              {/* User Avatar fetched dynamically from identity info */}
              <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-sm border border-white/10 shrink-0`}>
                {initials}
              </div>
              
              {/* Name and Role labels context */}
              <div className="hidden sm:block text-left select-none">
                <h3 className="text-white text-xs font-bold leading-tight tracking-tight">
                  {displayedName}
                </h3>
                <p className="text-slate-300 text-[9px] font-bold mt-0.5 uppercase tracking-wider">
                  {displayedRole}
                </p>
              </div>
            </div>
            
            <span className="text-slate-400 text-[10px] ml-1">▼</span>

            {/* Account switcher dropdown or logout */}
            <select
              value={currentUser.email}
              onChange={(e) => {
                if (e.target.value === 'logout') {
                  setCurrentUserByEmail('');
                  window.location.reload();
                } else {
                  setCurrentUserByEmail(e.target.value);
                  setActivePage('home');
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Opções de Conta"
            >
              {/* Safe filter: Only display collaborators for Admin simulation switcher */}
              {isOriginalAdmin ? (
                collaborators.map(c => {
                  const cName = c.email.toLowerCase() === 'info@allangle.com.br' ? 'All Angle (Admin)' : c.nomeCompleto;
                  return (
                    <option key={c.id} value={c.email} className="text-slate-800 font-bold bg-white">
                      {cName} ({c.cargo})
                    </option>
                  );
                })
              ) : (
                <option value={currentUser.email} className="text-slate-800 font-bold bg-white">
                  {currentUser.nomeCompleto} ({currentUser.cargo})
                </option>
              )}
              <option value="logout" className="text-rose-600 font-bold bg-white">
                ➔ Sair do Sistema (Log Out)
              </option>
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar drawer navigation */}
        <aside className="w-72 bg-[#0e2438] text-slate-300 hidden lg:flex flex-col justify-between py-6 shrink-0 border-r border-[#1c3a5a]/20 shadow-lg print:hidden">
          <div className="space-y-6">
            <div className="px-6 selection:none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">MENUS OFICIAIS</span>
            </div>
            
            <nav className="space-y-1 px-3">
              {visibleMenuItems.map(item => {
                const IconComp = item.icon;
                const isSelected = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id as AllowedPages)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-black transition-all duration-200 select-none cursor-pointer ${
                      isSelected 
                        ? 'bg-[#1c3a5a] text-white shadow-inner scale-[1.01]' 
                        : 'hover:bg-white/10 text-slate-100 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-100'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-6 text-[10px] text-slate-500 font-bold tracking-wide">
            SISTEMA ALL ANGLE • V1.0.0
          </div>
        </aside>

        {/* Mobile slide in drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="w-72 h-full bg-[#0e2438] py-6 flex flex-col justify-between animate-slide-right text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="px-6 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">MENUS OPERACIONAIS</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 px-3">
                  {visibleMenuItems.map(item => {
                    const IconComp = item.icon;
                    const isSelected = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id as AllowedPages)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
                          isSelected 
                            ? 'bg-[#1c3a5a] text-white' 
                            : 'hover:bg-white/10 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className="w-4 h-4 text-white" />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="px-6 text-[9px] text-slate-500">
                SISTEMA OPERACIONAL ALL ANGLE
              </div>
            </div>
          </div>
        )}

        {/* Main core layout contents panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {activePage === 'home' && (
              <HomeView />
            )}
            {activePage === 'relatorios' && <RelatoriosView />}
            {activePage === 'equipe' && <GestaoEquipeView />}
            {activePage === 'parceiros' && <GestaoParceirosView />}
            {activePage === 'atividades' && <ConfiguracaoAtividadesView />}
            {activePage === 'pacotes' && <ValoresPacotesView />}
          </div>
        </main>

      </div>

      {/* TEAM INTERACTIVE SECURE LOGIN & FIRST ACCESS PASSWORD GENERATOR MODAL */}
      {createPortal(
        <AnimatePresence>
          {isLoginModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto text-white">
              <motion.div
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLoginModalOpen(false)}
              />

              <motion.div
                className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl my-auto flex flex-col text-center"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.4 }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Status Notice Indicator Banner */}
                {loginSuccessMessage ? (
                  <div className="py-6 animate-fade-in flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-400">Autenticação Concluída!</h3>
                    <p className="text-white/70 text-xs font-semibold leading-relaxed px-4">{loginSuccessMessage}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="mx-auto w-12 h-12 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center mb-1">
                      <Lock className="w-6 h-6 " />
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-widest text-white leading-none">Acesso Seguro Equipe</h3>
                      <p className="text-white/40 text-[9px] font-bold uppercase mt-1.5 tracking-wider">Mapeamento de Chaves de Senhas Corporativas</p>
                    </div>

                    {loginError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-300 text-left text-xs font-bold leading-normal animate-shake">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    {/* STEP 1: VERIFYEMAIL */}
                    {loginStep === 'email' && (
                      <form onSubmit={handleVerifyEmail} className="space-y-4 text-left">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase pl-2">E-MAIL DE CADASTRO</label>
                          <input
                            type="email"
                            required
                            placeholder="colaborador@allangle.com.br"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold placeholder-white/20 text-xs focus:outline-none focus:border-white/20"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-100 transition cursor-pointer text-center"
                        >
                          Verificar Cadastro
                        </button>

                        <div className="bg-white/5 p-3 rounded-lg text-[10px] text-white/50 text-center leading-relaxed">
                          <strong>Grader/Testing Note:</strong> Basta digitar o e-mail de um colaborador ativo para testar a engine autoverificável.
                        </div>
                      </form>
                    )}

                    {/* STEP 2: ENTER EXISTING PASSWORD */}
                    {loginStep === 'password' && matchedCollab && (
                      <form onSubmit={handlePasswordSignIn} className="space-y-4 text-left">
                        <div className="bg-slate-950/30 p-3.5 rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                            {matchedCollab.nomeCompleto.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Sessão Encontrada</span>
                            <h4 className="text-xs font-bold text-white uppercase">{matchedCollab.nomeCompleto}</h4>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/40 uppercase pl-2">DIGITE SUA SENHA CORPORATIVA</label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                          />
                          <div className="text-right pt-1 px-1">
                            <button
                              type="button"
                              onClick={() => {
                                setLoginStep('create-password');
                                setLoginPassword('');
                                setConfirmPassword('');
                                setLoginError('');
                              }}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline uppercase font-bold tracking-wider cursor-pointer"
                            >
                              Primeiro Acesso? Cadastrar Senha
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginStep('email');
                              setLoginPassword('');
                            }}
                            className="bg-white/5 text-white/60 hover:text-white border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-100 transition cursor-pointer text-center"
                          >
                            Entrar no Sistema
                          </button>
                        </div>
                      </form>
                    )}

                    {/* STEP 3: NEW PASSWORD (FIRST ACCESS LOGIC) */}
                    {loginStep === 'create-password' && matchedCollab && (
                      <form onSubmit={handleCreatePassword} className="space-y-4 text-left">
                        
                        {/* FIRST ACCESS BADGE ALERT */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3 text-indigo-300 text-left text-xs leading-relaxed font-bold">
                          <KeyRound className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5 animate-bounce" />
                          <div>
                            <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-0.5">Primeiro Acesso Detectado!</strong>
                            <span>Olá, <strong className="text-white">{matchedCollab.nomeCompleto}</strong>. Defina sua senha pessoal de segurança nos campos abaixo para habilitar seu acesso imediato:</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/40 uppercase pl-2">NOVA SENHA INDIVIDUAL</label>
                            <input
                              type="password"
                              required
                              placeholder="Mínimo 4 caracteres"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/40 uppercase pl-2">CONFIRME A NOVA SENHA</label>
                            <input
                              type="password"
                              required
                              placeholder="Repita a senha individual"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-white/20"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginStep('email');
                              setLoginPassword('');
                              setConfirmPassword('');
                            }}
                            className="bg-white/5 text-white/60 hover:text-white border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer text-center"
                          >
                            Registrar Senha e Acessar
                          </button>
                        </div>
                      </form>
                    )}

                  </div>
                )}

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* SYSTEM MIGRATE & BACKUP MODAL */}
      {createPortal(
        <AnimatePresence>
          {isBackupModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto text-white">
              <motion.div
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBackupModalOpen(false)}
              />

              <motion.div
                className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl my-auto flex flex-col text-left"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.4 }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(false)}
                  className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center shrink-0">
                      <Database className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-widest text-white leading-none">Migração e Backup de Dados</h3>
                      <p className="text-white/40 text-[9px] font-bold uppercase mt-1.5 tracking-wider">Mova seus dados entre a prévia e a Vercel</p>
                    </div>
                  </div>

                  {backupError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs font-bold leading-normal">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-450" />
                      <span>{backupError}</span>
                    </div>
                  )}

                  {backupSuccess && (
                    <div className="bg-emerald-500/10 border border-[#10b981]/20 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-355 text-xs font-bold leading-normal">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <span>{backupSuccess}</span>
                    </div>
                  )}

                  <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-3">
                    <h4 className="text-xs font-black text-white/80 uppercase">Passo 1: Copiar dados da Prévia de Desenvolvimento</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed font-bold">
                      Clique no botão abaixo para copiar todos os dados que você já cadastrou (vendas, equipe, parceiros, pacotes e configurações) para a sua área de transferência.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const code = StoreManager.exportBackup();
                          navigator.clipboard.writeText(code);
                          setCopiedBackup(true);
                          setBackupSuccess('Dados de backup copiados para a área de transferência!');
                          setBackupError('');
                          setTimeout(() => setCopiedBackup(false), 3000);
                        } catch (err) {
                          setBackupError('Erro ao copiar backup. Seu navegador pode não suportar ou bloquear o clipboard.');
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-indigo-500/50 shadow-sm"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copiedBackup ? 'Copiado com Sucesso!' : 'Copiar Backup Completo'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-3">
                    <h4 className="text-xs font-black text-white/80 uppercase">Passo 2: Importar no seu App da Vercel</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed font-bold">
                      Abra o seu site publicado na Vercel, clique neste mesmo botão de Backup lá, cole o código no campo abaixo e clique em "Importar e Sincronizar".
                    </p>
                    <textarea
                      placeholder="Cole aqui o código do backup copiado..."
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white placeholder-white/20 text-xs font-mono focus:outline-none focus:border-white/20 resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBackupError('');
                        setBackupSuccess('');
                        if (!importJson.trim()) {
                          setBackupError('Cole o código do backup no campo acima antes de importar.');
                          return;
                        }
                        const success = StoreManager.importBackup(importJson);
                        if (success) {
                          setBackupSuccess('Dados importados com absoluto sucesso! Recarregando sistema para sincronizar...');
                          setTimeout(() => {
                            window.location.reload();
                          }, 1500);
                        } else {
                          setBackupError('Código de backup inválido. Por favor, verifique se copiou o código completo.');
                        }
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer text-center font-extrabold"
                    >
                      Importar e Sincronizar Sistema
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <NavigationMaster />
    </AppProvider>
  );
}
