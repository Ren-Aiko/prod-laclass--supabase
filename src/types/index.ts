/**
 * Laclassé Luxury Abaya Fashion Brand — TypeScript Data Models
 */

export type CategoryType = 'All' | 'Premium' | 'Bridal' | 'Casual' | 'Luxury' | string;

export type FabricType = 
  | 'Dubai Nida'
  | 'Indonesian Zoom'
  | 'Silk Satin'
  | 'Korean Chiffon'
  | 'Linen Cotton'
  | 'Organza Silk'
  | 'Velvet Crêpe'
  | string;

export interface ProductVariation {
  id: string;
  slug: string;
  size: 'S' | 'M' | 'L' | 'XL' | '2XL' | 'Custom' | string;
  quantity: number;
  price: number;
  original_price?: number | null;
  offer_price?: number | null;
}

export interface SizeStockItem {
  id?: string;
  size: string;
  quantity: number;
}

export interface Product {
  id: string;
  product_id?: string;
  productId?: string;
  productCode?: string;
  product_code?: string;
  name: string;
  slug: string;
  category: CategoryType;
  collection: string;
  description: string;
  detailedFabric: string;
  detailed_fabric?: string;
  price: number; // in INR
  original_price?: number | null;
  originalPrice?: number | null;
  offerPrice?: number | null;
  offer_price?: number | null;
  size: 'S' | 'M' | 'L' | 'XL' | '2XL' | 'Custom' | string;
  quantity: number;
  stock: number; // total stock across sizes or current size stock
  sizeStock?: Record<string, number>;
  variantStock?: Record<string, number>;
  variants?: { id?: string; size: string; length?: string; quantity: number; price?: number }[];
  sizes?: (string | SizeStockItem)[]; // list of sizes supported or size objects
  lengths: string[]; // e.g. ['56"'] or ['52"', '54"', '56"', '58"', '60"']
  length?: string;
  fabric: FabricType;
  image1: string;
  image2?: string;
  image3?: string;
  images: string[];
  thumbnail: string;
  featured: boolean;
  is_featured?: boolean | number;
  newArrival: boolean;
  is_new_arrival?: boolean | number;
  flashSale: boolean;
  is_flash_sale?: boolean | number;
  active: boolean;
  is_active?: boolean | number;
  careInstructions: string;
  care_instructions?: string;
  includesMatchingSheila: boolean;
  includes_matching_sheila?: boolean | number;
  rating: number;
  reviewCount: number;
  review_count?: number;
  variations?: ProductVariation[];
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CustomMeasurements {
  chest: string; // Chest (in)
  hip: string; // Hip (in)
  abayaLength: string; // Abaya Length (in)
  height: string; // Your Height (cm)
  sleeveLength: string; // Sleeve Length (in)
  // Optional aliases for backward compatibility:
  bust?: string;
  waist?: string;
  shoulder?: string;
  armhole?: string;
  neckDepth?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedSize: string;
  selectedLength: string;
  customMeasurements?: CustomMeasurements;
  quantity: number;
}

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
}

export type OrderStatus = 
  | 'Paid, Awaiting Confirmation'
  | 'Payment Confirmed'
  | 'Payment Rejected'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  | 'Pending'
  | 'Processing';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'COD';

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  productId?: string;
  product_variant_id?: string | null;
  name?: string;
  quantity: number;
  size: string;
  length?: string | null;
  price_at_purchase: number;
  unitPrice?: number;
  totalPrice?: number;
  custom_measurements?: CustomMeasurements | null;
}

export interface Order {
  id?: string;
  orderId: string; // e.g. LC-2026-8942
  date: string;
  customer: CustomerDetails;
  items: OrderItem[];
  amount: number; // subtotal
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  grandTotal: number;
  utrNumber: string; // 12+ digit UTR/Transaction reference
  utr_number?: string;
  status: OrderStatus;
  paymentStatus: string;
  payment_status?: string;
  paymentMethod: string;
  payment_method?: string;
  courierName?: string;
  courier_name?: string;
  trackingNumber?: string;
  tracking_number?: string;
  reservation_status?: 'reserved' | 'committed' | 'released' | 'expired' | string;
  reservation_expires_at?: string | null;
  restocked_at?: string | null;
  notes?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number; // e.g. 15 for 15% or 500 for ₹500
  minPurchase: number;
  expiryDate: string;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number; // 1 to 5
  reviewText: string;
  date: string;
  approved: boolean;
  verifiedPurchase: boolean;
}

export interface Subscriber {
  email: string;
  subscribedAt: string;
}

export interface SubscribeResult {
  success: boolean;
  alreadySubscribed?: boolean;
  couponCode?: string;
  message: string;
}

export interface ContactMessage {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'Unread' | 'Read';
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalSubscribers: number;
  pendingOrdersCount: number;
  avgOrderValue: number;
}
