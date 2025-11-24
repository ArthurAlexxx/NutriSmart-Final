
# Prompt Mestre para Criação de Sistemas SaaS White-Label

## 1. Objetivo Principal

Criar uma aplicação web completa, seguindo os mais altos padrões de UX/UI, performance e qualidade de código, baseada em uma arquitetura SaaS (Software as a Service) white-label, multi-inquilino (multi-tenant).

---

## 2. Identidade Visual e Sistema de Design (Single Source of Truth)

**Diretriz Inegociável:** Toda a identidade visual, incluindo cores, fontes e estilo de componentes, **deve** seguir estritamente as regras definidas no arquivo `docs/design-system.md`. Este documento é a única fonte de verdade para o design.

- **Filosofia de Design:** A interface deve ser limpa, moderna, profissional e inspirar confiança. A prioridade é a clareza e a facilidade de uso, com uma estética convidativa. A inspiração vem da clareza do **Notion** com a estética acolhedora do **Headspace**.

- **Paleta de Cores:**
    - **Primária:** `hsl(101 28% 54%)` (Verde Nutri) para botões principais e destaques.
    - **Fundo:** `hsl(0 0% 100%)` (Branco) e `hsl(210 40% 96.1%)` (Cinza Claro).
    - **Texto:** `hsl(224 71.4% 4.1%)` (Cinza Escuro) para textos principais e `hsl(215.4 16.3% 46.9%)` para textos secundários.
    - **Destrutivo:** `hsl(0 84.2% 60.2%)` para erros e exclusões.

- **Tipografia:**
    - **Títulos (Heading):** **Lexend** (`--font-lexend`).
    - **Corpo (Sans):** **Poppins** (`--font-poppins`).

- **Estilo dos Componentes:**
    - **Raio da Borda (`--radius`):** `0.8rem` para cantos bem arredondados.
    - **Cards:** Devem ser o principal elemento de organização, com `rounded-2xl`, borda sutil e sombra leve (`shadow-sm` ou `shadow-md`).
    - **Botões e Inputs:** Design limpo, arredondado e com anel de foco na cor primária.

---

## 3. Arquitetura Técnica (Tech Stack)

A aplicação **deve** ser construída utilizando a seguinte stack, sem exceções:

- **Framework:** Next.js (com App Router)
- **Linguagem:** TypeScript
- **UI:** React, ShadCN UI
- **Estilização:** Tailwind CSS
- **Backend & DB:** Firebase (Authentication e Firestore)
- **IA Generativa:** Genkit

---

## 4. Arquitetura White-Label e Multi-Inquilino (Multi-Tenant)

Esta é a espinha dorsal do modelo de negócio. A implementação deve seguir esta lógica:

- **Isolamento de Dados:** Todos os dados no Firestore **devem** ser particionados por um `tenantId`. Cada inquilino (clínica, profissional) tem seus próprios dados isolados (pacientes, configurações, etc.).
- **`backend.json`:** Este arquivo define a estrutura das entidades e do banco de dados. Ele deve ser atualizado para refletir o modelo de dados da nova aplicação.
- **Renderização Dinâmica de Tema:** A aplicação renderiza a aparência (logo, cores, fontes) dinamicamente com base no inquilino (`tenantId`).
    - O componente `src/app/app-provider.tsx`, em conjunto com a função `src/lib/get-site-config-client.ts`, é responsável por identificar o inquilino (via hostname ou usuário logado) e injetar o tema correto.
    - A configuração de cada inquilino fica armazenada em `tenants/{tenantId}/config/site` no Firestore.

---

## 5. Experiência do Usuário (UX) e Padrões de Implementação

- **Responsividade (Mobile-First):** O layout deve ser 100% responsivo, adaptando-se perfeitamente de telas de celular a desktops. Conteúdo é reorganizado em uma única coluna em telas pequenas, e modais devem ser centralizados e não cortar conteúdo.
- **Páginas e Rotas:**
    - **Página Pública (`/`):** Deve servir como uma landing page (vitrine) para o produto, com seções como "Funcionalidades", "Preços" e "Depoimentos".
    - **Páginas de Autenticação (`/login`, `/register`):** Devem ser visualmente atraentes e seguras.
    - **Dashboard (`/dashboard`):** A tela principal da aplicação após o login do usuário final.
- **Modais e Diálogos:** Devem ser usados para ações focadas (ex: "Adicionar Refeição", "Configurações"). O design deve ser limpo, centralizado e com excelente uso de abas e ícones para simplificar formulários complexos.
- **Feedback ao Usuário:** Use `Toast` para notificações e confirmações. Use `Loader` (ícones de carregamento) dentro de botões para indicar ações em andamento.

---

## Exemplo de Aplicação (Contexto)

**Para a IA:** "Com base em todas as diretrizes acima, crie uma aplicação SaaS de [**descreva o novo nicho, ex: 'gestão de treinos para academias' ou 'plataforma de agendamento para salões de beleza'**]. A estrutura deve ser idêntica à do projeto Nutrinea, mas o conteúdo, as entidades de dados e as funcionalidades específicas devem ser adaptados para o novo contexto."
