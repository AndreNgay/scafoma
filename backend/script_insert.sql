-- Users
INSERT INTO tbluser (email, first_name, last_name, password, role, email_verified, profile_created, profile_image)
VALUES 
('admin@scafoma.com', 'System', 'Admin', 'hashed_admin_pw', 'admin', TRUE, TRUE, decode('adminimg', 'escape')),
('john.cust@example.com', 'John', 'Doe', 'hashed_pw1', 'customer', TRUE, TRUE, decode('johnimg', 'escape')),
('jane.cust@example.com', 'Jane', 'Smith', 'hashed_pw2', 'customer', FALSE, FALSE, decode('janeimg', 'escape')),
('concession1@example.com', 'Alice', 'Vendor', 'hashed_pw3', 'concessionaire', TRUE, TRUE, decode('aliceimg', 'escape')),
('concession2@example.com', 'Bob', 'Vendor', 'hashed_pw4', 'concessionaire', TRUE, TRUE, decode('bobimg', 'escape'));

-- Cafeterias
INSERT INTO tblcafeteria (cafeteria_name, location)
VALUES 
('Cafeteria A', 'Main Building, Ground Floor'),
('Cafeteria B', 'Science Hall, 2nd Floor');

-- Concessions
INSERT INTO tblconcession (concession_name, concessionaire_id, cafeteria_id, image, gcash_payment_available, oncounter_payment_available, gcash_number)
VALUES 
('Alice’s Snacks', 4, 1, decode('alice_snack_img', 'escape'), TRUE, TRUE, '09171234567'),
('Bob’s Meals', 5, 2, decode('bob_meals_img', 'escape'), TRUE, TRUE, '09981234567');

-- Menu Items
INSERT INTO tblmenuitem (item_name, concession_id, price, image, category, available)
VALUES 
('Cheeseburger', 1, 85.00, decode('cheeseburgerimg', 'escape'), 'Fast Food', TRUE),
('Fries', 1, 45.00, decode('friesimg', 'escape'), 'Snacks', TRUE),
('Chicken Meal', 2, 120.00, decode('chickenmealimg', 'escape'), 'Meals', FALSE);

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
(2, 1, 1, 4, 2, 170.00, 'pending'),
(3, 3, 2, 5, 1, 120.00, 'accepted'),
(2, 2, 1, 4, 3, 180.00, 'processing');

-- Feedbacks
INSERT INTO tblfeedback (customer_id, menu_item_id, rating, comment)
VALUES 
(2, 1, 5, 'Delicious cheeseburger, very satisfying!'),
(3, 3, 4, 'Good chicken meal, but could use more sauce.'),
(2, 2, 3, 'Fries were a bit cold, but still tasty.');
