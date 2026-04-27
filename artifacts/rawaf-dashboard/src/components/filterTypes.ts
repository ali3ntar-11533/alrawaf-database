export interface FilterState {
  contractor:      string;
  portfolio:       string;
  project:         string;
  businessProgram: string;
  workType:        string;
  workCategory:    string;
  itemPrice:       string;
}

export const EMPTY_FILTERS: FilterState = {
  contractor:      "",
  portfolio:       "",
  project:         "",
  businessProgram: "",
  workType:        "",
  workCategory:    "",
  itemPrice:       "",
};
