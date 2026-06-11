import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from './AppContext';
import { StoreManager } from '../store';
import { calculateCollaboratorCommission, calculatePartnerCommission } from '../utils/finance';
import { Sale, Collaborator, Partner, Activity, Package } from '../types';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Waves, Landmark, Users, Calendar, ArrowUpRight, DollarSign, 
  ChevronDown, ChevronUp, Smartphone, MapPin, User, Image, 
  Tag, MessageSquare, Activity as ActivityIcon, Briefcase, 
  Layers, Plus, Trash2, Edit, Save, X, Search, CheckCircle, 
  RefreshCw, SlidersHorizontal, AlertCircle, AlertTriangle,
  Database, Cloud, Download, Upload, ShieldAlert
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    currentUser, sales, collaborators, partners, activities, packages, paidCommissions,
    addSale, updateSale, deleteSale, addPartner, toggleRepassePaid,
    forcePushLocalToCloud, forcePullCloudToLocal, wipeAllSystemData
  } = useApp();

  const isAdmin = currentUser.cargo === 'Admin';
  
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
  
  // Date timeframe filters (defaults to current month and year dynamically)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-12
  const [isAnnualView, setIsAnnualView] = useState<boolean>(false);

  // Search & Active Subtabs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState<'lancamentos' | 'caixa' | 'equipe' | 'parceiros'>('lancamentos');

  // Launch Sales Modals state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [overrideLaunchDate, setOverrideLaunchDate] = useState<string | null>(null);

  // Selected sale details popup modal state ("CLICK-TO-VIEW")
  const [selectedSaleDetailId, setSelectedSaleDetailId] = useState<string | null>(null);

  // WhatsApp recovery message customized/editable state
  const [customWppMsg, setCustomWppMsg] = useState('');

  // Custom confirmation state variables to avoid iframe window.confirm() blockages
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingLaunchDelete, setIsConfirmingLaunchDelete] = useState(false);
  const [quickConfirmDeleteId, setQuickConfirmDeleteId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Advanced Cloud Synchronization panel states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'loading' | null, text: string }>({ type: null, text: '' });
  const [confirmSyncAction, setConfirmSyncAction] = useState<'push' | 'pull' | 'wipe' | null>(null);

  // In-launch partner creation state
  const [isAddNewPartnerModalOpen, setIsAddNewPartnerModalOpen] = useState(false);
  const [inLaunchPartnerName, setInLaunchPartnerName] = useState('');
  const [inLaunchPartnerWhatsapp, setInLaunchPartnerWhatsapp] = useState('');
  const [inLaunchPartnerCommission, setInLaunchPartnerCommission] = useState('10');

  // Form State inside Launch Modal
  const [formData, setFormData] = useState({
    data: '',
    nomeCliente: '',
    whatsapp: '',
    email: '',
    hospedagem: '',
    pessoas: '1',
    vendedorId: '',
    parceiroId: '',
    atividadeId: '',
    formaPagamento: '',
    status: 'Pendente',
    fotosEnviadas: '',
    fotosVendidas: '',
    descontoManual: '',
    notas: ''
  });

  // Shopping cart items inside the Launch Modal
  const [cartItems, setCartItems] = useState<Array<{
    pacoteId: string;
    nome: string;
    precoUnitario: number;
    subtotal: number;
    quantidadeFotos?: number;
  }>>([]);

  // Package selector inside Modal
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [specialPhotoQty, setSpecialPhotoQty] = useState('');

  // Payment methods rows state
  const [paymentRows, setPaymentRows] = useState<Array<{ forma: string; valor: string }>>([
    { forma: 'PIX', valor: '' }
  ]);

  // Settle individual sale expansions state
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});
  const [expandedGroupMinimized, setExpandedGroupMinimized] = useState<Record<string, boolean>>({});

  // Helper calculation for Year-Month filter key
  const selectedPeriodStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Handle setting up default dates upon opening Modal
  useEffect(() => {
    if (isLaunchModalOpen && !editingSale) {
      const todayStr = new Date().toISOString().split('T')[0];
      setFormData({
        data: overrideLaunchDate || todayStr,
        nomeCliente: '',
        whatsapp: '',
        email: '',
        hospedagem: '',
        pessoas: '1',
        vendedorId: isAdmin ? '' : currentUser.id,
        parceiroId: '',
        atividadeId: '',
        formaPagamento: '',
        status: 'Pendente',
        fotosEnviadas: '',
        fotosVendidas: '',
        descontoManual: '',
        notas: ''
      });
      setCartItems([]);
      setSelectedPackageId('');
      setSpecialPhotoQty('');
      setPaymentRows([
        { forma: 'PIX', valor: '' }
      ]);
      setIsConfirmingLaunchDelete(false);
      setValidationError(null);
    }
  }, [isLaunchModalOpen, editingSale, activities, currentUser, isAdmin]);

  // Reset overrideLaunchDate when modal closes
  useEffect(() => {
    if (!isLaunchModalOpen) {
      setOverrideLaunchDate(null);
    }
  }, [isLaunchModalOpen]);

  // Reset details modal deletion state when details modal closes
  useEffect(() => {
    if (!selectedSaleDetailId) {
      setConfirmDeleteId(null);
    }
  }, [selectedSaleDetailId]);

  // Load and compile default whatsapp recovery message when details modal opens
  useEffect(() => {
    if (selectedSaleDetailId) {
      const detailSale = sales.find(s => s.id === selectedSaleDetailId);
      if (detailSale) {
        const act = activities.find(a => a.id === detailSale.atividadeId);
        const pkg = packages.find(p => p.id === detailSale.sacolaItens[0]?.pacoteId);
        const rawMessage = pkg?.mensagemAbandono || 'Olá {nomeCliente}! Verificamos que o seu carrinho de fotos da atividade {atividade} está registrado. Para escolher e receber suas fotos, acesse nosso link de seleção. Estamos te esperando!';
        
        const compiledMessage = rawMessage
          .replace(/{nomeCliente}/gi, detailSale.nomeCliente || '')
          .replace(/{atividade}/gi, act?.nomeAtividade || 'Standard');
        
        setCustomWppMsg(compiledMessage);
      }
    } else {
      setCustomWppMsg('');
    }
  }, [selectedSaleDetailId, sales, activities, packages]);

  // Reset validator error on form edits
  useEffect(() => {
    setValidationError(null);
  }, [formData.atividadeId, formData.nomeCliente, formData.formaPagamento, cartItems.length, isLaunchModalOpen]);

  // Handle state restoration when entering edit mode
  const startEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsConfirmingLaunchDelete(false);
    setValidationError(null);
    setFormData({
      data: sale.data,
      nomeCliente: sale.nomeCliente,
      whatsapp: sale.whatsapp,
      email: sale.email || '',
      hospedagem: sale.hospedagem || '',
      pessoas: String(sale.pessoas || 1),
      vendedorId: sale.vendedorId,
      parceiroId: sale.parceiroId || '',
      atividadeId: sale.atividadeId,
      formaPagamento: sale.formaPagamento || '',
      status: sale.status,
      fotosEnviadas: !sale.fotosEnviadas ? '' : String(sale.fotosEnviadas),
      fotosVendidas: !sale.fotosVendidas ? '' : String(sale.fotosVendidas),
      descontoManual: !sale.descontoManual ? '' : String(sale.descontoManual),
      notas: sale.notas || ''
    });
    setCartItems(sale.sacolaItens || []);
    
    // Load existing multiple payments if available
    if (sale.pagamentos && sale.pagamentos.length > 0) {
      setPaymentRows(sale.pagamentos.map(p => ({
        forma: p.forma,
        valor: String(p.valor)
      })));
    } else {
      setPaymentRows([
        { forma: sale.formaPagamento || 'PIX', valor: String(sale.valorTotal || '') }
      ]);
    }
    
    setIsLaunchModalOpen(true);
  };

  // Helper formatting routines
  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatLongDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `${day} de ${months[monthIndex]} de ${year}`;
    }
    return dateStr;
  };

  const getDaysSinceLaunch = (dateStr: string) => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return 0;
    // Year, Month (0-11), Day
    const launchDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = todayZero.getTime() - launchDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isMinimizedByDefault = (sale: Sale) => {
    if (sale.status === 'Pago') return true;
    if (sale.status === 'Abandonada' && getDaysSinceLaunch(sale.data) > 30) return true;
    return false;
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amt);
  };

  const getMonthName = () => {
    const names = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return names[selectedMonth - 1];
  };

  // Check if a collaborator is Admin
  const isAdminCollaborator = (collab: Collaborator | undefined): boolean => {
    if (!collab) return false;
    return (
      collab.email.toLowerCase() === 'info@allangle.com.br' ||
      collab.nomeCompleto === 'ALL ANGLE ADMIN'
    );
  };

  const getTeammateName = (collab: Collaborator | undefined): string => {
    if (!collab) return 'Equipe';
    if (collab.nomeCompleto === 'ALL ANGLE ADMIN' || collab.email.toLowerCase() === 'info@allangle.com.br') {
      return 'All Angle';
    }
    return collab.nomeCompleto;
  };

  // 1. FILTER LOGIC FOR MONTH'S OFF-LINE OPERATIONS & COMPETENCY RECONCILIATIONS
  // Pinned/carryover logic: past months Pendente or Abandonada remain in block 1 until Pago/Reconciled
  // Role profile restriction: Staff users ONLY see their own entries. Admin sees everything.
  const filteredSalesData = useMemo(() => {
    return sales.filter(sale => {
      // Role enforcement
      if (!isAdmin && sale.vendedorId !== currentUser.id) {
        return false;
      }

      // Activity ID filter input
      if (selectedActivityId !== 'all' && sale.atividadeId !== selectedActivityId) {
        return false;
      }

      // Search filters
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const clientMatch = sale.nomeCliente.toLowerCase().includes(query);
        const phoneMatch = sale.whatsapp.includes(query);
        const hostMatch = (sale.hospedagem || '').toLowerCase().includes(query);
        if (!clientMatch && !phoneMatch && !hostMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sales, isAdmin, currentUser.id, selectedActivityId, searchTerm]);

  // Block 1: Carryovers (Past month's non-closed items rolling forward)
  const carryoverSales = useMemo(() => {
    return filteredSalesData.filter(sale => {
      // It belongs to a previous month relative to filter
      const salePeriod = sale.data.substring(0, 7);
      const isPastMonth = isAnnualView 
        ? sale.data < `${selectedYear}-01-01`
        : salePeriod < selectedPeriodStr;
      
      const isUnresolved = sale.status === 'Pendente' || sale.status === 'Abandonada';
      return isPastMonth && isUnresolved;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [filteredSalesData, selectedPeriodStr, selectedYear, isAnnualView]);

  // Group carryovers by month & year for unified timeline blocking
  const carryoverSalesGrouped = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    carryoverSales.forEach(s => {
      const parts = s.data.split('-');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`; // e.g. "2026-05"
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(s);
      }
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // Newer past month blocks first
      .map(key => {
        const [yr, mo] = key.split('-');
        const monthsNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthName = monthsNames[parseInt(mo, 10) - 1];
        return {
          key,
          isCarryover: true,
          label: `Pendentes de ${monthName} de ${yr}`,
          sales: groups[key]
        };
      });
  }, [carryoverSales]);

  // Block 2: Month Chronological Services
  const activeMonthSales = useMemo(() => {
    return filteredSalesData.filter(sale => {
      const salePeriod = sale.data.substring(0, 7);
      const inCurrentPeriod = isAnnualView 
        ? sale.data.startsWith(`${selectedYear}-`)
        : salePeriod === selectedPeriodStr;

      // Filter out past month unresolved items that are already pinned in Block 1
      const isPastMonth = isAnnualView
        ? sale.data < `${selectedYear}-01-01`
        : salePeriod < selectedPeriodStr;
      const isUnresolved = sale.status === 'Pendente' || sale.status === 'Abandonada';
      const isPinnablePast = isPastMonth && isUnresolved;

      return inCurrentPeriod && !isPinnablePast;
    }).sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));
  }, [filteredSalesData, selectedPeriodStr, selectedYear, isAnnualView]);

  // Group current active month's sales by date
  const activeMonthSalesGrouped = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    activeMonthSales.forEach(s => {
      const d = s.data;
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(s);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // Newest day block first
      .map(date => ({
        date,
        isCarryover: false,
        label: formatLongDate(date),
        sales: groups[date]
      }));
  }, [activeMonthSales]);

  // Combine past month carryovers and active month days into a single timeline blocks timeline
  const timelineBlocks = useMemo(() => {
    const blocks: Array<{ key: string; label: string; sales: Sale[]; isCarryover: boolean }> = [];

    // Previous unresolved months
    carryoverSalesGrouped.forEach(g => {
      blocks.push({
        key: `past-${g.key}`,
        label: g.label,
        sales: g.sales,
        isCarryover: true
      });
    });

    // Current month days
    activeMonthSalesGrouped.forEach(g => {
      blocks.push({
        key: `day-${g.date}`,
        label: g.label,
        sales: g.sales,
        isCarryover: false
      });
    });

    return blocks;
  }, [carryoverSalesGrouped, activeMonthSalesGrouped]);

  // 2. FINANCIAL LEDGER INFLOWS (REGIME DE CAIXA: based on payment date falling in timeframe)
  const paidSalesInPeriod = useMemo(() => {
    return sales.filter(sale => {
      if (sale.status !== 'Pago' || !sale.dataPagamento) return false;

      // Enforce role visibility
      if (!isAdmin && sale.vendedorId !== currentUser.id) return false;

      // Filter timeframe
      const matchTimeframe = isAnnualView 
        ? sale.dataPagamento.startsWith(`${selectedYear}-`)
        : sale.dataPagamento.startsWith(selectedPeriodStr);

      return matchTimeframe;
    }).sort((a, b) => (a.dataPagamento || '').localeCompare(b.dataPagamento || ''));
  }, [sales, selectedYear, selectedPeriodStr, isAnnualView, isAdmin, currentUser.id]);

  // Ledger summary details metrics
  const grossRevenue = useMemo(() => {
    return paidSalesInPeriod.reduce((acc, s) => acc + s.valorTotal, 0);
  }, [paidSalesInPeriod]);

  const personalCommission = useMemo(() => {
    return paidSalesInPeriod.reduce((acc, s) => {
      const act = activities.find(a => a.id === s.atividadeId);
      return acc + calculateCollaboratorCommission(s, currentUser, act);
    }, 0);
  }, [paidSalesInPeriod, activities, currentUser]);

  const totalCommissions = useMemo(() => {
    return paidSalesInPeriod.reduce((acc, s) => {
      const collab = collaborators.find(c => c.id === s.vendedorId);
      const partner = partners.find(p => p.id === s.parceiroId);
      const act = activities.find(a => a.id === s.atividadeId);

      const isCollabAdmin = isAdminCollaborator(collab);
      const sComm = isCollabAdmin ? 0 : calculateCollaboratorCommission(s, collab, act);
      const pComm = calculatePartnerCommission(s, partner, act);

      return acc + sComm + pComm;
    }, 0);
  }, [paidSalesInPeriod, collaborators, partners, activities]);

  const finalBalance = useMemo(() => {
    return grossRevenue - totalCommissions;
  }, [grossRevenue, totalCommissions]);

  // 3. REPASSES / PAYROLLS FOR LISTINGS
  const teamPayroll = useMemo(() => {
    return collaborators
      .filter(collab => !isAdminCollaborator(collab)) // Exclude admin
      .map(collab => {
        const totalCommission = paidSalesInPeriod
          .filter(s => s.vendedorId === collab.id)
          .reduce((sum, sale) => {
            const act = activities.find(a => a.id === sale.atividadeId);
            return sum + calculateCollaboratorCommission(sale, collab, act);
          }, 0);

        const roleStr = collab.cargo === 'Admin' ? 'Administrador' : 'Fotógrafo';
        const reconKey = `vendedor-${collab.id}-${selectedPeriodStr}`;
        const isSettled = paidCommissions[reconKey] || false;

        return {
          id: collab.id,
          collab,
          nome: collab.nomeCompleto,
          funcao: roleStr,
          pixInfo: collab.chavePix ? `${collab.tipoChavePix}: ${collab.chavePix}` : 'PIX não cadastrado',
          totalCommission,
          reconKey,
          isSettled
        };
      })
      .filter(row => row.totalCommission > 0);
  }, [collaborators, paidSalesInPeriod, activities, paidCommissions, selectedPeriodStr]);

  const partnerPayroll = useMemo(() => {
    return partners
      .map(partner => {
        const totalCommission = paidSalesInPeriod
          .filter(s => s.parceiroId === partner.id)
          .reduce((sum, sale) => {
            const act = activities.find(a => a.id === sale.atividadeId);
            return sum + calculatePartnerCommission(sale, partner, act);
          }, 0);

        const rate = partner.comissaoPadrao !== undefined ? partner.comissaoPadrao : 10;
        const reconKey = `partner-${partner.id}-${selectedPeriodStr}`;
        const isSettled = paidCommissions[reconKey] || false;

        return {
          id: partner.id,
          partner,
          nome: partner.nomeParceiro,
          rate,
          pixInfo: partner.chavePix ? `${partner.tipoChavePix || 'PIX'}: ${partner.chavePix}` : 'PIX não cadastrado',
          totalCommission,
          reconKey,
          isSettled
        };
      })
      .filter(row => row.totalCommission > 0);
  }, [partners, paidSalesInPeriod, activities, paidCommissions, selectedPeriodStr]);

  // 4. CALCULATING LIVE BASKET METRICS INSIDE LAUNCH MODAL
  const currentSelectedPackage = useMemo(() => {
    return packages.find(pkg => pkg.id === selectedPackageId);
  }, [selectedPackageId, packages]);

  // Automated partner locking logic
  const lockedPartnerId = useMemo(() => {
    // 1. If currently selected package has a partner assigned
    if (currentSelectedPackage && currentSelectedPackage.parceiroId) {
      return currentSelectedPackage.parceiroId;
    }
    // 2. If any items in the basket have a partner assigned
    for (const item of cartItems) {
      const pkg = packages.find(p => p.id === item.pacoteId);
      if (pkg && pkg.parceiroId) {
        return pkg.parceiroId;
      }
    }
    return null;
  }, [currentSelectedPackage, cartItems, packages]);

  // Synchronize locked partner option with form value
  useEffect(() => {
    if (lockedPartnerId) {
      setFormData(prev => ({ ...prev, parceiroId: lockedPartnerId }));
    }
  }, [lockedPartnerId]);

  // Calculating photos limit considering scale factor dynamically
  const formPeopleCount = Math.max(1, parseInt(formData.pessoas, 10) || 1);
  const liveScaledPhotoLimit = useMemo(() => {
    if (!currentSelectedPackage) return 0;
    const limitPerPerson = currentSelectedPackage.maxFotosEnviadas || 0;
    const isStandard = currentSelectedPackage.tipoPreco === 'Standard';
    return isStandard ? limitPerPerson * formPeopleCount : limitPerPerson;
  }, [currentSelectedPackage, formPeopleCount]);

  const isSelectionDependentActive = useMemo(() => {
    const hasSelectionDependent = (currentSelectedPackage?.vendaDireta === false) || cartItems.some(item => {
      const pkg = packages.find(p => p.id === item.pacoteId);
      return pkg && pkg.vendaDireta === false;
    });
    return hasSelectionDependent;
  }, [currentSelectedPackage, cartItems, packages]);

  // Automated dynamic status setter based on packages in cart or selection
  useEffect(() => {
    if (!isLaunchModalOpen) return;
    if (isSelectionDependentActive) {
      if (!editingSale) {
        setFormData(prev => {
          if (prev.status !== 'Pendente') {
            return { ...prev, status: 'Pendente' };
          }
          return prev;
        });
      }
    } else {
      if (!editingSale && (currentSelectedPackage || cartItems.length > 0)) {
        setFormData(prev => {
          if (prev.status !== 'Pago') {
            return { ...prev, status: 'Pago' };
          }
          return prev;
        });
      }
    }
  }, [isSelectionDependentActive, currentSelectedPackage, cartItems, isLaunchModalOpen, editingSale]);

  // Helper to calculate progressive pricing considering previously accumulated purchased/included photos
  const calculateEspecialPriceWithAccumulated = (pkg: Package, startIdx: number, qty: number): { subtotal: number; precoUnitarioUsed: number } => {
    if (!qty || qty <= 0) {
      return { subtotal: 0, precoUnitarioUsed: 0 };
    }
    if (!pkg.tiers || pkg.tiers.length === 0) {
      return { subtotal: 0, precoUnitarioUsed: 0 };
    }

    const totalQty = qty + startIdx;
    const tier = pkg.tiers.find(t => totalQty >= t.minFotos && totalQty <= t.maxFotos)
      || pkg.tiers[pkg.tiers.length - 1]; // fallback to last tier
    const precoUnitario = tier ? tier.precoUnitario : 0;

    return {
      subtotal: qty * precoUnitario,
      precoUnitarioUsed: precoUnitario
    };
  };

  // Sum of photos from existing cart items to see starting index for the new chosen package
  const accumulatedPhotosInCart = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const pkg = packages.find(p => p.id === item.pacoteId);
      if (!pkg) return acc;
      const isVendaDireta = pkg.vendaDireta !== false;
      if (isVendaDireta) {
        if (pkg.fotosPacote !== undefined && pkg.fotosPacote > 0) {
          return acc + pkg.fotosPacote;
        }
        return acc + (item.quantidadeFotos || 0);
      } else {
        return acc + (item.quantidadeFotos || 0);
      }
    }, 0);
  }, [cartItems, packages]);

  // Calculates subtotal of the package chosen to be added to cart
  const currentItemCalculatedSubtotal = useMemo(() => {
    if (!currentSelectedPackage) return 0;
    
    const isVendaDireta = currentSelectedPackage.vendaDireta !== false;
    
    if (isVendaDireta) {
      if (currentSelectedPackage.tipoPreco === 'Standard') {
        const basePrice = currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0;
        return basePrice * formPeopleCount;
      } else if (currentSelectedPackage.tipoPreco === 'Foto') {
        const rate = currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0;
        const qty = parseInt(specialPhotoQty, 10) || 0;
        return rate * qty;
      } else if (currentSelectedPackage.tipoPreco === 'ProgressivoPessoa') {
        const p1 = currentSelectedPackage.precoPrimeiraPessoa ?? 0;
        const p2 = currentSelectedPackage.precoSegundaPessoa ?? 0;
        const pAdd = currentSelectedPackage.precoAdicionalPessoa ?? 0;
        if (formPeopleCount === 1) {
          return p1;
        } else if (formPeopleCount === 2) {
          return p1 + p2;
        } else if (formPeopleCount >= 3) {
          return p1 + p2 + ((formPeopleCount - 2) * pAdd);
        } else {
          return 0;
        }
      } else {
        // Especial type (progressive pricing based on custom photo qty chosen)
        const qty = parseInt(specialPhotoQty, 10) || 0;
        const { subtotal } = calculateEspecialPriceWithAccumulated(currentSelectedPackage, accumulatedPhotosInCart, qty);
        return subtotal;
      }
    } else {
      // Venda dependente da seleção do cliente
      const qtySold = parseInt(formData.fotosVendidas, 10) || 0;
      if (qtySold <= 0) return 0; // o total geral deve continuar R$ 0,00 enquanto não houver fotos vendidas
      
      if (currentSelectedPackage.tipoPreco === 'Standard') {
        const basePrice = currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0;
        return basePrice * formPeopleCount;
      } else if (currentSelectedPackage.tipoPreco === 'Foto') {
        const rate = currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0;
        return rate * qtySold;
      } else if (currentSelectedPackage.tipoPreco === 'ProgressivoPessoa') {
        const p1 = currentSelectedPackage.precoPrimeiraPessoa ?? 0;
        const p2 = currentSelectedPackage.precoSegundaPessoa ?? 0;
        const pAdd = currentSelectedPackage.precoAdicionalPessoa ?? 0;
        if (formPeopleCount === 1) {
          return p1;
        } else if (formPeopleCount === 2) {
          return p1 + p2;
        } else if (formPeopleCount >= 3) {
          return p1 + p2 + ((formPeopleCount - 2) * pAdd);
        } else {
          return 0;
        }
      } else {
        // Especial type
        const { subtotal } = calculateEspecialPriceWithAccumulated(currentSelectedPackage, accumulatedPhotosInCart, qtySold);
        return subtotal;
      }
    }
  }, [currentSelectedPackage, formPeopleCount, specialPhotoQty, formData.fotosVendidas, accumulatedPhotosInCart]);

  // Synchronize cart items with changes to fotosVendidas and pessoas
  useEffect(() => {
    setCartItems(prevItems => {
      let isChanged = false;
      let runningAccumulatedPhotos = 0;

      const updated = prevItems.map(item => {
        const pkg = packages.find(p => p.id === item.pacoteId);
        if (!pkg) return item;
        
        const isVendaDireta = pkg.vendaDireta !== false;
        let newSubtotal = item.subtotal;
        let newPrecoUnitario = item.precoUnitario;

        // Determine how many photos this item contributes to the progressive path for the next ones
        let itemPhotos = 0;
        if (isVendaDireta) {
          if (pkg.fotosPacote !== undefined && pkg.fotosPacote > 0) {
            itemPhotos = pkg.fotosPacote;
          } else {
            itemPhotos = item.quantidadeFotos || 0;
          }
        } else {
          itemPhotos = parseInt(formData.fotosVendidas, 10) || 0;
        }

        if (isVendaDireta) {
          if (pkg.tipoPreco === 'Standard') {
            newSubtotal = (pkg.precoStandard || 0) * formPeopleCount;
            newPrecoUnitario = pkg.precoStandard || 0;
          } else if (pkg.tipoPreco === 'ProgressivoPessoa') {
            const p1 = pkg.precoPrimeiraPessoa ?? 0;
            const p2 = pkg.precoSegundaPessoa ?? 0;
            const pAdd = pkg.precoAdicionalPessoa ?? 0;
            if (formPeopleCount === 1) {
              newSubtotal = p1;
            } else if (formPeopleCount === 2) {
              newSubtotal = p1 + p2;
            } else if (formPeopleCount >= 3) {
              newSubtotal = p1 + p2 + ((formPeopleCount - 2) * pAdd);
            } else {
              newSubtotal = 0;
            }
            newPrecoUnitario = formPeopleCount > 0 ? (newSubtotal / formPeopleCount) : 0;
          } else if (pkg.tipoPreco === 'Foto') {
            const qty = item.quantidadeFotos || 0;
            newSubtotal = (pkg.precoStandard || 0) * qty;
            newPrecoUnitario = pkg.precoStandard || 0;
          } else if (pkg.tipoPreco === 'Especial') {
            const qty = item.quantidadeFotos || 0;
            const { subtotal, precoUnitarioUsed } = calculateEspecialPriceWithAccumulated(pkg, runningAccumulatedPhotos, qty);
            newSubtotal = subtotal;
            newPrecoUnitario = precoUnitarioUsed;
          }
        } else {
          const qtySold = parseInt(formData.fotosVendidas, 10) || 0;
          if (qtySold <= 0) {
            newSubtotal = 0;
            newPrecoUnitario = 0;
          } else {
            if (pkg.tipoPreco === 'Standard') {
              newSubtotal = (pkg.precoStandard || 0) * formPeopleCount;
              newPrecoUnitario = pkg.precoStandard || 0;
            } else if (pkg.tipoPreco === 'ProgressivoPessoa') {
              const p1 = pkg.precoPrimeiraPessoa ?? 0;
              const p2 = pkg.precoSegundaPessoa ?? 0;
              const pAdd = pkg.precoAdicionalPessoa ?? 0;
              if (formPeopleCount === 1) {
                newSubtotal = p1;
              } else if (formPeopleCount === 2) {
                newSubtotal = p1 + p2;
              } else if (formPeopleCount >= 3) {
                newSubtotal = p1 + p2 + ((formPeopleCount - 2) * pAdd);
              } else {
                newSubtotal = 0;
              }
              newPrecoUnitario = formPeopleCount > 0 ? (newSubtotal / formPeopleCount) : 0;
            } else if (pkg.tipoPreco === 'Foto') {
              newSubtotal = (pkg.precoStandard || 0) * qtySold;
              newPrecoUnitario = pkg.precoStandard || 0;
            } else if (pkg.tipoPreco === 'Especial') {
              const { subtotal, precoUnitarioUsed } = calculateEspecialPriceWithAccumulated(pkg, runningAccumulatedPhotos, qtySold);
              newSubtotal = subtotal;
              newPrecoUnitario = precoUnitarioUsed;
            }
          }
        }

        // Add to running accumulated total for subsequent items
        runningAccumulatedPhotos += itemPhotos;

        const targetQty = isVendaDireta ? item.quantidadeFotos : (parseInt(formData.fotosVendidas, 10) || undefined);

        if (item.subtotal !== newSubtotal || item.precoUnitario !== newPrecoUnitario || item.quantidadeFotos !== targetQty) {
          isChanged = true;
          return {
            ...item,
            subtotal: newSubtotal,
            precoUnitario: newPrecoUnitario,
            quantidadeFotos: targetQty
          };
        }
        return item;
      });

      return isChanged ? updated : prevItems;
    });
  }, [formData.fotosVendidas, formData.pessoas, packages, formPeopleCount]);

  const effectiveCartItems = useMemo(() => {
    if (!currentSelectedPackage) {
      return cartItems;
    }
    // Check if the current selected package is already in cartItems
    const exists = cartItems.some(item => item.pacoteId === selectedPackageId);
    if (exists) {
      return cartItems;
    }

    // Determine quantity of photos based on vendaDireta structure
    const isVendaDireta = currentSelectedPackage.vendaDireta !== false;
    let qtyPhotos = 0;
    if (isVendaDireta) {
      qtyPhotos = (currentSelectedPackage.tipoPreco === 'Standard')
        ? (currentSelectedPackage.fotosPacote || 0)
        : (parseInt(specialPhotoQty, 10) || 0);
    } else {
      qtyPhotos = parseInt(formData.fotosVendidas, 10) || 0;
    }

    const tempItem = {
      pacoteId: currentSelectedPackage.id,
      nome: currentSelectedPackage.nomePacote,
      subtotal: currentItemCalculatedSubtotal,
      precoUnitario: qtyPhotos > 0 ? (currentItemCalculatedSubtotal / qtyPhotos) : (currentSelectedPackage.precoStandard || 0),
      quantidadeFotos: qtyPhotos
    };

    return [...cartItems, tempItem];
  }, [cartItems, currentSelectedPackage, selectedPackageId, currentItemCalculatedSubtotal, specialPhotoQty, formData.fotosVendidas]);

  const liveTotalValue = useMemo(() => {
    const basketSum = effectiveCartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discount = parseFloat(formData.descontoManual) || 0;
    return Math.max(0, basketSum - discount);
  }, [effectiveCartItems, formData.descontoManual]);

  const livePhotosLimitMax = useMemo(() => {
    return effectiveCartItems.reduce((acc, item) => {
      const pkg = packages.find(p => p.id === item.pacoteId);
      if (!pkg) return acc;
      
      if (pkg.possuiLimiteFotosPorPessoa && pkg.limiteFotosPorPessoa !== undefined) {
        return acc + (pkg.limiteFotosPorPessoa * formPeopleCount);
      }
      
      const factor = (pkg.tipoPreco === 'Standard' || pkg.tipoPreco === 'Especial') ? formPeopleCount : 1;
      return acc + ((pkg.maxFotosEnviadas || 0) * factor);
    }, 0);
  }, [effectiveCartItems, packages, formPeopleCount]);

  const isOverDeliveryWasteLive = useMemo(() => {
    const photosDelivered = parseInt(formData.fotosEnviadas, 10) || 0;
    return photosDelivered > livePhotosLimitMax && livePhotosLimitMax > 0;
  }, [formData.fotosEnviadas, livePhotosLimitMax]);

  // Master ADM access block (Admins cannot perform launches, only equipe/staff can)
  const canPerformLaunches = !isAdmin;

  // Activities eligible for the current logged-in user
  const eligibleActivities = useMemo(() => {
    return activities.filter(act => {
      // For staff, we check eligibility list
      if (!isAdmin) {
        if (act.membrosElegiveis && act.membrosElegiveis.length > 0) {
          return act.membrosElegiveis.includes(currentUser.id);
        }
      }
      return true;
    });
  }, [activities, currentUser, isAdmin]);

  const handleInLaunchPartnerCreate = () => {
    if (!inLaunchPartnerName.trim()) {
      alert('Por favor, preencha o nome do parceiro!');
      return;
    }
    if (!inLaunchPartnerWhatsapp.trim()) {
      alert('Por favor, informe o WhatsApp do parceiro!');
      return;
    }
    const commRate = parseFloat(inLaunchPartnerCommission) || 10;
    
    const newP = addPartner({
      nomeParceiro: inLaunchPartnerName.trim(),
      whatsapp: inLaunchPartnerWhatsapp.replace(/\D/g, ''),
      comissaoPadrao: commRate,
      status: 'Aprovado'
    });

    // Populate partner selection in form instantly
    setFormData(prev => ({ ...prev, parceiroId: newP.id }));
    
    // Clear in-launch partner form states
    setInLaunchPartnerName('');
    setInLaunchPartnerWhatsapp('');
    setInLaunchPartnerCommission('10');
    setIsAddNewPartnerModalOpen(false);
  };

  // 5. AUTOLOCATE DEPENDENT PARTNERS & COMMISSION METRIC UPON SELECTION
  // Handle adding items to bag
  const handleAddItemToCart = () => {
    if (!currentSelectedPackage) return;
    
    let subVal = currentItemCalculatedSubtotal;
    let qtyPhotos: number | undefined = undefined;

    const isVendaDireta = currentSelectedPackage.vendaDireta !== false;

    if (isVendaDireta) {
      if (currentSelectedPackage.tipoPreco === 'Especial' || currentSelectedPackage.tipoPreco === 'Foto') {
        qtyPhotos = parseInt(specialPhotoQty, 10) || 0;
        if (qtyPhotos <= 0) {
          alert('Insira uma quantidade de fotos válida!');
          return;
        }
      }
    } else {
      qtyPhotos = parseInt(formData.fotosVendidas, 10) || undefined;
    }

    const baseUnitRate = currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0;

    const newItem = {
      pacoteId: currentSelectedPackage.id,
      nome: currentSelectedPackage.nomePacote,
      precoUnitario: currentSelectedPackage.tipoPreco === 'Standard' 
        ? baseUnitRate
        : currentSelectedPackage.tipoPreco === 'ProgressivoPessoa'
          ? (subVal / formPeopleCount)
          : (subVal / (qtyPhotos || 1)),
      subtotal: subVal,
      quantidadeFotos: qtyPhotos
    };

    setCartItems(prev => [...prev, newItem]);
    
    // Auto-dependency link automation: if package has a partner linked, set partner!
    if (currentSelectedPackage.parceiroId) {
      setFormData(prev => ({
        ...prev,
        parceiroId: currentSelectedPackage.parceiroId || ''
      }));
    }

    // Reset selector
    setSelectedPackageId('');
    setSpecialPhotoQty('');
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit operations
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.atividadeId) {
      setValidationError('Por favor, selecione a Atividade correspondente primeiro!');
      return;
    }
    if (!formData.nomeCliente.trim()) {
      setValidationError('Por favor, informe o nome do cliente!');
      return;
    }
    if (paymentRows.some(row => !row.forma)) {
      setValidationError('Por favor, selecione a Forma de Pagamento!');
      return;
    }
    if (effectiveCartItems.length === 0) {
      setValidationError('Sua sacola de faturamento precisa ter no mínimo 1 produto!');
      return;
    }

    // If payment date is cleared but status is Paid, auto set payment date to today
    let finalPayDate = editingSale?.dataPagamento;
    if (formData.status === 'Pago') {
      finalPayDate = editingSale?.dataPagamento || new Date().toISOString().split('T')[0];
    } else {
      finalPayDate = undefined;
    }

    // Build pagamentos list for saving
    const pgList = paymentRows.map(row => ({
      forma: row.forma,
      valor: parseFloat(row.valor) || 0
    }));

    // Backwards-compatible comma list for single-method lookups
    const uniqueMethods = Array.from(new Set(paymentRows.map(row => row.forma).filter(Boolean)));
    const finalFormaPagamento = uniqueMethods.join(', ');

    const payload = {
      data: formData.data,
      pessoas: formPeopleCount,
      nomeCliente: formData.nomeCliente.trim(),
      hospedagem: formData.hospedagem.trim(),
      whatsapp: formData.whatsapp.trim(),
      email: formData.email.trim() || undefined,
      parceiroId: formData.parceiroId || undefined,
      atividadeId: formData.atividadeId,
      fotosEnviadas: parseInt(formData.fotosEnviadas, 10) || 0,
      fotosVendidas: parseInt(formData.fotosVendidas, 10) || 0,
      sacolaItens: effectiveCartItems,
      descontoManual: parseFloat(formData.descontoManual) || 0,
      valorTotal: liveTotalValue,
      formaPagamento: finalFormaPagamento,
      pagamentos: pgList,
      status: formData.status as 'Pago' | 'Pendente' | 'Abandonada' | 'Cancelado',
      notas: formData.notas.trim(),
      vendedorId: formData.vendedorId || currentUser.id,
      dataPagamento: finalPayDate
    };

    try {
      if (editingSale) {
        updateSale(editingSale.id, payload);
      } else {
        addSale(payload);
      }
      setIsLaunchModalOpen(false);
      setEditingSale(null);
    } catch (err: any) {
      setValidationError(`Falha ao gravar lançamento: ${err.message || err}`);
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedSales(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-850">
      
      {/* ======================================================== */}
      {/* TOP HEADER: TITLE & CORE DASHBOARD METRICS COUNTERS     */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e2438] text-white p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
        
        {/* Sparkle subtle vectors */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-12">
          <Waves className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10">
          <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-black tracking-[0.2em] px-3 py-1 rounded-full uppercase border border-indigo-500/20">
            {isAdmin ? 'ADMINISTRAÇÃO GLOBAL' : 'SALA DE EQUIPE'}
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            Olá, {currentUser.nomeCompleto.split(' ')[0]}!
          </h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            Seja bem-vindo ao painel operacional e de faturamentos unificados da ALL ANGLE.
          </p>
        </div>

        {/* Action controls panel */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Calendar controls switcher */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 px-3 py-1.5 rounded-2xl">
            {/* Visual Toggle for Visão Anual */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
              <span className="text-[9px] uppercase font-bold text-white/50">Anual:</span>
              <button
                type="button"
                onClick={() => setIsAnnualView(!isAnnualView)}
                className={`w-8 h-4.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                  isAnnualView ? 'bg-indigo-500' : 'bg-white/10'
                }`}
                title="Alternar entre visualizações Anuais e Mensais"
              >
                <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${isAnnualView ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Month select */}
            {!isAnnualView && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-black text-white bg-transparent outline-none cursor-pointer pr-1"
              >
                <option value="1" className="bg-slate-900 text-white font-bold">Jan</option>
                <option value="2" className="bg-slate-900 text-white font-bold">Fev</option>
                <option value="3" className="bg-slate-900 text-white font-bold">Mar</option>
                <option value="4" className="bg-slate-900 text-white font-bold">Abr</option>
                <option value="5" className="bg-slate-900 text-white font-bold">Mai</option>
                <option value="6" className="bg-slate-900 text-white font-bold">Jun</option>
                <option value="7" className="bg-slate-900 text-white font-bold">Jul</option>
                <option value="8" className="bg-slate-900 text-white font-bold">Ago</option>
                <option value="9" className="bg-slate-900 text-white font-bold">Set</option>
                <option value="10" className="bg-slate-900 text-white font-bold">Out</option>
                <option value="11" className="bg-slate-900 text-white font-bold">Nov</option>
                <option value="12" className="bg-slate-900 text-white font-bold">Dez</option>
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-black text-white bg-transparent outline-none cursor-pointer"
            >
              <option value="2025" className="bg-slate-900 text-white font-bold">2025</option>
              <option value="2026" className="bg-slate-900 text-white font-bold">2026</option>
              <option value="2027" className="bg-slate-900 text-white font-bold">2027</option>
            </select>
          </div>

          {/* Cloud Sync trigger restricted strictly to info@allangle.com.br */}
          {currentUser.email.toLowerCase() === 'info@allangle.com.br' && (
            <button
              type="button"
              onClick={() => {
                setSyncStatusMsg({ type: null, text: '' });
                setConfirmSyncAction(null);
                setIsSyncModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-400 py-3 px-4.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-sans"
              title="Central de Sincronização e Alinhamento de Nuvem"
            >
              <Database className="w-4 h-4 text-white" />
              <span>Sincronizar Banco</span>
            </button>
          )}

          {/* Bold Launch Trigger Action */}
          {canPerformLaunches && (
            <button
              type="button"
              onClick={() => {
                setEditingSale(null);
                setIsLaunchModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* METRICS CARDS: ROLE PROFILE ADAPTIVE STATS PANELS       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isAdmin ? (
          <>
            {/* Metric 1: Faturamento Bruto Total (Regime de Caixa) */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-emerald-500 border-slate-200/80 shadow-xs relative group hover:border-emerald-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-emerald-50/10">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 border border-emerald-100">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Faturamento Efetuado (Caixa)</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2.5 font-mono tracking-tight">
                {formatCurrency(grossRevenue)}
              </h3>
              <p className="text-[10px] text-emerald-800 bg-emerald-50/60 border border-emerald-250 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ● Recebido e liquidado no período
              </p>
            </div>

            {/* Metric 2: Comissões Gerais a Pagar */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-purple-500 border-slate-200/80 shadow-xs relative group hover:border-purple-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-purple-50/10">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4 border border-purple-100">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Comissões de Equipe e Parceiros</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2.5 font-mono tracking-tight">
                {formatCurrency(totalCommissions)}
              </h3>
              <p className="text-[10px] text-purple-800 bg-purple-50/65 border border-purple-250 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ● splits devidos a parceiros/equipe
              </p>
            </div>

            {/* Metric 3: Saldo Final Reconciliado */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-indigo-500 border-slate-200/80 shadow-xs relative group hover:border-indigo-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-indigo-50/10">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4 border border-indigo-100">
                <Landmark className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Faturamento Líquido Estimado</p>
              <h3 className="text-3xl font-black text-indigo-700 mt-2.5 font-mono tracking-tight">
                {formatCurrency(finalBalance)}
              </h3>
              <p className="text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ➔ Caixa após deduções operacionais
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Metric 1: My total transactions count */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-indigo-500 border-slate-200 shadow-xs relative group hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4 border border-indigo-100">
                <Layers className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Meus Lançamentos Realizados</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2.5 font-mono tracking-tight">
                {activeMonthSales.length} {activeMonthSales.length === 1 ? 'Lançamento' : 'Lançamentos'}
              </h3>
              <p className="text-[10px] text-indigo-850 bg-indigo-50 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ● Total operacional mapeado
              </p>
            </div>

            {/* Metric 2: Total gross amount generated */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-emerald-500 border-emerald-100/80 shadow-xs relative group hover:border-emerald-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-emerald-50/10">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 border border-emerald-100">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Minha Receita Gerada (Caixa)</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2.5 font-mono tracking-tight">
                {formatCurrency(grossRevenue)}
              </h3>
              <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-250 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ● Receita bruta de faturamento
              </p>
            </div>

            {/* Metric 3: Estimated commission */}
            <div className="bg-white p-6 rounded-3xl border border-l-8 border-l-purple-500 border-purple-100/80 shadow-xs relative group hover:border-purple-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-purple-50/10">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4 border border-purple-100">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Minhas comissões a receber</p>
              <h3 className="text-3xl font-black text-purple-700 mt-2.5 font-mono tracking-tight">
                {formatCurrency(personalCommission)}
              </h3>
              <p className="text-[10px] text-purple-800 bg-purple-50 border border-purple-250 px-2 py-0.5 mt-2 rounded-lg font-bold uppercase tracking-wide inline-block leading-none">
                ➔ Estimativa de comissão para resgate
              </p>
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* SUBTABS BAR: CORE NAVIGATION CONTROL OVER VIEWS          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Tab switchers */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('lancamentos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'lancamentos' 
                ? 'bg-[#0e2438] text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Lançamentos Operacionais
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSubTab('caixa')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'caixa' 
                ? 'bg-[#0e2438] text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Controle de Caixa
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('equipe')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  activeSubTab === 'equipe' 
                    ? 'bg-[#0e2438] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Folha de Equipe
              </button>
              
              <button
                type="button"
                onClick={() => setActiveSubTab('parceiros')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  activeSubTab === 'parceiros' 
                    ? 'bg-[#0e2438] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Folha de Parceiros
              </button>
            </>
          )}
        </div>

        {/* Global Filter fields for activity or search matching Tab requirements */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeSubTab === 'lancamentos' && (
            <>
              {/* Search textbox */}
              <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus-within:ring-1 focus-within:ring-indigo-500 w-full md:w-56 h-9">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cliente ou pousada..."
                  className="bg-transparent outline-none w-full font-semibold placeholder:text-slate-400"
                />
              </div>

              {/* Activity select */}
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9"
              >
                <option value="all">Todas as Atividades</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>{act.nomeAtividade}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. VIEW TAB: LANÇAMENTOS OPERACIONAIS (Grouped strictly) */}
      {/* ======================================================== */}
      {activeSubTab === 'lancamentos' && (
        <div id="tab-lancamentos-view" className="space-y-6">

          {/* CHRONOLOGICAL CURRENT MONTH RELEASES & PAST PENDENCIES GROUPED */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Cronograma de Lançamentos ({activeMonthSales.length + carryoverSales.length} faturamentos)</span>
            </h3>

            {timelineBlocks.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Waves className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-xs font-black text-slate-500">Nenhum lançamento catalogado neste período.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {timelineBlocks.map(block => {
                  const visibleSales = block.sales.filter(s => !isMinimizedByDefault(s));
                  const minimizedSales = block.sales.filter(s => isMinimizedByDefault(s));
                  const isBlockExpanded = !!expandedGroupMinimized[block.key];

                  return (
                    <div key={block.key} className="space-y-3.5 border-b border-slate-100 last:border-b-0 pb-6 last:pb-0">
                      
                      {/* Day or Previous Month Block Header Banner with Stark Contrasted Design */}
                      {block.isCarryover ? (
                        <div className="text-xs font-black text-rose-800 bg-rose-500/10 border border-rose-500/20 border-l-4 border-l-rose-500 px-4 py-3 rounded-r-xl flex items-center justify-between select-none">
                          <span className="uppercase tracking-wider font-extrabold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                            <span>Vendas Não Concluídas de {block.label}</span>
                          </span>
                          <span className="text-[10px] bg-rose-500/20 text-rose-800 px-2.5 py-1 rounded-full font-black block">{block.sales.length} pendências</span>
                        </div>
                      ) : (
                        <div className="text-xs font-black text-slate-800 bg-slate-100/90 border-l-4 border-l-indigo-500 px-4 py-3 rounded-r-xl flex items-center justify-between select-none font-sans">
                          <span className="tracking-wide block font-extrabold uppercase text-slate-800">{block.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-full font-black font-sans block">{block.sales.length} lançamentos</span>
                            {canPerformLaunches && (
                              <button
                                type="button"
                                onClick={() => {
                                  const blockDate = block.key.replace('day-', '');
                                  setOverrideLaunchDate(blockDate);
                                  setEditingSale(null);
                                  setIsLaunchModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-slate-950 hover:text-white text-white py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs hover:scale-[1.03] active:scale-95 transition-all cursor-pointer border border-indigo-700 font-sans"
                                title="Inserir lançamento direto nesta data"
                              >
                                <Plus className="w-3 h-3 text-white font-extrabold" />
                                <span className="font-extrabold text-white">+ Venda</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Regular (visible) sales list */}
                      <div className="space-y-2.5">
                        {visibleSales.length === 0 && minimizedSales.length > 0 && !isBlockExpanded && (
                          <p className="text-[11px] text-slate-400 font-bold italic text-left pl-2">Todos os lançamentos deste bloco estão arquivados ou pagos e recolhidos automaticamente.</p>
                        )}
                        
                        {visibleSales.map((sale, saleIdx) => {
                          const sCollab = collaborators.find(c => c.id === sale.vendedorId);
                          const rowBg = saleIdx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]';
                          const isCancelado = sale.status === 'Cancelado';
                          const canModify = isAdmin || (sale.vendedorId === currentUser.id);

                          // Total limit metric
                          const itemPhotosLimit = sale.sacolaItens.reduce((acc, item) => {
                            const p = packages.find(pkg => pkg.id === item.pacoteId);
                            if (!p) return acc;
                            if (p.possuiLimiteFotosPorPessoa && p.limiteFotosPorPessoa !== undefined) {
                              return acc + (p.limiteFotosPorPessoa * (sale.pessoas || 1));
                            }
                            const factor = (p.tipoPreco === 'Standard' || p.tipoPreco === 'Especial') ? (sale.pessoas || 1) : 1;
                            return acc + ((p.maxFotosEnviadas || 0) * factor);
                          }, 0);
                          const overPhotosWarning = sale.fotosEnviadas > itemPhotosLimit && itemPhotosLimit > 0;

                          // 7-day abandonment alert check
                          const showRecoveryAlert = sale.status === 'Abandonada' && getDaysSinceLaunch(sale.data) >= 7;

                          // Accent borders
                          const statusAccentBorder = 
                            sale.status === 'Pago' ? 'border-l-8 border-l-emerald-500' :
                            sale.status === 'Abandonada' ? 'border-l-8 border-l-rose-500' :
                            sale.status === 'Cancelado' ? 'border-l-8 border-l-slate-400' :
                            'border-l-8 border-l-amber-500';

                          return (
                            <div 
                              key={sale.id}
                              onClick={() => setSelectedSaleDetailId(sale.id)}
                              className={`${statusAccentBorder} border border-slate-200/60 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.005] transition-all duration-200 cursor-pointer select-none p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${rowBg} ${
                                overPhotosWarning ? 'border-amber-200 bg-amber-50/10' : ''
                              } ${isCancelado ? 'opacity-65' : ''}`}
                              id={`row-sale-item-${sale.id}`}
                            >
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-left">
                                <span className="text-xs font-black text-slate-900 font-sans tracking-tight uppercase">{sale.nomeCliente}</span>
                                
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/50 uppercase"
                                  style={(() => {
                                    const actObj = activities.find(a => a.id === sale.atividadeId);
                                    return getInlineTagStyle(actObj?.corTag || '#94a3b8');
                                  })()}
                                >
                                  <ActivityIcon className="w-3 h-3 shrink-0" />
                                  {activities.find(a => a.id === sale.atividadeId)?.nomeAtividade || 'Atividade'}
                                </span>

                                {/* Admin Staff Badge */}
                                {isAdmin && (
                                  <span 
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase font-sans whitespace-nowrap"
                                    style={getInlineTagStyle(sCollab?.corTag || '#6366f1')}
                                  >
                                    <User className="w-3 h-3 shrink-0" />
                                    <span>Fotógrafo: <strong>{getTeammateName(sCollab)}</strong></span>
                                  </span>
                                )}

                                {/* Attention recovery alert for 7+ days abandoned */}
                                {showRecoveryAlert && (
                                  <span className="inline-flex items-center gap-1.5 text-[9px] font-black bg-rose-600 text-white px-2.5 py-1 rounded-full uppercase shadow-xs animate-bounce border border-rose-700">
                                    <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" />
                                    <span>Recuperar Venda ({getDaysSinceLaunch(sale.data)}d abandonada)</span>
                                  </span>
                                )}

                                {overPhotosWarning && (
                                  <span className="text-[9px] bg-amber-100 text-amber-850 font-bold px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-3 h-3" /> Excesso de fotos
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-3.5 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 w-full md:w-auto">
                                <span className="text-xs font-mono font-black text-slate-900">{formatCurrency(sale.valorTotal)}</span>
                                
                                {/* High contrast semitransparent badges */}
                                <div>
                                  {sale.status === 'Pago' ? (
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 uppercase tracking-wider">
                                      PAGO
                                    </span>
                                  ) : sale.status === 'Abandonada' ? (
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-750 border border-rose-500/30 uppercase tracking-wider">
                                      ABANDONADA
                                    </span>
                                  ) : sale.status === 'Cancelado' ? (
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-slate-500/10 text-slate-600 border border-slate-500/30 uppercase tracking-wider">
                                      CANCELADO
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-800 border border-amber-500/30 uppercase tracking-wider font-bold">
                                      PENDENTE
                                    </span>
                                  )}
                                </div>

                                {canModify && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation(); // prevent opening details
                                      if (quickConfirmDeleteId === sale.id) {
                                        deleteSale(sale.id);
                                        setQuickConfirmDeleteId(null);
                                      } else {
                                        setQuickConfirmDeleteId(sale.id);
                                      }
                                    }}
                                    className={`p-1.5 rounded-xl border transition cursor-pointer select-none inline-flex items-center justify-center shrink-0 ${
                                      quickConfirmDeleteId === sale.id 
                                        ? 'bg-rose-600 border-rose-750 text-white animate-pulse text-[9px] font-extrabold px-2.5 py-1 uppercase tracking-wider'
                                        : 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-700'
                                    }`}
                                    title={quickConfirmDeleteId === sale.id ? 'Refirma?' : 'Excluir faturamento'}
                                  >
                                    {quickConfirmDeleteId === sale.id ? 'Confirma?' : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                <span className="text-[10px] bg-indigo-500/15 hover:bg-indigo-500/20 text-indigo-700 font-extrabold px-3 py-1.5 rounded-xl transition">
                                  Ver Detalhes →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Minimized/Collapsed section */}
                      {minimizedSales.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedGroupMinimized(prev => ({
                                ...prev,
                                [block.key]: !prev[block.key]
                              }));
                            }}
                            className="inline-flex items-center gap-2 text-xs font-extrabold text-white bg-indigo-950 hover:bg-indigo-900 border border-indigo-950 px-4.5 py-2.5 rounded-xl transition-all cursor-pointer select-none font-sans shadow-sm uppercase tracking-wider"
                          >
                            {isBlockExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 text-indigo-200" />
                                <span>Recolher {minimizedSales.length} Lançamentos finalizados</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 text-indigo-200" />
                                <span>Visualizar {minimizedSales.length} Lançamentos concluídos (Recolhidos)</span>
                              </>
                            )}
                          </button>

                          {isBlockExpanded && (
                            <div className="space-y-2 mt-3 animate-fade-in pl-1">
                              {minimizedSales.map((sale, saleIdx) => {
                                const sCollab = collaborators.find(c => c.id === sale.vendedorId);
                                const rowBg = saleIdx % 2 === 0 ? 'bg-[#f8fafc]/50' : 'bg-white';
                                const isCancelado = sale.status === 'Cancelado';
                                const canModify = isAdmin || (sale.vendedorId === currentUser.id);

                                // Total limit metric
                                const itemPhotosLimit = sale.sacolaItens.reduce((acc, item) => {
                                  const p = packages.find(pkg => pkg.id === item.pacoteId);
                                  if (!p) return acc;
                                  if (p.possuiLimiteFotosPorPessoa && p.limiteFotosPorPessoa !== undefined) {
                                    return acc + (p.limiteFotosPorPessoa * (sale.pessoas || 1));
                                  }
                                  const factor = (p.tipoPreco === 'Standard' || p.tipoPreco === 'Especial') ? (sale.pessoas || 1) : 1;
                                  return acc + ((p.maxFotosEnviadas || 0) * factor);
                                }, 0);
                                const overPhotosWarning = sale.fotosEnviadas > itemPhotosLimit && itemPhotosLimit > 0;

                                const showRecoveryAlert = sale.status === 'Abandonada' && getDaysSinceLaunch(sale.data) >= 7;

                                const statusAccentBorder = 
                                  sale.status === 'Pago' ? 'border-l-8 border-l-emerald-500' :
                                  sale.status === 'Abandonada' ? 'border-l-8 border-l-rose-500' :
                                  sale.status === 'Cancelado' ? 'border-l-8 border-l-slate-400' :
                                  'border-l-8 border-l-amber-500';

                                return (
                                  <div 
                                    key={sale.id}
                                    onClick={() => setSelectedSaleDetailId(sale.id)}
                                    className={`${statusAccentBorder} border border-slate-250/50 rounded-xl overflow-hidden shadow-xs hover:shadow-xs hover:scale-[1.002] transition-all duration-200 cursor-pointer select-none p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${rowBg} ${
                                      overPhotosWarning ? 'border-amber-200 bg-amber-50/10' : ''
                                    } ${isCancelado ? 'opacity-65' : ''}`}
                                  >
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-left">
                                      <span className="text-xs font-bold text-slate-800 font-sans tracking-tight uppercase">{sale.nomeCliente}</span>
                                      
                                      <span 
                                        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200/50 uppercase"
                                        style={(() => {
                                          const actObj = activities.find(a => a.id === sale.atividadeId);
                                          return getInlineTagStyle(actObj?.corTag || '#94a3b8');
                                        })()}
                                      >
                                        <ActivityIcon className="w-3 h-3 shrink-0" />
                                        {activities.find(a => a.id === sale.atividadeId)?.nomeAtividade || 'Atividade'}
                                      </span>

                                      {/* Admin Staff Badge */}
                                      {isAdmin && (
                                        <span 
                                          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase font-sans whitespace-nowrap"
                                          style={getInlineTagStyle(sCollab?.corTag || '#6366f1')}
                                        >
                                          <User className="w-3 h-3 shrink-0" />
                                          <span>Fotógrafo: <strong>{getTeammateName(sCollab)}</strong></span>
                                        </span>
                                      )}

                                      {/* Attention recovery alert for over 7 days abandoned */}
                                      {showRecoveryAlert && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase shadow-xs animate-pulse">
                                          <AlertTriangle className="w-3 h-3 text-white" />
                                          <span>Recuperar Venda ({getDaysSinceLaunch(sale.data)}d)</span>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 w-full md:w-auto">
                                      <span className="text-xs font-mono font-bold text-slate-700">{formatCurrency(sale.valorTotal)}</span>
                                      
                                      <div>
                                        {sale.status === 'Pago' ? (
                                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 uppercase tracking-wider">
                                            PAGO
                                          </span>
                                        ) : sale.status === 'Abandonada' ? (
                                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-750 border border-rose-500/30 uppercase tracking-wider">
                                            ABANDONADA
                                          </span>
                                        ) : sale.status === 'Cancelado' ? (
                                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-500/10 text-slate-600 border border-slate-500/30 uppercase tracking-wider">
                                            CANCELADO
                                          </span>
                                        ) : (
                                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-850 border border-amber-500/30 uppercase tracking-wider font-bold animate-pulse">
                                            PENDENTE
                                          </span>
                                        )}
                                      </div>

                                      {canModify && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation(); // prevent opening details
                                            if (quickConfirmDeleteId === sale.id) {
                                              deleteSale(sale.id);
                                              setQuickConfirmDeleteId(null);
                                            } else {
                                              setQuickConfirmDeleteId(sale.id);
                                            }
                                          }}
                                          className={`p-1 border rounded transition cursor-pointer select-none inline-flex items-center justify-center shrink-0 ${
                                            quickConfirmDeleteId === sale.id 
                                              ? 'bg-rose-600 border-rose-700 text-white font-extrabold px-2 py-0.5 text-[9px]'
                                              : 'bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200 hover:border-rose-300'
                                          }`}
                                        >
                                          {quickConfirmDeleteId === sale.id ? 'Confirma?' : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                      )}

                                      <span className="text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase font-sans">
                                        Ficha →
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VIEW TAB: CONTROLE DE CAIXA (Financial Inflow Table)  */}
      {/* ======================================================== */}
      {activeSubTab === 'caixa' && (
        <div id="tab-caixa-view" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-5 py-4 border-b border-slate-150 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-[#0e2438]" />
              <span>Entradas Liquidadas (Caixa) - {selectedPeriodStr}</span>
            </h3>
            <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full uppercase">
              Regime de Caixa
            </span>
          </div>

          <div className="p-5">
            {paidSalesInPeriod.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-xs">
                Nenhuma entrada liquidada disponível para este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-150">
                  <thead>
                    <tr className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                      <th className="pb-3 text-slate-500">Data do Caixa</th>
                      <th className="pb-3 text-slate-500">Cliente</th>
                      <th className="pb-3 text-slate-500">Atividade</th>
                      <th className="pb-3 text-slate-500">Fotógrafo</th>
                      <th className="pb-3 text-right text-slate-500">Valor Bruto</th>
                      {isAdmin && (
                        <>
                          <th className="pb-3 text-right text-slate-500">Comissão Equipe</th>
                          <th className="pb-3 text-right text-slate-500">Comissão de Parceiros</th>
                          <th className="pb-3 text-right text-slate-500">Saldo ALL ANGLE</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paidSalesInPeriod.map(s => {
                      const collab = collaborators.find(c => c.id === s.vendedorId);
                      const partner = partners.find(p => p.id === s.parceiroId);
                      const act = activities.find(a => a.id === s.atividadeId);

                      const isCollabAdmin = isAdminCollaborator(collab);
                      const collabComm = isCollabAdmin ? 0 : calculateCollaboratorCommission(s, collab, act);
                      const partnerComm = calculatePartnerCommission(s, partner, act);
                      const netRetained = s.valorTotal - collabComm - partnerComm;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 font-mono font-bold text-slate-500">
                            {s.dataPagamento ? formatDate(s.dataPagamento) : formatDate(s.data)}
                          </td>
                          <td className="py-3 font-bold text-slate-900">{s.nomeCliente}</td>
                          <td className="py-3 whitespace-nowrap">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase"
                              style={getInlineTagStyle(act?.corTag || '#94a3b8')}
                            >
                              {act ? act.nomeAtividade : 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 whitespace-nowrap font-semibold">
                            {collab ? (
                              <span 
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase"
                                style={getInlineTagStyle(collab?.corTag || '#475569')}
                              >
                                {getTeammateName(collab)}
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(s.valorTotal)}</td>
                          {isAdmin && (
                            <>
                              <td className="py-3 text-right font-mono text-amber-700 font-semibold">{formatCurrency(collabComm)}</td>
                              <td className="py-3 text-right font-mono text-rose-700 font-semibold">{formatCurrency(partnerComm)}</td>
                              <td className="py-3 text-right font-mono text-emerald-800 font-extrabold">{formatCurrency(netRetained)}</td>
                            </>
                          )}
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

      {/* ======================================================== */}
      {/* 3. VIEW TAB: FOLHA DE EQUIPE (Reconciliation & settle)   */}
      {/* ======================================================== */}
      {activeSubTab === 'equipe' && isAdmin && (
        <div id="tab-equipe-payroll" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-5 py-4 border-b border-slate-150">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Folha de Repasses para Equipe ({teamPayroll.length})</span>
            </h3>
          </div>

          <div className="p-5">
            {teamPayroll.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                Nenhum repasse de fotógrafo a ser faturado no período.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamPayroll.map(row => (
                  <div 
                    key={row.id} 
                    className={`border border-l-8 rounded-2xl p-5 flex flex-col justify-between h-auto gap-3.5 transition shadow-xs hover:shadow-sm ${
                      row.isSettled ? 'bg-emerald-50/15 border-emerald-200 border-l-emerald-500' : 'bg-white border-slate-200 border-l-amber-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900">{row.nome}</h4>
                        <span className="text-[9px] uppercase font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded leading-none">
                          {row.funcao}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">{row.pixInfo}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/70 pt-3.5">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Repasse Devido</span>
                        <span className="text-base font-black text-slate-900 font-mono block mt-1">{formatCurrency(row.totalCommission)}</span>
                      </div>

                      {/* Interactive settlement checkbox trigger */}
                      <button
                        type="button"
                        onClick={() => toggleRepassePaid(row.reconKey)}
                        className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer select-none items-center gap-1.5 focus:outline-none ${
                          row.isSettled 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{row.isSettled ? 'Líquido / Pago' : 'Confirmar Pix'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VIEW TAB: FOLHA DE PARCEIROS                          */}
      {/* ======================================================== */}
      {activeSubTab === 'parceiros' && isAdmin && (
        <div id="tab-parceiros-payroll" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-5 py-4 border-b border-slate-150">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>Comissionamento das Pousadas Parceiras ({partnerPayroll.length})</span>
            </h3>
          </div>

          <div className="p-5">
            {partnerPayroll.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                Nenhuma comissão devida a pousadas neste período.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partnerPayroll.map(row => (
                  <div 
                    key={row.id} 
                    className={`border border-l-8 rounded-2xl p-5 flex flex-col justify-between h-auto gap-3.5 transition shadow-xs hover:shadow-sm ${
                      row.isSettled ? 'bg-emerald-50/15 border-emerald-200 border-l-emerald-500' : 'bg-white border-slate-200 border-l-amber-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900">{row.nome}</h4>
                        <span className="text-[9px] uppercase font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded leading-none">
                          comissão: {row.rate}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">{row.pixInfo}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/70 pt-3.5">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">PIX Pendente</span>
                        <span className="text-base font-black text-slate-900 font-mono block mt-1">{formatCurrency(row.totalCommission)}</span>
                      </div>

                      {/* Settlement Action toggle */}
                      <button
                        type="button"
                        onClick={() => toggleRepassePaid(row.reconKey)}
                        className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer select-none items-center gap-1.5 focus:outline-none ${
                          row.isSettled 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{row.isSettled ? 'Pix Enviado' : 'Marcar Pago'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STANDARDIZED LAUNCH / GESTÃO DE LANÇAMENTO PORTAL MODAL  */}
      {/* ======================================================== */}
      {isLaunchModalOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
            {/* Backdrop Dismiss trigger */}
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLaunchModalOpen(false);
                setEditingSale(null);
              }}
            />

            {/* Standardized popup window wrapper */}
            <motion.div
              className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col focus:outline-none overflow-hidden text-white"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.12 }}
            >
              {/* Top dismissal button */}
              <button
                type="button"
                onClick={() => {
                  setIsLaunchModalOpen(false);
                  setEditingSale(null);
                }}
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-white/40 hover:text-white border border-white/10 shrink-0 cursor-pointer"
                title="Fechar Formulário"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Form header details */}
              <div className="mb-6 col-span-3">
                <span className="text-[10px] bg-indigo-500 text-white font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-400/20">
                  Operação e Fechamento
                </span>
                <h2 className="text-xl font-extrabold text-white mt-2 leading-none uppercase tracking-wide">
                  {editingSale ? 'Editar Lançamento de Venda' : 'Registrar Novo Lançamento'}
                </h2>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                  Logística, Produtos e Partilha Financeira Instantânea
                </p>
              </div>

              {/* Central scrollable area */}
              <form onSubmit={handleFormSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-2">
                
                {/* 1. SECTOR ONE: LOGISTIC METADATA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="col-span-3 mb-1 -mt-1">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">Informações do Cliente</span>
                  </div>

                  {/* Nome do Cliente */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">NOME</label>
                    <input
                      type="text"
                      required
                      value={formData.nomeCliente}
                      onChange={(e) => setFormData({ ...formData, nomeCliente: e.target.value })}
                      placeholder="Ex: Clara de Souza, Tiago Silva..."
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-semibold mt-1"
                    />
                  </div>

                  {/* Data do Lançamento */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Data do Serviço</label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono text-white mt-1"
                    />
                  </div>

                  {/* WhatsApp Cellphone */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">WHATSAPP</label>
                    <input
                      type="text"
                      required
                      placeholder="Apenas números, ex: 11999998888"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono mt-1"
                    />
                  </div>

                  {/* Hospedagem / Pousada */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Hospedagem / Local</label>
                    <input
                      type="text"
                      placeholder="Ex: Pousada Maresias"
                      value={formData.hospedagem}
                      onChange={(e) => setFormData({ ...formData, hospedagem: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono mt-1"
                    />
                  </div>

                  {/* Qtd de Pessoas (No spinners - Plain text value) */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Qtd de Pessoas</label>
                    <input
                      type="text"
                      value={formData.pessoas}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, pessoas: val });
                      }}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono font-bold text-center mt-1"
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">E-MAIL</label>
                    <input
                      type="email"
                      placeholder="nome@dominio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>

                  {/* Parceria Associada */}
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">PARCEIRO(A)</label>
                      {lockedPartnerId && (
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Travado</span>
                      )}
                    </div>
                    <select
                      value={formData.parceiroId}
                      disabled={!!lockedPartnerId}
                      onChange={(e) => setFormData({ ...formData, parceiroId: e.target.value })}
                      className="w-full bg-[#1e293b] border border-white/10 px-3 py-2 text-sm rounded-xl block mt-1 disabled:opacity-50"
                    >
                      <option value="">Nenhuma Parceria</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nomeParceiro} {isAdmin ? `(${p.comissaoPadrao}% comissão)` : ''}
                        </option>
                      ))}
                    </select>

                    {!lockedPartnerId && (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setInLaunchPartnerName('');
                            setInLaunchPartnerWhatsapp('');
                            setInLaunchPartnerCommission('10');
                            setIsAddNewPartnerModalOpen(true);
                          }}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-extrabold uppercase hover:underline cursor-pointer flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>Cadastrar Novo Parceiro</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SECTOR TWO: CORE ACTIVITY & PACKAGE SELECTOR */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="mb-1 -mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">VALORES E PACOTES</span>
                    
                    {/* Activity selection */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-white/40">ATIVIDADE:</span>
                      <select
                        value={formData.atividadeId}
                        onChange={(e) => {
                          setFormData({ ...formData, atividadeId: e.target.value });
                          setSelectedPackageId('');
                          setCartItems([]); // Clear bag upon switching core logistics
                        }}
                        className="bg-[#1e293b] text-white text-xs font-bold border border-white/15 rounded-lg px-2 py-1 cursor-pointer"
                      >
                        <option value="">-- Selecione uma Atividade --</option>
                        {eligibleActivities.map(act => (
                          <option key={act.id} value={act.id}>{act.nomeAtividade}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Add packages selector inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                    
                    {/* Package list matching picked activity */}
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Selecione o Produto / Pacote</label>
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="w-full bg-[#1e293b] border border-white/10 px-3 py-2 text-xs rounded-xl text-white"
                      >
                        <option value="">Selecione o pacote associado...</option>
                        {packages
                          .filter(pkg => pkg.atividadeId === formData.atividadeId && !pkg.arquivado)
                          .map(pkg => {
                            const rate = pkg.precoStandard ?? (pkg as any).precoBase ?? 0;
                            const subLabel = pkg.tipoPreco === 'Standard' 
                              ? `R$ ${rate} por pessoa` 
                              : pkg.tipoPreco === 'Foto'
                              ? `R$ ${rate} por foto`
                              : pkg.tipoPreco === 'ProgressivoPessoa'
                              ? `R$ ${pkg.precoPrimeiraPessoa ?? 0} (1ª) + R$ ${pkg.precoSegundaPessoa ?? 0} (2ª) + R$ ${pkg.precoAdicionalPessoa ?? 0}/adicional`
                              : 'Preço Progressivo por Item';
                            return (
                              <option key={pkg.id} value={pkg.id}>{pkg.nomePacote} ({subLabel})</option>
                            );
                          })}
                      </select>
                    </div>

                    {/* Photos quantity input (Renders for Especial and Foto if Venda Direta) */}
                    {currentSelectedPackage && (currentSelectedPackage.tipoPreco === 'Especial' || currentSelectedPackage.tipoPreco === 'Foto') && currentSelectedPackage.vendaDireta !== false ? (
                      <div>
                        <label className="text-[9px] font-black uppercase text-white/40 block mb-1">
                          Quantidade de Fotos Compradas
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 5"
                          value={specialPhotoQty}
                          onChange={(e) => setSpecialPhotoQty(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#1e293b] border border-white/10 px-3 py-2 text-xs rounded-xl font-mono text-center block text-white focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col justify-end text-[10px] text-white/50 pl-2">
                        {currentSelectedPackage && (
                          <div className="space-y-0.5">
                            {currentSelectedPackage.tipoPreco === 'ProgressivoPessoa' ? (
                              <>
                                <p>Preço 1ª pessoa: <strong className="text-emerald-400">{formatCurrency(currentSelectedPackage.precoPrimeiraPessoa || 0)}</strong></p>
                                <p>Preço 2ª pessoa: <strong className="text-emerald-400">{formatCurrency(currentSelectedPackage.precoSegundaPessoa ?? 0)}</strong></p>
                                <p>Preço adicional (a partir da 3ª): <strong className="text-emerald-400">{formatCurrency(currentSelectedPackage.precoAdicionalPessoa || 0)}</strong></p>
                              </>
                            ) : (
                              currentSelectedPackage.tipoPreco === 'Standard' && (
                                <p>Preço unitário: <strong className="text-emerald-400">{formatCurrency(currentSelectedPackage.precoStandard ?? (currentSelectedPackage as any).precoBase ?? 0)} cada</strong></p>
                              )
                            )}
                            <p>Teto de fotos/pax: <strong className="text-white">{currentSelectedPackage.maxFotosEnviadas || 0} fotos</strong></p>
                            <p>Limite total faturado: <strong className="text-indigo-400 font-mono">{liveScaledPhotoLimit} fotos</strong></p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add trigger */}
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={handleAddItemToCart}
                        disabled={!selectedPackageId}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 font-black uppercase text-[10px] py-2 px-4 rounded-xl disabled:opacity-40 transition cursor-pointer text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                  </div>

                  {/* Dynamic inputs for Photos inside VALORES E PACOTES */}
                  {(currentSelectedPackage || cartItems.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
                      {isSelectionDependentActive ? (
                        <>
                          {/* FOTOS ENVIADAS (Selection Dependent) */}
                          <div>
                            <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block mb-1 text-left">FOTOS ENVIADAS</label>
                            <input
                              type="text"
                              placeholder="Qtd enviada ao cliente"
                              value={formData.fotosEnviadas}
                              onChange={(e) => setFormData({ ...formData, fotosEnviadas: e.target.value.replace(/\D/g, '') })}
                              className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono font-bold text-center text-white"
                            />
                            <p className="text-[9px] text-white/30 text-left mt-1 uppercase font-bold">Estas fotos não geram faturamento imediato</p>
                          </div>
                          
                          {/* FOTOS VENDIDAS */}
                          <div>
                            <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block mb-1 text-left">FOTOS VENDIDAS</label>
                            <input
                              type="text"
                              placeholder="Qtd de fotos compradas"
                              value={formData.fotosVendidas}
                              onChange={(e) => setFormData({ ...formData, fotosVendidas: e.target.value.replace(/\D/g, '') })}
                              className="w-full bg-[#1e293b] border border-emerald-500/45 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-emerald-500 font-mono font-bold text-center text-white"
                            />
                            <p className="text-[9px] text-emerald-400 text-left mt-1 uppercase font-bold">Inicia o cálculo de faturamento e repasses</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* FOTOS ENVIADAS (Venda Direta / Pacote Fechado) */}
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block mb-1 text-left">FOTOS ENVIADAS</label>
                            <input
                              type="text"
                              placeholder="Quantidade entregue"
                              value={formData.fotosEnviadas}
                              onChange={(e) => setFormData({ ...formData, fotosEnviadas: e.target.value.replace(/\D/g, '') })}
                              className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 font-mono font-bold text-center text-white"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Live Multiplication Preview for chosen Package with Discount integration */}
                  {currentSelectedPackage && (
                    <div className="bg-indigo-950/40 border border-indigo-500/25 p-5 rounded-2xl text-left text-xs font-semibold leading-relaxed space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">Produto Selecionado</span>
                        <strong className="text-white uppercase font-black">{currentSelectedPackage.nomePacote} ({currentSelectedPackage.tipoPreco})</strong>
                      </div>

                      <div className="flex justify-between items-center border-t border-white/5 pt-2.5 text-slate-300">
                        <span>Subtotal do Produto</span>
                        <strong className="font-mono text-xs font-bold text-white">{formatCurrency(currentItemCalculatedSubtotal)}</strong>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-center bg-slate-900/40 p-3.5 rounded-xl border border-white/5">
                        <div>
                          <label className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block mb-1">Desconto Aplicado (R$)</label>
                          <input
                            type="text"
                            placeholder="0.00"
                            value={formData.descontoManual}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setFormData({ ...formData, descontoManual: val });
                            }}
                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs rounded-lg block focus:outline-none focus:border-indigo-500 font-mono text-center text-rose-300"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Valor Final do Produto</span>
                          <strong className="font-mono text-emerald-450 font-black text-sm block">
                            {formatCurrency(Math.max(0, currentItemCalculatedSubtotal - (parseFloat(formData.descontoManual) || 0)))}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Added items block */}
                  {cartItems.length > 0 && (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/30">
                      <div className="bg-white/5 px-4 py-2 border-b border-white/10 text-[9px] uppercase font-bold text-white/40">
                        Sacola do Atendimento Ativo
                      </div>
                      <div className="divide-y divide-white/10">
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-white block">{item.nome}</span>
                              {item.quantidadeFotos !== undefined && item.quantidadeFotos > 0 && (
                                <span className="text-[10px] text-slate-400 block">{item.quantidadeFotos} fotos vendidas</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold font-mono text-slate-300">{formatCurrency(item.subtotal)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(idx)}
                                className="text-rose-400 hover:text-rose-500 p-1 bg-white/5 hover:bg-white/10 rounded-md transition"
                                title="Remover item da sacola"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* 3. SECTOR THREE: TRANSACTION STATUS & VALUES */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5 bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="col-span-4 mb-1 -mt-1">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">DADOS DO LANÇAMENTO</span>
                  </div>

                  {/* Vendedor associado (Disabled for Staff) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Fotógrafo / Vendedor</label>
                    <select
                      value={formData.vendedorId}
                      disabled={!isAdmin}
                      onChange={(e) => setFormData({ ...formData, vendedorId: e.target.value })}
                      className="w-full bg-[#1e293b] disabled:opacity-60 border border-white/10 px-3 py-2 text-sm rounded-xl block mt-1 text-white font-bold animate-fade-in text-left"
                    >
                      <option value="">Selecione...</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{getTeammateName(c)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Banner */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Status do Lançamento</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-[#1e293b] border border-white/10 px-3 py-2 text-sm rounded-xl block font-bold text-center mt-1 text-white animate-fade-in"
                    >
                      <option value="Pago" className="text-emerald-400 font-bold">PAGO</option>
                      <option value="Pendente" className="text-amber-400 font-bold">Pendente</option>
                      <option value="Abandonada" className="text-rose-400 font-bold">Abandonada</option>
                      <option value="Cancelado" className="text-slate-400 font-bold">Cancelado</option>
                    </select>
                  </div>

                  {/* MULTIPLE PAYMENT METHODS SECTION */}
                  <div className="md:col-span-4 space-y-4 bg-slate-950/20 p-4 rounded-2xl border border-white/5 text-left">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <span className="text-[10px] text-white/50 font-black uppercase tracking-wider block">Formas de Pagamento</span>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentRows(prev => [...prev, { forma: '', valor: '' }]);
                        }}
                        className="inline-flex items-center gap-1.5 text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-extrabold uppercase px-3 py-2 rounded-xl border border-indigo-500/20 transition cursor-pointer text-left shrink-0"
                      >
                        <Plus className="w-3 h-3 shrink-0" />
                        <span>+ Adicionar forma de pagamento</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {paymentRows.map((row, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 animate-fade-in">
                          <div className="flex-1">
                            <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Método</label>
                            <select
                              value={row.forma}
                              onChange={(e) => {
                                const newRows = [...paymentRows];
                                newRows[index].forma = e.target.value;
                                setPaymentRows(newRows);
                              }}
                              className="w-full bg-[#1e293b] border border-white/10 px-3 py-2 text-xs rounded-xl text-white font-bold"
                            >
                              <option value="" disabled hidden>Selecione...</option>
                              <option value="PIX">PIX</option>
                              <option value="Cartão de Crédito">Cartão de Crédito</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="Cartão de Débito">Cartão de Débito</option>
                              <option value="PayPal">PayPal</option>
                              <option value="Transferência">Transferência</option>
                            </select>
                          </div>

                          <div className="w-full sm:w-48">
                            <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Valor (R$)</label>
                            <input
                              type="text"
                              placeholder="e.g. 150.00"
                              value={row.valor}
                              onChange={(e) => {
                                const numeric = e.target.value.replace(/[^0-9.]/g, '');
                                const newRows = [...paymentRows];
                                newRows[index].valor = numeric;
                                setPaymentRows(newRows);
                              }}
                              className="w-full bg-slate-900 border border-white/10 px-3 py-2 text-xs rounded-xl text-white font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {paymentRows.length > 1 && (
                            <div className="flex items-end justify-center pt-2 sm:pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentRows(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="text-white hover:text-white p-2 bg-rose-700 hover:bg-rose-800 border border-rose-600 rounded-xl transition cursor-pointer shrink-0"
                                title="Remover esta forma de pagamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* SUM vs TOTAL WARNING TRIGGER */}
                    {(() => {
                      const totalPayments = paymentRows.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
                      const difference = Math.abs(totalPayments - liveTotalValue);
                      const isDifferent = difference > 0.01;
                      
                      if (isDifferent) {
                        return (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2.5 mt-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <p className="text-[10px] text-amber-300 leading-relaxed font-bold normal-case text-left">
                              A soma das formas de pagamento (<strong>{formatCurrency(totalPayments)}</strong>) difere do Total Geral do lançamento (<strong>{formatCurrency(liveTotalValue)}</strong>). 
                              A gravação não está bloqueada, mas sugerimos que valide os valores.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Notes text logs */}
                  <div className="md:col-span-8 text-left font-bold">
                    <label className="text-[10px] font-black uppercase text-white/50 tracking-wider">Notas & Observações adicionais</label>
                    <input
                      type="text"
                      placeholder="Adicione observações para este atendimento..."
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm rounded-xl block focus:outline-none focus:border-indigo-500 mt-1 text-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Audit summary banner inside Modal for final checks - Discriminado */}
                <div className="bg-[#0f172a] p-5 rounded-2xl border border-white/10 space-y-3.5 text-left">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-450 border-b border-white/5 pb-2">
                    <span className="uppercase text-[9px] font-extrabold tracking-wider text-slate-400">Total dos Itens (Subtotal):</span>
                    <span className="font-mono text-white">{formatCurrency(effectiveCartItems.reduce((acc, item) => acc + item.subtotal, 0))}</span>
                  </div>
                  {parseFloat(formData.descontoManual) > 0 && (
                    <div className="flex justify-between items-center text-xs font-semibold text-rose-400 border-b border-white/5 pb-2">
                      <span className="uppercase text-[9px] font-extrabold tracking-wider text-rose-300">Desconto Aplicado:</span>
                      <span className="font-mono font-bold">- {formatCurrency(parseFloat(formData.descontoManual) || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <span className="text-[9px] text-white/40 uppercase font-black tracking-wider leading-none block">VALOR FINAL</span>
                      <h3 className="text-xl font-mono font-black text-emerald-400 mt-1">{formatCurrency(liveTotalValue)}</h3>
                    </div>
                    {/* Formas de pagamento discriminadas */}
                    <div className="text-right text-[10px] text-slate-300 space-y-0.5">
                      <span className="text-[8px] text-slate-400 uppercase font-bold block leading-none mb-1">Formas de Pagamento:</span>
                      {paymentRows.map((row, idx) => {
                        const val = parseFloat(row.valor) || 0;
                        if (val <= 0 || !row.forma) return null;
                        return (
                          <div key={idx} className="font-mono font-medium">
                            <span className="text-white">{row.forma}:</span> {formatCurrency(val)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {validationError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold p-3.5 rounded-xl text-center text-xs mt-2 shrink-0">
                    {validationError}
                  </div>
                )}

                {/* Actions Button Footers */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 shrink-0">
                  
                  {/* Left: Delete fully option for admins or owners */}
                  {editingSale && (isAdmin || editingSale.vendedorId === currentUser.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isConfirmingLaunchDelete) {
                          deleteSale(editingSale.id);
                          setIsLaunchModalOpen(false);
                          setEditingSale(null);
                          setIsConfirmingLaunchDelete(false);
                        } else {
                          setIsConfirmingLaunchDelete(true);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 font-extrabold uppercase text-[10px] py-2 px-3 border rounded-xl focus:outline-none transition cursor-pointer ${
                        isConfirmingLaunchDelete
                          ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                          : 'text-rose-700 bg-rose-100 hover:bg-rose-200 border-rose-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isConfirmingLaunchDelete ? 'Confirmar Exclusão' : 'Excluir Lançamento'}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {/* Right: Triggers */}
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLaunchModalOpen(false);
                        setEditingSale(null);
                      }}
                      className="w-full sm:w-auto text-xs font-black uppercase text-white/50 hover:text-white py-3 px-5 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wide py-3.5 px-7 rounded-2xl transition shadow-md active:scale-95 cursor-pointer"
                    >
                      {editingSale ? 'Salvar Alterações' : 'Gravar Faturamento'}
                    </button>
                  </div>

                </div>

              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* CLICK-TO-VIEW: COMPREHENSIVE SERVICE LEDGER DETAILS MODAL */}
      {selectedSaleDetailId && (() => {
        const detailSale = sales.find(s => s.id === selectedSaleDetailId);
        if (!detailSale) return null;
        const collab = collaborators.find(c => c.id === detailSale.vendedorId);
        const partner = partners.find(p => p.id === detailSale.parceiroId);
        const act = activities.find(a => a.id === detailSale.atividadeId);

        return createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
              <motion.div
                className="absolute inset-0 bg-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSaleDetailId(null)}
              />

              <motion.div
                className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-auto flex flex-col text-white z-10"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setSelectedSaleDetailId(null)}
                  className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="space-y-1 mb-8 text-left">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block font-bold">AUDITORIA E CONSULTA DE LANÇAMENTO</span>
                  <h3 className="text-xl font-bold tracking-tight text-white uppercase">{detailSale.nomeCliente}</h3>
                  <p className="text-slate-400 text-xs mt-1">ID do Lançamento: <span className="font-mono text-indigo-300 font-bold">{detailSale.id}</span> • Registrado em: <span className="font-mono text-slate-300 font-bold">{formatDate(detailSale.data)}</span></p>
                </div>

                {/* Details layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-sm leading-relaxed overflow-y-auto max-h-[60vh] pr-2">
                  
                  {/* Column 1 */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider mb-2 font-bold">Passagem & Contato</h4>
                      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5 font-bold text-slate-200">
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Cliente: <strong className="text-white font-black">{detailSale.nomeCliente}</strong></span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Whats: <span className="font-mono text-indigo-400">{detailSale.whatsapp}</span></span>
                        </p>
                        {detailSale.email && (
                          <p className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Email: <span className="font-mono text-slate-300 font-normal">{detailSale.email}</span></span>
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Pousada: <strong className="text-slate-200 font-bold">{detailSale.hospedagem || 'Não Informada'}</strong></span>
                        </p>
                      </div>

                      {/* WhatsApp Recovery Section */}
                      {detailSale.status === 'Abandonada' && (
                        <div className="bg-emerald-950/40 border border-emerald-500/20 p-4 rounded-xl space-y-3 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 font-sans">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                              Recuperação de Venda Abandonada
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-450 uppercase tracking-widest pl-1 font-sans">
                              Mensagem customizada:
                            </label>
                            <textarea
                              value={customWppMsg}
                              onChange={(e) => setCustomWppMsg(e.target.value)}
                              rows={3}
                              className="w-full text-[11px] bg-slate-900/90 border border-white/10 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500/50 resize-y font-medium font-sans"
                            />
                          </div>

                          {(() => {
                            const cleanPhone = detailSale.whatsapp.replace(/\D/g, '');
                            const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
                            const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customWppMsg)}`;
                            
                            return (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all cursor-pointer text-white font-extrabold text-xs uppercase shadow-xs tracking-wide"
                              >
                                <MessageSquare className="w-4 h-4 text-emerald-100 mr-1 shrink-0" />
                                <span>Enviar via WhatsApp</span>
                              </a>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider mb-2 font-bold">Logística do Serviço</h4>
                      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5 font-bold text-slate-250">
                        <p>Atividade: <strong className="text-white font-extrabold">{act?.nomeAtividade || 'Atividade Desconhecida'}</strong></p>
                        <p>Forma de Pagamento: <strong className="text-white">{detailSale.formaPagamento}</strong></p>
                        <div className="flex items-center gap-2.5">
                          <span>Status Financeiro:</span>
                          <div>
                            {detailSale.status === 'Pago' ? (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500 rounded uppercase">PAGO</span>
                            ) : detailSale.status === 'Abandonada' ? (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-rose-400/20 text-rose-300 border border-rose-500 rounded uppercase">ABANDONADA</span>
                            ) : detailSale.status === 'Cancelado' ? (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-slate-700/30 text-slate-400 border border-white/10 rounded uppercase">CANCELADO</span>
                            ) : (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-500 rounded uppercase animate-pulse">PENDENTE</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider mb-2 font-bold">Entrega & Desperdício</h4>
                      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2 font-semibold text-slate-300 text-xs">
                        <p>Qtd Pessoas: <strong className="text-white">{detailSale.pessoas} pax</strong></p>
                        <p>Fotos Faturadas: <strong className="text-indigo-300 font-mono">{detailSale.fotosEnviadas} fotos</strong></p>
                        
                        {(() => {
                          const maxLimit = detailSale.sacolaItens.reduce((acc, item) => {
                            const p = packages.find(pkg => pkg.id === item.pacoteId);
                            if (!p) return acc;
                            if (p.possuiLimiteFotosPorPessoa && p.limiteFotosPorPessoa !== undefined) {
                              return acc + (p.limiteFotosPorPessoa * (detailSale.pessoas || 1));
                            }
                            const factor = (p.tipoPreco === 'Standard' || p.tipoPreco === 'Especial') ? (detailSale.pessoas || 1) : 1;
                            return acc + ((p.maxFotosEnviadas || 0) * factor);
                          }, 0);
                          const isWaste = detailSale.fotosEnviadas > maxLimit && maxLimit > 0;
                          
                          return (
                            <div className="mt-2 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-white/5 font-bold space-y-1">
                              <p>Limite acordado do pacote: <strong className="text-indigo-400">{maxLimit} fotos</strong></p>
                              {isWaste && (
                                <p className="text-rose-400 animate-pulse flex items-center gap-1 font-black">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Desperdício: +{detailSale.fotosEnviadas - maxLimit} fotos excedidas!
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider mb-2 font-bold">Sacola de Produtos</h4>
                      <div className="bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                        {detailSale.sacolaItens.map((item, idx) => (
                          <div key={idx} className="p-3.5 flex justify-between gap-3 text-xs font-bold">
                            <div>
                              <span className="text-white block font-black">{item.nome}</span>
                              {item.quantidadeFotos !== undefined && item.quantidadeFotos > 0 && (
                                <span className="text-[10px] text-white/40 block font-normal mt-0.5">{item.quantidadeFotos} fotos</span>
                              )}
                            </div>
                            <div className="text-right font-mono text-[11px]">
                              <span className="text-indigo-300 block">{formatCurrency(item.subtotal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider mb-2 font-bold">Distribuição de split</h4>
                      <div className="bg-[#111827] border border-white/10 p-4 rounded-xl space-y-2.5 font-bold text-xs">
                        {(() => {
                          const vCommission = calculateCollaboratorCommission(detailSale, collab, act);
                          const pCommission = calculatePartnerCommission(detailSale, partner, act);
                          const companyRetention = Math.max(0, detailSale.valorTotal - vCommission - pCommission);

                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between border-b border-white/5 pb-1.5">
                                <span className="text-white/50">Faturamento Real Total:</span>
                                <strong className="text-white font-black font-mono">{formatCurrency(detailSale.valorTotal)}</strong>
                              </div>
                              
                              <div className="flex justify-between text-indigo-300">
                                <span>Repasse Fotógrafo:</span>
                                <strong className="font-mono">{formatCurrency(vCommission)}</strong>
                              </div>
                              {collab && (
                                <p className="text-[10px] text-white/40 -mt-1 leading-none pl-1">
                                  Vendedor: {collab.nomeCompleto}
                                </p>
                              )}

                              {isAdmin ? (
                                <>
                                  <div className="flex justify-between text-emerald-300">
                                    <span>Repasse Parceria Comercial:</span>
                                    <strong className="font-mono">{formatCurrency(pCommission)}</strong>
                                  </div>
                                  {partner && (
                                    <p className="text-[10px] text-white/40 -mt-1 leading-none pl-1">
                                      Pousada: {partner.nomeParceiro}
                                    </p>
                                  )}

                                  <div className="flex justify-between text-yellow-300 border-t border-white/5 pt-1.5 font-bold">
                                    <span>Margem Líquida Retida Empresa:</span>
                                    <strong className="font-mono">{formatCurrency(companyRetention)}</strong>
                                  </div>
                                </>
                              ) : (
                                partner && (
                                  <div className="border-t border-white/5 pt-1.5 mt-1">
                                    <p className="text-[10px] text-white/40 leading-none">
                                      Parceria Vinculada: <span className="text-slate-200 font-extrabold">{partner.nomeParceiro}</span>
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Notas text input content */}
                    {(detailSale.notas || detailSale.notes) && (
                      <div className="bg-amber-950/25 border border-amber-500/10 p-3 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-amber-500 block">Notas de Atendimento</span>
                        <p className="text-amber-200/90 leading-relaxed text-xs mt-1 font-bold">{detailSale.notas || detailSale.notes}</p>
                      </div>
                    )}

                  </div>
                </div>

                {/* Footer and authorization checks */}
                <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-transparent">
                  {isAdmin ? (
                    <p className="text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[10px] text-left leading-normal font-bold max-w-sm">
                      Modo ADM (info@allangle.com.br): Você tem permissão de edição e exclusão total para corrigir faturamentos retroativos de colaboradores.
                    </p>
                  ) : (
                    <div className="text-[11px] text-white/50 font-bold">
                      {detailSale.vendedorId === currentUser.id ? (
                        <span className="text-emerald-400">Você é o criador deste lançamento e tem permissões de edição e exclusão.</span>
                      ) : (
                        <span className="text-rose-400">Este lançamento pertence a outro colaborador (Apenas Leitura).</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end w-full sm:w-auto">
                    {(isAdmin || detailSale.vendedorId === currentUser.id) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            startEditSale(detailSale);
                            setSelectedSaleDetailId(null);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition focus:outline-none cursor-pointer"
                        >
                          Editar Lançamento
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmDeleteId === detailSale.id) {
                              deleteSale(detailSale.id);
                              setSelectedSaleDetailId(null);
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(detailSale.id);
                            }
                          }}
                          className={`px-4 py-2 text-xs font-bold uppercase transition rounded-xl focus:outline-none cursor-pointer ${
                            confirmDeleteId === detailSale.id 
                              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                              : 'bg-rose-600/40 border border-rose-500/20 hover:bg-rose-600 text-rose-200'
                          }`}
                        >
                          {confirmDeleteId === detailSale.id ? 'Confirmar Exclusão' : 'Excluir'}
                        </button>
                      </>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setSelectedSaleDetailId(null)}
                      className="px-4 py-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          </AnimatePresence>,
          document.body
        );
      })()}

      {/* ADD NEW PARTNER MAIN MODAL OVERLAY (POR CIMA DE TUDO) */}
      {isAddNewPartnerModalOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
            <motion.div
              className="absolute inset-0 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddNewPartnerModalOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl my-auto flex flex-col text-white z-10"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAddNewPartnerModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] block mb-1">Parceria Comercial</span>
                  <h3 className="text-xl font-black text-white uppercase font-sans">Cadastrar Novo Parceiro</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-sans">Abra uma exceção de cadastro imediato preenchendo as informações do novo parceiro abaixo.</p>
                </div>

                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/45 uppercase pl-2 font-sans">Nome do Parceiro / Pousada</label>
                    <input
                      type="text"
                      placeholder="Ex: Pousada Maresias, Marcelo Guia..."
                      value={inLaunchPartnerName}
                      onChange={(e) => setInLaunchPartnerName(e.target.value)}
                      className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-xl text-white font-bold placeholder-white/20 text-xs focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/45 uppercase pl-2 font-sans">WhatsApp Corporativo</label>
                      <input
                        type="text"
                        placeholder="Apenas números com DDD"
                        value={inLaunchPartnerWhatsapp}
                        onChange={(e) => setInLaunchPartnerWhatsapp(e.target.value)}
                        className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-xl text-white font-mono font-bold placeholder-white/20 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/45 uppercase pl-2 font-sans">Taxa de Comissão (%)</label>
                      <input
                        type="text"
                        placeholder="Ex: 10"
                        value={inLaunchPartnerCommission}
                        onChange={(e) => setInLaunchPartnerCommission(e.target.value)}
                        className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-xl text-white font-mono font-bold placeholder-white/20 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddNewPartnerModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer text-center font-sans"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleInLaunchPartnerCreate}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer text-center font-sans font-black"
                  >
                    Salvar e Vincular
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* COORDENAÇÃO DE SINCRONIZAÇÃO ALINHADA (POR CIMA DE TUDO - PORTAL) */}
      {isSyncModalOpen && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="absolute inset-0 bg-transparent" onClick={() => { if (syncStatusMsg.type !== 'loading') setIsSyncModalOpen(false); }} />

          <div className="relative w-full max-w-xl bg-white border rounded-[2rem] p-7 md:p-9 shadow-2xl my-auto flex flex-col text-slate-800 z-10 font-sans border-slate-200">
            {/* Close */}
            <button
              type="button"
              disabled={syncStatusMsg.type === 'loading'}
              onClick={() => setIsSyncModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Sincronização & Alinhamento</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Acesso de Administrador</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                Esta central permite corrigir manualmente discrepâncias quando o aplicativo estiver mostrando duplicados ou dados antigos. Você pode forçar a sincronização de um lado para o outro.
              </p>

              {/* Status Message Display */}
              {syncStatusMsg.type && (
                <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 font-bold ${
                  syncStatusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  syncStatusMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                  'bg-indigo-50 border-indigo-100 text-indigo-800 animate-pulse'
                }`}>
                  {syncStatusMsg.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  {syncStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  {syncStatusMsg.type === 'loading' && <RefreshCw className="w-4 h-4 text-indigo-800 shrink-0 mt-0.5 animate-spin" />}
                  <div className="space-y-1">
                    <p className="uppercase tracking-wider text-[10px]">
                      {syncStatusMsg.type === 'success' ? '➔ Operação Concluída!' :
                       syncStatusMsg.type === 'error' ? '➔ Falha na Operação' :
                       '➔ Processando dados na Nuvem...'}
                    </p>
                    <p className="font-semibold">{syncStatusMsg.text}</p>
                  </div>
                </div>
              )}

              {/* Core Operations Selection */}
              {!confirmSyncAction && syncStatusMsg.type !== 'loading' && (
                <div className="space-y-4 pt-1">
                  
                  {/* Action 1: Force PUSH (Overwrite cloud) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition gap-4">
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-black uppercase text-slate-900">Sobrescrever Tudo na Nuvem</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Apaga o banco na nuvem e envia <strong>exatamente</strong> o que você está vendo no seu navegador agora. Soluciona equipe duplicada e histórico fantasma.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmSyncAction('push')}
                      className="bg-[#0e2438] hover:bg-[#1a3a57] text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl transition shrink-0 tracking-wider cursor-pointer"
                    >
                      Forçar Envio
                    </button>
                  </div>

                  {/* Action 2: Force PULL (Overwrite local) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition gap-4">
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-black uppercase text-slate-900">Substituir Dados Locais</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Limpa a memória deste aparelho e faz o download limpo do que já está armazenado atualmente na nuvem pública.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmSyncAction('pull')}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl transition shrink-0 tracking-wider cursor-pointer"
                    >
                      Forçar Download
                    </button>
                  </div>

                  {/* Action 3: Wipe All */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-50/50 hover:bg-rose-50 rounded-2xl border border-rose-100 transition gap-4">
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <h4 className="text-xs font-black uppercase text-rose-900">Zerar Tudo (Reset Geral)</h4>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-normal font-medium">
                        Exclui permanentemente todos os registros, lançamentos, parceiros e configurações da nuvem e também do seu dispositivo. Ideal para recomeçar do zero.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmSyncAction('wipe')}
                      className="bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-extrabold uppercase py-2.5 px-4 rounded-xl transition shrink-0 tracking-wider cursor-pointer border border-rose-800"
                    >
                      Zerar Tudo
                    </button>
                  </div>

                </div>
              )}

              {/* Dynamic Action Confirmations */}
              {confirmSyncAction && syncStatusMsg.type !== 'loading' && (
                <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 text-left">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Aviso de Segurança</h4>
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {confirmSyncAction === 'push' && "Você vai sobrescrever os dados na nuvem com o seu navegador. Outros computadores conectados receberão esta mesma versão limpa. Confirma?"}
                    {confirmSyncAction === 'pull' && "Isso apagará o histórico atual deste navegador para baixar o que está no servidor de dados. Confirma?"}
                    {confirmSyncAction === 'wipe' && "ATENÇÃO MÁXIMA: Isso apagará absolutamente TUDO e não pode ser desfeito. É um reset total. Confirma?"}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmSyncAction(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-750 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const action = confirmSyncAction;
                        setConfirmSyncAction(null);
                        setSyncStatusMsg({ type: 'loading', text: 'Comunicando com as tabelas de dados na nuvem corporativa...' });
                        try {
                          if (action === 'push') {
                            await forcePushLocalToCloud();
                            setSyncStatusMsg({ type: 'success', text: 'Você substituiu com êxito os dados remotos pelo seu estado atual. A partir de agora, todos os dispositivos verão exatamente esta mesma lista!' });
                          } else if (action === 'pull') {
                            await forcePullCloudToLocal();
                            setSyncStatusMsg({ type: 'success', text: 'Download concluído com sucesso. Sua memória local foi substituída pelas tabelas oficiais do servidor Firestore.' });
                          } else if (action === 'wipe') {
                            await wipeAllSystemData();
                            setSyncStatusMsg({ type: 'success', text: 'O sistema foi completamente redefinido. Todas as bases locais e na nuvem foram limpas.' });
                          }
                        } catch (e: any) {
                          setSyncStatusMsg({ type: 'error', text: `Impossível concluir operação na nuvem. Erro técnico: ${e.message || e}` });
                        }
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-400 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer text-center font-sans font-black"
                    >
                      Confirmar Operação
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
