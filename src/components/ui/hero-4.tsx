// components/ui/hero-section.tsx
'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { motion } from "framer-motion";

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

const TypingAnimation = ({ texts }: { texts: string[] }) => {
  const [textIndex, setTextIndex] = React.useState(0);
  const [displayedText, setDisplayedText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const handleTyping = () => {
      const currentText = texts[textIndex];
      if (isDeleting) {
        if (displayedText.length > 0) {
          setDisplayedText((prev) => prev.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      } else {
        if (displayedText.length < currentText.length) {
          setDisplayedText((prev) => currentText.slice(0, prev.length + 1));
        } else {
          // Wait before deleting
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    };

    const typingSpeed = isDeleting ? 100 : 150;
    const timeout = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, textIndex, texts]);

  return (
    <span className="inline-block">
      {displayedText}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
        className="inline-block w-[2px] h-[1em] bg-primary ml-1 translate-y-1"
      ></motion.span>
    </span>
  );
};


const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, title, animatedTexts, subtitle, infoBadgeText, ctaButtonText, ctaButtonLink, socialProofText, avatars, ...props }, ref) => {
    
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
                <TypingAnimation texts={animatedTexts} />
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
