
// src/app/press/page.tsx
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Mail, Download, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Imprensa',
};

const pressKitItems = [
    { title: 'Logotipo (PNG, SVG)', description: 'Versões em alta resolução do nosso logotipo.' },
    { title: 'Imagens do Produto', description: 'Screenshots e mockups da plataforma.' },
    { title: 'Guia da Marca', description: 'Diretrizes de uso da nossa identidade visual.' },
]

export default function PressPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-secondary/30 py-20 md:py-32">
                    <div className="container mx-auto text-center z-10 relative">
                        <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground">
                            Kit de <span className="text-primary">Imprensa</span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Recursos e informações para jornalistas, blogueiros e parceiros de mídia interessados em contar a história do Nutrinea.
                        </p>
                    </div>
                </section>

                {/* Contact & Kit Section */}
                <section className="py-20 lg:py-24">
                    <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        {/* Contato */}
                        <div className="space-y-6 text-center md:text-left">
                            <h2 className="text-3xl font-bold font-heading">Contato de Mídia</h2>
                            <p className="text-muted-foreground text-lg">
                                Para todas as perguntas da imprensa, entrevistas ou outras solicitações de mídia, entre em contato com nossa equipe de comunicação.
                            </p>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="font-semibold">Equipe de Comunicação</p>
                                    <a href="mailto:imprensa@nutrinea.com" className="text-primary text-lg font-medium flex items-center justify-center md:justify-start gap-2 mt-2 hover:underline">
                                        <Mail className="h-5 w-5" />
                                        imprensa@nutrinea.com
                                    </a>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Press Kit */}
                        <div className="space-y-6 text-center md:text-left">
                             <h2 className="text-3xl font-bold font-heading">Recursos da Marca</h2>
                             <p className="text-muted-foreground text-lg">
                                Faça o download do nosso kit de imprensa completo, que inclui logotipos, imagens do produto e guia da marca.
                            </p>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Newspaper className="h-6 w-6 text-primary" /> Conteúdo do Kit</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     {pressKitItems.map(item => (
                                        <div key={item.title} className="flex items-start gap-3">
                                            <div className="w-2 h-2 mt-2 bg-primary rounded-full shrink-0" />
                                            <div>
                                                <p className="font-semibold">{item.title}</p>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                        </div>
                                     ))}
                                </CardContent>
                             </Card>
                             <Button asChild size="lg" className="w-full">
                                <a href="#">
                                    <Download className="mr-2 h-5 w-5" />
                                    Baixar Press Kit
                                </a>
                             </Button>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
