import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const symbols: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "Rs. ",
  EUR: "€",
  GBP: "£",
};

// Conversion multiplier from base DB price (assumed in USD)
const rates: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 80,
  EUR: 0.9,
  GBP: 0.8,
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem("app_currency") as CurrencyCode) || "USD";
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("app_currency", c);
  };

  const formatPrice = (amount: number) => {
    const symbol = symbols[currency] || "$";
    const rate = rates[currency] || 1;
    const converted = amount * rate;
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
