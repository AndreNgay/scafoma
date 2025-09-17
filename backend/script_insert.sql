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
('Chicken Meal', 2, 120.00, decode('chickenmealimg', 'escape'), 'Meals', FALSE),
('Hotdog Sandwich', 1, 50.00, decode('hotdogimg', 'escape'), 'Snacks', TRUE),
('Nachos', 1, 60.00, decode('nachosimg', 'escape'), 'Snacks', TRUE),
('Iced Tea', 1, 25.00, decode('icedteaimg', 'escape'), 'Beverages', TRUE),
('Chocolate Cake Slice', 1, 40.00, decode('choccakeimg', 'escape'), 'Desserts', TRUE),
('Ham & Cheese Sandwich', 1, 55.00, decode('hamsandwichimg', 'escape'), 'Snacks', TRUE),
('Corn Dog', 1, 45.00, decode('corndogimg', 'escape'), 'Snacks', TRUE),
('Fish Balls', 1, 30.00, decode('fishballsimg', 'escape'), 'Street Food', TRUE),
('Taco', 1, 70.00, decode('tacoimg', 'escape'), 'Snacks', FALSE),
('Fruit Shake', 1, 50.00, decode('fruitshakeimg', 'escape'), 'Beverages', TRUE),
('Mango Graham', 1, 35.00, decode('mangograhamimg', 'escape'), 'Desserts', TRUE),
('Beef Tapa Meal', 2, 130.00, decode('beeftapamealimg', 'escape'), 'Meals', TRUE),
('Pork Sisig', 2, 110.00, decode('sisigimg', 'escape'), 'Meals', TRUE),
('Spaghetti', 2, 85.00, decode('spaghettiimg', 'escape'), 'Meals', TRUE),
('Fried Rice Meal', 2, 95.00, decode('friedriceimg', 'escape'), 'Meals', TRUE),
('Spring Rolls', 2, 50.00, decode('springrollsimg', 'escape'), 'Appetizers', TRUE),
('Tuna Sandwich', 2, 60.00, decode('tunasandwichimg', 'escape'), 'Snacks', TRUE),
('Iced Coffee', 2, 40.00, decode('icedcoffeeimg', 'escape'), 'Beverages', TRUE),
('Grilled Chicken Wrap', 2, 100.00, decode('chickenwrapimg', 'escape'), 'Meals', TRUE),
('Carbonara', 2, 90.00, decode('carbonaraimg', 'escape'), 'Meals', FALSE),
('Clubhouse Sandwich', 2, 95.00, decode('clubhouseimg', 'escape'), 'Snacks', TRUE);

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
