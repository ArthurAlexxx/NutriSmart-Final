// src/components/ui/gradient-background.tsx
"use client";

import { cn } from "@/lib/utils";

export default function GradientBackground() {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.5), transparent)
        `,
        backgroundSize: "100% 100%",
      }}
    />
  );
};
