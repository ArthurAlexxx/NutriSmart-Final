
// src/app/terms/page.tsx
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function TermsPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-16 md:py-24">
                    <article className="prose prose-lg max-w-4xl mx-auto dark:prose-invert">
                        <h1 className="text-4xl font-bold font-heading">Termos de Serviço</h1>
                        <p className="text-muted-foreground">Última atualização: 25 de Julho de 2024</p>
                        
                        <p>Bem-vindo ao Nutrinea. Estes Termos de Serviço ("Termos") regem o seu uso da nossa aplicação web e serviços. Ao acessar ou usar o Nutrinea, você concorda em cumprir estes Termos.</p>
                        
                        <h2>1. Uso do Serviço</h2>
                        <p>O Nutrinea fornece uma plataforma para acompanhamento nutricional, geração de receitas com IA e conexão com profissionais de saúde. Você concorda em usar o serviço apenas para fins legais e de acordo com estes Termos.</p>
                        <ul>
                            <li><strong>Conta de Usuário:</strong> Você é responsável por manter a confidencialidade de sua conta e senha.</li>
                            <li><strong>Uso Proibido:</strong> Você não pode usar o serviço para qualquer finalidade ilegal ou para violar quaisquer leis em sua jurisdição.</li>
                        </ul>

                        <h2>2. Conteúdo e Informações de Saúde</h2>
                        <p>O Nutrinea não é um dispositivo médico. As informações, receitas e planos alimentares gerados pela nossa Inteligência Artificial são sugestões e não devem substituir o conselho de um médico, nutricionista ou outro profissional de saúde qualificado.</p>
                        <p>Sempre consulte um profissional de saúde antes de iniciar qualquer nova dieta ou programa de exercícios. Você é o único responsável por suas decisões de saúde.</p>
                        
                        <h2>3. Assinaturas e Pagamentos</h2>
                        <p>Oferecemos planos gratuitos e pagos (Premium). As funcionalidades de cada plano estão descritas em nossa página de preços. As assinaturas Premium são cobradas mensal ou anualmente. Os pagamentos são processados por um gateway de pagamento terceirizado e estão sujeitos aos seus termos.</p>
                        
                        <h2>4. Propriedade Intelectual</h2>
                        <p>Todo o conteúdo, design e tecnologia do Nutrinea são de nossa propriedade ou licenciados para nós e protegidos por leis de direitos autorais. Você não pode copiar, modificar ou distribuir qualquer parte do nosso serviço sem permissão explícita.</p>

                        <h2>5. Limitação de Responsabilidade</h2>
                        <p>O Nutrinea é fornecido "como está", sem garantias de qualquer tipo. Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos, indiretos, incidentais ou consequentes resultantes do uso ou da incapacidade de usar nosso serviço.</p>

                        <h2>6. Alterações nos Termos</h2>
                        <p>Podemos modificar estes Termos a qualquer momento. Notificaremos você sobre quaisquer alterações publicando os novos Termos nesta página. Seu uso continuado do serviço após a publicação das alterações constitui sua aceitação dos novos Termos.</p>

                        <h2>7. Contato</h2>
                        <p>Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em <a href="mailto:legal@nutrinea.com">legal@nutrinea.com</a>.</p>
                    </article>
                </div>
            </main>
            <Footer />
        </div>
    );
}
