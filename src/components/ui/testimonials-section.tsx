// src/components/ui/testimonials-section.tsx
"use client";
import React from "react";
import { Star } from "lucide-react";
import { Badge } from "./badge";
import { Card, CardContent, CardFooter, CardHeader } from "./card";

type Testimonial = {
    text: string;
    image: string;
    name: string;
    role: string;
    rating: number;
};

const testimonials: Testimonial[] = [
    {
        name: 'Juliana M.',
        role: 'Usuária Satisfeita',
        text: '"O NutriNea mudou minha relação com a comida. Nunca foi tão fácil comer bem e atingir minhas metas de saúde. A IA entende minhas necessidades!"',
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80",
        rating: 5,
    },
    {
        name: 'Carlos S.',
        role: 'Atleta Amador',
        text: '"Como atleta, minha nutrição é fundamental. O app me ajuda a controlar meus macros com uma precisão incrível e o Chef Virtual é perfeito para refeições pós-treino."',
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&q=80",
        rating: 5,
    },
    {
        name: 'Dr. Fernanda L.',
        role: 'Nutricionista Parceira',
        text: '"Uso o NutriNea para acompanhar meus pacientes e os resultados são fantásticos. A interface é intuitiva e a capacidade de compartilhar dados otimizou meu trabalho."',
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80",
        rating: 5,
    },
    {
        name: 'Lucas P.',
        role: 'Pai de Família',
        text: '"Com a rotina corrida, eu não tinha tempo para planejar refeições. O Chef Virtual foi um divisor de águas! Receitas rápidas e saudáveis que toda a família adora."',
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80",
        rating: 4,
    }
];

const TestimonialCard = ({ text, image, name, role, rating }: Testimonial) => (
    <Card className="h-full flex flex-col justify-between shadow-sm hover:shadow-primary/10 transition-shadow duration-300">
        <CardHeader>
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`}
                    />
                ))}
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-muted-foreground text-base">"{text}"</p>
        </CardContent>
        <CardFooter>
            <div className="flex items-center gap-3">
                <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{role}</p>
                </div>
            </div>
        </CardFooter>
    </Card>
);

export function TestimonialsSection() {
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
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {testimonials.map((testimonial, i) => (
                        <TestimonialCard key={i} {...testimonial} />
                    ))}
                </div>
            </div>
        </section>
    );
}