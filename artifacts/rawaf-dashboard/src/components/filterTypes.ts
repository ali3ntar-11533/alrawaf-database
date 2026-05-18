export interface FilterState {
  contractor:      string;
  portfolio:       string;
  project:         string;
  businessProgram: string;
  workFamily:      string;
  workType:        string;
  itemScope:       string;
  techSpecs:       string;
  measurements:    string;
  workCategory:    string;
  itemPrice:       string;
}

export const EMPTY_FILTERS: FilterState = {
  contractor:      "",
  portfolio:       "",
  project:         "",
  businessProgram: "",
  workFamily:      "",
  workType:        "",
  itemScope:       "",
  techSpecs:       "",
  measurements:    "",
  workCategory:    "",
  itemPrice:       "",
};
