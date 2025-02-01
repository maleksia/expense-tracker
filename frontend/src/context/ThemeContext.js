import React, { createContext, useState, useContext, useEffect } from 'react';
import { themes } from '../themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Update CSS variables based on theme
    Object.entries(themes[currentTheme]).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set theme attribute for CSS selectors
    root.setAttribute('data-theme', currentTheme);
    
    // Set background colors
    root.style.backgroundColor = themes[currentTheme].background;
    body.style.backgroundColor = themes[currentTheme].background;
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, theme: themes[currentTheme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);