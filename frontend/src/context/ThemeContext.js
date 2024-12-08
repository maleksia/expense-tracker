import React, { createContext, useState, useContext } from 'react';
import { themes } from '../themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, theme: themes[currentTheme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);