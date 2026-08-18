"""
Import ALL products from KYP Pharma and RSquare Services folders
into the office_os.db SQLite database.

This script:
  1. Reads product data from kyppharma/data.json and rsquare_backup/rsquare_data.json
  2. Creates proper categories for each company
  3. Inserts all products with full details (description, specs stored in description)
  4. Copies product photo files into the storage directory
  5. Creates document records for each product photo

Run with: python seed/import_products.py
"""
import json
import os
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone

# ─── Paths ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "office_os.db")
STORAGE_BASE = os.path.join(BASE_DIR, "storage")

KYP_DATA_PATH = r"C:\Users\Kush Maurya\OneDrive\Desktop\kyppharma\data.json"
KYP_ASSETS_BASE = r"C:\Users\Kush Maurya\OneDrive\Desktop\kyppharma"

RS_DATA_PATH = r"C:\Users\Kush Maurya\OneDrive\Desktop\rsquare_backup\rsquare_data.json"
RS_ASSETS_BASE = r"C:\Users\Kush Maurya\OneDrive\Desktop\rsquare_backup"


def new_uuid():
    return uuid.uuid4().hex


def now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def get_mime_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return mime_map.get(ext, "application/octet-stream")


def copy_image_to_storage(src_path, company_storage_dir, original_name):
    """Copy an image file into the storage directory and return the new path + filename."""
    if not os.path.exists(src_path):
        print(f"    ⚠ Image not found: {src_path}")
        return None, None, None

    ext = os.path.splitext(src_path)[1].lower()
    new_filename = new_uuid() + ext
    dest_path = os.path.join(company_storage_dir, new_filename)

    os.makedirs(company_storage_dir, exist_ok=True)
    shutil.copy2(src_path, dest_path)

    size_bytes = os.path.getsize(dest_path)
    return dest_path, new_filename, size_bytes


def format_specs_as_description(product):
    """Build a rich description from the product data."""
    parts = []
    
    if product.get("description"):
        parts.append(product["description"])
    
    if product.get("specs"):
        parts.append("\n\nSpecifications:")
        for spec in product["specs"]:
            parts.append(f"  • {spec['label']}: {spec['value']}")
    
    if product.get("tags"):
        parts.append(f"\n\nTags: {', '.join(product['tags'])}")
    
    return "\n".join(parts) if parts else None


def generate_sku(company_prefix, category, index):
    """Generate a unique SKU from company prefix, category slug, and index."""
    cat_slug = category.upper().replace("-", "").replace(" ", "")[:6]
    return f"{company_prefix}-{cat_slug}-{index:03d}"


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    now = now_str()

    # ─── Get existing company IDs ──────────────────────────────────────────
    cur.execute("SELECT id, name FROM companies")
    companies = {row["name"]: row["id"] for row in cur.fetchall()}
    
    kyp_company_id = companies.get("KYP Pharma")
    rs_company_id = companies.get("RSquare Services")
    
    if not kyp_company_id:
        print("❌ KYP Pharma company not found in database!")
        return
    if not rs_company_id:
        print("❌ RSquare Services company not found in database!")
        return
    
    print(f"✓ KYP Pharma ID: {kyp_company_id}")
    print(f"✓ RSquare Services ID: {rs_company_id}")

    # ─── Get existing products to avoid duplicates ─────────────────────────
    cur.execute("SELECT sku FROM products WHERE deleted_at IS NULL")
    existing_skus = {row["sku"] for row in cur.fetchall() if row["sku"]}
    
    cur.execute("SELECT name, company_id FROM products WHERE deleted_at IS NULL")
    existing_products = {(row["name"], row["company_id"]) for row in cur.fetchall()}
    print(f"✓ {len(existing_products)} existing products found")

    # ─── Get existing categories ───────────────────────────────────────────
    cur.execute("SELECT id, name, company_id FROM categories")
    existing_categories = {}
    for row in cur.fetchall():
        key = (row["name"], row["company_id"])
        existing_categories[key] = row["id"]

    # ═══════════════════════════════════════════════════════════════════════
    # IMPORT KYP PHARMA
    # ═══════════════════════════════════════════════════════════════════════
    print(f"\n{'='*60}")
    print("IMPORTING KYP PHARMA PRODUCTS")
    print(f"{'='*60}")
    
    with open(KYP_DATA_PATH, "r", encoding="utf-8") as f:
        kyp_data = json.load(f)
    
    kyp_products = kyp_data.get("products", [])
    print(f"Found {len(kyp_products)} products in data.json")
    
    # Storage dir for KYP Pharma
    # Use the existing tenant storage directory format
    kyp_storage_dir = os.path.join(STORAGE_BASE, kyp_company_id.replace("-", "")
                                    if "-" in kyp_company_id else kyp_company_id)
    # Check if the directory already exists (UUID format with dashes)
    possible_dirs = []
    if os.path.exists(STORAGE_BASE):
        for d in os.listdir(STORAGE_BASE):
            if d.replace("-", "") == kyp_company_id.replace("-", ""):
                kyp_storage_dir = os.path.join(STORAGE_BASE, d)
                break
    
    os.makedirs(kyp_storage_dir, exist_ok=True)
    print(f"Storage dir: {kyp_storage_dir}")
    
    # Build category map from unique subcategories and categories
    kyp_category_map = {}  # category slug -> category_id
    kyp_sku_counter = {}  # category -> counter
    
    for product in kyp_products:
        cat_name = product.get("subcategory") or product.get("category", "General")
        
        if cat_name not in kyp_category_map:
            cat_key = (cat_name, kyp_company_id)
            if cat_key in existing_categories:
                kyp_category_map[cat_name] = existing_categories[cat_key]
                print(f"  ✓ Category exists: {cat_name}")
            else:
                cat_id = new_uuid()
                cur.execute(
                    "INSERT INTO categories (id, company_id, name, description) VALUES (?, ?, ?, ?)",
                    (cat_id, kyp_company_id, cat_name, f"KYP Pharma - {cat_name}")
                )
                kyp_category_map[cat_name] = cat_id
                existing_categories[cat_key] = cat_id
                print(f"  + Category created: {cat_name}")
    
    conn.commit()
    
    # Insert products
    imported_kyp = 0
    skipped_kyp = 0
    
    for product in kyp_products:
        product_name = product["name"]
        
        # Check for duplicate
        if (product_name, kyp_company_id) in existing_products:
            skipped_kyp += 1
            continue
        
        cat_name = product.get("subcategory") or product.get("category", "General")
        category_id = kyp_category_map.get(cat_name)
        
        # Generate SKU
        cat_prefix = product.get("category", "GEN")[:6].upper().replace("-", "")
        if cat_prefix not in kyp_sku_counter:
            kyp_sku_counter[cat_prefix] = 1
        else:
            kyp_sku_counter[cat_prefix] += 1
        
        sku = f"KYP-{cat_prefix}-{kyp_sku_counter[cat_prefix]:03d}"
        while sku in existing_skus:
            kyp_sku_counter[cat_prefix] += 1
            sku = f"KYP-{cat_prefix}-{kyp_sku_counter[cat_prefix]:03d}"
        
        description = format_specs_as_description(product)
        product_id = new_uuid()
        
        cur.execute("""
            INSERT INTO products (
                id, company_id, sku, name, category_id, description, unit,
                purchase_price, avg_purchase_price, selling_price,
                gst_rate, hsn_sac_code, primary_vendor_id,
                is_active, track_inventory, has_batches, has_expiry, has_serial_numbers,
                min_stock, max_stock, reorder_level, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product_id, kyp_company_id, sku, product_name, category_id, description,
            "Pcs",  # unit
            None,  # purchase_price
            None,  # avg_purchase_price
            None,  # selling_price
            None,  # gst_rate
            None,  # hsn_sac_code
            None,  # primary_vendor_id
            1,  # is_active
            1,  # track_inventory
            0,  # has_batches
            0,  # has_expiry
            0,  # has_serial_numbers
            None,  # min_stock
            None,  # max_stock
            None,  # reorder_level
            None,  # created_by
            now, now,
        ))
        
        existing_skus.add(sku)
        existing_products.add((product_name, kyp_company_id))
        
        # Copy product images
        images = product.get("images", [])
        for img_rel_path in images:
            img_abs_path = os.path.join(KYP_ASSETS_BASE, img_rel_path.replace("/", os.sep))
            original_name = os.path.basename(img_rel_path)
            
            dest_path, new_filename, size_bytes = copy_image_to_storage(
                img_abs_path, kyp_storage_dir, original_name
            )
            if dest_path:
                doc_id = new_uuid()
                mime = get_mime_type(original_name)
                cur.execute("""
                    INSERT INTO documents (
                        id, company_id, filename, original_name, mime_type, 
                        size_bytes, storage_path, category, tags, uploaded_by,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    doc_id, kyp_company_id, new_filename, 
                    f"product/{sku}/{original_name}",
                    mime, size_bytes, dest_path, "product", 
                    f"product,{sku},{product_name}", None, now, now,
                ))
        
        imported_kyp += 1
        print(f"  + [{sku}] {product_name}")
    
    conn.commit()
    print(f"\n  ✅ KYP Pharma: {imported_kyp} imported, {skipped_kyp} skipped (already exist)")

    # ═══════════════════════════════════════════════════════════════════════
    # IMPORT RSQUARE SERVICES
    # ═══════════════════════════════════════════════════════════════════════
    print(f"\n{'='*60}")
    print("IMPORTING RSQUARE SERVICES PRODUCTS")
    print(f"{'='*60}")
    
    with open(RS_DATA_PATH, "r", encoding="utf-8") as f:
        rs_data = json.load(f)
    
    rs_products = rs_data.get("products", [])
    print(f"Found {len(rs_products)} products in rsquare_data.json")
    
    # Storage dir for RSquare
    rs_storage_dir = os.path.join(STORAGE_BASE, rs_company_id.replace("-", "")
                                   if "-" in rs_company_id else rs_company_id)
    for d in os.listdir(STORAGE_BASE):
        if d.replace("-", "") == rs_company_id.replace("-", ""):
            rs_storage_dir = os.path.join(STORAGE_BASE, d)
            break
    
    os.makedirs(rs_storage_dir, exist_ok=True)
    print(f"Storage dir: {rs_storage_dir}")
    
    # Build category map
    rs_category_map = {}
    rs_sku_counter = {}
    
    for product in rs_products:
        cat_name = product.get("subcategory") or product.get("category", "General")
        
        if cat_name not in rs_category_map:
            cat_key = (cat_name, rs_company_id)
            if cat_key in existing_categories:
                rs_category_map[cat_name] = existing_categories[cat_key]
                print(f"  ✓ Category exists: {cat_name}")
            else:
                cat_id = new_uuid()
                cur.execute(
                    "INSERT INTO categories (id, company_id, name, description) VALUES (?, ?, ?, ?)",
                    (cat_id, rs_company_id, cat_name, f"RSquare Services - {cat_name}")
                )
                rs_category_map[cat_name] = cat_id
                existing_categories[cat_key] = cat_id
                print(f"  + Category created: {cat_name}")
    
    conn.commit()
    
    # Insert products
    imported_rs = 0
    skipped_rs = 0
    
    for product in rs_products:
        product_name = product["name"]
        
        if (product_name, rs_company_id) in existing_products:
            skipped_rs += 1
            continue
        
        cat_name = product.get("subcategory") or product.get("category", "General")
        category_id = rs_category_map.get(cat_name)
        
        cat_prefix = product.get("category", "GEN")[:6].upper().replace("-", "")
        if cat_prefix not in rs_sku_counter:
            rs_sku_counter[cat_prefix] = 1
        else:
            rs_sku_counter[cat_prefix] += 1
        
        sku = f"RSQ-{cat_prefix}-{rs_sku_counter[cat_prefix]:03d}"
        while sku in existing_skus:
            rs_sku_counter[cat_prefix] += 1
            sku = f"RSQ-{cat_prefix}-{rs_sku_counter[cat_prefix]:03d}"
        
        description = format_specs_as_description(product)
        product_id = new_uuid()
        
        cur.execute("""
            INSERT INTO products (
                id, company_id, sku, name, category_id, description, unit,
                purchase_price, avg_purchase_price, selling_price,
                gst_rate, hsn_sac_code, primary_vendor_id,
                is_active, track_inventory, has_batches, has_expiry, has_serial_numbers,
                min_stock, max_stock, reorder_level, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product_id, rs_company_id, sku, product_name, category_id, description,
            "Pcs",
            None, None, None, None, None, None,
            1, 1, 0, 0, 0,
            None, None, None, None, now, now,
        ))
        
        existing_skus.add(sku)
        existing_products.add((product_name, rs_company_id))
        
        # Copy product images
        images = product.get("images", [])
        for img_rel_path in images:
            # RSquare images reference "images/xxx" but actual files are in the root folder
            img_filename = os.path.basename(img_rel_path)
            img_abs_path = os.path.join(RS_ASSETS_BASE, img_filename)
            
            # Also try the path as-is
            if not os.path.exists(img_abs_path):
                img_abs_path = os.path.join(RS_ASSETS_BASE, img_rel_path.replace("/", os.sep))
            
            # Try matching by product id to find the image
            if not os.path.exists(img_abs_path):
                # Try to find image matching product id or name pattern
                prod_id = product.get("id", "")
                for fname in os.listdir(RS_ASSETS_BASE):
                    if fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        # Match by product id slug
                        name_slug = prod_id.replace("-", "_").replace(" ", "_").lower()
                        if name_slug in fname.lower().replace("-", "_"):
                            img_abs_path = os.path.join(RS_ASSETS_BASE, fname)
                            img_filename = fname
                            break
            
            original_name = img_filename
            dest_path, new_filename, size_bytes = copy_image_to_storage(
                img_abs_path, rs_storage_dir, original_name
            )
            if dest_path:
                doc_id = new_uuid()
                mime = get_mime_type(original_name)
                cur.execute("""
                    INSERT INTO documents (
                        id, company_id, filename, original_name, mime_type, 
                        size_bytes, storage_path, category, tags, uploaded_by,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    doc_id, rs_company_id, new_filename,
                    f"product/{sku}/{original_name}",
                    mime, size_bytes, dest_path, "product",
                    f"product,{sku},{product_name}", None, now, now,
                ))
        
        # Also try to find standalone product photos for RSquare
        # Match product name slug to image files in the folder
        prod_id = product.get("id", "")
        name_slug = prod_id.replace("-", "_").lower()
        for fname in os.listdir(RS_ASSETS_BASE):
            if fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                fname_slug = os.path.splitext(fname)[0].replace("-", "_").lower()
                if name_slug == fname_slug or fname_slug.startswith(name_slug):
                    img_path = os.path.join(RS_ASSETS_BASE, fname)
                    dest_path, new_filename, size_bytes = copy_image_to_storage(
                        img_path, rs_storage_dir, fname
                    )
                    if dest_path:
                        doc_id = new_uuid()
                        mime = get_mime_type(fname)
                        cur.execute("""
                            INSERT INTO documents (
                                id, company_id, filename, original_name, mime_type, 
                                size_bytes, storage_path, category, tags, uploaded_by,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            doc_id, rs_company_id, new_filename,
                            f"product/{sku}/{fname}",
                            mime, size_bytes, dest_path, "product",
                            f"product,{sku},{product_name}", None, now, now,
                        ))
        
        imported_rs += 1
        print(f"  + [{sku}] {product_name}")
    
    conn.commit()
    print(f"\n  ✅ RSquare Services: {imported_rs} imported, {skipped_rs} skipped (already exist)")

    # ─── Summary ───────────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) as cnt FROM products WHERE deleted_at IS NULL")
    total = cur.fetchone()["cnt"]
    
    cur.execute("SELECT COUNT(*) as cnt FROM categories")
    total_cats = cur.fetchone()["cnt"]
    
    cur.execute("SELECT COUNT(*) as cnt FROM documents WHERE category = 'product'")
    total_photos = cur.fetchone()["cnt"]
    
    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"  Total products in DB:  {total}")
    print(f"  Total categories:      {total_cats}")
    print(f"  Total product photos:  {total_photos}")
    print(f"  KYP Pharma imported:   {imported_kyp}")
    print(f"  RSquare imported:      {imported_rs}")
    
    conn.close()


if __name__ == "__main__":
    main()
