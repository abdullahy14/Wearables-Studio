export type UserRole = 'customer' | 'creator' | 'admin';
export type PaymentStatus = 'Pending' | 'Paid';
export type OrderStatus =
  | 'Pending Payment'
  | 'Paid'
  | 'Processing'
  | 'Printed'
  | 'Ready for Pickup'
  | 'Completed'
  | 'Cancelled'
  | 'Needs Design Edits';

export type DesignElement =
  | {
      id: string;
      type: 'text';
      content: string;
      x: number;
      y: number;
      color: string;
      fontSize: number;
    }
  | {
      id: string;
      type: 'image';
      content: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  earnings: number;
  username?: string;
  bio?: string;
}

export interface Design {
  id: string;
  creatorId: string;
  title: string;
  imageUrl: string;
  price: number;
  isPublished: boolean;
  salesCount: number;
  elements: DesignElement[];
  mockupLabel: string;
  createdAt: string;
}

export interface OrderItem {
  designId: string;
  designTitle: string;
  size: 'S' | 'M' | 'L' | 'XL';
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  createdAt: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  adminNote?: string;
}

export interface QRCodeRecord {
  id: string;
  type: 'design' | 'order' | 'pickup';
  data: string;
  generatedAt: string;
  referenceId: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

export interface AppDatabase {
  users: User[];
  designs: Design[];
  orders: Order[];
  qrCodes: QRCodeRecord[];
  sessions: SessionRecord[];
}
