
export interface Service {
  id: string;
  name: string;
  price: number;
  status: 'available' | 'unavailable';
  available: boolean;
  description?: string;
  attendantId?: string;
  attendantName?: string;
}

export interface ServiceAssignment {
  id: string;
  attendantId: string;
  attendantName: string;
  services: Service[];
}
