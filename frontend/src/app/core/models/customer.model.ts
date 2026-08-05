export interface Customer {
  id: number;
  name: string;
  phone: string;
}

export interface CustomerAuthResponse {
  token: string;
  customer: Customer;
}
