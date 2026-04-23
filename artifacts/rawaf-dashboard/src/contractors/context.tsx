import { createContext, useContext } from "react";
import { useContractors } from "./api";
import type { Contractor } from "./types";

interface ContractorsContextValue {
  data: Contractor[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const ContractorsContext = createContext<ContractorsContextValue | null>(null);

export function ContractorsProvider({ children }: { children: React.ReactNode }) {
  const value = useContractors();
  return (
    <ContractorsContext.Provider value={value}>
      {children}
    </ContractorsContext.Provider>
  );
}

export function useContractorsContext(): ContractorsContextValue {
  const ctx = useContext(ContractorsContext);
  if (!ctx) throw new Error("useContractorsContext must be used inside ContractorsProvider");
  return ctx;
}
