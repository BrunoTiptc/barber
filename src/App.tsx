import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, seedDatabaseIfNeeded } from './firebase';
import { EstabelecimentoConfig, Agendamento } from './types';
import ClientBooking from './components/ClientBooking';
import BarberDashboard from './components/BarberDashboard';
import AdminDashboard from './components/AdminDashboard';
import { Scissors, Shield, Sparkles, Smartphone, CheckCircle, Bell, MessageSquare, Terminal, RefreshCw, Smartphone as PhoneIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Global config fetched from Firestore
  const [config, setConfig] = useState<EstabelecimentoConfig>({
    id: 'global',
    horario_inicio: '09:00',
    horario_fim: '19:00',
    intervalo_minutos: 30,
    dias_bloqueados: [0], // Domingo bloqueado por padrão
    lembretes_antecedencia: 60,
    lembretes_unidade: 'minutos',
    lembretes_ativo: true
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Active role/view switcher
  const [activeRole, setActiveRole] = useState<'cliente' | 'barbeiro' | 'admin'>('cliente');

  // Simulation & Logs state
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'system' | 'sms' | 'live' }>>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'Sistema iniciado. Pronto para agendamentos.', type: 'system' }
  ]);
  const [simulatedSMS, setSimulatedSMS] = useState<{ code: string; phone: string; name: string } | null>(null);
  const [isSimulationCenterOpen, setIsSimulationCenterOpen] = useState(true);

  // Seed DB and fetch global configuration
  useEffect(() => {
    async function init() {
      try {
        // Seed first
        await seedDatabaseIfNeeded();

        // Listen to config changes in real-time
        const configDocRef = doc(db, 'configuracoes', 'global');
        const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setConfig(docSnap.data() as EstabelecimentoConfig);
          }
          setLoadingConfig(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
        setLoadingConfig(false);
      }
    }
    init();
  }, []);

  // Add a log helper
  const addLog = (text: string, type: 'system' | 'sms' | 'live' = 'system') => {
    setLogs(prev => [
      {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text,
        type
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Callback when a client requests validation code
  const triggerSimulatedSMS = (code: string, phone: string, name: string) => {
    setSimulatedSMS({ code, phone, name });
    addLog(`Código de confirmação [${code}] gerado para o cliente ${name} (+${phone})`, 'sms');
    
    // Automatically focus on the SMS simulator or slide it open
    setIsSimulationCenterOpen(true);
  };

  // Callback when booking completes successfully
  const handleBookingConfirmed = (booking: Agendamento) => {
    addLog(`NOVO AGENDAMENTO CONFIRMADO: Cliente ${booking.cliente_nome} agendou ${booking.servico_nome} com ${booking.barbeiro_nome} para dia ${booking.data.split('-').reverse().join('/')} às ${booking.horario}`, 'live');
    
    if (config.lembretes_ativo) {
      addLog(`[Lembrete] Lembrete automático agendado para disparar ${config.lembretes_antecedencia} ${config.lembretes_unidade} antes para ${booking.cliente_nome}`, 'system');
      
      // Simulate automatic WhatsApp notification preview
      setTimeout(() => {
        addLog(`[WhatsApp Auto] Lembrete disparado com sucesso para +${booking.cliente_whatsapp}!`, 'sms');
      }, 4000);
    }
    
    // Clear simulated SMS since booking is finalized
    setSimulatedSMS(null);
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-sans text-sm">Carregando configurações do estabelecimento...</p>
      </div>
    );
  }

  return (
    <div id="main-app-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* GLOBAL HIGH-END NAVIGATION BAR */}
      <header id="global-nav-bar" className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/15 rounded-xl border border-yellow-500/30 text-yellow-500">
              <Scissors className="w-5 h-5 rotate-90" />
            </div>
            <div>
              <h1 className="font-display font-black text-white text-base tracking-wider uppercase">Craft & Blade</h1>
              <p className="text-[10px] text-yellow-500 tracking-widest uppercase font-semibold">Salão & Barbearia</p>
            </div>
          </div>

          {/* ACTIVE ROLE SWITCHER - Golden capsule */}
          <div id="role-selector-tab" className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveRole('cliente')}
              id="switch-role-client"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRole === 'cliente'
                  ? 'bg-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 Cliente
            </button>
            <button
              onClick={() => setActiveRole('barbeiro')}
              id="switch-role-barber"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRole === 'barbeiro'
                  ? 'bg-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💈 Barbeiro
            </button>
            <button
              onClick={() => setActiveRole('admin')}
              id="switch-role-admin"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRole === 'admin'
                  ? 'bg-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚙️ Admin
            </button>
          </div>

          {/* Collapsible Simulator toggle button */}
          <button
            onClick={() => setIsSimulationCenterOpen(!isSimulationCenterOpen)}
            id="toggle-simulator-btn"
            className="hidden lg:flex items-center gap-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-yellow-500" />
            {isSimulationCenterOpen ? 'Ocultar Simulador' : 'Mostrar Simulador'}
          </button>
        </div>
      </header>

      {/* CORE LAYOUT GRID (Bento layout on desktop) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ACTIVE ROLE VIEW PORT (Responsive width based on simulation state) */}
        <section 
          id="active-view-portal"
          className={`transition-all duration-300 ${
            isSimulationCenterOpen ? 'lg:col-span-8' : 'lg:col-span-12'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeRole === 'cliente' && (
                <ClientBooking 
                  config={config} 
                  onBookingConfirmed={handleBookingConfirmed}
                  triggerSimulatedSMS={triggerSimulatedSMS}
                />
              )}

              {activeRole === 'barbeiro' && (
                <BarberDashboard 
                  config={config}
                  onSendSimulationNotification={(txt) => addLog(txt, 'system')}
                />
              )}

              {activeRole === 'admin' && (
                <AdminDashboard 
                  config={config} 
                  onConfigUpdated={(newCfg) => setConfig(newCfg)}
                  onSendSimulationNotification={(txt) => addLog(txt, 'system')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* INTERACTIVE REAL-TIME SIMULATION & PHONE NOTIFICATION CENTER */}
        {isSimulationCenterOpen && (
          <aside 
            id="simulation-center-sidebar"
            className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-yellow-500" />
                <h3 className="font-display font-extrabold text-white text-sm tracking-wide uppercase">Painel de Simulação Real-time</h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" title="Conexão Firebase Ativa"></span>
            </div>

            {/* Simulated Smartphone Overlay for validation code SMS receipt */}
            <div id="simulated-phone-container" className="space-y-3">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-yellow-500" />
                Dispositivo SMS/WhatsApp do Cliente (Simulador)
              </span>

              {simulatedSMS ? (
                <motion.div 
                  id="sms-bubble-notification"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-slate-950 border-2 border-yellow-500/40 rounded-2xl p-4 space-y-2 text-xs relative overflow-hidden gold-glow"
                >
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" /> Mensagem Recebida
                    </span>
                    <span>Agora</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    Olá, <strong>{simulatedSMS.name}</strong>! Seu código de confirmação para agendamento na <span className="text-white font-semibold">Craft & Blade</span> é:{' '}
                    <span className="bg-yellow-500 text-slate-950 font-mono font-black py-0.5 px-2 rounded tracking-widest text-sm inline-block pulse-glow mx-1">
                      {simulatedSMS.code}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500">Digite este código na janela de validação do agendamento para confirmar.</p>
                </motion.div>
              ) : (
                <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                  <Smartphone className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                  <p>Aguardando solicitação de agendamento...</p>
                  <p className="text-[10px] text-slate-600">O código de 4 dígitos do cliente aparecerá aqui instantaneamente.</p>
                </div>
              )}
            </div>

            {/* Operations logs (live updates from Firestore actions) */}
            <div id="simulation-logs-container" className="space-y-2.5">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-yellow-500" />
                Histórico de Operações e Automações
              </span>

              <div id="logs-box" className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2.5 font-mono text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <div key={log.id} className="border-b border-slate-900/80 pb-1.5 last:border-0">
                    <div className="flex justify-between text-[9px] text-slate-600 mb-0.5">
                      <span>[{log.time}]</span>
                      <span className={`px-1 rounded ${
                        log.type === 'sms' 
                          ? 'bg-green-500/10 text-green-400' 
                          : log.type === 'live' 
                          ? 'bg-yellow-500/10 text-yellow-400' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {log.type}
                      </span>
                    </div>
                    <p className={`${
                      log.type === 'sms' 
                        ? 'text-green-400' 
                        : log.type === 'live' 
                        ? 'text-yellow-400' 
                        : 'text-slate-400'
                    }`}>
                      {log.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        )}

      </main>

      {/* Global minimal footer with info */}
      <footer id="global-footer" className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-600 space-y-1 font-sans">
        <p>© 2026 Craft & Blade Salão & Barbearia. Todos os direitos reservados.</p>
        <p className="text-[10px] text-slate-700">Desenvolvido em ambiente sandbox seguro integrado ao Google Cloud Run & Firestore Real-time.</p>
      </footer>

    </div>
  );
}
