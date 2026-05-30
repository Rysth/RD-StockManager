// Listados para los selects de Clientes.

// Principales ciudades / cantones del Ecuador (orden alfabético).
export const ECUADOR_CITIES = [
  "Ambato",
  "Azogues",
  "Babahoyo",
  "Cuenca",
  "Daule",
  "Durán",
  "Esmeraldas",
  "Guayaquil",
  "Ibarra",
  "Latacunga",
  "Loja",
  "Machala",
  "Manta",
  "Milagro",
  "Portoviejo",
  "Quevedo",
  "Quito",
  "Riobamba",
  "Salinas",
  "Samborondón",
  "Santa Elena",
  "Santo Domingo",
  "Tena",
  "Tulcán",
  "Ventanas",
] as const;

// Países (Ecuador primero por ser el mercado principal).
export const COUNTRIES = [
  "Ecuador",
  "Argentina",
  "Bolivia",
  "Chile",
  "Colombia",
  "Costa Rica",
  "España",
  "Estados Unidos",
  "México",
  "Panamá",
  "Perú",
  "Venezuela",
] as const;

// Tipos de documento de identidad.
export const ID_TYPES: { value: string; label: string }[] = [
  { value: "cedula", label: "Cédula" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "ruc", label: "RUC" },
];
