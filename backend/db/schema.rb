# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_05_31_160004) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"

  create_table "account_login_change_keys", force: :cascade do |t|
    t.string "key", null: false
    t.string "login", null: false
    t.datetime "deadline", null: false
  end

  create_table "account_password_reset_keys", force: :cascade do |t|
    t.string "key", null: false
    t.datetime "deadline", null: false
    t.datetime "email_last_sent", default: -> { "CURRENT_TIMESTAMP" }, null: false
  end

  create_table "account_remember_keys", force: :cascade do |t|
    t.string "key", null: false
    t.datetime "deadline", null: false
  end

  create_table "account_verification_keys", force: :cascade do |t|
    t.string "key", null: false
    t.datetime "requested_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "email_last_sent", default: -> { "CURRENT_TIMESTAMP" }, null: false
  end

  create_table "accounts", force: :cascade do |t|
    t.integer "status", default: 1, null: false
    t.citext "email", null: false
    t.string "password_hash"
    t.index ["email"], name: "index_accounts_on_email", unique: true, where: "(status = ANY (ARRAY[1, 2]))"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "alembic_version", primary_key: "version_num", id: { type: :string, limit: 32 }, force: :cascade do |t|
  end

  create_table "audits", force: :cascade do |t|
    t.integer "auditable_id"
    t.string "auditable_type"
    t.integer "associated_id"
    t.string "associated_type"
    t.integer "user_id"
    t.string "user_type"
    t.string "username"
    t.string "action"
    t.text "audited_changes"
    t.integer "version", default: 0
    t.string "comment"
    t.string "remote_address"
    t.string "request_uuid"
    t.datetime "created_at"
    t.index ["associated_type", "associated_id"], name: "associated_index"
    t.index ["auditable_type", "auditable_id", "version"], name: "auditable_index"
    t.index ["created_at"], name: "index_audits_on_created_at"
    t.index ["request_uuid"], name: "index_audits_on_request_uuid"
    t.index ["user_id", "user_type"], name: "user_index"
  end

  create_table "brands", force: :cascade do |t|
    t.string "name", null: false
    t.string "description"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_brands_on_name", unique: true
  end

  create_table "businesses", force: :cascade do |t|
    t.string "name"
    t.string "slogan"
    t.string "whatsapp"
    t.string "instagram"
    t.string "facebook"
    t.string "tiktok"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email"
    t.string "location"
    t.string "ruc"
    t.string "razon_social"
    t.string "dir_matriz"
    t.string "dir_establecimiento"
    t.string "obligado_contabilidad", default: "NO", null: false
    t.string "establecimiento", default: "001", null: false
    t.string "punto_emision", default: "001", null: false
    t.string "contribuyente_especial"
    t.string "contribuyente_rimpe"
    t.boolean "sri_enabled", default: false, null: false
    t.string "sri_ambiente", default: "1", null: false
    t.string "sri_cert_path"
    t.string "sri_cert_filename"
    t.datetime "sri_cert_uploaded_at"
    t.text "sri_cert_password_ciphertext"
    t.index ["ruc"], name: "index_businesses_on_ruc", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.string "name", null: false
    t.string "description"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "parent_id"
    t.index ["name"], name: "index_categories_on_name"
    t.index ["parent_id"], name: "index_categories_on_parent_id"
  end

  create_table "customers", force: :cascade do |t|
    t.string "name", null: false
    t.string "phone"
    t.string "city"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "id_type"
    t.string "id_number"
    t.string "country", default: "Ecuador"
    t.text "address"
    t.boolean "active", default: true, null: false
    t.boolean "is_customer", default: true, null: false
    t.boolean "is_supplier", default: false, null: false
    t.string "email"
    t.decimal "credit_limit", precision: 10, scale: 2, default: "0.0", null: false
    t.integer "payment_term_days"
    t.index ["active"], name: "index_customers_on_active"
    t.index ["is_customer"], name: "index_customers_on_is_customer"
    t.index ["is_supplier"], name: "index_customers_on_is_supplier"
    t.index ["name"], name: "index_customers_on_name"
  end

  create_table "expense_categories", force: :cascade do |t|
    t.string "name", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "is_payroll", default: false, null: false
    t.index ["name"], name: "index_expense_categories_on_name", unique: true
  end

  create_table "expenses", force: :cascade do |t|
    t.bigint "expense_category_id"
    t.bigint "location_id"
    t.bigint "user_id"
    t.decimal "amount", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "expense_date"
    t.text "description"
    t.integer "payment_method", default: 0, null: false
    t.string "reference"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "employee_id"
    t.index ["employee_id"], name: "index_expenses_on_employee_id"
    t.index ["expense_category_id"], name: "index_expenses_on_expense_category_id"
    t.index ["expense_date"], name: "index_expenses_on_expense_date"
    t.index ["location_id"], name: "index_expenses_on_location_id"
    t.index ["user_id"], name: "index_expenses_on_user_id"
  end

  create_table "invoices", force: :cascade do |t|
    t.bigint "sale_id", null: false
    t.string "clave_acceso"
    t.integer "secuencial", null: false
    t.string "establecimiento", default: "001", null: false
    t.string "punto_emision", default: "001", null: false
    t.string "ambiente", null: false
    t.string "estado", default: "ERROR", null: false
    t.string "numero_autorizacion"
    t.datetime "fecha_autorizacion"
    t.text "xml_firmado"
    t.text "xml_autorizado"
    t.binary "ride_pdf"
    t.jsonb "mensajes", default: [], null: false
    t.jsonb "comprador_snapshot", default: {}, null: false
    t.decimal "importe_total", precision: 10, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["clave_acceso"], name: "index_invoices_on_clave_acceso", unique: true
    t.index ["establecimiento", "punto_emision", "secuencial"], name: "idx_invoices_emission_point_secuencial", unique: true
    t.index ["sale_id"], name: "index_invoices_on_sale_id"
  end

  create_table "locations", force: :cascade do |t|
    t.string "name", null: false
    t.string "address"
    t.string "phone"
    t.boolean "is_default", default: false, null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_locations_on_active"
    t.index ["is_default"], name: "index_locations_on_is_default"
  end

  create_table "otp_codes", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "code", limit: 6, null: false
    t.datetime "expires_at", null: false
    t.datetime "used_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_otp_codes_on_account_id"
    t.index ["code"], name: "index_otp_codes_on_code"
    t.index ["expires_at"], name: "index_otp_codes_on_expires_at"
  end

  create_table "permissions", force: :cascade do |t|
    t.string "key", null: false
    t.string "name", null: false
    t.string "description"
    t.string "group", default: "general", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_permissions_on_key", unique: true
  end

  create_table "product_variants", force: :cascade do |t|
    t.bigint "product_id", null: false
    t.string "size"
    t.string "color"
    t.integer "stock", default: 0, null: false
    t.string "sku", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_product_variants_on_product_id"
    t.index ["sku"], name: "index_product_variants_on_sku", unique: true
  end

  create_table "products", force: :cascade do |t|
    t.string "name", null: false
    t.decimal "base_price", precision: 10, scale: 2, default: "0.0", null: false
    t.text "description"
    t.boolean "active", default: true, null: false
    t.bigint "category_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "cost", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "wholesale_price", precision: 10, scale: 2
    t.integer "wholesale_min_quantity", default: 3, null: false
    t.bigint "brand_id"
    t.index ["brand_id"], name: "index_products_on_brand_id"
    t.index ["category_id"], name: "index_products_on_category_id"
    t.index ["name"], name: "index_products_on_name"
  end

  create_table "purchase_items", force: :cascade do |t|
    t.bigint "purchase_id", null: false
    t.bigint "product_variant_id", null: false
    t.integer "quantity", default: 0, null: false
    t.decimal "unit_cost", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["product_variant_id"], name: "index_purchase_items_on_product_variant_id"
    t.index ["purchase_id"], name: "index_purchase_items_on_purchase_id"
  end

  create_table "purchase_payments", force: :cascade do |t|
    t.bigint "purchase_id", null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "payment_method", default: "cash", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["purchase_id"], name: "index_purchase_payments_on_purchase_id"
  end

  create_table "purchases", force: :cascade do |t|
    t.bigint "customer_id"
    t.bigint "location_id"
    t.bigint "user_id"
    t.integer "status", default: 0, null: false
    t.integer "payment_status", default: 0, null: false
    t.datetime "purchase_date"
    t.date "due_date"
    t.decimal "subtotal", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "discount", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "tax", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "total", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "paid_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.string "reference"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_purchases_on_customer_id"
    t.index ["due_date"], name: "index_purchases_on_due_date"
    t.index ["location_id"], name: "index_purchases_on_location_id"
    t.index ["payment_status"], name: "index_purchases_on_payment_status"
    t.index ["purchase_date"], name: "index_purchases_on_purchase_date"
    t.index ["status"], name: "index_purchases_on_status"
    t.index ["user_id"], name: "index_purchases_on_user_id"
  end

  create_table "role_permissions", force: :cascade do |t|
    t.bigint "role_id", null: false
    t.bigint "permission_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["permission_id"], name: "index_role_permissions_on_permission_id"
    t.index ["role_id", "permission_id"], name: "index_role_permissions_on_role_id_and_permission_id", unique: true
    t.index ["role_id"], name: "index_role_permissions_on_role_id"
  end

  create_table "roles", force: :cascade do |t|
    t.string "name"
    t.string "resource_type"
    t.bigint "resource_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name", "resource_type", "resource_id"], name: "index_roles_on_name_and_resource_type_and_resource_id"
    t.index ["name"], name: "index_roles_on_name"
    t.index ["resource_type", "resource_id"], name: "index_roles_on_resource"
  end

  create_table "sale_items", force: :cascade do |t|
    t.bigint "sale_id", null: false
    t.bigint "product_variant_id", null: false
    t.integer "quantity", default: 1, null: false
    t.decimal "unit_price", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "unit_cost", precision: 10, scale: 2, default: "0.0", null: false
    t.index ["product_variant_id"], name: "index_sale_items_on_product_variant_id"
    t.index ["sale_id"], name: "index_sale_items_on_sale_id"
  end

  create_table "sales", force: :cascade do |t|
    t.bigint "customer_id"
    t.bigint "user_id"
    t.integer "status", default: 0, null: false
    t.decimal "total", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "sold_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "payment_method", default: 0, null: false
    t.boolean "cash_on_delivery", default: false, null: false
    t.bigint "location_id"
    t.decimal "paid_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.integer "payment_status", default: 0, null: false
    t.date "due_date"
    t.decimal "shipping_cost", precision: 10, scale: 2, default: "0.0", null: false
    t.index ["customer_id"], name: "index_sales_on_customer_id"
    t.index ["due_date"], name: "index_sales_on_due_date"
    t.index ["location_id"], name: "index_sales_on_location_id"
    t.index ["sold_at"], name: "index_sales_on_sold_at"
    t.index ["status"], name: "index_sales_on_status"
    t.index ["user_id"], name: "index_sales_on_user_id"
  end

  create_table "stock_levels", force: :cascade do |t|
    t.bigint "product_variant_id", null: false
    t.bigint "location_id", null: false
    t.integer "quantity", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["location_id"], name: "index_stock_levels_on_location_id"
    t.index ["product_variant_id", "location_id"], name: "index_stock_levels_on_product_variant_id_and_location_id", unique: true
    t.index ["product_variant_id"], name: "index_stock_levels_on_product_variant_id"
  end

  create_table "users", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "fullname"
    t.string "username"
    t.string "phone_number"
    t.string "identification"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "location_id"
    t.index ["account_id"], name: "index_users_on_account_id"
    t.index ["location_id"], name: "index_users_on_location_id"
  end

  create_table "users_roles", id: false, force: :cascade do |t|
    t.bigint "user_id"
    t.bigint "role_id"
    t.index ["role_id"], name: "index_users_roles_on_role_id"
    t.index ["user_id", "role_id"], name: "index_users_roles_on_user_id_and_role_id"
    t.index ["user_id"], name: "index_users_roles_on_user_id"
  end

  add_foreign_key "account_login_change_keys", "accounts", column: "id"
  add_foreign_key "account_password_reset_keys", "accounts", column: "id"
  add_foreign_key "account_remember_keys", "accounts", column: "id"
  add_foreign_key "account_verification_keys", "accounts", column: "id"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "categories", "categories", column: "parent_id"
  add_foreign_key "expenses", "expense_categories"
  add_foreign_key "expenses", "locations"
  add_foreign_key "expenses", "users"
  add_foreign_key "expenses", "users", column: "employee_id"
  add_foreign_key "invoices", "sales"
  add_foreign_key "otp_codes", "accounts"
  add_foreign_key "product_variants", "products"
  add_foreign_key "products", "brands"
  add_foreign_key "products", "categories"
  add_foreign_key "purchase_items", "product_variants"
  add_foreign_key "purchase_items", "purchases"
  add_foreign_key "purchase_payments", "purchases"
  add_foreign_key "purchases", "customers"
  add_foreign_key "purchases", "locations"
  add_foreign_key "purchases", "users"
  add_foreign_key "role_permissions", "permissions"
  add_foreign_key "role_permissions", "roles"
  add_foreign_key "sale_items", "product_variants"
  add_foreign_key "sale_items", "sales"
  add_foreign_key "sales", "customers"
  add_foreign_key "sales", "locations"
  add_foreign_key "sales", "users"
  add_foreign_key "stock_levels", "locations"
  add_foreign_key "stock_levels", "product_variants"
  add_foreign_key "users", "accounts"
  add_foreign_key "users", "locations"
end
