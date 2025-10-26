-- =========================
-- Users Table
-- =========================
CREATE TABLE IF NOT EXISTS tbluser (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'concessionaire', 'admin')),
    profile_image BYTEA,
    email_verified BOOLEAN DEFAULT FALSE,
    profile_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Cafeteria Table
-- =========================
CREATE TABLE IF NOT EXISTS tblcafeteria (
    id SERIAL PRIMARY KEY,
    cafeteria_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Concession Table
-- =========================
CREATE TABLE IF NOT EXISTS tblconcession (
    id SERIAL PRIMARY KEY,
    concession_name VARCHAR(100) NOT NULL,
    concessionaire_id INT NOT NULL,
    cafeteria_id INT NOT NULL,
    image BYTEA,

    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),

    gcash_payment_available BOOLEAN DEFAULT FALSE,
    oncounter_payment_available BOOLEAN DEFAULT TRUE,
    gcash_number VARCHAR(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT gcash_number_format CHECK (gcash_number IS NULL OR gcash_number ~ '^[0-9]{11}$'),

    CONSTRAINT fk_concessionaire
        FOREIGN KEY (concessionaire_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_cafeteria
        FOREIGN KEY (cafeteria_id)
        REFERENCES tblcafeteria (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Menu Items Table
-- =========================
CREATE TABLE IF NOT EXISTS tblmenuitem (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    concession_id INT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image BYTEA,
    category VARCHAR(100),
    available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_concession
        FOREIGN KEY (concession_id)
        REFERENCES tblconcession (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Item Variations Table
-- =========================
CREATE TABLE IF NOT EXISTS tblitemvariationgroup (
    id SERIAL PRIMARY KEY,
    variation_group_name VARCHAR(100) NOT NULL,
    menu_item_id INT NOT NULL,
    required_selection BOOLEAN DEFAULT FALSE,
    max_selection INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menuitem_variation_group
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tblitemvariation (
    id SERIAL PRIMARY KEY,
    item_variation_group_id INT NOT NULL,
    variation_name VARCHAR(50) NOT NULL,
    additional_price NUMERIC(10,2) NOT NULL CHECK (additional_price >= 0),
    image BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_variation_group
        FOREIGN KEY (item_variation_group_id)
        REFERENCES tblitemvariationgroup (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Orders Table
-- =========================
CREATE TABLE IF NOT EXISTS tblorder (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    concession_id INT NOT NULL,
    dining_option VARCHAR(10) CHECK (dining_option IN ('dine-in', 'take-out')) DEFAULT 'dine-in',
    schedule_time TIMESTAMP,
    total_price NUMERIC(10,2) CHECK (total_price >= 0),
    order_status VARCHAR(30) DEFAULT 'pending' CHECK (order_status IN (
        'pending', 'accepted', 'declined', 'cancelled', 'ready for pickup', 'completed'
    )),
    payment_method VARCHAR(20) CHECK (payment_method IN ('gcash', 'on-counter')) DEFAULT 'on-counter',
    in_cart BOOLEAN DEFAULT FALSE,
    gcash_screenshot BYTEA,
    decline_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer
        FOREIGN KEY (customer_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_concession
        FOREIGN KEY (concession_id)
        REFERENCES tblconcession (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Order Details Table
-- =========================
CREATE TABLE IF NOT EXISTS tblorderdetail (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    item_price NUMERIC(10,2) NOT NULL CHECK (item_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order
        FOREIGN KEY (order_id)
        REFERENCES tblorder (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_item
        FOREIGN KEY (item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Order Item Variations Table
-- =========================
CREATE TABLE IF NOT EXISTS tblorderitemvariation (
    id SERIAL PRIMARY KEY,
    order_detail_id INT NOT NULL,
    variation_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orderdetail_variation
        FOREIGN KEY (order_detail_id)
        REFERENCES tblorderdetail (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_variation
        FOREIGN KEY (variation_id)
        REFERENCES tblitemvariation (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Cart Table
-- =========================
CREATE TABLE IF NOT EXISTS tblcart (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Cart Details Table
-- =========================
CREATE TABLE IF NOT EXISTS tblcartdetail (
    id SERIAL PRIMARY KEY,
    cart_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart
        FOREIGN KEY (cart_id)
        REFERENCES tblcart (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_cart_item
        FOREIGN KEY (item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Cart Item Variations Table
-- =========================
CREATE TABLE IF NOT EXISTS tblcartitemvariation (
    id SERIAL PRIMARY KEY,
    cart_detail_id INT NOT NULL,
    variation_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cartdetail_variation
        FOREIGN KEY (cart_detail_id)
        REFERENCES tblcartdetail (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_cart_variation
        FOREIGN KEY (variation_id)
        REFERENCES tblitemvariation (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Feedbacks Table
-- =========================
CREATE TABLE IF NOT EXISTS tblfeedback (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feedback_customer
        FOREIGN KEY (customer_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_feedback_menuitem
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Notifications Table
-- =========================
CREATE TABLE IF NOT EXISTS tblnotification (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_notification
        FOREIGN KEY (user_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

ALTER DATABASE scafoma_38uo SET timezone TO 'Asia/Manila';
