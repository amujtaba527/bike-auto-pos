-- CREATE CUSTOMER TABLE 
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE VENDOR TABLE 
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--CREATE BRAND TABLE
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--CREATE CATEGORY TABLE
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE PRODUCT TABLE 
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    brand_id INT,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- CREATE SALE TABLE
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    customer_id INT,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL, -- Always equals total_amount
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- CREATE SALE ITEMS TABLE
CREATE TABLE sales_items (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    sale_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Create ENUM types for statuses
CREATE TYPE status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CREATE SALE RETURNS TABLE
CREATE TABLE sale_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(255) NOT NULL UNIQUE,
    original_sale_id INT NOT NULL,
    customer_id INT,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    refund_amount DECIMAL(10, 2) NOT NULL,
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status status_enum DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_sale_id) REFERENCES sales(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- CREATE SALE RETURN ITEMS TABLE
CREATE TABLE sale_return_items (
    id SERIAL PRIMARY KEY,
    sale_return_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- CREATE PURCHASE TABLE 
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL, -- Always equals total_amount
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- CREATE PURCHASE ITEMS TABLE
CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    purchase_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- CREATE PURCHASE RETURNS TABLE
CREATE TABLE purchase_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(255) NOT NULL UNIQUE,
    original_purchase_id INT NOT NULL,
    vendor_id INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    refund_received DECIMAL(10, 2) NOT NULL,
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status status_enum DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- CREATE PURCHASE RETURN ITEMS TABLE
CREATE TABLE purchase_return_items (
    id SERIAL PRIMARY KEY,
    purchase_return_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- CREATE EXPENSE TABLE (Enhanced)
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    category VARCHAR(100), -- e.g., 'Rent', 'Utilities', 'Supplies'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE CHARTS OF ACCOUNT TABLE
-- First create the enum type for account_type
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

-- CREATE GENERAL LEDGER TABLE
CREATE TABLE general_ledger (
    ledger_id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    reference_type VARCHAR(50), -- SALE, PURCHASE, EXPENSE
    reference_id INT,
    journal_entry_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(journal_id)
);

-- CREATE JOURNAL ENTRY TABLE
CREATE TABLE journal_entries (
    journal_id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- SALE, PURCHASE, EXPENSE
    reference_id INT,
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE JOURNAL ENTRY LINES TABLE
CREATE TABLE journal_entry_lines (
    line_id SERIAL PRIMARY KEY,
    journal_id INT NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);

-- INSERT DEFAULT CHART OF ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
-- ASSETS
('1000', 'Cash', 'ASSET', 'CASH', 'Cash on hand'),
('1010', 'Bank Account', 'ASSET', 'BANK', 'Bank deposits and checking account'),
('1020', 'Accounts Receivable', 'ASSET', 'RECEIVABLE', 'Money owed by customers'),
('1030', 'Inventory', 'ASSET', 'INVENTORY', 'Stock inventory'),
('1040', 'Tax Recoverable', 'ASSET', 'TAX', 'Recoverable taxes paid'),


-- LIABILITIES
('2000', 'Accounts Payable', 'LIABILITY', 'PAYABLE', 'Money owed to vendors'),
('2100', 'Tax Payable', 'LIABILITY', 'TAX', 'Taxes owed to authorities'),

-- EQUITY
('3000', 'Owner Equity', 'EQUITY', 'EQUITY', 'Owner investment'),
('3100', 'Retained Earnings', 'EQUITY', 'PROFIT', 'Accumulated profits'),

-- REVENUE
('4000', 'Sales Revenue', 'REVENUE', 'SALES', 'Revenue from sales'),

-- EXPENSES
('5000', 'Cost of Goods Sold', 'EXPENSE', 'COGS', 'Direct cost of products sold'),
('5100', 'Operating Expenses', 'EXPENSE', 'OPERATING', 'General operating expenses');
('5200', 'Rent Expense', 'EXPENSE', 'OPERATING', 'Office/business rent expenses'),
('5300', 'Utilities Expense', 'EXPENSE', 'OPERATING', 'Electricity, water, gas bills'),
('5400', 'Salaries Expense', 'EXPENSE', 'OPERATING', 'Employee salaries and wages'),
('5500', 'Maintenance Expense', 'EXPENSE', 'OPERATING', 'Equipment and building maintenance');

-- TRIGGERS FOR AUTOMATIC ACCOUNTING

-- Note: PostgreSQL uses a different trigger syntax with functions

-- Trigger for Sales (Cash-only)
CREATE OR REPLACE FUNCTION after_sale_insert_func()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id INT;
BEGIN
    DECLARE v_journal_id INT;
    
    -- Create journal entry for cash sale
    INSERT INTO journal_entries (entry_date, description, reference_type, reference_id)
    VALUES (NEW.sale_date::date, 'Cash Sale #' || NEW.invoice_number, 'SALE', NEW.id)
    RETURNING journal_id INTO v_journal_id;
    
    -- Debit: Cash (increase)
    INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
    VALUES (v_journal_id, 1, NEW.total_amount, 'Cash received from sale #' || NEW.invoice_number);
    
    -- Credit: Sales Revenue (increase)
    INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
    VALUES (v_journal_id, 7, NEW.subtotal, 'Sales revenue from sale #' || NEW.invoice_number);
    
    -- Credit: Tax Payable (if applicable)
    IF NEW.tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
        VALUES (v_journal_id, 4, NEW.tax_amount, 'Tax collected from sale #' || NEW.invoice_number);
    END IF;
    
    -- Debit: Cost of Goods Sold (expense)
    -- Credit: Inventory (decrease)
    INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
    SELECT v_journal_id, 8, SUM(si.quantity * p.cost_price), 'COGS for sale #' || NEW.invoice_number
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = NEW.id;
    
    INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
    SELECT v_journal_id, 2, SUM(si.quantity * p.cost_price), 'Inventory reduction for sale #' || NEW.invoice_number
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = NEW.id;
    
    -- Post to General Ledger
    INSERT INTO general_ledger (transaction_date, account_id, debit_amount, description, reference_type, reference_id, journal_entry_id)
    SELECT NEW.sale_date::date, account_id, debit_amount, description, 'SALE', NEW.id, v_journal_id
    FROM journal_entry_lines WHERE journal_id = v_journal_id AND debit_amount > 0;
    
    INSERT INTO general_ledger (transaction_date, account_id, credit_amount, description, reference_type, reference_id, journal_entry_id)
    SELECT NEW.sale_date::date, account_id, credit_amount, description, 'SALE', NEW.id, v_journal_id
    FROM journal_entry_lines WHERE journal_id = v_journal_id AND credit_amount > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_sale_insert
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION after_sale_insert_func();

-- Trigger for Purchases (Cash-only)
CREATE OR REPLACE FUNCTION after_purchase_insert_func()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id INT;
BEGIN
    DECLARE v_journal_id INT;
    
    -- Create journal entry for cash purchase
    INSERT INTO journal_entries (entry_date, description, reference_type, reference_id)
    VALUES (NEW.purchase_date::date, 'Cash Purchase #' || NEW.invoice_number, 'PURCHASE', NEW.id)
    RETURNING journal_id INTO v_journal_id;
    
    -- Debit: Inventory (increase)
    INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
    VALUES (v_journal_id, 2, NEW.subtotal, 'Inventory purchase #' || NEW.invoice_number);
    
    -- Debit: Tax Asset (if recoverable)
    IF NEW.tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
        VALUES (v_journal_id, 4, NEW.tax_amount, 'Tax paid on purchase #' || NEW.invoice_number);
    END IF;
    
    -- Credit: Cash (decrease)
    INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
    VALUES (v_journal_id, 1, NEW.total_amount, 'Cash paid for purchase #' || NEW.invoice_number);
    
    -- Post to General Ledger
    INSERT INTO general_ledger (transaction_date, account_id, debit_amount, description, reference_type, reference_id, journal_entry_id)
    SELECT NEW.purchase_date::date, account_id, debit_amount, description, 'PURCHASE', NEW.id, v_journal_id
    FROM journal_entry_lines WHERE journal_id = v_journal_id AND debit_amount > 0;
    
    INSERT INTO general_ledger (transaction_date, account_id, credit_amount, description, reference_type, reference_id, journal_entry_id)
    SELECT NEW.purchase_date::date, account_id, credit_amount, description, 'PURCHASE', NEW.id, v_journal_id
    FROM journal_entry_lines WHERE journal_id = v_journal_id AND credit_amount > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_purchase_insert
AFTER INSERT ON purchases
FOR EACH ROW
EXECUTE FUNCTION after_purchase_insert_func();

-- Trigger for Expenses
CREATE OR REPLACE FUNCTION after_expense_insert_func()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id INT;
BEGIN
    DECLARE v_journal_id INT;
    
    -- Create journal entry for expense
    INSERT INTO journal_entries (entry_date, description, reference_type, reference_id)
    VALUES (NEW.expense_date, 'Expense: ' || NEW.description, 'EXPENSE', NEW.id)
    RETURNING journal_id INTO v_journal_id;
    
    -- Debit: Operating Expense (increase expense)
    INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
    VALUES (v_journal_id, 9, NEW.amount, 'Expense: ' || NEW.description);
    
    -- Credit: Cash (decrease)
    INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
    VALUES (v_journal_id, 1, NEW.amount, 'Cash paid for expense: ' || NEW.description);
    
    -- Post to General Ledger
    INSERT INTO general_ledger (transaction_date, account_id, debit_amount, description, reference_type, reference_id, journal_entry_id)
    VALUES (NEW.expense_date, 9, NEW.amount, 'Expense: ' || NEW.description, 'EXPENSE', NEW.id, v_journal_id);
    
    INSERT INTO general_ledger (transaction_date, account_id, credit_amount, description, reference_type, reference_id, journal_entry_id)
    VALUES (NEW.expense_date, 1, NEW.amount, 'Cash paid for expense: ' || NEW.description, 'EXPENSE', NEW.id, v_journal_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_expense_insert
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION after_expense_insert_func();

-- End of triggers

-- VIEWS FOR REPORTING

-- Current Account Balances
CREATE VIEW account_balances AS
SELECT 
    coa.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    COALESCE(SUM(gl.debit_amount), 0) - COALESCE(SUM(gl.credit_amount), 0) as balance
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.account_id = gl.account_id
WHERE coa.is_active = TRUE
GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_type;

-- Monthly Financial Summary
CREATE VIEW monthly_summary AS
SELECT 
    TO_CHAR(gl.transaction_date, 'YYYY-MM') as month,
    SUM(CASE WHEN coa.account_type = 'REVENUE' THEN gl.credit_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN gl.debit_amount ELSE 0 END) as total_expenses,
    (SUM(CASE WHEN coa.account_type = 'REVENUE' THEN gl.credit_amount ELSE 0 END) - 
     SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN gl.debit_amount ELSE 0 END)) as net_profit
FROM general_ledger gl
JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
GROUP BY TO_CHAR(gl.transaction_date, 'YYYY-MM')
ORDER BY month DESC;






-- Insert the essential accounts for your POS system

-- ASSET ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('1000', 'Cash', 'ASSET', 'CASH', 'Cash on hand'),
('1010', 'Bank Account', 'ASSET', 'BANK', 'Bank deposits and checking account'),
('1030', 'Inventory', 'ASSET', 'INVENTORY', 'Stock inventory value');

-- LIABILITY ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('2000', 'Accounts Payable', 'LIABILITY', 'PAYABLE', 'Money owed to vendors'),
('2100', 'Tax Payable', 'LIABILITY', 'TAX', 'Taxes collected from customers');

-- EQUITY ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('3000', 'Owner Equity', 'EQUITY', 'EQUITY', 'Owner investment in business'),
('3100', 'Retained Earnings', 'EQUITY', 'PROFIT', 'Accumulated business profits');

-- REVENUE ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('4000', 'Sales Revenue', 'REVENUE', 'SALES', 'Revenue from product sales');

-- EXPENSE ACCOUNTS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('5000', 'Cost of Goods Sold', 'EXPENSE', 'COGS', 'Direct cost of products sold'),
('5100', 'Operating Expenses', 'EXPENSE', 'OPERATING', 'General business operating expenses');

-- Additional useful accounts (optional but recommended)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type, description) VALUES
('1020', 'Accounts Receivable', 'ASSET', 'RECEIVABLE', 'Money owed by customers'),
('1040', 'Tax Recoverable', 'ASSET', 'TAX', 'Recoverable taxes paid'),
('5200', 'Rent Expense', 'EXPENSE', 'OPERATING', 'Office/business rent expenses'),
('5300', 'Utilities Expense', 'EXPENSE', 'OPERATING', 'Electricity, water, gas bills'),
('5400', 'Salaries Expense', 'EXPENSE', 'OPERATING', 'Employee salaries and wages'),
('5500', 'Marketing Expense', 'EXPENSE', 'OPERATING', 'Advertising and promotional expenses'),
('5600', 'Maintenance Expense', 'EXPENSE', 'OPERATING', 'Equipment and building maintenance');