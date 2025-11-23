// src/components/ui/testimonials-section.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";
import { Badge } from "./badge";

type Testimonial = {
    text: string;
    image: string;
    name: string;
    role: string;
};

const testimonials: Testimonial[] = [
    {
        name: 'Juliana M.',
        role: 'Usuária Satisfeita',
        text: '"O NutriNea mudou minha relação com a comida. Nunca foi tão fácil comer bem e atingir minhas metas de saúde. A IA entende minhas necessidades!"',
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80",
    },
    {
        name: 'Carlos S.',
        role: 'Atleta Amador',
        text: '"Como atleta, minha nutrição é fundamental. O app me ajuda a controlar meus macros com uma precisão incrível e o Chef Virtual é perfeito para criar refeições pós-treino."',
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&q=80",
    },
    {
        name: 'Dr. Fernanda L.',
        role: 'Nutricionista Parceira',
        text: '"Uso o NutriNea para acompanhar meus pacientes e os resultados são fantásticos. A interface é intuitiva e a capacidade de compartilhar dados otimizou meu trabalho."',
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80",
    },
    {
        name: 'Lucas P.',
        role: 'Pai de Família',
        text: '"Com a rotina corrida, eu não tinha tempo para planejar refeições. O Chef Virtual foi um divisor de águas! Receitas rápidas e saudáveis que toda a família adora."',
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80",
    }
];

const TestimonialCard = ({ text, image, name, role }: Testimonial) => (
    <div className="p-6 rounded-2xl border bg-card shadow-sm max-w-xs w-full flex flex-col transition-all duration-300 hover:shadow-primary/10 hover:border-primary/30 hover:scale-105">
      <div className="text-muted-foreground flex-grow">"{text}"</div>
      <div className="flex items-center gap-3 mt-5">
        <img
          width={40}
          height={40}
          src={image}
          alt={name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <div className="font-semibold text-foreground tracking-tight leading-5">{name}</div>
          <div className="leading-5 text-muted-foreground text-sm tracking-tight">{role}</div>
        </div>
      </div>
    </div>
);


const TestimonialsColumn = ({ testimonials, duration = 20, className = "" }: { testimonials: Testimonial[]; duration?: number; className?: string; }) => {
  return (
    <div className={`relative h-[500px] w-full max-w-xs overflow-hidden ${className}`}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...testimonials, ...testimonials].map((testimonial, i) => (
          <TestimonialCard key={i} {...testimonial} />
        ))}
      </motion.div>
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-secondary/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-secondary/30 to-transparent" />
    </div>
  );
};


export const TestimonialsSection = () => {
    return (
        <section id="testimonials" className="w-full py-20 lg:py-24 bg-secondary/30">
            <div className="container mx-auto">
                 <div className="text-center max-w-3xl mx-auto">
                    <Badge variant="outline" className="mb-4">Depoimentos</Badge>
                    <h2 className="text-3xl font-bold md:text-4xl font-heading">Amado por milhares de usuários e profissionais</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Veja o que estão dizendo sobre a transformação que o NutriNea proporcionou.
                    </p>
                </div>
                <div className="mt-16 flex justify-center items-start gap-6">
                   <TestimonialsColumn testimonials={testimonials.slice(0,2)} duration={25} />
                   <TestimonialsColumn testimonials={testimonials.slice(2,4)} duration={30} className="hidden md:flex" />
                   <TestimonialsColumn testimonials={testimonials.slice(0,2)} duration={22} className="hidden lg:flex" />
                </div>
            </div>
        </section>
    );
}
