import React from 'react';
import { X } from 'lucide-react';

interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfService({ isOpen, onClose }: TermsOfServiceProps) {
  if (!isOpen) return null;

  return (
    <div id="terms-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div id="terms-modal-card" className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div id="terms-header" className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h3 className="font-display text-lg font-semibold text-yellow-500">Termos de Uso & Privacidade</h3>
          <button 
            id="close-terms-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="terms-body" className="p-6 overflow-y-auto text-slate-300 text-sm space-y-4 font-sans">
          <p className="font-semibold text-white">Bem-vindo ao nosso sistema de agendamentos!</p>
          
          <p>
            Ao utilizar este aplicativo para agendar seus serviços na Barbearia/Salão, você concorda com os termos descritos abaixo. Nosso objetivo é garantir um serviço rápido, pontual e de alta qualidade para todos.
          </p>

          <h4 className="font-semibold text-white mt-4">1. Coleta de Dados Simplificada</h4>
          <p>
            Coletamos apenas o seu <strong>Nome</strong> e seu número de <strong>WhatsApp</strong>. Esses dados são utilizados exclusivamente para confirmar o seu horário, validar a sua identidade através do envio de um código de verificação temporário e simular lembretes do seu agendamento.
          </p>

          <h4 className="font-semibold text-white mt-4">2. Validação do Celular</h4>
          <p>
            Para evitar agendamentos falsos e garantir a integridade dos horários dos barbeiros, o agendamento só será concluído e gravado em nosso sistema após a digitação do código de confirmação de 4 dígitos enviado na simulação.
          </p>

          <h4 className="font-semibold text-white mt-4">3. Cancelamentos e Atrasos</h4>
          <p>
            Pedimos a gentileza de cancelar ou reagendar seu horário com pelo menos <strong>2 horas de antecedência</strong> caso não possa comparecer. O atraso superior a 10 minutos poderá resultar no cancelamento automático do seu agendamento para não prejudicar os clientes seguintes.
          </p>

          <h4 className="font-semibold text-white mt-4">4. Lembretes por WhatsApp</h4>
          <p>
            Ao marcar a caixa de termos e concluir o agendamento, você autoriza o envio de mensagens simuladas de lembretes em seu dispositivo ou na central de simulação de acordo com o intervalo parametrizado pelo administrador.
          </p>

          <h4 className="font-semibold text-white mt-4">5. Respeito e Diversidade</h4>
          <p>
            Em conformidade com nossos princípios de igualdade, implementamos a escolha do barbeiro baseada puramente na disponibilidade técnica e no nome, ocultando fotos durante o fluxo de agendamento para promover um ambiente justo e sem julgamentos superficiais.
          </p>

          <p className="text-xs text-slate-500 pt-4 border-t border-slate-800">
            Última atualização: 19 de Julho de 2026. Obrigado por escolher nossos serviços!
          </p>
        </div>

        {/* Footer */}
        <div id="terms-footer" className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            id="terms-accept-modal-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-semibold transition-all shadow-md active:scale-95"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
