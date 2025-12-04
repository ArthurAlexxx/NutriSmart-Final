"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useUser } from "@/firebase"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const { onProfileUpdate } = useUser();
  // We need to wait for the theme to be resolved on the client before rendering the icon
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const handleToggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    onProfileUpdate({ theme: newTheme });
  };
  
  const iconVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };

  return (
    <Button variant="outline" size="icon" onClick={handleToggleTheme} className="relative overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
             {mounted && resolvedTheme === 'dark' ? (
                 <motion.div
                    key="moon"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={iconVariants}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                >
                    <Moon className="h-[1.2rem] w-[1.2rem]" />
                </motion.div>
             ) : (
                <motion.div
                    key="sun"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={iconVariants}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem]" />
                </motion.div>
             )}
        </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
