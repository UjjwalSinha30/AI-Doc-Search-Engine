import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(() => {
    // 1. First priority: saved user preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
    }

    // 2. Second priority: system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 3. Server/default fallback
    return false;
  });

  // Sync class + localStorage when darkMode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save preference (we save even when following system)
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <button
      onClick={toggleDarkMode}
      aria-label="Toggle dark mode"
      className="mt-auto flex items-center gap-3 p-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      <span className="text-sm font-medium">
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
} 