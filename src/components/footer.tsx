
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const LogoDisplay = () => {
    const logoImage = PlaceHolderImages.find(p => p.id === 'logo');
    return (
        <Image 
            src={logoImage?.imageUrl || ''}
            alt="Nutrinea Logo"
            width={140}
            height={35}
            priority
        />
    );
};


export default function Footer() {
  return (
    <footer className="w-full border-t bg-secondary/30">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          
          <div className="flex flex-col items-start gap-4 md:col-span-12 lg:col-span-4">
             <Link href="/" className="flex items-center gap-2">
                <LogoDisplay />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Nutrição inteligente para uma vida saudável. Junte-se a nós e transforme sua relação com a comida.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:col-span-12 lg:col-span-8 lg:pl-16">
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Produto</h3>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">Funcionalidades</Link></li>
                <li><Link href="/#testimonials" className="text-muted-foreground hover:text-primary transition-colors">Depoimentos</Link></li>
                <li><Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Preços</Link></li>
              </ul>
            </div>
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Empresa</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">Sobre Nós</Link></li>
                <li><Link href="/careers" className="text-muted-foreground hover:text-primary transition-colors">Carreiras</Link></li>
                <li><Link href="/press" className="text-muted-foreground hover:text-primary transition-colors">Imprensa</Link></li>
              </ul>
            </div>
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Legal</h3>
              <ul className="space-y-3">
                 <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Termos de Serviço</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

        </div>
        <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
                © {new Date().getFullYear()} Nutrinea. Todos os direitos reservados.
            </p>
        </div>
      </div>
    </footer>
  );
}
