export type UUID = string;

export type ISODateTime = string;

export type WeightKg = number;

export type DisplayWeight = {
  value: number;
  unit: "lb" | "kg";
};

export type AppEnvironment = "development" | "preview" | "production";

export type RPE = 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10;
