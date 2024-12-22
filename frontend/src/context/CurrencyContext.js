import React, { createContext, useContext, useState } from 'react';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [listCurrencies, setListCurrencies] = useState({});

  const setCurrencyForList = (listId, currency) => {
    setListCurrencies(prev => ({ ...prev, [listId]: currency }));
  };

  return (
    <CurrencyContext.Provider value={{ listCurrencies, setCurrencyForList }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);