// components/ui/hero-section.tsx
'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  animatedTexts: string[];
  subtitle: string;
  infoBadgeText: string;
  ctaButtonText: string;
  ctaButtonLink: string;
  socialProofText: string;
  avatars: {
    src: string;
    alt: string;
    fallback: string;
  }[];
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, title, animatedTexts, subtitle, infoBadgeText, ctaButtonText, ctaButtonLink, socialProofText, avatars, ...props }, ref) => {
    const [textIndex, setTextIndex] = React.useState(0);

    React.useEffect(() => {
      const interval = setInterval(() => {
        setTextIndex((prevIndex) => (prevIndex + 1) % animatedTexts.length);
      }, 4000); // Change text every 4 seconds

      return () => clearInterval(interval);
    }, [animatedTexts.length]);

    return (
      <section
        className={cn("container mx-auto flex flex-col items-center justify-center text-center py-20 md:py-32", className)}
        ref={ref}
        {...props}
      >
        <div className="max-w-4xl">
          {/* Info Badge */}
          <div className="inline-flex items-center rounded-lg bg-secondary text-secondary-foreground px-3 py-1 text-sm font-medium mb-6">
            {infoBadgeText}
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {title}
            <div className="relative mt-2 block w-fit mx-auto">
              <span className="absolute inset-0 -z-10 -m-2">
                <span className="absolute inset-0 border-2 border-dashed border-primary rounded-2xl"></span>
              </span>
              <div className="text-primary min-h-[1.2em] inline-block">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={textIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    {animatedTexts[textIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-6">
          {/* CTA Button */}
          <Button asChild size="lg" className="px-8 py-6 text-lg">
            <Link href={ctaButtonLink}>
                {ctaButtonText}
            </Link>
          </Button>

          {/* Social Proof */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex -space-x-4">
              {avatars.map((avatar, index) => (
                <Avatar key={index} className="border-2 border-background">
                  <AvatarImage src={avatar.src} alt={avatar.alt} />
                  <AvatarFallback>{avatar.fallback}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="ml-4 text-sm font-medium text-muted-foreground">
              {socialProofText}
            </p>
          </div>
        </div>
      </section>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
