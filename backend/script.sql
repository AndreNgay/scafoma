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

CREATE TABLE IF NOT EXISTS tblconcessions (
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

SELECT * FROM tblcafeteria;