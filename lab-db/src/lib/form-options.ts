export const EXPERIMENT_OWNERS = ["Jeff", "Steven", "Li-Yao", "Nick", "Martyn"] as const;
export const EXPERIMENT_TYPES = ["MOLBIOL", "INSILICO", "CELL"] as const;
export const EXPERIMENT_SOURCES = ["INTERNAL", "EXTERNAL"] as const;

export const PLASMID_TYPES = ["BACTERIAL", "MAMMALIAN", "LENTIVECTOR", "AAV"] as const;
export const PLASMID_SOURCES = ["IN_HOUSE", "ADDGENE", "THERMOFISHER", "EXTERNAL"] as const;
export const BACTERIAL_ANTIBIOTICS = [
  "AMPICILLIN",
  "KANAMYCIN",
  "CHLORAMPHENICOL",
] as const;
export const MAMMALIAN_ANTIBIOTICS = ["PUROMYCIN", "G418"] as const;
export const PROMOTERS = ["CMV", "CAG", "UBC"] as const;

export const BOOLEAN_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

export type ConstructFormValues = {
  id: string;
  shortName: string;
  proteinSequence: string;
};

export type PlasmidFormValues = {
  id: string;
  name: string;
  emptyVector: string;
  placeholderOnly: string;
  hasPlasmidPrep: string;
  hasGlycerolStock: string;
  vectorBackbone: string;
  insertDescription: string;
  guideRna: string;
  plasmidType: string;
  bacterialAntibiotic: string;
  mammalianAntibiotic: string;
  source: string;
  mammalianPromoter: string;
  bacterialOri: string;
  createdBy: string;
  createdOn: string;
  comments: string;
  description: string;
  constructId: string;
};

export type ExperimentFormValues = {
  id: string;
  owner: string;
  type: string;
  source: string;
  externalParty: string;
  titleAim: string;
  startDate: string;
  endDate: string;
  folderPath: string;
  comments: string;
};

export type FormState<TValues> = {
  values: TValues;
  errors: Record<string, string>;
};

export const emptyConstructValues: ConstructFormValues = {
  id: "",
  shortName: "",
  proteinSequence: "",
};

export const emptyPlasmidValues: PlasmidFormValues = {
  id: "",
  name: "",
  emptyVector: "",
  placeholderOnly: "",
  hasPlasmidPrep: "",
  hasGlycerolStock: "",
  vectorBackbone: "",
  insertDescription: "",
  guideRna: "",
  plasmidType: "",
  bacterialAntibiotic: "",
  mammalianAntibiotic: "",
  source: "",
  mammalianPromoter: "",
  bacterialOri: "",
  createdBy: "",
  createdOn: "",
  comments: "",
  description: "",
  constructId: "",
};

export const emptyExperimentValues: ExperimentFormValues = {
  id: "",
  owner: "",
  type: "",
  source: "",
  externalParty: "",
  titleAim: "",
  startDate: "",
  endDate: "",
  folderPath: "",
  comments: "",
};
