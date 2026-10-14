-- 1. Tabel Produk
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Transaksi / Histori Penjualan
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id TEXT NOT NULL UNIQUE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cashier TEXT DEFAULT 'Kasir 1',
    customer TEXT,
    items JSONB NOT NULL,
    total_gross NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'CASH',
    cash_received NUMERIC,
    change_given NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Pengeluaran (Biaya Operasional)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    fund_source TEXT DEFAULT 'KASIR',
    employee_name TEXT,
    reimbursed BOOLEAN DEFAULT FALSE,
    is_cancelled BOOLEAN DEFAULT FALSE,
    reason_cancelled TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Keamanan RLS (Row Level Security) - Opsional, untuk sementara allow anon read/write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow public read/write on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow public read/write on expenses" ON expenses FOR ALL USING (true);

-- Insert Data Bawaan (Default Seed)
INSERT INTO products (name, price, category) VALUES
('Kopi Susu Gula Aren', 18000, 'KAFE'),
('Caffe Latte', 22000, 'KAFE'),
('Americano', 15000, 'KAFE'),
('Matcha Latte', 24000, 'KAFE'),
('Butter Croissant', 20000, 'KAFE'),
('Cuci Mobil Hidrolik', 50000, 'CUCI'),
('Cuci Motor Premium', 25000, 'CUCI'),
('Wax Interior Mobil', 100000, 'CUCI');
