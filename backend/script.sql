CREATE TABLE IF NOT EXISTS tbluser (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    contact_number VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS tblcafeteria (
    id SERIAL PRIMARY KEY,
    cafeteria_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS tblconcession (
    id SERIAL PRIMARY KEY,
    concession_name VARCHAR(100) NOT NULL,
    concessionaire_id INT NOT NULL,
    cafeteria_id INT NOT NULL,
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

-- Menu Items Table
CREATE TABLE IF NOT EXISTS tblmenuitem (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    concession_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_concession
        FOREIGN KEY (concession_id)
        REFERENCES tblconcession (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Add-ons Table (e.g., extra cheese, egg, toppings)
CREATE TABLE IF NOT EXISTS tbladdon (
    id SERIAL PRIMARY KEY,
    addon_name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    menu_item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menuitem_addon
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Item Variations Table (e.g., flavor, type, category)
CREATE TABLE IF NOT EXISTS tblitemvariation (
    id SERIAL PRIMARY KEY,
    variation_name VARCHAR(100) NOT NULL,
    menu_item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menuitem_variation
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Item Sizes Table (e.g., small, medium, large with prices)
CREATE TABLE IF NOT EXISTS tblitemsize (
    id SERIAL PRIMARY KEY,
    size_name VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    menu_item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menuitem_size
        FOREIGN KEY (menu_item_id)
        REFERENCES tblmenuitem (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

SELECT * FROM tblcafeteria;