
export interface Product {
  id: number;
  title: string;
  imageUrl: string;
  price: number;
  priceOld?: number | null;
  description: string;
  status: 'on' | 'off';
  weight: number;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum AppStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}
