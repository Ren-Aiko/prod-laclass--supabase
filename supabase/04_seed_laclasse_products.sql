-- =====================================================================
-- 04_seed_laclasse_products.sql
-- LaClassé Haute Couture — Official 9 Garments & 35 Variant Inventory Seed
-- =====================================================================
-- Optional manual execution in Supabase SQL Editor.
-- Inserts the 9 authentic LaClassé garment models across 35 variant rows
-- totaling 35 units of initial inventory.
-- Per specification: Image columns remain NULL until real Cloudflare R2
-- asset keys are uploaded by the atelier.
-- =====================================================================

-- Clean existing product rows before seeding
DELETE FROM products;

-- ---------------------------------------------------------------------
-- 1. LC001 — Noir Royal Dubai Abaya (1 variant: XXL, 56", qty 1)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES (
  'LC001',
  'Noir Royal Dubai Abaya',
  'noir-royal-dubai-abaya',
  'Luxury',
  'Noir Royal',
  'An iconic Dubai silhouette draped in pure breathable Nida. Hand-finished sleeve cuffs with subtle gold threading for understated evening elegance.',
  'Imported Dubai Nida — ultra-matte, opaque, cool-touch, and wrinkle-resistant for seamless all-day wear.',
  'Dubai Nida',
  14999.00,
  16999.00,
  'XXL',
  1,
  '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean recommended or gentle cold hand wash. Steam lightly on reverse.',
  true, 5.0, 14
);

-- ---------------------------------------------------------------------
-- 2. LC002 — Zahra Imperial Embroidered Abaya (3 variants: L, XL, XXL; 56", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC002', 'Zahra Imperial Embroidered Abaya', 'zahra-imperial-embroidered-abaya',
  'Bridal', 'Imperial Heritage',
  'Masterfully hand-embroidered floral motifs along the lapel and sleeve cuffs. Designed for weddings, receptions, and memorable galas.',
  'Indonesian Zoom with micro-texture — structured drape with fluid movement.',
  'Indonesian Zoom', 18999.00, 21999.00,
  'L', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, true, false, true,
  'Specialist dry clean only. Protect embroidery when pressing.',
  true, 5.0, 9
),
(
  'LC002', 'Zahra Imperial Embroidered Abaya', 'zahra-imperial-embroidered-abaya',
  'Bridal', 'Imperial Heritage',
  'Masterfully hand-embroidered floral motifs along the lapel and sleeve cuffs. Designed for weddings, receptions, and memorable galas.',
  'Indonesian Zoom with micro-texture — structured drape with fluid movement.',
  'Indonesian Zoom', 18999.00, 21999.00,
  'XL', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, true, false, true,
  'Specialist dry clean only. Protect embroidery when pressing.',
  true, 5.0, 9
),
(
  'LC002', 'Zahra Imperial Embroidered Abaya', 'zahra-imperial-embroidered-abaya',
  'Bridal', 'Imperial Heritage',
  'Masterfully hand-embroidered floral motifs along the lapel and sleeve cuffs. Designed for weddings, receptions, and memorable galas.',
  'Indonesian Zoom with micro-texture — structured drape with fluid movement.',
  'Indonesian Zoom', 18999.00, 21999.00,
  'XXL', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, true, false, true,
  'Specialist dry clean only. Protect embroidery when pressing.',
  true, 5.0, 9
);

-- ---------------------------------------------------------------------
-- 3. LC003 — Medina Pure Silk Satin Abaya (3 variants: L, XL, XXL; 56", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC003', 'Medina Pure Silk Satin Abaya', 'medina-pure-silk-satin-abaya',
  'Premium', 'Medina Reverie',
  'Subtle liquid luster in deep midnight tone. Tailored with French seams and a relaxed silhouette that moves effortlessly.',
  'Pure Silk Satin weave — luminous sheen with a lightweight, breathable feel.',
  'Silk Satin', 15499.00, 17499.00,
  'L', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Dry clean recommended. Low steam with protective cloth.',
  true, 5.0, 6
),
(
  'LC003', 'Medina Pure Silk Satin Abaya', 'medina-pure-silk-satin-abaya',
  'Premium', 'Medina Reverie',
  'Subtle liquid luster in deep midnight tone. Tailored with French seams and a relaxed silhouette that moves effortlessly.',
  'Pure Silk Satin weave — luminous sheen with a lightweight, breathable feel.',
  'Silk Satin', 15499.00, 17499.00,
  'XL', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Dry clean recommended. Low steam with protective cloth.',
  true, 5.0, 6
),
(
  'LC003', 'Medina Pure Silk Satin Abaya', 'medina-pure-silk-satin-abaya',
  'Premium', 'Medina Reverie',
  'Subtle liquid luster in deep midnight tone. Tailored with French seams and a relaxed silhouette that moves effortlessly.',
  'Pure Silk Satin weave — luminous sheen with a lightweight, breathable feel.',
  'Silk Satin', 15499.00, 17499.00,
  'XXL', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Dry clean recommended. Low steam with protective cloth.',
  true, 5.0, 6
);

-- ---------------------------------------------------------------------
-- 4. LC004 — Soraya Pearl Organza Abaya (3 variants: L, XL, XXL; 56", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC004', 'Soraya Pearl Organza Abaya', 'soraya-pearl-organza-abaya',
  'Luxury', 'Soraya Atelier',
  'Sheer gossamer organza outer layer over an opaque inner slip, embellished with hand-sewn freshwater pearl accents.',
  'Organza Silk with fine French trim — ethereal, structured, and radiant under ambient chandeliers.',
  'Organza Silk', 19999.00, 23999.00,
  'L', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Delicate dry clean only.',
  true, 5.0, 8
),
(
  'LC004', 'Soraya Pearl Organza Abaya', 'soraya-pearl-organza-abaya',
  'Luxury', 'Soraya Atelier',
  'Sheer gossamer organza outer layer over an opaque inner slip, embellished with hand-sewn freshwater pearl accents.',
  'Organza Silk with fine French trim — ethereal, structured, and radiant under ambient chandeliers.',
  'Organza Silk', 19999.00, 23999.00,
  'XL', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Delicate dry clean only.',
  true, 5.0, 8
),
(
  'LC004', 'Soraya Pearl Organza Abaya', 'soraya-pearl-organza-abaya',
  'Luxury', 'Soraya Atelier',
  'Sheer gossamer organza outer layer over an opaque inner slip, embellished with hand-sewn freshwater pearl accents.',
  'Organza Silk with fine French trim — ethereal, structured, and radiant under ambient chandeliers.',
  'Organza Silk', 19999.00, 23999.00,
  'XXL', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Delicate dry clean only.',
  true, 5.0, 8
);

-- ---------------------------------------------------------------------
-- 5. LC005 — Layla Chiffon Layered Abaya (5 variants: Free Size; 52", 54", 56", 58", 60", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC005', 'Layla Chiffon Layered Abaya', 'layla-chiffon-layered-abaya',
  'Casual', 'Layla Flow',
  'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
  'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
  'Korean Chiffon', 9999.00, 11999.00,
  'Free Size', 1, '52"',
  NULL, NULL, NULL, NULL,
  false, true, true, true,
  'Machine wash delicate cycle in laundry bag or cold hand wash.',
  true, 5.0, 11
),
(
  'LC005', 'Layla Chiffon Layered Abaya', 'layla-chiffon-layered-abaya',
  'Casual', 'Layla Flow',
  'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
  'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
  'Korean Chiffon', 9999.00, 11999.00,
  'Free Size', 1, '54"',
  NULL, NULL, NULL, NULL,
  false, true, true, true,
  'Machine wash delicate cycle in laundry bag or cold hand wash.',
  true, 5.0, 11
),
(
  'LC005', 'Layla Chiffon Layered Abaya', 'layla-chiffon-layered-abaya',
  'Casual', 'Layla Flow',
  'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
  'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
  'Korean Chiffon', 9999.00, 11999.00,
  'Free Size', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, true, true, true,
  'Machine wash delicate cycle in laundry bag or cold hand wash.',
  true, 5.0, 11
),
(
  'LC005', 'Layla Chiffon Layered Abaya', 'layla-chiffon-layered-abaya',
  'Casual', 'Layla Flow',
  'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
  'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
  'Korean Chiffon', 9999.00, 11999.00,
  'Free Size', 1, '58"',
  NULL, NULL, NULL, NULL,
  false, true, true, true,
  'Machine wash delicate cycle in laundry bag or cold hand wash.',
  true, 5.0, 11
),
(
  'LC005', 'Layla Chiffon Layered Abaya', 'layla-chiffon-layered-abaya',
  'Casual', 'Layla Flow',
  'Double-tier flowing Korean chiffon creation with an airy, featherlight feel. Tailored in an all-encompassing Free Size with five precise lengths.',
  'Korean Chiffon with soft breathable crepe lining — crease-resistant, gentle drape.',
  'Korean Chiffon', 9999.00, 11999.00,
  'Free Size', 1, '60"',
  NULL, NULL, NULL, NULL,
  false, true, true, true,
  'Machine wash delicate cycle in laundry bag or cold hand wash.',
  true, 5.0, 11
);

-- ---------------------------------------------------------------------
-- 6. LC006 — Amina Velvet Crêpe Evening Abaya (5 variants: Free Size; 52", 54", 56", 58", 60", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC006', 'Amina Velvet Crêpe Evening Abaya', 'amina-velvet-crepe-evening-abaya',
  'Luxury', 'Amina Royal',
  'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
  'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
  'Velvet Crêpe', 16499.00, 18999.00,
  'Free Size', 1, '52"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean only. Steam from inside out.',
  true, 5.0, 7
),
(
  'LC006', 'Amina Velvet Crêpe Evening Abaya', 'amina-velvet-crepe-evening-abaya',
  'Luxury', 'Amina Royal',
  'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
  'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
  'Velvet Crêpe', 16499.00, 18999.00,
  'Free Size', 1, '54"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean only. Steam from inside out.',
  true, 5.0, 7
),
(
  'LC006', 'Amina Velvet Crêpe Evening Abaya', 'amina-velvet-crepe-evening-abaya',
  'Luxury', 'Amina Royal',
  'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
  'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
  'Velvet Crêpe', 16499.00, 18999.00,
  'Free Size', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean only. Steam from inside out.',
  true, 5.0, 7
),
(
  'LC006', 'Amina Velvet Crêpe Evening Abaya', 'amina-velvet-crepe-evening-abaya',
  'Luxury', 'Amina Royal',
  'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
  'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
  'Velvet Crêpe', 16499.00, 18999.00,
  'Free Size', 1, '58"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean only. Steam from inside out.',
  true, 5.0, 7
),
(
  'LC006', 'Amina Velvet Crêpe Evening Abaya', 'amina-velvet-crepe-evening-abaya',
  'Luxury', 'Amina Royal',
  'Plush velvet sleeve trimming against structured crepe body. A regal silhouette for formal banquets and prestigious occasions.',
  'Velvet Crêpe blend — rich matte depth with velvet lapel accents.',
  'Velvet Crêpe', 16499.00, 18999.00,
  'Free Size', 1, '60"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Dry clean only. Steam from inside out.',
  true, 5.0, 7
);

-- ---------------------------------------------------------------------
-- 7. LC007 — Qamar Minimalist Linen Abaya (5 variants: Free Size; 52", 54", 56", 58", 60", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC007', 'Qamar Minimalist Linen Abaya', 'qamar-minimalist-linen-abaya',
  'Casual', 'Qamar Daily',
  'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
  'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
  'Linen Cotton', 8999.00, 10499.00,
  'Free Size', 1, '52"',
  NULL, NULL, NULL, NULL,
  false, false, false, true,
  'Machine wash cold. Line dry in shade.',
  true, 5.0, 5
),
(
  'LC007', 'Qamar Minimalist Linen Abaya', 'qamar-minimalist-linen-abaya',
  'Casual', 'Qamar Daily',
  'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
  'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
  'Linen Cotton', 8999.00, 10499.00,
  'Free Size', 1, '54"',
  NULL, NULL, NULL, NULL,
  false, false, false, true,
  'Machine wash cold. Line dry in shade.',
  true, 5.0, 5
),
(
  'LC007', 'Qamar Minimalist Linen Abaya', 'qamar-minimalist-linen-abaya',
  'Casual', 'Qamar Daily',
  'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
  'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
  'Linen Cotton', 8999.00, 10499.00,
  'Free Size', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, false, false, true,
  'Machine wash cold. Line dry in shade.',
  true, 5.0, 5
),
(
  'LC007', 'Qamar Minimalist Linen Abaya', 'qamar-minimalist-linen-abaya',
  'Casual', 'Qamar Daily',
  'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
  'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
  'Linen Cotton', 8999.00, 10499.00,
  'Free Size', 1, '58"',
  NULL, NULL, NULL, NULL,
  false, false, false, true,
  'Machine wash cold. Line dry in shade.',
  true, 5.0, 5
),
(
  'LC007', 'Qamar Minimalist Linen Abaya', 'qamar-minimalist-linen-abaya',
  'Casual', 'Qamar Daily',
  'Clean Scandinavian lines crafted with natural Indian linen-cotton blend. Tailored for elevated daywear, office sophistication, and travel.',
  'Linen Cotton blend — natural breathability with soft enzyme-wash finish.',
  'Linen Cotton', 8999.00, 10499.00,
  'Free Size', 1, '60"',
  NULL, NULL, NULL, NULL,
  false, false, false, true,
  'Machine wash cold. Line dry in shade.',
  true, 5.0, 5
);

-- ---------------------------------------------------------------------
-- 8. LC008 — Yasmina Gold Zari Embroidered Abaya (5 variants: Free Size; 52", 54", 56", 58", 60", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC008', 'Yasmina Gold Zari Embroidered Abaya', 'yasmina-gold-zari-embroidered-abaya',
  'Bridal', 'Yasmina Royale',
  'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
  'Dubai Nida with hand-applied Gold Zari bullion thread.',
  'Dubai Nida', 22999.00, 26999.00,
  'Free Size', 1, '52"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Specialist dry clean only. Store wrapped in acid-free tissue.',
  true, 5.0, 16
),
(
  'LC008', 'Yasmina Gold Zari Embroidered Abaya', 'yasmina-gold-zari-embroidered-abaya',
  'Bridal', 'Yasmina Royale',
  'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
  'Dubai Nida with hand-applied Gold Zari bullion thread.',
  'Dubai Nida', 22999.00, 26999.00,
  'Free Size', 1, '54"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Specialist dry clean only. Store wrapped in acid-free tissue.',
  true, 5.0, 16
),
(
  'LC008', 'Yasmina Gold Zari Embroidered Abaya', 'yasmina-gold-zari-embroidered-abaya',
  'Bridal', 'Yasmina Royale',
  'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
  'Dubai Nida with hand-applied Gold Zari bullion thread.',
  'Dubai Nida', 22999.00, 26999.00,
  'Free Size', 1, '56"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Specialist dry clean only. Store wrapped in acid-free tissue.',
  true, 5.0, 16
),
(
  'LC008', 'Yasmina Gold Zari Embroidered Abaya', 'yasmina-gold-zari-embroidered-abaya',
  'Bridal', 'Yasmina Royale',
  'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
  'Dubai Nida with hand-applied Gold Zari bullion thread.',
  'Dubai Nida', 22999.00, 26999.00,
  'Free Size', 1, '58"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Specialist dry clean only. Store wrapped in acid-free tissue.',
  true, 5.0, 16
),
(
  'LC008', 'Yasmina Gold Zari Embroidered Abaya', 'yasmina-gold-zari-embroidered-abaya',
  'Bridal', 'Yasmina Royale',
  'Elaborate gold metallic zari border hand-woven by hereditary artisans. Features a trailing train and coordinating embellished sheila.',
  'Dubai Nida with hand-applied Gold Zari bullion thread.',
  'Dubai Nida', 22999.00, 26999.00,
  'Free Size', 1, '60"',
  NULL, NULL, NULL, NULL,
  true, false, false, true,
  'Specialist dry clean only. Store wrapped in acid-free tissue.',
  true, 5.0, 16
);

-- ---------------------------------------------------------------------
-- 9. LC009 — Fatima Signature Monogram Abaya (5 variants: Free Size; 52", 54", 56", 58", 60", qty 1 each)
-- ---------------------------------------------------------------------
INSERT INTO products (
  product_id, name, slug, category, collection, description, detailed_fabric,
  fabric, price, original_price, size, quantity, length,
  image1, image2, image3, thumbnail,
  is_featured, is_new_arrival, is_flash_sale, is_active,
  care_instructions, includes_matching_sheila, rating, review_count
) VALUES
(
  'LC009', 'Fatima Signature Monogram Abaya', 'fatima-signature-monogram-abaya',
  'Premium', 'Fatima Signature',
  'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
  'Indonesian Zoom with micro-Jacquard monogram pattern.',
  'Indonesian Zoom', 12499.00, 14499.00,
  'Free Size', 1, '52"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Gentle cycle cold wash. Low steam iron.',
  true, 5.0, 10
),
(
  'LC009', 'Fatima Signature Monogram Abaya', 'fatima-signature-monogram-abaya',
  'Premium', 'Fatima Signature',
  'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
  'Indonesian Zoom with micro-Jacquard monogram pattern.',
  'Indonesian Zoom', 12499.00, 14499.00,
  'Free Size', 1, '54"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Gentle cycle cold wash. Low steam iron.',
  true, 5.0, 10
),
(
  'LC009', 'Fatima Signature Monogram Abaya', 'fatima-signature-monogram-abaya',
  'Premium', 'Fatima Signature',
  'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
  'Indonesian Zoom with micro-Jacquard monogram pattern.',
  'Indonesian Zoom', 12499.00, 14499.00,
  'Free Size', 1, '56"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Gentle cycle cold wash. Low steam iron.',
  true, 5.0, 10
),
(
  'LC009', 'Fatima Signature Monogram Abaya', 'fatima-signature-monogram-abaya',
  'Premium', 'Fatima Signature',
  'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
  'Indonesian Zoom with micro-Jacquard monogram pattern.',
  'Indonesian Zoom', 12499.00, 14499.00,
  'Free Size', 1, '58"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Gentle cycle cold wash. Low steam iron.',
  true, 5.0, 10
),
(
  'LC009', 'Fatima Signature Monogram Abaya', 'fatima-signature-monogram-abaya',
  'Premium', 'Fatima Signature',
  'Subtle tone-on-tone woven atelier monogram Jacquard with satin bias trim. An essential statement piece with effortless elegance.',
  'Indonesian Zoom with micro-Jacquard monogram pattern.',
  'Indonesian Zoom', 12499.00, 14499.00,
  'Free Size', 1, '60"',
  NULL, NULL, NULL, NULL,
  false, true, false, true,
  'Gentle cycle cold wash. Low steam iron.',
  true, 5.0, 10
);

-- Initial Verification Summary
-- Total Garments: 9
-- Total Variants: 35
-- Total Stock Units: 35
