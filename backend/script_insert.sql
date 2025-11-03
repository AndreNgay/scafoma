-- =========================
-- Seed data for Scafoma (Simplified to 2 Concessions)
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
  ('conc2@example.com', 'Bob', 'Vendor', 'hashed_pw6', 'concessionaire', TRUE, TRUE, NULL);

-- ---------- CAFETERIAS ----------
INSERT INTO tblcafeteria (cafeteria_name, location)
VALUES
  ('Cafeteria Alpha', 'Main Building - Ground Floor'),
  ('Cafeteria Beta', 'Science Hall - 2nd Floor');

-- ---------- CONCESSIONS ----------
INSERT INTO tblconcession (concession_name, concessionaire_id, cafeteria_id, image, gcash_payment_available, oncounter_payment_available, gcash_number)
VALUES
  ('Alice’s Snacks', (SELECT id FROM tbluser WHERE email = 'conc1@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Alpha'), NULL, TRUE, TRUE, '09170000001'),
  ('Bob’s Meals',   (SELECT id FROM tbluser WHERE email = 'conc2@example.com'), (SELECT id FROM tblcafeteria WHERE cafeteria_name = 'Cafeteria Beta'), NULL, TRUE, TRUE, '09170000002');

-- ---------- MENU ITEMS ----------
-- Alice’s Snacks
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Cheeseburger Deluxe', (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 85.00, NULL, 'Fast Food', TRUE),
  ('Crispy Fries',        (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 45.00, NULL, 'Snacks', TRUE),
  ('Iced Lemon Tea',      (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'), 30.00, NULL, 'Beverages', TRUE);

-- Bob’s Meals
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES
  ('Beef Tapa Meal', (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 130.00, NULL, 'Meals', TRUE),
  ('Pork Sisig',     (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 110.00, NULL, 'Meals', TRUE),
  ('Banana Shake',   (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'), 55.00, NULL, 'Beverages', TRUE);

-- ---------- ITEM VARIATIONS ----------
-- Example pattern: First create variation groups, then insert variations linked to them.

-- Alice’s Snacks
INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id) VALUES
  ('Size',       (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Size',       (SELECT id FROM tblmenuitem WHERE item_name = 'Crispy Fries'        AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks'))),
  ('Sweetness',  (SELECT id FROM tblmenuitem WHERE item_name = 'Iced Lemon Tea'      AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')));

-- Now add variations for those groups
INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price) VALUES
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe')), 'Regular', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe')), 'Large', 20.00),

  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries')), 'Regular', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries')), 'Large', 15.00),

  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Sweetness' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea')), 'Normal', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Sweetness' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea')), 'Less Sugar', 0.00);

-- Bob’s Meals
INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id) VALUES
  ('Portion', (SELECT id FROM tblmenuitem WHERE item_name = 'Beef Tapa Meal' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Spice',   (SELECT id FROM tblmenuitem WHERE item_name = 'Pork Sisig'     AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals'))),
  ('Size',    (SELECT id FROM tblmenuitem WHERE item_name = 'Banana Shake'   AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')));

INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price) VALUES
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Portion' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal')), 'Regular', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Portion' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal')), 'Large', 25.00),

  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Spice' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig')), 'Mild', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Spice' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig')), 'Spicy', 0.00),

  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Banana Shake')), 'Regular', 0.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Size' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Banana Shake')), 'Large', 12.00);

-- ---------- FEEDBACKS ----------
-- Alice’s Snacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe'), 5, 'Delicious burger!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe'), 4, 'Good but a bit oily.'),

  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries'), 5, 'Crispy and fresh!'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries'), 3, 'Too salty for me.'),

  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea'), 4, 'Refreshing!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Iced Lemon Tea'), 5, 'Perfect balance of sweetness.');

-- Bob’s Meals
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment) VALUES
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal'), 5, 'Best tapa in campus!'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Beef Tapa Meal'), 4, 'Good portion, worth it.'),

  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig'), 5, 'Crispy and tasty!'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Pork Sisig'), 4, 'Flavorful but oily.'),

  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake'), 4, 'Sweet and creamy.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), (SELECT id FROM tblmenuitem WHERE item_name='Banana Shake'), 5, 'Refreshing drink!');

-- Allow multiple toppings for Cheeseburger Deluxe
INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id, multiple_selection) VALUES
  ('Toppings', (SELECT id FROM tblmenuitem WHERE item_name = 'Cheeseburger Deluxe' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')), TRUE);

INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price) VALUES
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Toppings' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe')), 'Cheese', 10.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Toppings' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe')), 'Bacon', 20.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Toppings' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Cheeseburger Deluxe')), 'Egg', 15.00);

-- Allow multiple dips for Crispy Fries
INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id, multiple_selection) VALUES
  ('Dips', (SELECT id FROM tblmenuitem WHERE item_name = 'Crispy Fries' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Alice’s Snacks')), TRUE);

INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price) VALUES
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Dips' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries')), 'Cheese Dip', 12.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Dips' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries')), 'Garlic Mayo', 10.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Dips' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Crispy Fries')), 'BBQ Sauce', 8.00);

-- Allow multiple add-ons for Banana Shake
INSERT INTO tblitemvariationgroup (variation_group_name, menu_item_id, multiple_selection) VALUES
  ('Add-ons', (SELECT id FROM tblmenuitem WHERE item_name = 'Banana Shake' AND concession_id = (SELECT id FROM tblconcession WHERE concession_name = 'Bob’s Meals')), TRUE);

INSERT INTO tblitemvariation (item_variation_group_id, variation_name, additional_price) VALUES
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Add-ons' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Banana Shake')), 'Choco Chips', 10.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Add-ons' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Banana Shake')), 'Whipped Cream', 8.00),
  ((SELECT id FROM tblitemvariationgroup WHERE variation_group_name='Add-ons' AND menu_item_id=(SELECT id FROM tblmenuitem WHERE item_name='Banana Shake')), 'Caramel Drizzle', 12.00);


-- =========================
-- NOTIFICATIONS SEED DATA FOR TESTING
-- =========================

-- Customer notifications
INSERT INTO tblnotification (user_id, notification_type, message)
VALUES
  -- Orders accepted
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), 'Order Update', 'Your order #101 has been accepted.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), 'Order Update', 'Your order #102 has been accepted.'),
  
  -- Orders declined
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), 'Order Update', 'Your order #103 has been declined.'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), 'Order Update', 'Your order #104 has been declined.'),
  
  -- Orders ready for pickup
  ((SELECT id FROM tbluser WHERE email='cust1@example.com'), 'Order Update', 'Your order #105 is ready for pickup.'),
  ((SELECT id FROM tbluser WHERE email='cust2@example.com'), 'Order Update', 'Your order #106 is ready for pickup.'),
  
  -- Orders completed
  ((SELECT id FROM tbluser WHERE email='cust3@example.com'), 'Order Update', 'Your order #107 has been completed. Thank you!'),
  ((SELECT id FROM tbluser WHERE email='cust4@example.com'), 'Order Update', 'Your order #108 has been completed. Thank you!');

-- Concessionaire notifications
INSERT INTO tblnotification (user_id, notification_type, message)
VALUES
  -- New orders
  ((SELECT id FROM tbluser WHERE email='conc1@example.com'), 'New Order', 'New order #101 has been placed by a customer.'),
  ((SELECT id FROM tbluser WHERE email='conc2@example.com'), 'New Order', 'New order #102 has been placed by a customer.'),
  
  -- Customer cancellations
  ((SELECT id FROM tbluser WHERE email='conc1@example.com'), 'Order Cancelled', 'Order #103 has been cancelled by the customer.'),
  ((SELECT id FROM tbluser WHERE email='conc2@example.com'), 'Order Cancelled', 'Order #104 has been cancelled by the customer.');
