import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Usuario, Servico, EstabelecimentoConfig, Agendamento, Cliente } from '../types';
import { Calendar, Clock, User, CheckCircle, MessageSquare, AlertCircle, Sparkles, ChevronRight, Check } from 'lucide-react';
import TermsOfService from './TermsOfService';
import { motion, AnimatePresence } from 'motion/react';

interface ClientBookingProps {
  config: EstabelecimentoConfig;
  onBookingConfirmed: (agendamento: Agendamento) => void;
  triggerSimulatedSMS: (code: string, phone: string, name: string) => void;
}

export default function ClientBooking({ config, onBookingConfirmed, triggerSimulatedSMS }: ClientBookingProps) {
  // Database States
  const [barbeiros, setBarbeiros] = useState<Usuario[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [existingBookings, setExistingBookings] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection States
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<Usuario | null>(null);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Client Form States
  const [clientNome, setClientNome] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [aceitoTermos, setAceitoTermos] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Verification States
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // Success Screen State
  const [confirmedBooking, setConfirmedBooking] = useState<Agendamento | null>(null);

  // Load initial data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Get Barbers
        const qBarbers = query(collection(db, 'usuarios'), where('funcao', '==', 'barbeiro'));
        const barbersSnap = await getDocs(qBarbers);
        const barbersList: Usuario[] = [];
        barbersSnap.forEach(doc => {
          barbersList.push({ id: doc.id, ...doc.data() } as Usuario);
        });
        setBarbeiros(barbersList);

        // Get Services
        const sSnap = await getDocs(collection(db, 'servicos'));
        const sList: Servico[] = [];
        sSnap.forEach(doc => {
          sList.push({ id: doc.id, ...doc.data() } as Servico);
        });
        setServicos(sList);
      } catch (err) {
        console.error("Erro ao buscar dados do cliente:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch bookings for selected barber and date to calculate availability
  useEffect(() => {
    if (!selectedBarbeiro || !selectedDate) return;

    async function fetchBookings() {
      try {
        const qBookings = query(
          collection(db, 'agendamentos'),
          where('barbeiro_id', '==', selectedBarbeiro?.id),
          where('data', '==', selectedDate),
          where('status', '!=', 'cancelado')
        );
        const snap = await getDocs(qBookings);
        const list: Agendamento[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Agendamento);
        });
        setExistingBookings(list);
      } catch (err) {
        console.error("Erro ao buscar agendamentos existentes:", err);
      }
    }

    fetchBookings();
  }, [selectedBarbeiro, selectedDate]);

  // Generate Available Times based on config
  const generateTimeSlots = () => {
    if (!config || !selectedDate) return [];

    // Check if day is blocked (Sunday is usually 0, or custom blocks)
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    if (config.dias_bloqueados.includes(dayOfWeek)) {
      return []; // Closed on this day
    }

    const slots: string[] = [];
    const [startHour, startMin] = config.horario_inicio.split(':').map(Number);
    const [endHour, endMin] = config.horario_fim.split(':').map(Number);
    const interval = config.intervalo_minutos;

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      const timeStr = current.toTimeString().substring(0, 5); // "HH:MM"
      
      // Check if this slot is in the past for today
      const todayStr = new Date().toISOString().split('T')[0];
      if (selectedDate === todayStr) {
        const now = new Date();
        const slotTime = new Date();
        const [h, m] = timeStr.split(':').map(Number);
        slotTime.setHours(h, m, 0, 0);
        if (slotTime <= now) {
          // Increment and skip
          current.setMinutes(current.getMinutes() + interval);
          continue;
        }
      }

      // Check if slot is already booked
      const isBooked = existingBookings.some(b => b.horario === timeStr);
      
      // Check if slot is blocked by barber
      const isBarberBlocked = selectedBarbeiro?.horarios_bloqueados?.some(block => {
        return block === timeStr || block === `${selectedDate}_${timeStr}`;
      });

      if (!isBooked && !isBarberBlocked) {
        slots.push(timeStr);
      }

      current.setMinutes(current.getMinutes() + interval);
    }

    return slots;
  };

  const availableSlots = generateTimeSlots();

  const getEndTimeStr = (timeStr: string, intervalMin: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const temp = new Date();
    temp.setHours(h, m, 0, 0);
    temp.setMinutes(temp.getMinutes() + intervalMin);
    return temp.toTimeString().substring(0, 5);
  };

  // Handle requesting appointment (trigger SMS/WhatsApp validation)
  const handleRequestBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarbeiro || !selectedServico || !selectedDate || !selectedTime || !clientNome || !clientWhatsapp || !aceitoTermos) {
      return;
    }

    // Generate random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(code);
    setUserEnteredCode('');
    setVerificationError('');
    setShowVerificationModal(true);

    // Call callback to display simulated incoming notification
    triggerSimulatedSMS(code, clientWhatsapp, clientNome);
  };

  // Handle confirming the code and writing to Firestore
  const handleVerifyCode = async () => {
    if (userEnteredCode !== verificationCode) {
      setVerificationError('Código incorreto! Verifique o número e tente novamente.');
      return;
    }

    try {
      setLoading(true);
      // 1. Create or retrieve client
      const clientData: Omit<Cliente, 'id'> = {
        nome: clientNome,
        whatsapp: clientWhatsapp,
        termo_aceito: true,
        validado: true
      };

      // In real app, we search if client already exists. For simplicity, we save client doc
      const clientDocRef = await addDoc(collection(db, 'clientes'), clientData);
      const clienteId = clientDocRef.id;

      // 2. Create booking
      const bookingData: Omit<Agendamento, 'id'> = {
        cliente_id: clienteId,
        barbeiro_id: selectedBarbeiro!.id,
        servico_id: selectedServico!.id,
        data: selectedDate,
        horario: selectedTime,
        status: 'confirmado',
        // Denormalized fields for simple instant rendering on dash
        cliente_nome: clientNome,
        cliente_whatsapp: clientWhatsapp,
        barbeiro_nome: selectedBarbeiro!.nome,
        servico_nome: selectedServico!.nome_servico,
        servico_preco: selectedServico!.preco
      };

      const bookingDocRef = await addDoc(collection(db, 'agendamentos'), bookingData);
      
      const completeBooking: Agendamento = {
        id: bookingDocRef.id,
        ...bookingData
      };

      setConfirmedBooking(completeBooking);
      setShowVerificationModal(false);
      onBookingConfirmed(completeBooking);
    } catch (err) {
      console.error("Erro ao salvar agendamento:", err);
      setVerificationError("Ocorreu um erro ao salvar o agendamento no Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedBarbeiro(null);
    setSelectedServico(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('');
    setClientNome('');
    setClientWhatsapp('');
    setAceitoTermos(false);
    setConfirmedBooking(null);
  };

  // Min date today
  const todayStr = new Date().toISOString().split('T')[0];

  if (loading && !showVerificationModal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-sans text-sm">Carregando serviços e profissionais...</p>
      </div>
    );
  }

  return (
    <div id="client-booking-container" className="max-w-md mx-auto px-4 py-6 font-sans">
      
      {/* SUCCESS CONFIRMATION SCREEN */}
      {confirmedBooking ? (
        <motion.div 
          id="success-screen"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Accent Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-500/10 blur-3xl rounded-full"></div>

          {/* CRITICAL UX RULE: Barber Photo must be MEDIUM, CENTERED at the TOP of the success modal */}
          <div id="success-barber-photo-container" className="text-center relative z-10 pt-4">
            <div className="relative inline-block">
              <img 
                id="success-barber-photo"
                src={selectedBarbeiro?.foto_url} 
                alt={selectedBarbeiro?.nome}
                referrerPolicy="no-referrer"
                className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-yellow-500 shadow-xl mx-auto object-cover object-top"
              />
              <span className="absolute bottom-1 right-2 bg-yellow-500 text-slate-950 p-1.5 rounded-full shadow-md">
                <Check className="w-4 h-4 stroke-[3px]" />
              </span>
            </div>
            
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-3">Agendado com Sucesso!</h3>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              {selectedBarbeiro?.nome}
            </h2>
          </div>

          <div id="success-details" className="mt-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 relative z-10">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Serviço</span>
              <span className="text-white font-medium">{selectedServico?.nome_servico}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Data</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-yellow-500" />
                {selectedDate.split('-').reverse().join('/')}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-sm">Horário</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-yellow-500" />
                {selectedTime} às {getEndTimeStr(selectedTime, config.intervalo_minutos)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-slate-400 text-sm">Valor</span>
              <span className="text-yellow-500 font-bold text-lg">
                R$ {selectedServico?.preco.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Simulated Automation Notice */}
          <div id="success-notification-alert" className="mt-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-500 flex gap-3 items-start relative z-10">
            <MessageSquare className="w-5 h-5 shrink-0 text-yellow-500" />
            <div>
              <p className="font-semibold text-yellow-400 mb-0.5">Lembrete Automático Simulado Ativo</p>
              <p className="text-slate-400 leading-relaxed">
                Você receberá uma simulação de lembrete em seu WhatsApp {config.lembretes_antecedencia} {config.lembretes_unidade} antes do atendimento.
              </p>
            </div>
          </div>

          <button
            id="success-new-booking-btn"
            onClick={resetForm}
            className="w-full py-4 mt-6 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-950 font-bold text-center tracking-wide shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 hover:from-yellow-500 hover:to-yellow-400 transition-all active:scale-[0.98] cursor-pointer relative z-10"
          >
            Fazer Novo Agendamento
          </button>
        </motion.div>
      ) : (
        
        /* BOOKING FORM FLOW */
        <form id="booking-form" onSubmit={handleRequestBooking} className="space-y-6">
          
          {/* Header */}
          <div id="booking-header" className="text-center space-y-1 py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20 text-yellow-500 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Agendamento Sem Fricção
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
              Agendar Horário
            </h1>
            <p className="text-slate-400 text-sm">
              Escolha o profissional, serviço e reserve em segundos
            </p>
          </div>

          {/* 1. Barber Selection (Foto Oculta - UX MANDATE!) */}
          <div id="section-barber" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-yellow-500" />
              1. Selecione o Barbeiro
            </label>
            
            <div className="grid grid-cols-1 gap-2.5">
              {barbeiros.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  id={`barber-option-${b.id}`}
                  onClick={() => {
                    setSelectedBarbeiro(b);
                    setSelectedTime(''); // reset time if barber changes
                  }}
                  className={`relative p-3.5 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer ${
                    selectedBarbeiro?.id === b.id
                      ? 'bg-yellow-500/10 border-yellow-500/70 text-white shadow-md shadow-yellow-500/5'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm md:text-base">{b.nome}</span>
                    {selectedBarbeiro?.id === b.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    )}
                  </div>
                  
                  {/* UX Mandate: No photo displayed here during selection */}
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    {selectedBarbeiro?.id === b.id ? (
                      <span className="text-yellow-500 font-semibold flex items-center gap-1">
                        Selecionado <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-slate-500">Selecionar</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Service Selection */}
          <div id="section-service" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              2. Escolha o Serviço
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {servicos.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  id={`service-option-${s.id}`}
                  onClick={() => setSelectedServico(s)}
                  className={`relative p-3.5 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer ${
                    selectedServico?.id === s.id
                      ? 'bg-yellow-500/10 border-yellow-500/70 text-white shadow-md shadow-yellow-500/5'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm md:text-base">{s.nome_servico}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-yellow-500 text-sm md:text-base">
                      R$ {s.preco.toFixed(2)}
                    </span>
                    {selectedServico?.id === s.id ? (
                      <div className="bg-yellow-500 text-slate-950 p-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Date & Time Selection (Only active if Barber is selected) */}
          <div id="section-datetime" className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-lg transition-all duration-300 ${
            !selectedBarbeiro ? 'opacity-50 pointer-events-none' : 'opacity-100'
          }`}>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-500" />
              3. Data e Horário
            </label>

            {/* Date Input */}
            <div>
              <div className="relative">
                <input
                  type="date"
                  id="booking-date-input"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 outline-none focus:border-yellow-500 transition-colors font-medium text-sm"
                />
              </div>
            </div>

            {/* Time Slot Picker */}
            {selectedDate && (
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-medium">Horários Disponíveis</span>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center p-6 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1.5 text-slate-500" />
                    Nenhum horário disponível para esta data ou o salão está fechado.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((time) => (
                      <button
                        type="button"
                        key={time}
                        id={`time-option-${time}`}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 px-2 text-center rounded-lg border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                          selectedTime === time
                            ? 'bg-yellow-500 text-slate-950 border-yellow-500 font-bold'
                            : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {time} às {getEndTimeStr(time, config.intervalo_minutos)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Client Info (Active only if Service, Barber, Date and Time are selected) */}
          <div id="section-client-info" className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-lg transition-all duration-300 ${
            !selectedTime ? 'opacity-50 pointer-events-none' : 'opacity-100'
          }`}>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-yellow-500" />
              4. Seus Dados
            </label>

            <div className="space-y-3.5">
              <div>
                <input
                  type="text"
                  id="client-name-input"
                  placeholder="Nome Completo"
                  required
                  value={clientNome}
                  onChange={(e) => setClientNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 placeholder:text-slate-600 outline-none focus:border-yellow-500 transition-colors text-sm"
                />
              </div>

              <div>
                <input
                  type="tel"
                  id="client-phone-input"
                  placeholder="WhatsApp (com DDD)"
                  required
                  value={clientWhatsapp}
                  onChange={(e) => {
                    // numbers only
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setClientWhatsapp(cleaned);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 placeholder:text-slate-600 outline-none focus:border-yellow-500 transition-colors text-sm"
                />
              </div>

              {/* Termos de uso checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="accept-terms-checkbox"
                  checked={aceitoTermos}
                  onChange={(e) => setAceitoTermos(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-yellow-500 bg-slate-950 border-slate-800 focus:ring-yellow-500 focus:ring-offset-slate-900 focus:ring-2 mt-0.5"
                />
                <label htmlFor="accept-terms-checkbox" className="text-xs text-slate-400 leading-normal select-none">
                  Aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-yellow-500 hover:underline font-semibold"
                  >
                    Termos de Uso
                  </button>{' '}
                  do estabelecimento.
                </label>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            id="request-booking-submit-btn"
            disabled={
              !selectedBarbeiro ||
              !selectedServico ||
              !selectedDate ||
              !selectedTime ||
              !clientNome ||
              !clientWhatsapp ||
              !aceitoTermos
            }
            className={`w-full py-4 rounded-xl font-bold text-center tracking-wider text-slate-950 shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
              selectedBarbeiro &&
              selectedServico &&
              selectedDate &&
              selectedTime &&
              clientNome &&
              clientWhatsapp &&
              aceitoTermos
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 shadow-yellow-500/10'
                : 'bg-slate-800 text-slate-500 border border-slate-800/50 cursor-not-allowed shadow-none'
            }`}
          >
            Confirmar e Agendar
          </button>

        </form>
      )}

      {/* TERMS OF SERVICE MODAL */}
      <TermsOfService isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />

      {/* 4-DIGIT CODE VERIFICATION MODAL */}
      <AnimatePresence>
        {showVerificationModal && (
          <div id="verification-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              id="verification-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/5 blur-2xl rounded-full"></div>

              <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>

              <h3 className="font-display text-xl font-bold text-white">Validação por WhatsApp</h3>
              <p className="text-slate-400 text-xs mt-2 px-2 leading-relaxed">
                Para concluir, digite o código de 4 dígitos enviado na simulação de SMS para o número <strong>+{clientWhatsapp}</strong>
              </p>

              <div className="my-6">
                <input
                  type="text"
                  maxLength={4}
                  id="verification-code-input"
                  placeholder="0000"
                  value={userEnteredCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setUserEnteredCode(clean);
                  }}
                  className="w-32 bg-slate-950 border-2 border-slate-800 focus:border-yellow-500 text-white text-center font-display text-3xl font-extrabold rounded-2xl py-3 tracking-widest outline-none transition-colors"
                />
                
                {verificationError && (
                  <p className="text-red-500 text-xs mt-3 flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {verificationError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  id="cancel-verification-btn"
                  onClick={() => setShowVerificationModal(false)}
                  className="flex-1 py-3 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-colors active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="confirm-verification-btn"
                  onClick={handleVerifyCode}
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
