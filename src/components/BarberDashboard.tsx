import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Usuario, Agendamento, EstabelecimentoConfig } from '../types';
import { Calendar, Clock, Lock, Unlock, LogOut, CheckCircle, XCircle, AlertCircle, Phone, Sparkles, Key, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarberDashboardProps {
  config: EstabelecimentoConfig;
  onSendSimulationNotification: (text: string) => void;
}

export default function BarberDashboard({ config, onSendSimulationNotification }: BarberDashboardProps) {
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [barber, setBarber] = useState<Usuario | null>(null);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [blockTime, setBlockTime] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen to appointments for this barber in real-time!
  useEffect(() => {
    if (!barber) return;

    // Real-time Firestore query for barber's bookings
    const q = query(
      collection(db, 'agendamentos'),
      where('barbeiro_id', '==', barber.id),
      where('data', '==', selectedDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Agendamento[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Agendamento);
      });
      // Sort by time
      list.sort((a, b) => a.horario.localeCompare(b.horario));
      setAppointments(list);
    }, (error) => {
      console.error("Erro no listener de agendamentos:", error);
    });

    return () => unsubscribe();
  }, [barber, selectedDate]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const q = query(
        collection(db, 'usuarios'),
        where('email', '==', email.toLowerCase().trim()),
        where('funcao', '==', 'barbeiro')
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        setLoginError('E-mail não cadastrado ou não possui acesso de Barbeiro.');
        setLoading(false);
        return;
      }

      let foundUser: Usuario | null = null;
      snap.forEach(doc => {
        const u = doc.data() as Usuario;
        if (u.senha === password) {
          foundUser = { id: doc.id, ...u };
        }
      });

      if (foundUser) {
        setBarber(foundUser);
        onSendSimulationNotification(`Barbeiro ${foundUser.nome} fez login com sucesso!`);
      } else {
        setLoginError('Senha incorreta! Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fill login credentials quickly for testing ease
  const autoFillLogin = (bEmail: string) => {
    setEmail(bEmail);
    setPassword('barbeiro123');
  };

  // Handle changing appointment status
  const handleUpdateStatus = async (id: string, newStatus: 'confirmado' | 'cancelado') => {
    try {
      const docRef = doc(db, 'agendamentos', id);
      await updateDoc(docRef, { status: newStatus });
      onSendSimulationNotification(`Agendamento atualizado para ${newStatus}!`);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle blocking / unblocking a time slot for a specific date
  const handleToggleBlockTime = async (time: string) => {
    if (!barber) return;

    try {
      const docRef = doc(db, 'usuarios', barber.id);
      const userSnap = await getDoc(docRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as Usuario;
      const blocks = userData.horarios_bloqueados || [];
      
      // format: YYYY-MM-DD_HH:MM
      const blockKey = `${selectedDate}_${time}`;
      let newBlocks = [...blocks];

      if (newBlocks.includes(blockKey)) {
        newBlocks = newBlocks.filter(b => b !== blockKey);
        onSendSimulationNotification(`Horário ${time} desbloqueado.`);
      } else {
        newBlocks.push(blockKey);
        onSendSimulationNotification(`Horário ${time} bloqueado temporariamente.`);
      }

      await updateDoc(docRef, { horarios_bloqueados: newBlocks });
      
      // Update local barber state
      setBarber({
        ...barber,
        horarios_bloqueados: newBlocks
      });
    } catch (err) {
      console.error("Erro ao alterar bloqueio de horário:", err);
    }
  };

  // Generate all potential slots to show block/unblock options
  const generateAllPotentialSlots = () => {
    const slots: string[] = [];
    const [startHour, startMin] = config.horario_inicio.split(':').map(Number);
    const [endHour, endMin] = config.horario_fim.split(':').map(Number);
    const interval = config.intervalo_minutos;

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      slots.push(current.toTimeString().substring(0, 5));
      current.setMinutes(current.getMinutes() + interval);
    }

    return slots;
  };

  const allSlots = generateAllPotentialSlots();

  if (!barber) {
    return (
      <div id="barber-login-container" className="max-w-md mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Painel do Barbeiro</h2>
            <p className="text-slate-400 text-xs">Entre com suas credenciais de cabeleireiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">E-mail</label>
              <input
                type="email"
                required
                placeholder="nome@salao.com"
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
              id="barber-login-submit-btn"
              className="w-full py-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Entrar na Agenda'
              )}
            </button>
          </form>

          {/* Quick-Test Accounts Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Acesso Rápido para Teste:</span>
            <div className="grid grid-cols-1 gap-2">
              <button 
                type="button" 
                onClick={() => autoFillLogin('joao@salao.com')}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-slate-700 hover:bg-slate-950 text-xs flex items-center justify-between cursor-pointer"
              >
                <span className="text-slate-300 font-medium">João da Tesoura</span>
                <span className="text-yellow-500">Selecionar</span>
              </button>
              <button 
                type="button" 
                onClick={() => autoFillLogin('pedro@salao.com')}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-slate-700 hover:bg-slate-950 text-xs flex items-center justify-between cursor-pointer"
              >
                <span className="text-slate-300 font-medium">Pedro Navalha</span>
                <span className="text-yellow-500">Selecionar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active user's blocks on current day
  const isTimeBlockedOnCurrentDay = (time: string) => {
    const key = `${selectedDate}_${time}`;
    return barber.horarios_bloqueados?.includes(key) || false;
  };

  return (
    <div id="barber-dashboard" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Profiler Header */}
      <div id="barber-profile-header" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
          <img 
            src={barber.foto_url} 
            alt={barber.nome}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border-2 border-yellow-500 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h2 className="font-display text-lg font-bold text-white">{barber.nome}</h2>
              <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-[10px] text-yellow-500 rounded font-semibold">Barbeiro</span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{barber.email}</p>
          </div>
        </div>

        <button
          onClick={() => setBarber(null)}
          id="barber-logout-btn"
          className="flex items-center gap-2 py-2 px-4 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair do Painel
        </button>
      </div>

      {/* Main split dashboard (Schedule & Hours Block block) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Appointments Column (7 cols) */}
        <div id="barber-schedule-section" className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-display font-semibold text-white text-base">Minha Agenda do Dia</h3>
              <p className="text-slate-400 text-xs">Gerencie os compromissos agendados para você</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-lg py-1.5 px-3 outline-none text-xs font-semibold"
            />
          </div>

          <div id="appointments-list" className="space-y-3 pt-2">
            {appointments.length === 0 ? (
              <div className="text-center p-8 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-500 text-xs">
                <Calendar className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                Nenhum cliente agendado para esta data.
              </div>
            ) : (
              appointments.map((appt) => (
                <div 
                  key={appt.id} 
                  id={`barber-appt-card-${appt.id}`}
                  className={`p-4 rounded-xl border flex justify-between items-center gap-4 transition-all ${
                    appt.status === 'cancelado' 
                      ? 'bg-red-500/5 border-red-500/10 opacity-60' 
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="py-0.5 px-2 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {appt.horario}
                      </span>
                      <span className="text-slate-300 font-semibold text-sm">{appt.cliente_nome}</span>
                    </div>

                    <p className="text-slate-400 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      {appt.servico_nome} • <span className="text-yellow-500 font-semibold">R$ {appt.servico_preco?.toFixed(2)}</span>
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <a 
                        href={`https://wa.me/${appt.cliente_whatsapp}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-green-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {appt.cliente_whatsapp}
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {appt.status === 'confirmado' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'cancelado')}
                          className="px-2.5 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <span className="text-green-500 text-xs font-semibold flex items-center gap-1 px-2.5 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                          ✓ Ativo
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'confirmado')}
                          className="px-2.5 py-1.5 rounded-lg bg-green-500 text-slate-950 text-xs font-semibold hover:bg-green-400 transition-colors cursor-pointer"
                        >
                          Ativar
                        </button>
                        <span className="text-red-500 text-xs font-semibold flex items-center gap-1 px-2.5 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
                          ✕ Cancelado
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blocking Column (5 cols) */}
        <div id="barber-blocking-section" className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div>
            <h3 className="font-display font-semibold text-white text-base">Bloqueio de Horários</h3>
            <p className="text-slate-400 text-xs">Marque ou desmarque horários para folga/intervalo nesta data</p>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-xs text-yellow-500 flex gap-2.5 items-start">
            <AlertCircle className="w-4.5 h-4.5 text-yellow-500 shrink-0" />
            <p className="leading-relaxed">
              Os horários marcados em <span className="font-bold">vermelho</span> ficarão indisponíveis para os clientes escolherem nesta data selecionada ({selectedDate.split('-').reverse().join('/')}).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {allSlots.map((time) => {
              const blocked = isTimeBlockedOnCurrentDay(time);
              return (
                <button
                  type="button"
                  key={time}
                  onClick={() => handleToggleBlockTime(time)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    blocked
                      ? 'bg-red-500/10 border-red-500/40 text-red-400 font-bold'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{time}</span>
                  {blocked ? (
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
