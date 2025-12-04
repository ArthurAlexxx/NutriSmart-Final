"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const Icon = () => {
     if (theme === 'dark') {
      return <Moon className="h-[1.2rem] w-[1.2rem]" />;
    }
    if (theme === 'light') {
      return <Sun className="h-[1.2rem] w-[1.2rem]" />;
    }
    return <Monitor className="h-[1.2rem] w-[1.2rem]" />;
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={theme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.3 }}
        >
          <Icon />
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
