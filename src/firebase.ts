import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import { Usuario, Servico, EstabelecimentoConfig } from './types';

const firebaseConfig = {
  projectId: "optimus-214be",
  appId: "1:1065936379309:web:3220231a3ba03f46eb1524",
  apiKey: "AIzaSyDMlWuKKtdgsbwpqKH20atAs9exiBIIjno",
  authDomain: "optimus-214be.firebaseapp.com",
  storageBucket: "optimus-214be.firebasestorage.app",
  messagingSenderId: "1065936379309"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore com o DatabaseId customizado
export const db = getFirestore(app, "ai-studio-5f546831-359c-471f-8e6b-1e52eea122a7");

// Função para semear dados iniciais se estiverem vazios
export async function seedDatabaseIfNeeded() {
  try {
    const usuariosCol = collection(db, 'usuarios');
    const usuariosSnapshot = await getDocs(usuariosCol);
    
    if (usuariosSnapshot.empty) {
      console.log("Semeando banco de dados com dados padrão...");
      
      const batch = writeBatch(db);
      
      // 1. Criar usuários (Admin e Barbeiros)
      const usuariosIniciais: Usuario[] = [
        {
          id: 'admin_1',
          nome: 'Administrador Master',
          email: 'admin@salao.com',
          funcao: 'admin',
          foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
          senha: 'admin123',
          horarios_bloqueados: []
        },
        {
          id: 'barber_1',
          nome: 'João da Tesoura',
          email: 'joao@salao.com',
          funcao: 'barbeiro',
          foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
          senha: 'barbeiro123',
          horarios_bloqueados: []
        },
        {
          id: 'barber_2',
          nome: 'Pedro Navalha',
          email: 'pedro@salao.com',
          funcao: 'barbeiro',
          foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
          senha: 'barbeiro123',
          horarios_bloqueados: []
        },
        {
          id: 'barber_3',
          nome: 'Marcos Degradê',
          email: 'marcos@salao.com',
          funcao: 'barbeiro',
          foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
          senha: 'barbeiro123',
          horarios_bloqueados: []
        }
      ];

      usuariosIniciais.forEach(u => {
        const docRef = doc(db, 'usuarios', u.id);
        batch.set(docRef, u);
      });

      // 2. Criar Serviços
      const servicosIniciais: Servico[] = [
        { id: 'srv_1', nome_servico: 'Corte', preco: 45 },
        { id: 'srv_2', nome_servico: 'Barba', preco: 35 },
        { id: 'srv_3', nome_servico: 'Corte + Barba', preco: 70 },
        { id: 'srv_4', nome_servico: 'Sobrancelha', preco: 15 }
      ];

      servicosIniciais.forEach(s => {
        const docRef = doc(db, 'servicos', s.id);
        batch.set(docRef, s);
      });

      // 3. Criar Configuração Global
      const configInicial: EstabelecimentoConfig = {
        id: 'global',
        horario_inicio: '09:00',
        horario_fim: '19:00',
        intervalo_minutos: 30,
        dias_bloqueados: [0], // Domingo bloqueado por padrão
        lembretes_antecedencia: 60,
        lembretes_unidade: 'minutos',
        lembretes_ativo: true
      };

      const configRef = doc(db, 'configuracoes', 'global');
      batch.set(configRef, configInicial);

      await batch.commit();
      console.log("Banco de dados semeado com sucesso!");
    } else {
      console.log("Banco de dados já contém dados. Verificando migração de nomes...");
    }

    // Garantir que os serviços padrão tenham os nomes simplificados corretos, mesmo se o banco já existia
    const servicosIniciaisSimplificados = [
      { id: 'srv_1', nome_servico: 'Corte', preco: 45 },
      { id: 'srv_2', nome_servico: 'Barba', preco: 35 },
      { id: 'srv_3', nome_servico: 'Corte + Barba', preco: 70 },
      { id: 'srv_4', nome_servico: 'Sobrancelha', preco: 15 }
    ];

    for (const s of servicosIniciaisSimplificados) {
      const docRef = doc(db, 'servicos', s.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (
          data.nome_servico === 'Corte Degradê' || 
          data.nome_servico === 'Barba Terapia' || 
          data.nome_servico === 'Sobrancelha Navalhada'
        ) {
          await setDoc(docRef, { nome_servico: s.nome_servico }, { merge: true });
          console.log(`Serviço ${s.id} migrado para nome simplificado: ${s.nome_servico}`);
        }
      } else {
        // Se o documento não existir, criar com o padrão
        await setDoc(docRef, s);
        console.log(`Serviço padrão ${s.id} criado: ${s.nome_servico}`);
      }
    }
  } catch (error) {
    console.error("Erro ao semear o banco de dados:", error);
  }
}
