-- =========================
-- Seed data for Scafoma
-- =========================

-- ---------- USERS ----------
INSERT INTO tbluser (email, first_name, last_name, password, role, email_verified, profile_created, profile_image)
VALUES
  ('admin@scafoma.com', 'System', 'Admin', 'hashed_admin_pw', 'admin', TRUE, TRUE, NULL),
  ('cust1@example.com', 'John', 'Doe', 'hashed_pw1', 'customer', TRUE, TRUE, NULL),
  ('cust2@example.com', 'Jane', 'Smith', 'hashed_pw2', 'customer', TRUE, TRUE, NULL),
  ('cust3@example.com', 'Alex', 'Brown', 'hashed_pw3', 'customer', TRUE, TRUE, NULL),
  ('cust4@example.com', 'Maria', 'Garcia', 'hashed_pw4', 'customer', TRUE, TRUE, NULL),
  ('conc1@example.com', 'Alice', 'Vendor', 'hashed_pw5', 'concessionaire', TRUE, TRUE, NULL),
  ('conc2@example.com', 'Bob', 'Vendor', 'hashed_pw6', 'concessionaire', TRUE, TRUE, NULL),
  ('conc3@example.com', 'Carlos', 'Vendor', 'hashed_pw7', 'concessionaire', TRUE, TRUE, NULL),
  ('conc4@example.com', 'Diana', 'Vendor', 'hashed_pw8', 'concessionaire', TRUE, TRUE, NULL);

-- ---------- CAFETERIAS ----------
INSERT INTO tblcafeteria (cafeteria_name, location)
VALUES
  ('Cafeteria Alpha', 'Main Building - Ground Floor'),
  ('Cafeteria Beta', 'Science Hall - 2nd Floor'),
  ('Cafeteria Gamma', 'Library Wing - 1st Floor'),
  ('Cafeteria Delta', 'Student Center - 3rd Floor');

-- ---------- CONCESSIONS (one per concessionaire) ----------
INSERT INTO tblconcession (concession_name, concessionaire_id, cafeteria_id, image, gcash_payment_available, oncounter_payment_available, gcash_number)
VALUES
  ('Alice’s Snacks', (SELECT id FROM tbluser WHERE email = 'conc1@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Alpha'), NULL, TRUE, TRUE, '09170000001'),
  ('Bob’s Meals', (SELECT id FROM tbluser WHERE email = 'conc2@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Beta'), NULL, TRUE, TRUE, '09170000002'),
  ('Carlos Corner', (SELECT id FROM tbluser WHERE email = 'conc3@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Gamma'), NULL, TRUE, TRUE, '09170000003'),
  ('Diana Delights', (SELECT id FROM tbluser WHERE email = 'conc4@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Delta'), NULL, TRUE, TRUE, '09170000004');

-- ---------- MENU ITEMS (4 per concession => 16 total) ----------
-- Concession Alice’s Snacks
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Cheeseburger Deluxe', (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 85.00, NULL, 'Fast Food', TRUE),
  ('Crispy Fries',       (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 45.00, NULL, 'Snacks', TRUE),
  ('Iced Lemon Tea',     (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 30.00, NULL, 'Beverages', TRUE),
  ('Chocolate Cookie',   (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 35.00, NULL, 'Desserts', TRUE);

-- Concession Bob’s Meals
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Beef Tapa Meal',     (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 130.00, NULL, 'Meals', TRUE),
  ('Pork Sisig',         (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 110.00, NULL, 'Meals', TRUE),
  ('Garlic Fried Rice',  (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 40.00, NULL, 'Sides', TRUE),
  ('Banana Shake',       (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 55.00, NULL, 'Beverages', TRUE);

-- Concession Carlos Corner
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Fish Ball Combo',    (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'), 60.00, NULL, 'Street Food', TRUE),
  ('Chicken Wrap',       (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'), 95.00, NULL, 'Meals', TRUE),
  ('Spicy Tacos',        (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'), 75.00, NULL, 'Snacks', TRUE),
  ('Mango Smoothie',     (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'), 65.00, NULL, 'Beverages', TRUE);

-- Concession Diana Delights
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Ham & Cheese Sandwich', (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'), 65.00, NULL, 'Snacks', TRUE),
  ('Creamy Carbonara',      (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'), 95.00, NULL, 'Meals', TRUE),
  ('Mango Graham Cup',      (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'), 50.00, NULL, 'Desserts', TRUE),
  ('Iced Coffee Frappe',    (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'), 60.00, NULL, 'Beverages', TRUE);

-- ---------- ITEM VARIATIONS (at least 3 per menu item) ----------
-- We'll insert three variations per menu item with reasonable grouping labels.

-- Alice’s Snacks items
-- Cheeseburger Deluxe (size + add-on + sauce)
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Small', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe'    AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Size', 'Medium', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Size', 'Large', 25.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe'  AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Add-on', 'Extra Cheese', 10.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')));

-- Crispy Fries
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Size', 'Large', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Add-on', 'Cheese Dip', 12.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Crispy Fries'  AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')));

-- Iced Lemon Tea
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Sweetness', 'No Sugar', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Sweetness', 'Normal', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Size', 'Large', 10.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')));

-- Chocolate Cookie
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Type', 'Double Chocolate', 8.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Type', 'Oatmeal', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Add-on', 'Ice Cream Scoop', 20.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')));

-- Bob’s Meals items
-- Beef Tapa Meal
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Portion', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Portion', 'Large', 25.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Add-on', 'Extra Egg', 10.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')));

-- Pork Sisig
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Spice', 'Mild', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Spice', 'Spicy', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Add-on', 'Chicharon Topping', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')));

-- Garlic Fried Rice
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Portion', 'Single', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Portion', 'Family', 40.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Add-on', 'Fried Egg', 10.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')));

-- Banana Shake
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Size', 'Large', 12.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Add-on', 'Choco Syrup', 8.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')));

-- Carlos Corner items
-- Fish Ball Combo
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Pack', '6 pcs', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Pack', '12 pcs', 25.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Sauce', 'Sweet', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner')));

-- Chicken Wrap
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Type', 'Grilled', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Type', 'Fried', 5.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Add-on', 'Extra Sauce', 8.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner')));

-- Spicy Tacos
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Shell', 'Soft', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Shell', 'Crispy', 5.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Add-on', 'Extra Jalapeno', 7.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner')));

-- Mango Smoothie
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Size', 'Large', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner'))),
  ('Add-on', 'Protein Boost', 25.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Carlos Corner')));

-- Diana Delights items
-- Ham & Cheese Sandwich
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Bread', 'Whole Wheat', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Bread', 'Sourdough', 5.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Add-on', 'Extra Ham', 20.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights')));

-- Creamy Carbonara
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Portion', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Portion', 'Large', 25.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Add-on', 'Bacon Bits', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights')));

-- Mango Graham Cup
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Single', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Size', 'Share', 30.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Add-on', 'Extra Condensed Milk', 8.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights')));

-- Iced Coffee Frappe
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id) VALUES
  ('Size', 'Regular', 0.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Size', 'Large', 15.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights'))),
  ('Add-on', 'Caramel Drizzle', 10.00, (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Diana Delights')));

-- ---------- FEEDBACKS (4 per menu item => 16 items x 4 = 64 total) ----------
-- We'll rotate customer IDs  (cust1..cust4) and give varied ratings/comments.

-- Helper: small function-like comment: use each item_name + concession to identify menu_item_id

-- Alice’s Snacks feedbacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  -- Cheeseburger Deluxe feedbacks (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'Great burger — juicy and tasty!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Good size, will order again.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'Loved the cheese and bun.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Tasty but a little oily.'),

  -- Crispy Fries feedbacks (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Crispy and hot.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 3, 'A bit too salty.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'Perfect snack.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Liked the cheese dip.'),

  -- Iced Lemon Tea feedbacks (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Refreshing!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Nice flavor.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 3, 'A bit too sweet.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'My go-to drink.'),

  -- Chocolate Cookie feedbacks (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'Soft and chocolatey!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Nice treat.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 5, 'Kids loved it.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chocolate Cookie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Alice’s Snacks')), 4, 'Good texture.');

-- Bob’s Meals feedbacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  -- Beef Tapa Meal (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Authentic tapa taste.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Good portion.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Reminds me of home.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Solid meal.'),

  -- Pork Sisig (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Crispy sisig, great flavor.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Good but slightly oily.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Best sisig spot.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Loved the spice.'),

  -- Garlic Fried Rice (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Garlicky and tasty.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 3, 'Could be fresher.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Perfect with tapa.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Garlic Fried Rice' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Well-seasoned.'),

  -- Banana Shake (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Creamy and smooth.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 5, 'Perfect sweetness.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Refreshing.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Bob’s Meals')), 4, 'Nice texture.');

-- Carlos Corner feedbacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  -- Fish Ball Combo (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Good value for money.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'Nice sauces.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Tasty street food.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Fish Ball Combo' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 3, 'Wanted it hotter.'),

  -- Chicken Wrap (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'So good and filling.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Well-seasoned.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Nice wrap.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Chicken Wrap' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'Will order again.'),

  -- Spicy Tacos (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Great kick.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 3, 'Too spicy for me.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'Amazing flavor.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Spicy Tacos' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Fresh ingredients.'),

  -- Mango Smoothie (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'Perfectly sweet.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Good consistency.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 4, 'Refreshing pick-me-up.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Smoothie' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Carlos Corner')), 5, 'Loved it.');

-- Diana Delights feedbacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  -- Ham & Cheese Sandwich (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Great toasted sandwich.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Perfect comfort food.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Nice bread choice.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Ham & Cheese Sandwich' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Well made.'),

  -- Creamy Carbonara (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Creamy goodness.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Good flavor balance.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Generous serving.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Creamy Carbonara' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Highly recommended.'),

  -- Mango Graham Cup (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Perfect dessert!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Sweet and nostalgic.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Good portion.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Mango Graham Cup' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Loved the flavors.'),

  -- Iced Coffee Frappe (4)
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Strong and delicious.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Just the right sweetness.'),
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 4, 'Nice texture.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Coffee Frappe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name='Diana Delights')), 5, 'Best frappe on campus.');

-- Done seeding
