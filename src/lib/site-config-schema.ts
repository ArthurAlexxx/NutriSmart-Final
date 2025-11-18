
// src/lib/site-config-schema.ts
import { z } from 'zod';

const featureSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

const testimonialSchema = z.object({
  name: z.string(),
  role: z.string(),
  quote: z.string(),
  imageUrl: z.string().url(),
  imageHint: z.string(),
});

export const colorOptions = {
    'Verde Nutri': '#72A159',
    'Azul Sereno': '#3b82f6',
    'Rosa Vital': '#ec4899',
    'Laranja Energia': '#f97316',
    'Roxo Criativo': '#8b5cf6',
    'Ciano Fresh': '#06b6d4',
};

export const colorHslMap: Record<keyof typeof colorOptions, string> = {
    'Verde Nutri': '101 28% 54%',
    'Azul Sereno': '221 83% 53%',
    'Rosa Vital': '326 81% 61%',
    'Laranja Energia': '26 95% 53%',
    'Roxo Criativo': '263 90% 67%',
    'Ciano Fresh': '190 95% 43%',
};

// Map for contrasting foreground colors
export const colorForegroundHslMap: Record<keyof typeof colorOptions, string> = {
    'Verde Nutri': '101 28% 98%', // Near-white for Verde Nutri
    'Azul Sereno': '221 83% 98%', // Near-white for Azul Sereno
    'Rosa Vital': '326 81% 98%', // Near-white for Rosa Vital
    'Laranja Energia': '26 95% 98%', // Near-white for Laranja Energia
    'Roxo Criativo': '263 90% 98%', // Near-white for Roxo Criativo
    'Ciano Fresh': '190 95% 98%', // Near-white for Ciano Fresh
};

export const logoFonts = {
    'Poppins': 'var(--font-poppins)',
    'Lexend': 'var(--font-lexend)',
    'Montserrat': 'var(--font-montserrat)',
    'Lato': 'var(--font-lato)',
    'Oswald': 'var(--font-oswald)',
    'Roboto Slab': 'var(--font-roboto-slab)',
    'Playfair Display': 'var(--font-playfair-display)',
    'Merriweather': 'var(--font-merriweather)',
    'Lobster': 'var(--font-lobster)',
    'Pacifico': 'var(--font-pacifico)',
    'Dancing Script': 'var(--font-dancing-script)',
    'Caveat': 'var(--font-caveat)',
};

export const titleFontSizes = {
  'Pequeno': 'text-3xl sm:text-4xl',
  'Médio': 'text-4xl sm:text-5xl',
  'Grande': 'text-5xl sm:text-6xl',
  'Extra Grande': 'text-6xl sm:text-7xl',
};


export const siteConfigSchema = z.object({
  siteName: z.string(),
  customDomain: z.string().optional(),
  logo: z.object({
    type: z.enum(['image', 'text']),
    imageUrl: z.string().url().or(z.literal('')),
    text: z.string().optional(),
    font: z.enum(Object.keys(logoFonts) as [keyof typeof logoFonts, ...(keyof typeof logoFonts)[]]).optional(),
  }),
  theme: z.object({
    primaryColor: z.enum(Object.keys(colorOptions) as [keyof typeof colorOptions, ...(keyof typeof colorOptions)[]]).default('Verde Nutri'),
    titleFontSize: z.enum(Object.keys(titleFontSizes) as [keyof typeof titleFontSizes, ...(keyof typeof titleFontSizes)[]]).default('Médio'),
  }),
  heroSection: z.object({
    title: z.string(),
    subtitle: z.string(),
    cta: z.string(),
    imageUrl: z.string().url(),
  }),
  featuresSection: z.object({
    title: z.string(),
    subtitle: z.string(),
    features: z.array(featureSchema),
  }),
  professionalProfileSection: z.object({
    title: z.string(),
    aboutMe: z.string(),
    location: z.string(),
    hours: z.string(),
    imageUrl: z.string().url().or(z.literal('')),
  }),
  ctaSection: z.object({
    title: z.string(),
    subtitle: z.string(),
    cta: z.string(),
    imageUrl: z.string().url(),
  }),
  testimonialsSection: z.object({
    title: z.string(),
    testimonials: z.array(testimonialSchema),
  }),
  finalCtaSection: z.object({
    title: z.string(),
    subtitle: z.string(),
    cta: z.string(),
  }),
});

// This schema defines the structure for the settings form.
// It includes optional fields for sections only the super-admin can see.
export const siteSettingsSchema = z.object({
    siteName: z.string().min(1, "O nome do site é obrigatório."),
    customDomain: z.string().optional(),
    logo: z.object({
        type: z.enum(['image', 'text']),
        imageUrl: z.string().url("URL da logo inválida.").or(z.literal('')),
        text: z.string().optional(),
        font: z.enum(Object.keys(logoFonts) as [keyof typeof logoFonts, ...(keyof typeof logoFonts)[]]).optional(),
    }).refine(data => {
        if (data.type === 'image') return data.imageUrl !== '';
        if (data.type === 'text') return data.text && data.text.length > 0;
        return false;
    }, {
        message: "Forneça uma URL para a imagem ou um texto para o logo.",
        path: ['imageUrl'], // Apply error to a common path
    }),
    theme: z.object({
        primaryColor: z.enum(Object.keys(colorOptions) as [keyof typeof colorOptions, ...(keyof typeof colorOptions)[]]),
        titleFontSize: z.enum(Object.keys(titleFontSizes) as [keyof typeof titleFontSizes, ...(keyof typeof titleFontSizes)[]]).default('Médio'),
    }),
    heroSection: z.object({
        title: z.string().min(1, "O título é obrigatório."),
        subtitle: z.string().min(1, "O subtítulo é obrigatório."),
        cta: z.string().min(1, "O CTA é obrigatório."),
        imageUrl: z.string().url("URL da imagem do Hero inválida.").or(z.literal('')),
    }),
    professionalProfileSection: z.object({
        title: z.string(),
        aboutMe: z.string(),
        location: z.string(),
        hours: z.string(),
        imageUrl: z.string().url("URL da imagem do perfil inválida.").or(z.literal('')),
    }),
    featuresSection: z.object({
        title: z.string(),
        subtitle: z.string(),
        features: z.array(featureSchema).optional(),
    }).optional(),
    ctaSection: z.object({
        title: z.string(),
        subtitle: z.string(),
        cta: z.string(),
        imageUrl: z.string().url().or(z.literal('')),
    }).optional(),
    testimonialsSection: z.object({
        title: z.string(),
        testimonials: z.array(testimonialSchema).optional(),
    }).optional(),
    finalCtaSection: z.object({
        title: z.string(),
        subtitle: z.string(),
        cta: z.string(),
    }).optional(),
});


export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
