import { createContext, useContext } from "react";
import { useContractors, useFilterOptions } from "./api";
import type { Contractor } from "./types";
import type { FilterOptionsMap } from "./api";

interface ContractorsContextValue {
  data:          Contractor[];
  isLoading:     boolean;
  isFetching:    boolean;
  isError:       boolean;
  refetch:       () => void;
  updateData:    (updater: (prev: Contractor[]) => Contractor[]) => void;
  filterOptions: FilterOptionsMap | null;
}

const ContractorsContext = createContext<ContractorsContextValue | null>(null);

export function ContractorsProvider({ children }: { children: React.ReactNode }) {
  const contractors   = useContractors();
  const filterOptions = useFilterOptions();

  return (
    <ContractorsContext.Provider value={{ ...contractors, filterOptions }}>
      {children}
    </ContractorsContext.Provider>
  );
}

export function useContractorsContext(): ContractorsContextValue {
  const ctx = useContext(ContractorsContext);
  if (!ctx) throw new Error("useContractorsContext must be used inside ContractorsProvider");
  return ctx;
}
