# ✂️ BarberFlow - Sistema de Agendamento Inteligente

O **BarberFlow** é um WebApp desenvolvido com foco em alta conversão e experiência do usuário (UX) para barbearias e salões de beleza. O sistema elimina a necessidade de instalação de aplicativos tradicionais, operando direto no navegador do cliente com carregamento instantâneo.

## 🚀 Diferenciais do Projeto

- **Fricção Zero:** O cliente não precisa criar senhas ou preencher cadastros longos. O acesso e a validação do agendamento ocorrem via Token de Confirmação enviado por mensagem (WhatsApp/SMS).
- **Escolha Imparcial:** O cliente escolhe o profissional pelo nome e disponibilidade. A foto do barbeiro é exibida apenas na tela de sucesso após a confirmação do corte, garantindo governança visual neutra.
- **Arquitetura Baseada em Funções (RBAC):** Três níveis distintos de permissão (Cliente, Barbeiro e Administrador Master).

## 🛠️ Tecnologias Utilizadas

- **Front-end:** React.js, TypeScript, Tailwind CSS (Design System Dark Mode)
- **Back-end & Banco de Dados:** Firebase Firestore (Banco NoSQL em tempo real)
- **Autenticação & Mensageria:** Firebase Auth & Simulação de API de mensageria (WhatsApp/SMS)

## 👤 Níveis de Acesso e Governança

1. **Cliente:** Visualiza serviços, seleciona profissionais por nome, aceita os Termos de Uso em um clique e valida o agendamento por código numérico.
2. **Barbeiro:** Painel restrito com login para gerenciamento e bloqueio de seus próprios horários e visualização da agenda diária.
3. **Administrador Master:** Controle total do estabelecimento. Cadastro de novos barbeiros, gerenciamento dinâmico de serviços (CRUD com botão `+`), definição da grade comercial global e configuração do tempo dos lembretes automáticos.

## 🗄️ Estrutura do Banco de Dados (Firestore)

O banco de dados foi modelado de forma simples e escalável utilizando estruturas NoSQL:
- `clientes`: Dados básicos de contato e aceite de termos.
- `usuarios`: Perfis de profissionais com definição de papéis (`admin` / `barbeiro`) e URL da foto.
- `servicos`: Catálogo dinâmico de serviços e preços gerenciado pelo Admin.
- `agendamentos`: Registro centralizado unindo cliente, barbeiro, serviço, data, horário e status.

## ⚙️ Como Executar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd nome-do-repositorio
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com ☕ por **Bruno César Alves** (`Systens`).

