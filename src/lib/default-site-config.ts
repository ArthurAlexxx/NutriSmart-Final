
// src/lib/default-site-config.ts
import type { SiteConfig } from './site-config-schema';

export const defaultSiteConfig: SiteConfig = {
  siteName: "NutriSmart",
  logo: {
    type: 'image',
    imageUrl: "https://i.imgur.com/QHV8Oil.png",
    text: "NutriSmart",
    font: "Lexend",
  },
  theme: {
    primaryColor: "Verde Nutri",
    titleFontSize: "Grande",
  },
  heroSection: {
    title: "O futuro da sua saúde, <span class='text-primary'>hoje</span>.",
    subtitle: "A plataforma inteligente que une o melhor da nutrição e tecnologia. Transforme sua jornada de bem-estar com planos alimentares, IA e acompanhamento em tempo real.",
    cta: "Começar minha Jornada",
    imageUrl: "https://i.imgur.com/hyUEBmM.png",
  },
  featuresSection: {
    title: "Uma plataforma <span class='text-primary'>completa</span> para sua saúde",
    subtitle: "Do registro de refeições ao plano personalizado com IA, temos tudo o que você precisa para alcançar seus objetivos.",
    features: [
      { icon: 'BookCheck', title: 'Diário Inteligente', description: 'Registre suas refeições, água e histórico de consumo de forma simples e intuitiva.' },
      { icon: 'BrainCircuit', title: 'Análise com IA', description: 'Receba análises detalhadas e planos que se adaptam às suas metas e progresso.' },
      { icon: 'ChefHat', title: 'Chef Virtual', description: 'Descubra milhares de receitas com base nos ingredientes que você tem em casa.' },
      { icon: 'Users', title: 'Conexão Profissional', description: 'Compartilhe seus dados com seu nutricionista para um acompanhamento preciso e seguro.' },
    ],
  },
  professionalProfileSection: {
    title: "Conheça o seu Nutricionista",
    aboutMe: "Olá! Sou especialista em nutrição, com mais de 10 anos de experiência em transformar vidas através da alimentação. Minha missão é ajudar você a construir uma relação saudável e prazerosa com a comida, alcançando seus objetivos de bem-estar de forma sustentável e sem dietas restritivas. Acredito em uma abordagem personalizada, focada na reeducação alimentar e no equilíbrio. Vamos juntos nessa jornada?",
    location: "São Paulo, SP (Atendimento Online)",
    hours: "Seg - Sex, 9h às 18h",
    imageUrl: "https://images.unsplash.com/photo-1576091160323-838b816a1b63?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  ctaSection: {
    title: "Eleve seu atendimento a <span class='text-primary'>outro nível</span>.",
    subtitle: "Ofereça aos seus pacientes uma plataforma moderna para acompanhamento em tempo real, gestão de planos e comunicação direta. Tenha sua própria página, otimize seu tempo e entregue mais resultados com uma solução white-label completa.",
    cta: "Torne-se um Parceiro",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  testimonialsSection: {
    title: "Resultados que falam por si",
    testimonials: [
      {
        name: 'Juliana M.',
        role: 'Usuária Satisfeita',
        quote: '"O NutriSmart mudou minha relação com a comida. Nunca foi tão fácil comer bem e atingir minhas metas de saúde. A IA entende minhas necessidades melhor que qualquer app que já usei!"',
        imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxwcm9maWxlJTIwcGljdHVyZXxlbnwwfHx8fDE3NTg5MDk0Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        imageHint: "profile picture"
      },
      {
        name: 'Carlos S.',
        role: 'Atleta Amador',
        quote: '"Como atleta, minha nutrição é fundamental. O app me ajuda a controlar meus macros com uma precisão incrível e o Chef Virtual é perfeito para criar refeições pós-treino. Recomendo 100%!"',
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        imageHint: "athletic man"
      },
      {
        name: 'Dr. Fernanda L.',
        role: 'Nutricionista Parceira',
        quote: '"Uso o NutriSmart para acompanhar meus pacientes e os resultados são fantásticos. A interface é intuitiva e a capacidade de compartilhar dados de forma segura otimizou meu trabalho e melhorou a adesão ao plano."',
        imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxoZWFsdGglMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzU4OTA4Mzk5fDA&ixlib=rb-4.1.0&q=80&w=1080",
        imageHint: "health professional"
      },
      {
        name: 'Lucas P.',
        role: 'Pai de Família',
        quote: '"Com a rotina corrida, eu não tinha tempo para planejar refeições. O Chef Virtual foi um divisor de águas! Receitas rápidas, saudáveis e que toda a família adora."',
        imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        imageHint: "smiling man"
      }
    ]
  },
  finalCtaSection: {
    title: "Pronto para revolucionar sua saúde?",
    subtitle: "Junte-se a milhares de pessoas que já estão vivendo de forma mais saudável e conectada com a ajuda da nossa plataforma inteligente.",
    cta: "Comece sua Jornada Grátis",
  }
};
