-- CREATE CUSTOMER TABLE
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE VENDOR TABLE
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE PRODUCT TABLE
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL,
    min_stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE SALE TABLE
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(255) NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(id),
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE SALE ITEMS TABLE
CREATE TABLE sales_items (
    product_id INT NOT NULL REFERENCES products(id),
    sale_id INT NOT NULL REFERENCES sales(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE PURCHASE TABLE
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES vendors(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE PURCHASE ITEMS TABLE
CREATE TABLE purchase_items (
    product_id INT NOT NULL REFERENCES products(id),
    purchase_id INT NOT NULL REFERENCES purchases(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TRANSACTION TABLE
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_id INT REFERENCES expenses(id) DEFAULT NULL, 
    customer_id INT REFERENCES customers(id) DEFAULT NULL,
    vendor_id INT REFERENCES vendors(id) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--CREATE EXPENSE TABLE
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


--CREATE CHARTS OF ACCOUNT TABLE 
-- Create ENUM type for account_type
CREATE TYPE account_type_enum AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

CREATE TABLE chart_of_accounts (
    account_id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type account_type_enum NOT NULL,
    sub_type VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--CREATE GENERAL LEDGER TABLE
CREATE TABLE general_ledger (
    ledger_id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    reference_type VARCHAR(50), -- SALE, PURCHASE, PAYMENT, etc.
    reference_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);

--CREATE JOURNAL ENTRY LINES TABLE
CREATE TABLE journal_entry (
    journal_id SERIAL PRIMARY KEY,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);
