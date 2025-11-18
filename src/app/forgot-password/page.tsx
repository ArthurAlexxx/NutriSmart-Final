
// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';

const formSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const handlePasswordReset = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSubmitted(true);
    } catch (error: any) {
      let description = 'Ocorreu um erro desconhecido. Tente novamente.';
      if (error.code === 'auth/user-not-found') {
        description = 'Nenhuma conta encontrada com este e-mail. Verifique o e-mail digitado.';
      } else if (error.code === 'auth/invalid-email') {
          description = "O formato do e-mail é inválido. Por favor, corrija e tente novamente."
      }
      toast({
        title: 'Erro ao Enviar E-mail',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6 text-2xl font-bold font-heading text-primary">
              NutriSmart
          </Link>
          <h1 className="text-3xl font-bold font-heading">Redefinir Senha</h1>
          <p className="text-muted-foreground mt-2">
              {submitted 
              ? "Verifique sua caixa de entrada."
              : "Insira seu e-mail para receber o link."
              }
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className='w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto'>
              <Mail className="h-10 w-10" />
            </div>
            <p className="text-muted-foreground">
                Se uma conta com este e-mail existir, um link para redefinir sua senha foi enviado. O link expira em alguns minutos.
            </p>
            <Button asChild>
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Login
                </Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link de Redefinição
              </Button>
                <div className="text-center text-sm">
                  Lembrou a senha?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                      Faça login
                  </Link>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
