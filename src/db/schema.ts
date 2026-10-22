// =====================================================================
// src/db/schema.ts
// Relational Table Blueprint (Drizzle ORM Format) for LaClassé Abayas
// Compatible with PostgreSQL, Cloudflare Pages Edge, and Supabase
// =====================================================================

import { pgTable, uuid, text, numeric, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Order Status Enum: 'pending_verification', 'confirmed', 'rejected'
export const orderStatusEnum = pgEnum('order_status', [
  'pending_verification',
  'confirmed',
  'rejected'
]);

// 1. ADMINS TABLE
// [id (uuid, pk), email (text, unique), created_at]
export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. PRODUCTS TABLE
// [id (uuid, pk), name (text), description (text), price (numeric),
//  image_1 (text), image_2 (text), image_3 (text),
//  selected_variants (text[] - size arrays like ['S', 'M', 'L', 'XL']),
//  is_active (boolean, default true), created_at]
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image_1: text('image_1'),
  image_2: text('image_2'),
  image_3: text('image_3'),
  selected_variants: text('selected_variants').array().notNull().default(['S', 'M', 'L', 'XL']),
  is_active: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. ORDERS TABLE
// [id (uuid, pk), customer_name (text), customer_email (text),
//  shipping_address (text), total_amount (numeric), utr_number (text, unique),
//  status (enum: 'pending_verification', 'confirmed', 'rejected', default 'pending_verification'),
//  coupon_used (text, nullable), created_at]
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_name: text('customer_name').notNull(),
  customer_email: text('customer_email').notNull(),
  shipping_address: text('shipping_address').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  utr_number: text('utr_number').notNull().unique(),
  status: orderStatusEnum('status').default('pending_verification').notNull(),
  coupon_used: text('coupon_used'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. ORDER_ITEMS TABLE
// [id (uuid, pk), order_id (fk references orders.id on delete cascade),
//  product_id (fk references products.id), selected_size (text),
//  quantity (integer), price_at_purchase (numeric)]
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  order_id: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  selected_size: text('selected_size').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price_at_purchase: numeric('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
});

// 5. MESSAGES TABLE
// [id (uuid, pk), name (text), email (text), body (text), created_at]
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. REVIEWS TABLE
// [id (uuid, pk), customer_name (text), rating (integer), comment (text),
//  is_approved (boolean, default false), created_at]
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_name: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  is_approved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. SUBSCRIBERS TABLE
// [id (uuid, pk), email (text, unique), created_at]
export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. COUPONS TABLE
// [id (uuid, pk), code (text, unique), discount_percent (integer),
//  is_used (boolean, default false), assigned_to_email (text, nullable), created_at]
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  discount_percent: integer('discount_percent').notNull().default(10),
  is_used: boolean('is_used').default(false).notNull(),
  assigned_to_email: text('assigned_to_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// RELATIONS DEFINITIONS
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

// Export Types for TypeScript safety
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;

export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;

export type SubscriberRow = typeof subscribers.$inferSelect;
export type NewSubscriberRow = typeof subscribers.$inferInsert;

export type CouponRow = typeof coupons.$inferSelect;
export type NewCouponRow = typeof coupons.$inferInsert;
