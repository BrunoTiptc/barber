import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Usuario, Servico, EstabelecimentoConfig, Agendamento } from '../types';
import { Key, LogOut, Plus, Trash2, Edit2, Check, X, Users, Scissors, Clock, Settings, Bell, DollarSign, ListFilter, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  config: EstabelecimentoConfig;
  onConfigUpdated: (newConfig: EstabelecimentoConfig) => void;
  onSendSimulationNotification: (text: string) => void;
}

export default function AdminDashboard({ config, onConfigUpdated, onSendSimulationNotification }: AdminDashboardProps) {
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sub-tab Navigation
  const [activeTab, setActiveTab] = useState<'barbers' | 'services' | 'schedule' | 'settings' | 'reminders'>('barbers');

  // Database States
  const [barbeiros, setBarbeiros] = useState<Usuario[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [allAgendamentos, setAllAgendamentos] = useState<Agendamento[]>([]);
  const [stats, setStats] = useState({ totalBookings: 0, activeBookings: 0, revenue: 0 });

  // CRUD Forms - Barbers
  const [editingBarber, setEditingBarber] = useState<Usuario | null>(null);
  const [barberNome, setBarberNome] = useState('');
  const [barberEmail, setBarberEmail] = useState('');
  const [barberSenha, setBarberSenha] = useState('');
  const [barberFotoUrl, setBarberFotoUrl] = useState('');
  const [showBarberForm, setShowBarberForm] = useState(false);

  // CRUD Forms - Services
  const [editingService, setEditingService] = useState<Servico | null>(null);
  const [serviceNome, setServiceNome] = useState('');
  const [servicePreco, setServicePreco] = useState<number>(0);
  const [showServiceForm, setShowServiceForm] = useState(false);

  // Global Config form fields
  const [horarioInicio, setHorarioInicio] = useState(config.horario_inicio);
  const [horarioFim, setHorarioFim] = useState(config.horario_fim);
  const [intervalo, setIntervalo] = useState<number>(config.intervalo_minutos);
  const [diasBloqueados, setDiasBloqueados] = useState<number[]>(config.dias_bloqueados);

  // Reminder Automation config fields
  const [lembreteAtivo, setLembreteAtivo] = useState(config.lembretes_ativo);
  const [lembreteAntecedencia, setLembreteAntecedencia] = useState(config.lembretes_antecedencia);
  const [lembreteUnidade, setLembreteUnidade] = useState<'minutos' | 'horas' | 'dias'>(config.lembretes_unidade);

  // Filter Schedule State
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('todos');

  // Load configuration and listen to Firestore
  useEffect(() => {
    if (!isAdmin) return;

    // Listen to Barbers
    const qBarbers = query(collection(db, 'usuarios'), where('funcao', '==', 'barbeiro'));
    const unsubBarbers = onSnapshot(qBarbers, (snap) => {
      const list: Usuario[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Usuario));
      setBarbeiros(list);
    });

    // Listen to Services
    const unsubServices = onSnapshot(collection(db, 'servicos'), (snap) => {
      const list: Servico[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Servico));
      setServicos(list);
    });

    // Listen to All Bookings (real-time)
    const unsubBookings = onSnapshot(collection(db, 'agendamentos'), (snap) => {
      const list: Agendamento[] = [];
      let revenueSum = 0;
      let activeCount = 0;

      snap.forEach(d => {
        const appt = { id: d.id, ...d.data() } as Agendamento;
        list.push(appt);

        if (appt.status === 'confirmado') {
          activeCount++;
          revenueSum += appt.servico_preco || 0;
        }
      });

      // Sort by date then by time
      list.sort((a, b) => {
        const dateCompare = b.data.localeCompare(a.data);
        if (dateCompare !== 0) return dateCompare; // newer dates first in admin list
        return a.horario.localeCompare(b.horario);
      });

      setAllAgendamentos(list);
      setStats({
        totalBookings: list.length,
        activeBookings: activeCount,
        revenue: revenueSum
      });
    });

    return () => {
      unsubBarbers();
      unsubServices();
      unsubBookings();
    };
  }, [isAdmin]);

  // Sycn config form fields with prop config changes
  useEffect(() => {
    setHorarioInicio(config.horario_inicio);
    setHorarioFim(config.horario_fim);
    setIntervalo(config.intervalo_minutos);
    setDiasBloqueados(config.dias_bloqueados);
    setLembreteAtivo(config.lembretes_ativo);
    setLembreteAntecedencia(config.lembretes_antecedencia);
    setLembreteUnidade(config.lembretes_unidade);
  }, [config]);

  // Handle Admin Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const q = query(
        collection(db, 'usuarios'),
        where('email', '==', email.toLowerCase().trim()),
        where('funcao', '==', 'admin')
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        setLoginError('E-mail não cadastrado ou não possui acesso de Administrador.');
        setLoading(false);
        return;
      }

      let authed = false;
      snap.forEach(doc => {
        const u = doc.data() as Usuario;
        if (u.senha === password) {
          authed = true;
        }
      });

      if (authed) {
        setIsAdmin(true);
        onSendSimulationNotification("Administrador logado no painel de controle.");
      } else {
        setLoginError('Senha incorreta! Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Erro ao autenticar administrador.');
    } finally {
      setLoading(false);
    }
  };

  const autoFillAdmin = () => {
    setEmail('admin@salao.com');
    setPassword('admin123');
  };

  // ----- BARBER CRUD HANDLERS -----
  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberNome || !barberEmail || !barberSenha) return;

    try {
      const barberData: Omit<Usuario, 'id'> = {
        nome: barberNome,
        email: barberEmail.toLowerCase().trim(),
        funcao: 'barbeiro',
        senha: barberSenha,
        foto_url: barberFotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', // fallback default avatar
        horarios_bloqueados: editingBarber?.horarios_bloqueados || []
      };

      if (editingBarber) {
        // Edit
        await setDoc(doc(db, 'usuarios', editingBarber.id), { id: editingBarber.id, ...barberData });
        onSendSimulationNotification(`Barbeiro "${barberNome}" atualizado.`);
      } else {
        // Create
        const newDocRef = doc(collection(db, 'usuarios'));
        await setDoc(newDocRef, { id: newDocRef.id, ...barberData });
        onSendSimulationNotification(`Novo Barbeiro "${barberNome}" criado.`);
      }

      // Reset
      setBarberNome('');
      setBarberEmail('');
      setBarberSenha('');
      setBarberFotoUrl('');
      setEditingBarber(null);
      setShowBarberForm(false);
    } catch (err) {
      console.error("Erro ao salvar barbeiro:", err);
    }
  };

  const startEditBarber = (b: Usuario) => {
    setEditingBarber(b);
    setBarberNome(b.nome);
    setBarberEmail(b.email);
    setBarberSenha(b.senha || '');
    setBarberFotoUrl(b.foto_url);
    setShowBarberForm(true);
  };

  const handleDeleteBarber = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      onSendSimulationNotification(`Conta do Barbeiro ${name} excluída.`);
    } catch (err) {
      console.error(err);
    }
  };

  // ----- SERVICES CRUD HANDLERS -----
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNome || servicePreco <= 0) return;

    try {
      const sData: Omit<Servico, 'id'> = {
        nome_servico: serviceNome,
        preco: Number(servicePreco)
      };

      if (editingService) {
        await setDoc(doc(db, 'servicos', editingService.id), { id: editingService.id, ...sData });
        onSendSimulationNotification(`Serviço "${serviceNome}" atualizado.`);
      } else {
        const newDocRef = doc(collection(db, 'servicos'));
        await setDoc(newDocRef, { id: newDocRef.id, ...sData });
        onSendSimulationNotification(`Novo serviço "${serviceNome}" adicionado.`);
      }

      setServiceNome('');
      setServicePreco(0);
      setEditingService(null);
      setShowServiceForm(false);
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
    }
  };

  const startEditService = (s: Servico) => {
    setEditingService(s);
    setServiceNome(s.nome_servico);
    setServicePreco(s.preco);
    setShowServiceForm(true);
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o serviço "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'servicos', id));
      onSendSimulationNotification(`Serviço "${name}" removido.`);
    } catch (err) {
      console.error(err);
    }
  };

  // ----- ESTABLISHMENT HOURS CONFIG HANDLER -----
  const handleSaveGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newConfig: EstabelecimentoConfig = {
        id: 'global',
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        intervalo_minutos: Number(intervalo),
        dias_bloqueados: diasBloqueados,
        lembretes_ativo: lembreteAtivo,
        lembretes_antecedencia: Number(lembreteAntecedencia),
        lembretes_unidade: lembreteUnidade
      };

      await setDoc(doc(db, 'configuracoes', 'global'), newConfig);
      onConfigUpdated(newConfig);
      onSendSimulationNotification("Configurações do Estabelecimento salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar configurações:", err);
    }
  };

  // Helper to toggle weekday blocked
  const toggleDayBlocked = (dayNum: number) => {
    if (diasBloqueados.includes(dayNum)) {
      setDiasBloqueados(diasBloqueados.filter(d => d !== dayNum));
    } else {
      setDiasBloqueados([...diasBloqueados, dayNum]);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm("Deseja cancelar este agendamento?")) return;
    try {
      await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' });
      onSendSimulationNotification("Agendamento cancelado pelo Administrador.");
    } catch (err) {
      console.error(err);
    }
  };

  const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (!isAdmin) {
    return (
      <div id="admin-login-container" className="max-w-md mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Painel do Administrador</h2>
            <p className="text-slate-400 text-xs">Controle total do sistema, barbeiros e serviços</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">E-mail</label>
              <input
                type="email"
                required
                placeholder="admin@salao.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 placeholder:text-slate-600 outline-none focus:border-yellow-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 placeholder:text-slate-600 outline-none focus:border-yellow-500 transition-colors text-sm"
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              id="admin-login-submit-btn"
              className="w-full py-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Entrar no Controle'
              )}
            </button>
          </form>

          {/* Quick-Test Accounts Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Acesso Rápido para Teste:</span>
            <button 
              type="button" 
              onClick={autoFillAdmin}
              className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-slate-700 hover:bg-slate-950 text-xs flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-300 font-medium">Administrador Master</span>
              <span className="text-yellow-500 font-semibold">Preencher</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered appointments
  const filteredAgendamentos = selectedBarberFilter === 'todos'
    ? allAgendamentos
    : allAgendamentos.filter(a => a.barbeiro_id === selectedBarberFilter);

  return (
    <div id="admin-dashboard-container" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Admin Header Banner */}
      <div id="admin-header" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
        <div>
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            Administrador Master <span className="px-2 py-0.5 bg-yellow-500 text-slate-950 text-[10px] rounded font-bold uppercase">Acesso Geral</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Visão unificada das operações de agendamento em tempo real</p>
        </div>
        
        <button
          onClick={() => setIsAdmin(false)}
          id="admin-logout-btn"
          className="flex items-center gap-2 py-2 px-4 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair do Administrador
        </button>
      </div>

      {/* Widgets Grid */}
      <div id="admin-widgets" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturamento Ativo</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="font-display text-2xl font-black text-green-400">R$ {stats.revenue.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">Soma de serviços ativos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Agendamentos</span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="font-display text-2xl font-black text-white">{stats.activeBookings}</p>
          <p className="text-[10px] text-slate-500">Confirmados no sistema</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Barbeiros</span>
            <Users className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="font-display text-2xl font-black text-white">{barbeiros.length}</p>
          <p className="text-[10px] text-slate-500">Contas cadastradas</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Serviços Oferecidos</span>
            <Scissors className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="font-display text-2xl font-black text-white">{servicos.length}</p>
          <p className="text-[10px] text-slate-500">Tipos de cortes ativos</p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div id="admin-subtabs" className="border-b border-slate-800/80 flex gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('barbers')}
          className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all relative border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'barbers'
              ? 'text-yellow-500 border-yellow-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Barbeiros ({barbeiros.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all relative border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'services'
              ? 'text-yellow-500 border-yellow-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Serviços ({servicos.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all relative border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'schedule'
              ? 'text-yellow-500 border-yellow-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Fluxo de Agendamentos ({stats.totalBookings})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all relative border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'text-yellow-500 border-yellow-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Limite de Horários
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all relative border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'reminders'
              ? 'text-yellow-500 border-yellow-500'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Lembretes Automáticos
        </button>
      </div>

      {/* Tabs Content */}
      <div id="admin-tab-content" className="pt-2">
        
        {/* 👥 GESTÃO DE BARBEIROS (CRUD) */}
        {activeTab === 'barbers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Cadastro de Profissionais</h3>
                <p className="text-slate-400 text-xs">Crie, edite ou remova contas de barbeiros</p>
              </div>
              <button
                onClick={() => {
                  setEditingBarber(null);
                  setBarberNome('');
                  setBarberEmail('');
                  setBarberSenha('');
                  setBarberFotoUrl('');
                  setShowBarberForm(!showBarberForm);
                }}
                className="py-2 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Novo Barbeiro
              </button>
            </div>

            {/* Barber Form */}
            {showBarberForm && (
              <motion.form
                onSubmit={handleSaveBarber}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="md:col-span-2 border-b border-slate-800 pb-2 mb-2">
                  <h4 className="text-white font-semibold text-sm">
                    {editingBarber ? `Editar Barbeiro: ${editingBarber.nome}` : 'Adicionar Novo Profissional'}
                  </h4>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={barberNome}
                    onChange={(e) => setBarberNome(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    required
                    value={barberEmail}
                    onChange={(e) => setBarberEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    value={barberSenha}
                    onChange={(e) => setBarberSenha(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Foto de Perfil (URL)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={barberFotoUrl}
                    onChange={(e) => setBarberFotoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowBarberForm(false)}
                    className="py-2 px-4 rounded-lg bg-slate-950 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Salvar Barbeiro
                  </button>
                </div>
              </motion.form>
            )}

            {/* Barbers list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barbeiros.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3.5 relative overflow-hidden group">
                  <img
                    src={b.foto_url}
                    alt={b.nome}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500 shrink-0"
                  />
                  <div className="space-y-1 overflow-hidden flex-1">
                    <h4 className="text-white font-bold text-sm truncate">{b.nome}</h4>
                    <p className="text-xs text-slate-400 truncate">{b.email}</p>
                    <p className="text-[10px] text-slate-500">Senha: {b.senha}</p>
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => startEditBarber(b)}
                        className="text-xs text-yellow-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteBarber(b.id, b.nome)}
                        className="text-xs text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💈 GESTÃO DE SERVIÇOS (CRUD) */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Catálogo de Serviços</h3>
                <p className="text-slate-400 text-xs">Adicione novos cortes ou mude preços de forma dinâmica</p>
              </div>
              <button
                onClick={() => {
                  setEditingService(null);
                  setServiceNome('');
                  setServicePreco(0);
                  setShowServiceForm(!showServiceForm);
                }}
                className="py-2 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Novo Serviço
              </button>
            </div>

            {/* Service Form */}
            {showServiceForm && (
              <motion.form
                onSubmit={handleSaveService}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="md:col-span-2 border-b border-slate-800 pb-2 mb-2">
                  <h4 className="text-white font-semibold text-sm">
                    {editingService ? `Editar Serviço: ${editingService.nome_servico}` : 'Adicionar Novo Serviço'}
                  </h4>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome do Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Degradê + Platinado"
                    value={serviceNome}
                    onChange={(e) => setServiceNome(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={servicePreco || ''}
                    onChange={(e) => setServicePreco(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(false)}
                    className="py-2 px-4 rounded-lg bg-slate-950 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Salvar Serviço
                  </button>
                </div>
              </motion.form>
            )}

            {/* Services list table/cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Nome do Serviço</th>
                      <th className="p-4">Preço Comercial</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800">
                    {servicos.map(s => (
                      <tr key={s.id} className="hover:bg-slate-950/40">
                        <td className="p-4 font-semibold text-white">{s.nome_servico}</td>
                        <td className="p-4 font-display font-bold text-yellow-500">R$ {s.preco.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEditService(s)}
                              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-yellow-500 text-yellow-500 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(s.id, s.nome_servico)}
                              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-red-500 text-red-400 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 📅 FLUXO DE AGENDAMENTOS (Live Feed) */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Central de Agendamentos</h3>
                <p className="text-slate-400 text-xs">Fique de olho nos agendamentos de todos os profissionais em tempo real</p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Filtrar Barbeiro:</span>
                <select
                  value={selectedBarberFilter}
                  onChange={(e) => setSelectedBarberFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white text-xs rounded-lg py-1.5 px-3 outline-none focus:border-yellow-500 font-semibold"
                >
                  <option value="todos">Todos os Profissionais</option>
                  {barbeiros.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredAgendamentos.length === 0 ? (
                <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  Nenhum agendamento encontrado no sistema.
                </div>
              ) : (
                filteredAgendamentos.map(appt => (
                  <div
                    key={appt.id}
                    id={`admin-booking-card-${appt.id}`}
                    className={`bg-slate-900 border p-4.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      appt.status === 'cancelado' ? 'border-red-500/10 opacity-60 bg-red-500/[0.01]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Cliente</span>
                        <h4 className="text-white font-semibold text-sm">{appt.cliente_nome}</h4>
                        <span className="text-xs text-slate-400 font-mono">{appt.cliente_whatsapp}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Atendimento</span>
                        <h4 className="text-white font-semibold text-sm">{appt.servico_nome}</h4>
                        <span className="text-yellow-500 font-bold text-xs">R$ {appt.servico_preco?.toFixed(2)}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Barbeiro & Horário</span>
                        <h4 className="text-yellow-500 font-semibold text-sm flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {appt.horario} • {appt.data.split('-').reverse().join('/')}
                        </h4>
                        <span className="text-xs text-slate-400">{appt.barbeiro_nome}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      {appt.status === 'confirmado' ? (
                        <>
                          <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-xs rounded-lg">
                            ✓ Confirmado
                          </span>
                          <button
                            onClick={() => handleCancelBooking(appt.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs rounded-lg">
                          ✕ Cancelado
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ⚙️ LIMITE GLOBAL DE HORÁRIOS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Limite Global do Estabelecimento</h3>
              <p className="text-slate-400 text-xs">Defina a janela de horários, os domingos bloqueados e o intervalo de reservas</p>
            </div>

            <form onSubmit={handleSaveGlobalConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              {/* Working Hours Interval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Horário de Início (Abertura)</label>
                  <input
                    type="time"
                    required
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Horário de Término (Fechamento)</label>
                  <input
                    type="time"
                    required
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Service Interval */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Intervalo entre Atendimentos (em minutos)</label>
                <select
                  value={intervalo}
                  onChange={(e) => setIntervalo(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors text-sm font-semibold"
                >
                  <option value={15}>15 Minutos</option>
                  <option value={30}>30 Minutos (Padrão)</option>
                  <option value={45}>45 Minutos</option>
                  <option value={60}>60 Minutos (1 Hora)</option>
                </select>
              </div>

              {/* Blocked Weekdays */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-semibold">Dias da Semana Bloqueados por Padrão</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const isBlocked = diasBloqueados.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDayBlocked(day)}
                        className={`py-2 px-3.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                          isBlocked
                            ? 'bg-red-500/10 border-red-500/40 text-red-400 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {weekdayNames[day]}
                        {isBlocked ? ' (Fechado)' : ''}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Os clientes não poderão marcar horários nos dias bloqueados acima. Domingo (Dom) fica desativado por padrão de fábrica.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  type="submit"
                  id="save-hours-config-btn"
                  className="py-3 px-6 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar Limites de Agenda
                </button>
              </div>

            </form>
          </div>
        )}

        {/* 💬 AUTOMACÃO DE LEMBRETES */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Automação de Lembretes</h3>
              <p className="text-slate-400 text-xs">Configure o tempo de antecedência para disparo de mensagens de lembretes ao cliente</p>
            </div>

            <form onSubmit={handleSaveGlobalConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              {/* Toggle automation */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div>
                  <h4 className="text-white font-semibold text-sm">Disparo de Lembretes Automáticos</h4>
                  <p className="text-slate-400 text-xs">O sistema simulará um disparo de mensagem em tempo real para o WhatsApp cadastrado</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lembreteAtivo}
                    onChange={(e) => setLembreteAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-slate-950"></div>
                </label>
              </div>

              {/* Time Configuration */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all ${
                !lembreteAtivo ? 'opacity-40 pointer-events-none' : 'opacity-100'
              }`}>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Enviar com Antecedência de</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={lembreteAntecedencia}
                    onChange={(e) => setLembreteAntecedencia(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Unidade de Tempo</label>
                  <select
                    value={lembreteUnidade}
                    onChange={(e) => setLembreteUnidade(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors text-sm font-semibold"
                  >
                    <option value="minutos">Minutos</option>
                    <option value="horas">Horas</option>
                    <option value="dias">Dias</option>
                  </select>
                </div>
              </div>

              {/* Template Preview Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-yellow-500" />
                  Visualização do Modelo de Mensagem
                </span>
                <p className="text-xs text-slate-300 font-mono italic leading-relaxed">
                  "Olá, [Cliente]! Passando para lembrar do seu horário agendado de <strong className="text-yellow-500">([Serviço])</strong> com <strong className="text-yellow-500">([Barbeiro])</strong> hoje às <strong className="text-yellow-500">([Horário])</strong> na nossa Barbearia. Te aguardamos!"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  type="submit"
                  id="save-reminders-config-btn"
                  className="py-3 px-6 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar Configuração de Lembrete
                </button>
              </div>

            </form>
          </div>
        )}

      </div>

    </div>
  );
}
