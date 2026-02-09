export interface VisitedCountry {
  id: string;
  name: string;
  image: string;
}

export interface CountryFeature {
  type: "Feature";
  id: string;
  properties: {
    name: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}
