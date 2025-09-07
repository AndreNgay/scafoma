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
    profile_image_url TEXT,
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
    image_url TEXT,

    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')), -- ✅ NEW status field

    gcash_payment_available BOOLEAN DEFAULT FALSE,
    oncounter_payment_available BOOLEAN DEFAULT TRUE,
    gcash_number VARCHAR(11) CHECK (gcash_number ~ '^[0-9]{11}$'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    image_url TEXT,
    category VARCHAR(100),
    availability BOOLEAN DEFAULT FALSE, -- ✅ availability (default not available)
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
CREATE TABLE IF NOT EXISTS tblitemvariation (
    id SERIAL PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    variation_name VARCHAR(100) NOT NULL,
    additional_price NUMERIC(10,2) NOT NULL CHECK (additional_price >= 0),
    menu_item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menuitem_variation
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Orders Table
-- =========================
CREATE TABLE IF NOT EXISTS tblorder (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    concession_id INT NOT NULL,
    concessionaire_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'processing', 'declined', 'ready for pickup', 'completed'
    )),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer
        FOREIGN KEY (customer_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_menuitem
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_concession
        FOREIGN KEY (concession_id)
        REFERENCES tblconcession (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_concessionaire
        FOREIGN KEY (concessionaire_id)
        REFERENCES tbluser (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================
-- Feedbacks Table ✅
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
