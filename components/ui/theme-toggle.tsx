"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="h-[1.2rem] w-[1.2rem]" />
    } else if (theme === "dark") {
      return <Moon className="h-[1.2rem] w-[1.2rem]" />
    } else {
      return <Monitor className="h-[1.2rem] w-[1.2rem]" />
    }
  }

  const getTooltip = () => {
    if (theme === "light") {
      return "Switch to dark mode"
    } else if (theme === "dark") {
      return "Switch to system mode"
    } else {
      return "Switch to light mode"
    }
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={cycleTheme}
      title={getTooltip()}
      className="border-2 border-slate-300 dark:border-slate-600 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
