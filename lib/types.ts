export type Role = 'customer' | 'creator' | 'admin';

export type OrderStatus =
  | 'Pending Payment'
  | 'Paid'
  | 'Processing'
  | 'Printed'
  | 'Ready for Pickup'
  | 'Completed'
  | 'Cancelled'
  | 'Design Edits Requested';

export type PaymentStatus = 'Pending' | 'Paid';
export type QrType = 'design' | 'order' | 'pickup';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  earnings: number;
  phone: string;
  username: string;
}

export interface DesignLayer {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
}

export interface Design {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  isPublished: boolean;
  salesCount: number;
  layers: DesignLayer[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  designId: string;
  designTitle: string;
  size: string;
  quantity: number;
  price: number;
  mockupUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  notes?: string;
  phone: string;
  customerName: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QrCodeRecord {
  id: string;
  type: QrType;
  entityId: string;
  data: string;
  generatedAt: string;
}

export interface StoreData {
  users: User[];
  designs: Design[];
  orders: Order[];
  qrCodes: QrCodeRecord[];
}
