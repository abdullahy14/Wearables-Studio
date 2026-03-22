import type { Design, OrderStatus } from '@/lib/types';

export const ORDER_STATUSES: OrderStatus[] = [
  'Pending Payment',
  'Paid',
  'Processing',
  'Printed',
  'Ready for Pickup',
  'Completed',
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);

export const creatorCommission = (design: Design) => design.salesCount * 50;
