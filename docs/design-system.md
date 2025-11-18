# Sistema de Design - Especificação Padrão

Este documento define a identidade visual e os princípios de UX/UI para nossos projetos, usando o NutriSmart como base.

## 1. Filosofia de Design e Inspiração

- **Filosofia:** A interface deve ser limpa, moderna e inspirar confiança. Priorizamos a clareza e a facilidade de uso, com uma estética que é ao mesmo tempo profissional e acolhedora. O design deve ser intuitivo, guiando o usuário naturalmente através das funcionalidades.
- **Referência Visual:** O design se inspira na clareza e organização de aplicativos de produtividade modernos como **Notion** e **Linear**, combinados com a estética visual convidativa de plataformas de bem-estar como **Headspace**.

## 2. Paleta de Cores

A paleta de cores é um dos pilares da nossa identidade visual.

- **Cor Primária:** O tom principal da marca deve ser o **Verde Nutri (`hsl(101 28% 54%)`)**. Esta cor transmite saúde, natureza e vitalidade, sendo usada em botões principais, links e elementos de destaque.
- **Cor de Fundo (Background):** Um branco puro (`hsl(0 0% 100%)`) para a maior parte do conteúdo, com um cinza muito claro (`hsl(210 40% 96.1%)`) para seções secundárias ou para o fundo geral do app, criando um contraste suave.
- **Cores de Texto:**
    - **Principal (Foreground):** Um cinza bem escuro (`hsl(224 71.4% 4.1%)`), em vez de preto puro, para uma leitura mais confortável.
    - **Secundário (Muted Foreground):** Um cinza mais claro (`hsl(215.4 16.3% 46.9%)`) para descrições, placeholders e textos de menor importância.
- **Cores de Acento (Feedback):**
    - **Destrutivo (Errors):** Vermelho vivo (`hsl(0 84.2% 60.2%)`) para ações de exclusão e mensagens de erro.

## 3. Tipografia

A escolha das fontes é crucial para a legibilidade e personalidade do sistema.

- **Fonte para Títulos (Heading):** **Lexend**. É uma fonte moderna, com excelente legibilidade e um toque amigável, ideal para títulos e destaques. Use a variável `--font-lexend`.
- **Fonte para Corpo de Texto (Sans):** **Poppins**. É uma fonte geométrica e limpa, que funciona muito bem para parágrafos, botões e elementos de interface em geral. Use a variável `--font-poppins`.

## 4. Estilo dos Componentes (UI)

A consistência no estilo dos componentes cria uma experiência de usuário coesa.

- **Estilo Geral:** Componentes com cantos **bem arredondados**, transmitindo uma sensação de modernidade e suavidade. O `border-radius` principal deve ser `0.8rem`.
- **Cards:** Devem ser o principal elemento de organização de conteúdo. Use cantos bem arredondados (`rounded-2xl`), uma borda sutil e uma sombra leve (`shadow-sm` ou `shadow-md`) para dar uma sensação de profundidade e elevação em relação ao fundo.
- **Botões:** Arredondados (`rounded-md` ou `rounded-full` para CTAs específicos), com uma transição suave de cor ao passar o mouse. O texto deve estar em negrito.
- **Campos de Formulário (Inputs):** Devem ter um design limpo, com bordas claras e um anel de foco (ring) visível na cor primária quando selecionados.

## 5. Instruções Diretas para Implementação

- **Cor Primária:** Use `hsl(101 28% 54%)` para a variável `--primary` no `globals.css`.
- **Raio da Borda:** Defina a variável `--radius` em `globals.css` como `0.8rem`.
- **Fontes:** Configure `Lexend` como `font-heading` e `Poppins` como `font-sans` no arquivo `tailwind.config.ts`.
- **Sombras:** Aplique `shadow-sm` ou `shadow-md` em Cards para criar uma hierarquia visual.
- **Layout:** Utilize bastante espaço em branco para não sobrecarregar a interface. O conteúdo principal deve ser centralizado em um contêiner com padding generoso.
