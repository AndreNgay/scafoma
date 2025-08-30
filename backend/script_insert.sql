-- Users
INSERT INTO tbluser (email, first_name, last_name, password, role, gcash_number, email_verified, profile_created)
VALUES
('admin@scafoma.com', 'System', 'Admin', 'hashed_admin_pw', 'admin', NULL, TRUE, TRUE),
('john.cust@example.com', 'John', 'Doe', 'hashed_pw1', 'customer', NULL, TRUE, TRUE),
('jane.cust@example.com', 'Jane', 'Smith', 'hashed_pw2', 'customer', NULL, FALSE, FALSE),
('concession1@example.com', 'Alice', 'Vendor', 'hashed_pw3', 'concessionaire', '09171234567', TRUE, TRUE),
('concession2@example.com', 'Bob', 'Vendor', 'hashed_pw4', 'concessionaire', '09981234567', TRUE, TRUE);

-- Cafeterias
INSERT INTO tblcafeteria (cafeteria_name, location)
VALUES
('Cafeteria A', 'Main Building, Ground Floor'),
('Cafeteria B', 'Science Hall, 2nd Floor');

-- Concessions
INSERT INTO tblconcession (concession_name, concessionaire_id, cafeteria_id, image_url)
VALUES
('Alice’s Snacks', 4, 1, 'https://example.com/alice_snacks.jpg'),
('Bob’s Meals', 5, 2, 'https://example.com/bob_meals.jpg');

-- Menu Items
INSERT INTO tblmenuitem (item_name, concession_id, price, image_url)
VALUES
('Cheeseburger', 1, 85.00, 'https://example.com/cheeseburger.jpg'),
('Fries', 1, 45.00, 'https://example.com/fries.jpg'),
('Chicken Meal', 2, 120.00, 'https://example.com/chicken_meal.jpg');

-- Item Variations
INSERT INTO tblitemvariation (label, variation_name, additional_price, menu_item_id)
VALUES
('Size', 'Large', 20.00, 1),
('Size', 'Small', 0.00, 1),
('Flavor', 'BBQ', 10.00, 2),
('Flavor', 'Cheese', 15.00, 2);

-- Orders
INSERT INTO tblorder (customer_id, menu_item_id, concession_id, concessionaire_id, quantity, total_amount, status)
VALUES
(2, 1, 1, 4, 2, 190.00, 'pending'),
(3, 3, 2, 5, 1, 120.00, 'accepted'),
(2, 2, 1, 4, 3, 180.00, 'processing');
