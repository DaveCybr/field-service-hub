import mysql.connector
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import uuid
import sys

# Konfigurasi MySQL
mysql_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'rekamteknik'
}

# Konfigurasi PostgreSQL
pg_config = {
    'host': 'aws-1-ap-south-1.pooler.supabase.com',
    'user': 'postgres.phaqqnqticnmcabjgzui',
    'password': '4boxN1KEsI5chlbZ',
    'database': 'postgres'
}

class MySQLToPGMigration:
    def __init__(self):
        self.mysql_conn = None
        self.pg_conn = None
        self.migrated_records = {}
        
    def connect(self):
        try:
            self.mysql_conn = mysql.connector.connect(**mysql_config)
            self.pg_conn = psycopg2.connect(
                host=pg_config['host'],
                user=pg_config['user'],
                password=pg_config['password'],
                database=pg_config['database']
            )
            print("✓ Koneksi ke MySQL dan PostgreSQL berhasil")
        except Exception as e:
            print(f"✗ Error koneksi: {e}")
            sys.exit(1)
    
    def migrate_employees(self):
        """Migrate tbl_karyawan → employees"""
        print("\n📦 Migrasi Karyawan...")
        try:
            mysql_cursor = self.mysql_conn.cursor(dictionary=True)
            mysql_cursor.execute("SELECT * FROM tbl_karyawan")
            employees = mysql_cursor.fetchall()
            
            pg_cursor = self.pg_conn.cursor()
            
            data = []
            for emp in employees:
                emp_id = str(uuid.uuid4())
                data.append((
                    emp_id,
                    emp['nama_karyawan'],
                    emp['email'],
                    emp['nomor_telepon'],
                    'technician',  # default role
                    'available',   # default status
                    0.0,           # rating
                    0,             # total_jobs_completed
                    None,          # avatar_url
                    datetime.now(), # created_at
                    datetime.now()  # updated_at
                ))
                self.migrated_records[f"emp_{emp['id_karyawan']}"] = emp_id
            
            execute_values(
                pg_cursor,
                """INSERT INTO public.employees 
                (id, name, email, phone, role, status, rating, total_jobs_completed, avatar_url, created_at, updated_at) 
                VALUES %s""",
                data,
                page_size=100
            )
            self.pg_conn.commit()
            print(f"✓ {len(data)} karyawan berhasil di-migrate")
            mysql_cursor.close()
        except Exception as e:
            print(f"✗ Error migrate employees: {e}")
            self.pg_conn.rollback()
    
    def migrate_customers(self):
        """Migrate tbl_member → customers"""
        print("\n📦 Migrasi Member/Customers...")
        try:
            mysql_cursor = self.mysql_conn.cursor(dictionary=True)
            mysql_cursor.execute("SELECT * FROM tbl_member")
            members = mysql_cursor.fetchall()
            
            pg_cursor = self.pg_conn.cursor()
            
            data = []
            for member in members:
                cust_id = str(uuid.uuid4())
                data.append((
                    cust_id,
                    member['nama_member'],
                    member['nomor_telepon'],
                    None,          # email
                    member['alamat'],
                    'retail',      # category
                    0,             # payment_terms_days
                    0.0,           # current_outstanding
                    False,         # blacklisted
                    None,          # notes
                    datetime.now(), # created_at
                    datetime.now(), # updated_at
                    0.0            # credit_limit
                ))
                self.migrated_records[f"member_{member['id_member']}"] = cust_id
            
            execute_values(
                pg_cursor,
                """INSERT INTO public.customers 
                (id, name, phone, email, address, category, payment_terms_days, current_outstanding, blacklisted, notes, created_at, updated_at, credit_limit) 
                VALUES %s""",
                data,
                page_size=100
            )
            self.pg_conn.commit()
            print(f"✓ {len(data)} member berhasil di-migrate")
            mysql_cursor.close()
        except Exception as e:
            print(f"✗ Error migrate customers: {e}")
            self.pg_conn.rollback()
    
    def migrate_products(self):
        """Migrate tbl_product → products"""
        print("\n📦 Migrasi Produk...")
        try:
            mysql_cursor = self.mysql_conn.cursor(dictionary=True)
            mysql_cursor.execute("SELECT * FROM tbl_product")
            products = mysql_cursor.fetchall()
            
            pg_cursor = self.pg_conn.cursor()
            
            data = []
            for prod in products:
                prod_id = str(uuid.uuid4())
                data.append((
                    prod_id,
                    prod['seri'] or f"SKU-{prod['id_product']}",  # sku
                    prod['nama'] or 'Unnamed Product',  # name
                    prod['deskripsi'],  # description
                    'spare_parts',  # category
                    prod['satuan'] or 'pcs',  # unit
                    prod['hpp'] or 0,  # cost_price
                    prod['harga'] or 0,  # sell_price
                    prod['stok'] or 0,  # stock
                    5,  # min_stock_threshold
                    False,  # is_service_item
                    True,  # is_active
                    datetime.now(),  # created_at
                    datetime.now(),  # updated_at
                    None  # image_url
                ))
                self.migrated_records[f"prod_{prod['id_product']}"] = prod_id
            
            execute_values(
                pg_cursor,
                """INSERT INTO public.products 
                (id, sku, name, description, category, unit, cost_price, sell_price, stock, min_stock_threshold, is_service_item, is_active, created_at, updated_at, image_url) 
                VALUES %s""",
                data,
                page_size=100
            )
            self.pg_conn.commit()
            print(f"✓ {len(data)} produk berhasil di-migrate")
            mysql_cursor.close()
        except Exception as e:
            print(f"✗ Error migrate products: {e}")
            self.pg_conn.rollback()
    
    def migrate_invoices(self):
        """Migrate tbl_transaksi → invoices"""
        print("\n📦 Migrasi Transaksi/Invoice...")
        try:
            mysql_cursor = self.mysql_conn.cursor(dictionary=True)
            mysql_cursor.execute("SELECT * FROM tbl_transaksi")
            transactions = mysql_cursor.fetchall()
            
            pg_cursor = self.pg_conn.cursor()
            
            data = []
            for txn in transactions:
                inv_id = str(uuid.uuid4())
                cust_id = self.migrated_records.get(f"member_{txn['id_member']}")
                
                if not cust_id:
                    continue
                
                data.append((
                    inv_id,
                    txn['id_transaksi'],  # invoice_number
                    cust_id,  # customer_id
                    txn['tanggal_transaksi'],  # invoice_date
                    None,  # due_date
                    'completed',  # status
                    'paid' if txn['status_transaksi'] == 'paid' else 'unpaid',  # payment_status
                    0.0,  # services_total
                    int(txn['total_pembelian']) if txn['total_pembelian'] else 0,  # items_total
                    0.0,  # discount
                    0.0,  # tax
                    int(txn['total_pembelian']) if txn['total_pembelian'] else 0,  # grand_total
                    txn['total_pembayaran'] or 0,  # amount_paid
                    txn['catatan'],  # notes
                    None,  # admin_notes
                    None,  # created_by
                    datetime.now(),  # created_at
                    datetime.now(),  # updated_at
                    txn['lokasi']  # service_address
                ))
                self.migrated_records[f"txn_{txn['id_transaksi']}"] = inv_id
            
            execute_values(
                pg_cursor,
                """INSERT INTO public.invoices 
                (id, invoice_number, customer_id, invoice_date, due_date, status, payment_status, services_total, items_total, discount, tax, grand_total, amount_paid, notes, admin_notes, created_by, created_at, updated_at, service_address) 
                VALUES %s""",
                data,
                page_size=100
            )
            self.pg_conn.commit()
            print(f"✓ {len(data)} transaksi berhasil di-migrate")
            mysql_cursor.close()
        except Exception as e:
            print(f"✗ Error migrate invoices: {e}")
            self.pg_conn.rollback()
    
    def migrate_invoice_items(self):
        """Migrate tbl_detail_transaksi → invoice_items"""
        print("\n📦 Migrasi Detail Transaksi/Invoice Items...")
        try:
            mysql_cursor = self.mysql_conn.cursor(dictionary=True)
            mysql_cursor.execute("SELECT * FROM tbl_detail_transaksi")
            details = mysql_cursor.fetchall()
            
            pg_cursor = self.pg_conn.cursor()
            
            # Defer constraint checking saat insert
            pg_cursor.execute("SET CONSTRAINTS ALL DEFERRED;")
            
            # Disable user-defined triggers
            pg_cursor.execute("""
                SELECT trigger_name FROM information_schema.triggers 
                WHERE trigger_schema = 'public' AND event_object_table = 'invoice_items'
                AND trigger_name NOT LIKE 'RI_%';
            """)
            triggers = pg_cursor.fetchall()
            for trigger in triggers:
                try:
                    pg_cursor.execute(f"ALTER TABLE public.invoice_items DISABLE TRIGGER {trigger[0]};")
                except:
                    pass
            
            data = []
            for detail in details:
                inv_id = self.migrated_records.get(f"txn_{detail['id_transaksi']}")
                prod_id = self.migrated_records.get(f"prod_{detail['id_product']}")
                
                if not inv_id or not prod_id:
                    continue
                
                data.append((
                    str(uuid.uuid4()),  # id
                    inv_id,  # invoice_id
                    prod_id,  # product_id
                    detail['nama_product'],  # product_name
                    None,  # product_sku
                    None,  # description
                    int(detail['qty']) if detail['qty'] else 1,  # quantity
                    float(detail['harga']) if detail['harga'] else 0.0,  # unit_price
                    0.0,  # discount
                    float(detail['subtotal']) if detail['subtotal'] else 0.0,  # total_price
                    False,  # register_as_unit
                    None,  # registered_unit_id
                    datetime.now(),  # created_at
                    datetime.now()  # updated_at
                ))
            
            if data:
                execute_values(
                    pg_cursor,
                    """INSERT INTO public.invoice_items 
                    (id, invoice_id, product_id, product_name, product_sku, description, quantity, unit_price, discount, total_price, register_as_unit, registered_unit_id, created_at, updated_at) 
                    VALUES %s""",
                    data,
                    page_size=100
                )
            
            # Re-enable triggers
            for trigger in triggers:
                try:
                    pg_cursor.execute(f"ALTER TABLE public.invoice_items ENABLE TRIGGER {trigger[0]};")
                except:
                    pass
            
            self.pg_conn.commit()
            print(f"✓ {len(data)} detail transaksi berhasil di-migrate")
            mysql_cursor.close()
        except Exception as e:
            print(f"✗ Error migrate invoice items: {e}")
            self.pg_conn.rollback()
    
    def close(self):
        if self.mysql_conn:
            self.mysql_conn.close()
        if self.pg_conn:
            self.pg_conn.close()
        print("\n✓ Koneksi ditutup")

def main():
    migration = MySQLToPGMigration()
    migration.connect()
    
    print("=" * 50)
    print("🚀 Mulai Migrasi MySQL → PostgreSQL")
    print("=" * 50)
    
    migration.migrate_employees()
    migration.migrate_customers()
    migration.migrate_products()
    migration.migrate_invoices()
    migration.migrate_invoice_items()
    
    migration.close()
    
    print("\n" + "=" * 50)
    print("✅ Migrasi Selesai!")
    print("=" * 50)

if __name__ == "__main__":
    main()