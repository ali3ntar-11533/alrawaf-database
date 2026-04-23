export interface Contractor {
  id: number;
  contractNo: string;
  contractor: string;
  project: string;
  portfolio: string;
  workType: string;
  technicalScope: string;
  price: number;
  phone: string;
  email: string;
  mainActivity?: string | null;
  businessProgram?: string | null;
  workCategory?: string | null;
  unit?: string | null;
  localContent?: string | null;
  workDescription?: string | null;
  workScopeText?: string | null;
  rating?: number | null;
}
