import { OrderStatus } from './types';

export const BRAND = 'Wearables Studio';
export const SHIRT_PRICE = 500;
export const SHIRT_COST = 275;
export const CREATOR_COMMISSION = 50;

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'Pending Payment',
  'Paid',
  'Processing',
  'Printed',
  'Ready for Pickup',
  'Completed'
];

export const STATUS_FILTERS = [
  'All',
  'Pending Payment',
  'Paid',
  'Processing',
  'Printed',
  'Ready for Pickup',
  'Completed'
] as const;
