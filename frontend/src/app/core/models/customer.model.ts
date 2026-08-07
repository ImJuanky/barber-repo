export interface Customer {
  id: number;
  name: string;
  phone: string;
  // true cuando el teléfono de este cliente está en la lista de
  // administradores del backend (config/roles.js). Solo informativo: la
  // autorización real siempre se comprueba en el servidor.
  isAdmin?: boolean;
}

export interface CustomerAuthResponse {
  token: string;
  customer: Customer;
}
