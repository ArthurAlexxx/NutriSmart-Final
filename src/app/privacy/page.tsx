
// src/app/privacy/page.tsx
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function PrivacyPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-16 md:py-24">
                    <article className="prose prose-lg max-w-4xl mx-auto dark:prose-invert">
                        <h1 className="text-4xl font-bold font-heading">Política de Privacidade</h1>
                        <p className="text-muted-foreground">Última atualização: 25 de Julho de 2024</p>
                        
                        <p>Sua privacidade é extremamente importante para nós do NutriSmart. Esta Política de Privacidade descreve como coletamos, usamos, compartilhamos e protegemos suas informações pessoais.</p>
                        
                        <h2>1. Informações que Coletamos</h2>
                        <ul>
                            <li><strong>Informações de Cadastro:</strong> Nome, e-mail e senha quando você cria uma conta.</li>
                            <li><strong>Dados de Saúde e Bem-Estar:</strong> Informações que você nos fornece, como peso, metas de saúde, refeições registradas, consumo de água e outras métricas.</li>
                            <li><strong>Dados de Uso:</strong> Informações sobre como você interage com nosso serviço, como funcionalidades utilizadas e frequência de acesso.</li>
                            <li><strong>Comunicação com a IA:</strong> Os prompts e ingredientes que você fornece ao nosso Chef Virtual para gerar receitas.</li>
                        </ul>

                        <h2>2. Como Usamos Suas Informações</h2>
                        <p>Utilizamos as informações coletadas para:</p>
                        <ul>
                            <li>Fornecer, manter e melhorar nosso serviço.</li>
                            <li>Personalizar sua experiência, como gerar planos alimentares e receitas.</li>
                            <li>Analisar seu progresso e fornecer insights sobre seus hábitos.</li>
                            <li>Comunicar-nos com você sobre sua conta e atualizações do serviço.</li>
                            <li>Processar pagamentos de assinatura.</li>
                        </ul>
                        
                        <h2>3. Compartilhamento de Informações</h2>
                        <p>Nós não vendemos suas informações pessoais. Podemos compartilhar suas informações nas seguintes circunstâncias:</p>
                        <ul>
                            <li><strong>Com seu Profissional:</strong> Se você optar por usar nosso recurso de compartilhamento, seu profissional de saúde cadastrado terá acesso aos seus dados para acompanhamento.</li>
                            <li><strong>Provedores de Serviço:</strong> Compartilhamos informações com terceiros que nos ajudam a operar, como provedores de nuvem (Firebase/Google Cloud) e gateways de pagamento.</li>
                            <li><strong>Para Fins Legais:</strong> Podemos divulgar suas informações se exigido por lei ou para proteger nossos direitos.</li>
                        </ul>

                        <h2>4. Segurança de Dados</h2>
                        <p>Implementamos medidas de segurança robustas para proteger suas informações, incluindo criptografia de dados em trânsito e em repouso. Utilizamos a infraestrutura segura do Firebase (Google Cloud) para armazenar seus dados.</p>

                        <h2>5. Seus Direitos</h2>
                        <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento através das configurações de sua conta ou entrando em contato conosco. Você também pode revogar o acesso de um profissional de saúde a qualquer momento.</p>

                        <h2>6. Retenção de Dados</h2>
                        <p>Manteremos suas informações enquanto sua conta estiver ativa ou conforme necessário para fornecer os serviços. Você pode excluir sua conta a qualquer momento, o que removerá permanentemente seus dados de nossos sistemas de produção.</p>

                        <h2>7. Alterações nesta Política</h2>
                        <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações significativas publicando a nova política em nosso site.</p>

                        <h2>8. Contato</h2>
                        <p>Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco em <a href="mailto:privacidade@nutrismart.com">privacidade@nutrismart.com</a>.</p>
                    </article>
                </div>
            </main>
            <Footer />
        </div>
    );
}
