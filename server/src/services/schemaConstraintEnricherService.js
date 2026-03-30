/**
 * Schema Constraint Enricher Service — Universal Field Validation Engine
 *
 * Takes ANY generated schema (any domain, any app idea) and enriches every
 * field/column with:
 *   - Precise SQL types  (varchar → varchar(255), decimal → decimal(12,2))
 *   - Enum values        (status, role, type, currency, payment_method …)
 *   - Validation rules   (format, pattern, minLength, maxLength, min, max)
 *   - SQL constraints    (UNIQUE, CHECK expressions)
 *   - writeOnly flag     (passwords, tokens)
 *
 * Fully deterministic — no AI calls.  Works for every domain by matching
 * field names against a rich rule set.
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. ENUM CATALOGUE  —  field-name pattern → allowed values
// ---------------------------------------------------------------------------

const ENUM_RULES = [
  // Generic lifecycle
  { pattern: /^status$|_status$/, values: ['active', 'inactive', 'pending', 'suspended', 'deleted'] },
  { pattern: /^state$/, values: ['active', 'inactive', 'pending', 'archived'] },

  // Roles & permissions
  { pattern: /^role$|_role$/, values: ['admin', 'moderator', 'user', 'guest'] },
  { pattern: /^permission$|_permission$/, values: ['read', 'write', 'admin', 'none'] },

  // Gender
  { pattern: /^gender$|^sex$/, values: ['male', 'female', 'other', 'prefer_not_to_say'] },

  // Boolean-like flags stored as enum
  { pattern: /^visibility$|_visibility$/, values: ['public', 'private', 'friends_only', 'unlisted'] },
  { pattern: /^priority$|_priority$/, values: ['low', 'medium', 'high', 'critical', 'urgent'] },
  { pattern: /^difficulty$|_difficulty$/, values: ['beginner', 'intermediate', 'advanced', 'expert'] },

  // Payments
  { pattern: /^payment_status$|_payment_status$/, values: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'] },
  { pattern: /^payment_method$|^payment_type$/, values: ['card', 'cash', 'wallet', 'upi', 'net_banking', 'crypto'] },
  { pattern: /^currency$|_currency$|^currency_code$/, values: ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'AUD'] },
  { pattern: /^transaction_type$|^txn_type$/, values: ['credit', 'debit', 'refund', 'transfer', 'withdrawal', 'deposit'] },

  // Orders
  { pattern: /^order_status$/, values: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'returned'] },
  { pattern: /^delivery_status$|^shipment_status$/, values: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'] },
  { pattern: /^return_reason$/, values: ['damaged', 'wrong_item', 'not_needed', 'quality_issue', 'late_delivery', 'other'] },

  // Rides / trips
  { pattern: /^trip_status$|^ride_status$/, values: ['requested', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled'] },
  { pattern: /^vehicle_type$|^cab_type$/, values: ['sedan', 'suv', 'hatchback', 'bike', 'auto', 'electric', 'premium'] },
  { pattern: /^ride_type$/, values: ['pool', 'private', 'express', 'scheduled'] },

  // Messaging
  { pattern: /^message_type$|^msg_type$/, values: ['text', 'image', 'video', 'audio', 'document', 'location', 'sticker', 'gif'] },
  { pattern: /^chat_type$|^conversation_type$/, values: ['direct', 'group', 'broadcast', 'channel'] },
  { pattern: /^call_type$/, values: ['voice', 'video'] },
  { pattern: /^call_status$/, values: ['ringing', 'answered', 'missed', 'declined', 'ended'] },
  { pattern: /^reaction$|^emoji$/, values: ['like', 'love', 'haha', 'wow', 'sad', 'angry'] },

  // Content / media
  { pattern: /^media_type$|^file_type$/, values: ['image', 'video', 'audio', 'document', 'archive', 'other'] },
  { pattern: /^content_type$/, values: ['text', 'image', 'video', 'audio', 'mixed', 'story', 'reel'] },
  { pattern: /^post_type$/, values: ['text', 'image', 'video', 'story', 'reel', 'poll', 'event'] },
  { pattern: /^notification_type$|^alert_type$/, values: ['push', 'email', 'sms', 'in_app', 'whatsapp'] },

  // Food / delivery
  { pattern: /^cuisine_type$|^food_type$/, values: ['indian', 'chinese', 'italian', 'mexican', 'continental', 'fast_food', 'dessert', 'beverage'] },
  { pattern: /^meal_type$/, values: ['breakfast', 'lunch', 'dinner', 'snack', 'brunch'] },
  { pattern: /^dish_type$/, values: ['starter', 'main_course', 'dessert', 'beverage', 'side_dish'] },

  // Booking / hospitality
  { pattern: /^booking_status$|^reservation_status$/, values: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] },
  { pattern: /^room_type$|^accommodation_type$/, values: ['single', 'double', 'suite', 'deluxe', 'studio', 'penthouse'] },

  // Education
  { pattern: /^enrollment_status$/, values: ['enrolled', 'completed', 'dropped', 'pending', 'expired'] },
  { pattern: /^course_level$|^course_difficulty$/, values: ['beginner', 'intermediate', 'advanced', 'expert', 'all_levels'] },
  { pattern: /^submission_status$/, values: ['not_submitted', 'submitted', 'graded', 'late', 'missed'] },
  { pattern: /^assessment_type$/, values: ['quiz', 'assignment', 'project', 'exam', 'survey'] },

  // Project management / tasks
  { pattern: /^task_status$|^ticket_status$|^issue_status$/, values: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'] },
  { pattern: /^task_type$|^ticket_type$|^issue_type$/, values: ['bug', 'feature', 'improvement', 'epic', 'story', 'task', 'spike'] },
  { pattern: /^sprint_status$/, values: ['planned', 'active', 'completed', 'cancelled'] },

  // Auth / security
  { pattern: /^auth_provider$|^login_provider$/, values: ['email', 'google', 'facebook', 'apple', 'twitter', 'github', 'phone'] },
  { pattern: /^verification_status$|^kyc_status$/, values: ['unverified', 'pending', 'verified', 'rejected', 'expired'] },
  { pattern: /^device_type$|^platform$/, values: ['ios', 'android', 'web', 'desktop', 'tablet'] },
  { pattern: /^environment$|^env$/, values: ['development', 'staging', 'production'] },

  // Ecommerce
  { pattern: /^product_status$|^listing_status$/, values: ['draft', 'active', 'inactive', 'out_of_stock', 'discontinued'] },
  { pattern: /^stock_status$|^inventory_status$/, values: ['in_stock', 'low_stock', 'out_of_stock', 'pre_order', 'discontinued'] },
  { pattern: /^discount_type$/, values: ['percentage', 'flat', 'bogo', 'bulk', 'coupon'] },
  { pattern: /^address_type$/, values: ['home', 'work', 'other'] },

  // Subscription / billing
  { pattern: /^plan_type$|^subscription_plan$/, values: ['free', 'basic', 'standard', 'premium', 'enterprise'] },
  { pattern: /^billing_cycle$|^billing_period$/, values: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] },
  { pattern: /^subscription_status$/, values: ['trial', 'active', 'past_due', 'cancelled', 'expired'] },

  // Generic type fields (catch-all — least specific, checked last)
  { pattern: /^type$|_type$/, values: ['standard', 'premium', 'basic', 'custom', 'other'] },
  { pattern: /^category$|_category$/, values: ['general', 'featured', 'trending', 'new', 'archived'] },
  { pattern: /^source$|_source$/, values: ['web', 'mobile', 'api', 'admin', 'import', 'other'] },
  { pattern: /^format$|_format$/, values: ['json', 'xml', 'csv', 'pdf', 'html', 'plain_text'] },
  { pattern: /^direction$|_direction$/, values: ['asc', 'desc'] },
  { pattern: /^sort_by$|^order_by$/, values: ['created_at', 'updated_at', 'name', 'price', 'rating', 'relevance'] },
];

// ---------------------------------------------------------------------------
// 2. VALIDATION RULES  —  field-name pattern → validation object
// ---------------------------------------------------------------------------

const VALIDATION_RULES = [
  // --- Identifiers ---
  { pattern: /^id$|_id$|^uuid$/, rule: { type: 'string', format: 'uuid', minLength: 36, maxLength: 36 } },

  // --- Contact / identity ---
  { pattern: /^email$|_email$/, rule: { type: 'string', format: 'email', minLength: 5, maxLength: 254, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' } },
  { pattern: /^phone$|_phone$|^mobile$|_mobile$/, rule: { type: 'string', pattern: '^\\+?[1-9]\\d{6,14}$', minLength: 7, maxLength: 16 } },
  { pattern: /^username$/, rule: { type: 'string', pattern: '^[a-zA-Z0-9_.-]{3,50}$', minLength: 3, maxLength: 50 } },
  { pattern: /^password$|^password_hash$|^hashed_password$/, rule: { type: 'string', minLength: 8, maxLength: 255, writeOnly: true } },

  // --- URLs / media ---
  { pattern: /^url$|_url$|^website$|^link$|_link$/, rule: { type: 'string', format: 'uri', maxLength: 2048 } },
  { pattern: /^avatar$|^profile_picture$|^profile_image$|^thumbnail$|^cover_photo$|^banner$/, rule: { type: 'string', format: 'uri', maxLength: 2048 } },
  { pattern: /^image$|_image$|^photo$|_photo$/, rule: { type: 'string', format: 'uri', maxLength: 2048 } },

  // --- Tokens / keys ---
  { pattern: /^token$|_token$|^api_key$|^secret$|^otp$/, rule: { type: 'string', minLength: 6, maxLength: 512, writeOnly: true } },
  { pattern: /^otp_code$|^verification_code$/, rule: { type: 'string', pattern: '^[0-9]{4,8}$', minLength: 4, maxLength: 8 } },

  // --- Slug / code ---
  { pattern: /^slug$|_slug$/, rule: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', minLength: 1, maxLength: 255 } },
  { pattern: /^code$|_code$|^sku$|^barcode$|^pin$/, rule: { type: 'string', minLength: 2, maxLength: 50 } },
  { pattern: /^zip$|^zipcode$|^postal_code$|^pin_code$/, rule: { type: 'string', pattern: '^[A-Z0-9]{3,10}$', minLength: 3, maxLength: 10 } },
  { pattern: /^country_code$/, rule: { type: 'string', pattern: '^[A-Z]{2,3}$', minLength: 2, maxLength: 3 } },
  { pattern: /^currency_code$|^currency$/, rule: { type: 'string', pattern: '^[A-Z]{3}$', minLength: 3, maxLength: 3 } },
  { pattern: /^language$|^locale$|^lang$/, rule: { type: 'string', pattern: '^[a-z]{2}(-[A-Z]{2})?$', minLength: 2, maxLength: 10 } },
  { pattern: /^color$|^colour$|^hex_color$/, rule: { type: 'string', pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', minLength: 4, maxLength: 7 } },
  { pattern: /^timezone$|^tz$/, rule: { type: 'string', minLength: 2, maxLength: 64 } },

  // --- Names / text ---
  { pattern: /^name$|^full_name$|^display_name$|^first_name$|^last_name$/, rule: { type: 'string', minLength: 1, maxLength: 255 } },
  { pattern: /^title$/, rule: { type: 'string', minLength: 1, maxLength: 500 } },
  { pattern: /^subject$/, rule: { type: 'string', minLength: 1, maxLength: 500 } },
  { pattern: /^description$|^bio$|^summary$|^about$|^notes$/, rule: { type: 'string', maxLength: 5000 } },
  { pattern: /^body$|^content$|^message$|^text$|^caption$|^review_text$/, rule: { type: 'string', maxLength: 65535 } },
  { pattern: /^address$|_address$|^street$/, rule: { type: 'string', maxLength: 1000 } },
  { pattern: /^city$|^state$|^country$/, rule: { type: 'string', minLength: 2, maxLength: 100 } },

  // --- Numbers: money ---
  { pattern: /^price$|_price$|^amount$|_amount$|^total$|_total$|^fare$|^salary$|^cost$|^fee$|^balance$|^revenue$/, rule: { type: 'number', minimum: 0, multipleOf: 0.01 } },
  { pattern: /^discount$|_discount$|^tax$|_tax$|^commission$|_commission$/, rule: { type: 'number', minimum: 0, maximum: 100, multipleOf: 0.01 } },
  { pattern: /^tax_rate$|^gst_rate$|^vat_rate$/, rule: { type: 'number', minimum: 0, maximum: 100, multipleOf: 0.01 } },

  // --- Numbers: scores / ratings ---
  { pattern: /^rating$|_rating$|^score$|_score$|^stars$/, rule: { type: 'number', minimum: 1, maximum: 5, multipleOf: 0.1 } },
  { pattern: /^percentage$|_percentage$|^percent$/, rule: { type: 'number', minimum: 0, maximum: 100 } },

  // --- Numbers: counts ---
  { pattern: /^quantity$|_quantity$|^qty$|^stock$|_stock$|^inventory$|^count$|_count$/, rule: { type: 'integer', minimum: 0 } },
  { pattern: /^views$|_views$|^likes$|_likes$|^followers$|_followers$|^following$|^shares$|_shares$/, rule: { type: 'integer', minimum: 0 } },
  { pattern: /^age$|^age_years$/, rule: { type: 'integer', minimum: 0, maximum: 150 } },
  { pattern: /^duration$|_duration$|^time_taken$|^elapsed$/, rule: { type: 'integer', minimum: 0 } },
  { pattern: /^size$|_size$|^file_size$/, rule: { type: 'integer', minimum: 0 } },

  // --- Geo ---
  { pattern: /^latitude$|^lat$/, rule: { type: 'number', minimum: -90, maximum: 90 } },
  { pattern: /^longitude$|^lng$|^lon$|^long$/, rule: { type: 'number', minimum: -180, maximum: 180 } },

  // --- Booleans ---
  { pattern: /^is_|^has_|^can_|^allow_|^enable_|_enabled$|_active$|_verified$|_deleted$|_archived$/, rule: { type: 'boolean' } },

  // --- Dates ---
  { pattern: /^created_at$|^updated_at$|^deleted_at$|^modified_at$|^last_seen$|^last_login$|^signed_up_at$/, rule: { type: 'string', format: 'date-time' } },
  { pattern: /^expires_at$|^expiry$|_expiry$|^valid_until$|^valid_from$/, rule: { type: 'string', format: 'date-time' } },
  { pattern: /^started_at$|^completed_at$|^ended_at$|^scheduled_at$|^published_at$/, rule: { type: 'string', format: 'date-time' } },
  { pattern: /^date_of_birth$|^dob$|^birth_date$|^birthday$/, rule: { type: 'string', format: 'date', formatMinimum: '1900-01-01' } },
  { pattern: /^date$|_date$/, rule: { type: 'string', format: 'date' } },
  { pattern: /^time$|_time$/, rule: { type: 'string', format: 'time' } },

  // --- IPs ---
  { pattern: /^ip$|^ip_address$|^ipv4$/, rule: { type: 'string', format: 'ipv4' } },
  { pattern: /^ipv6$/, rule: { type: 'string', format: 'ipv6' } },
];

// ---------------------------------------------------------------------------
// 3. SQL TYPE PRECISION  —  bare type → precise SQL type
// ---------------------------------------------------------------------------

const SQL_TYPE_PRECISION = {
  // Strings
  'varchar':    (fieldName) => {
    if (/^id$|_id$|^uuid$/.test(fieldName))                       return 'uuid';
    if (/^phone$|_phone$|^mobile$/.test(fieldName))               return 'varchar(20)';
    if (/^status$|_status$|^state$|^role$|_role$/.test(fieldName)) return 'varchar(30)';
    if (/^code$|_code$|^sku$|^pin$|^otp/.test(fieldName))         return 'varchar(50)';
    if (/^color$|^colour$/.test(fieldName))                        return 'varchar(7)';
    if (/^country_code$/.test(fieldName))                          return 'varchar(3)';
    if (/^currency$|^currency_code$/.test(fieldName))              return 'varchar(3)';
    if (/^language$|^locale$/.test(fieldName))                     return 'varchar(10)';
    if (/^url$|_url$|^website$|^avatar$|^thumbnail$/.test(fieldName)) return 'varchar(2048)';
    if (/^password$|^password_hash$|^token$|_token$/.test(fieldName)) return 'varchar(512)';
    if (/^ip$|^ip_address$/.test(fieldName))                       return 'varchar(45)';
    if (/^zip$|^zipcode$|^postal_code$/.test(fieldName))           return 'varchar(10)';
    if (/^timezone$/.test(fieldName))                              return 'varchar(64)';
    if (/^username$|^slug$/.test(fieldName))                       return 'varchar(100)';
    if (/^title$|^subject$/.test(fieldName))                       return 'varchar(500)';
    return 'varchar(255)';
  },
  'char': () => 'char(1)',

  // Decimals
  'decimal':    (fieldName) => {
    if (/^latitude$|^lat$/.test(fieldName))    return 'decimal(9,6)';
    if (/^longitude$|^lng$|^lon$/.test(fieldName)) return 'decimal(9,6)';
    if (/^rating$|_rating$|^score$/.test(fieldName)) return 'decimal(3,1)';
    if (/^percentage$|^percent$|^discount$|^tax_rate$/.test(fieldName)) return 'decimal(5,2)';
    return 'decimal(12,2)';
  },
  'float':  (fieldName) => {
    if (/^latitude$|^lat$|^longitude$|^lng$/.test(fieldName)) return 'float(9,6)';
    return 'float(12,4)';
  },
  'numeric': (fieldName) => {
    if (/^rating$|_rating$/.test(fieldName)) return 'numeric(3,1)';
    return 'numeric(12,2)';
  },

  // Integers
  'integer':  (fieldName) => {
    if (/^rating$|^score$|^stars$/.test(fieldName))  return 'smallint';
    if (/^age$/.test(fieldName))                     return 'smallint';
    return 'integer';
  },
  'int':      (fieldName) => {
    if (/^rating$|^score$|^stars$/.test(fieldName))  return 'smallint';
    if (/^age$/.test(fieldName))                     return 'smallint';
    return 'int';
  },
};

// ---------------------------------------------------------------------------
// 4. SQL CHECK CONSTRAINTS  —  for specific field patterns
// ---------------------------------------------------------------------------

const CHECK_CONSTRAINTS = [
  { pattern: /^rating$|_rating$|^stars$/, check: (col) => `CHECK (${col} BETWEEN 1 AND 5)` },
  { pattern: /^score$|_score$/, check: (col) => `CHECK (${col} >= 0)` },
  { pattern: /^age$/, check: (col) => `CHECK (${col} >= 0 AND ${col} <= 150)` },
  { pattern: /^percentage$|_percentage$|^percent$/, check: (col) => `CHECK (${col} >= 0 AND ${col} <= 100)` },
  { pattern: /^tax_rate$|^discount$|_discount$/, check: (col) => `CHECK (${col} >= 0 AND ${col} <= 100)` },
  { pattern: /^price$|_price$|^amount$|_amount$|^fare$|^balance$|^salary$/, check: (col) => `CHECK (${col} >= 0)` },
  { pattern: /^latitude$|^lat$/, check: (col) => `CHECK (${col} >= -90 AND ${col} <= 90)` },
  { pattern: /^longitude$|^lng$|^lon$/, check: (col) => `CHECK (${col} >= -180 AND ${col} <= 180)` },
];

// ---------------------------------------------------------------------------
// 5. UNIQUE FIELDS  —  field names that are inherently unique
// ---------------------------------------------------------------------------

const UNIQUE_FIELDS = new Set([
  'email', 'username', 'phone', 'mobile', 'slug', 'sku', 'barcode',
  'license_number', 'license_plate', 'plate_number', 'registration_number',
  'order_number', 'invoice_number', 'tracking_number',
  'api_key', 'token', 'refresh_token', 'access_token',
]);

// ---------------------------------------------------------------------------
// 6. CORE ENRICHMENT LOGIC
// ---------------------------------------------------------------------------

const matchFirst = (rules, fieldName) => {
  const name = String(fieldName || '').trim().toLowerCase();
  for (const rule of rules) {
    if (rule.pattern.test(name)) return rule;
  }
  return null;
};

const inferEnum = (fieldName, tableName) => {
  const name = String(fieldName || '').toLowerCase();
  const table = String(tableName || '').toLowerCase();

  // Context-aware overrides: combine table + field name
  if (name === 'status' || name.endsWith('_status')) {
    if (/order|cart/.test(table))    return ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
    if (/trip|ride/.test(table))     return ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'];
    if (/delivery|shipment/.test(table)) return ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'];
    if (/payment|transaction/.test(table)) return ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (/booking|reservation/.test(table)) return ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
    if (/task|ticket|issue/.test(table)) return ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    if (/user|account|member/.test(table)) return ['active', 'inactive', 'pending', 'suspended', 'deleted'];
    if (/message|notification/.test(table)) return ['sent', 'delivered', 'read', 'failed', 'deleted'];
    if (/driver|agent|staff/.test(table)) return ['online', 'offline', 'busy', 'on_trip', 'inactive'];
    if (/product|item|listing/.test(table)) return ['draft', 'active', 'inactive', 'out_of_stock', 'discontinued'];
    if (/subscription|plan/.test(table)) return ['trial', 'active', 'past_due', 'cancelled', 'expired'];
  }

  if (name === 'type' || name.endsWith('_type')) {
    if (/vehicle|cab/.test(table))  return ['sedan', 'suv', 'hatchback', 'bike', 'auto', 'electric', 'premium'];
    if (/message|chat/.test(table)) return ['text', 'image', 'video', 'audio', 'document', 'location', 'sticker'];
    if (/payment|transaction/.test(table)) return ['credit', 'debit', 'refund', 'transfer', 'withdrawal'];
    if (/address/.test(table))      return ['home', 'work', 'other'];
    if (/notification/.test(table)) return ['push', 'email', 'sms', 'in_app'];
    if (/media|file|upload/.test(table)) return ['image', 'video', 'audio', 'document', 'archive'];
    if (/call/.test(table))         return ['voice', 'video'];
    if (/room|accommodation/.test(table)) return ['single', 'double', 'suite', 'deluxe', 'studio'];
  }

  if (name === 'role' || name.endsWith('_role')) {
    if (/group|team/.test(table))   return ['owner', 'admin', 'moderator', 'member'];
    if (/project|workspace/.test(table)) return ['owner', 'admin', 'member', 'viewer', 'guest'];
    return ['admin', 'moderator', 'user', 'guest'];
  }

  // Fall through to catalogue
  const match = matchFirst(ENUM_RULES, name);
  return match ? match.values : null;
};

const inferValidation = (fieldName) => {
  const match = matchFirst(VALIDATION_RULES, String(fieldName || '').toLowerCase());
  if (!match) return null;
  const { writeOnly, ...rest } = match.rule;
  return { ...rest };
};

const inferWriteOnly = (fieldName) => {
  return /^password$|^password_hash$|^hashed_password$|^token$|_token$|^api_key$|^secret$/.test(
    String(fieldName || '').toLowerCase()
  );
};

const inferUnique = (fieldName) => UNIQUE_FIELDS.has(String(fieldName || '').toLowerCase());

const refineSqlType = (rawType, fieldName) => {
  const base = String(rawType || 'varchar').toLowerCase().replace(/\(.*\)/, '').trim();
  const refiner = SQL_TYPE_PRECISION[base];
  if (refiner) return typeof refiner === 'function' ? refiner(fieldName.toLowerCase()) : refiner;
  return rawType; // keep as-is if no refinement rule (text, boolean, timestamp, uuid, etc.)
};

const inferCheckConstraint = (fieldName) => {
  const name = String(fieldName || '').toLowerCase();
  const match = CHECK_CONSTRAINTS.find((c) => c.pattern.test(name));
  return match ? match.check(name) : null;
};

// ---------------------------------------------------------------------------
// 7. ENRICH A SQL COLUMN
// ---------------------------------------------------------------------------

const enrichSqlColumn = (column, tableName) => {
  const name = String(column.name || '').toLowerCase();

  const enriched = { ...column };

  // Precise SQL type
  enriched.type = refineSqlType(column.type, name);

  // Unique flag
  if (inferUnique(name)) enriched.unique = true;

  // Enum
  const enumValues = inferEnum(name, tableName);
  if (enumValues) {
    enriched.enum = enumValues;
  }

  // writeOnly flag (for passwords, tokens)
  if (inferWriteOnly(name)) enriched.writeOnly = true;

  // Validation block
  const validation = inferValidation(name);
  if (validation) {
    // If we have an enum too, merge it in
    enriched.validation = enumValues ? { ...validation, enum: enumValues } : validation;
  } else if (enumValues) {
    enriched.validation = { type: 'string', enum: enumValues };
  }

  // SQL CHECK constraint
  const check = inferCheckConstraint(name);
  if (check) enriched.check = check;

  return enriched;
};

// ---------------------------------------------------------------------------
// 8. ENRICH A NOSQL FIELD
// ---------------------------------------------------------------------------

const enrichNoSqlField = (field, collectionName) => {
  const name = String(field.name || '').toLowerCase();
  const enriched = { ...field };

  // Enum
  const enumValues = inferEnum(name, collectionName);
  if (enumValues) enriched.enum = enumValues;

  // Validation
  const validation = inferValidation(name);
  if (validation) {
    enriched.validation = enumValues ? { ...validation, enum: enumValues } : validation;
  } else if (enumValues) {
    enriched.validation = { type: 'string', enum: enumValues };
  }

  // writeOnly
  if (inferWriteOnly(name)) enriched.writeOnly = true;

  // Unique
  if (inferUnique(name)) enriched.unique = true;

  return enriched;
};

// ---------------------------------------------------------------------------
// 9. ENRICH AN ENTIRE SCHEMA (entry point)
// ---------------------------------------------------------------------------

const enrichSchemaConstraints = (schema) => {
  if (!schema || !Array.isArray(schema.architectures)) return schema;

  const architectures = schema.architectures.map((arch) => {
    if (arch.database_type === 'sql') {
      return {
        ...arch,
        tables: (arch.tables || []).map((table) => ({
          ...table,
          columns: (table.columns || []).map((col) =>
            enrichSqlColumn(col, table.name)
          ),
        })),
      };
    }

    if (arch.database_type === 'nosql') {
      return {
        ...arch,
        collections: (arch.collections || []).map((collection) => ({
          ...collection,
          document_shape: (collection.document_shape || []).map((field) =>
            enrichNoSqlField(field, collection.name)
          ),
        })),
      };
    }

    return arch;
  });

  return { ...schema, architectures };
};

// ---------------------------------------------------------------------------
// 10. AJV VALIDATION REPORT — validate schema object with JSON Schema 2020-12
// ---------------------------------------------------------------------------

let _ajvInstance = null;

const getAjv = () => {
  if (_ajvInstance) return _ajvInstance;
  const Ajv = require('ajv/dist/2020');
  const addFormats = require('ajv-formats');
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  _ajvInstance = ajv;
  return ajv;
};

// JSON Schema 2020-12 meta-schema for our internal schema object
const INTERNAL_SCHEMA_META = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://mock-postman/schema-object',
  type: 'object',
  required: ['architectures'],
  properties: {
    architectures: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['database_type', 'database_engine'],
        properties: {
          database_type: { type: 'string', enum: ['sql', 'nosql'] },
          database_engine: { type: 'string', minLength: 1 },
          tables: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'columns'],
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                columns: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['name', 'type'],
                    properties: {
                      name:        { type: 'string', minLength: 1 },
                      type:        { type: 'string', minLength: 1 },
                      required:    { type: 'boolean' },
                      primary:     { type: 'boolean' },
                      unique:      { type: 'boolean' },
                      writeOnly:   { type: 'boolean' },
                      foreign_key: { type: 'string' },
                      enum:        { type: 'array', items: { type: 'string' } },
                      check:       { type: 'string' },
                      description: { type: 'string' },
                      validation:  { type: 'object' },
                    },
                  },
                },
              },
            },
          },
          collections: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'document_shape'],
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                document_shape: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['name', 'type'],
                    properties: {
                      name:       { type: 'string', minLength: 1 },
                      type:       { type: 'string', minLength: 1 },
                      required:   { type: 'boolean' },
                      unique:     { type: 'boolean' },
                      writeOnly:  { type: 'boolean' },
                      enum:       { type: 'array', items: { type: 'string' } },
                      description:{ type: 'string' },
                      validation: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

let _validateFn = null;

const validateSchemaWithAjv = (schema) => {
  try {
    const ajv = getAjv();
    if (!_validateFn) {
      _validateFn = ajv.compile(INTERNAL_SCHEMA_META);
    }
    const valid = _validateFn(schema);
    return {
      valid,
      errors: valid ? [] : (_validateFn.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`),
      schemaVersion: 'draft/2020-12',
    };
  } catch (err) {
    return { valid: false, errors: [`AJV init failed: ${err.message}`], schemaVersion: 'draft/2020-12' };
  }
};

// ---------------------------------------------------------------------------
// 11. BUILD PER-FIELD VALIDATION SUMMARY  (human-readable report)
// ---------------------------------------------------------------------------

const buildValidationReport = (schema) => {
  const report = { tables: {}, collections: {} };

  for (const arch of schema.architectures || []) {
    if (arch.database_type === 'sql') {
      for (const table of arch.tables || []) {
        report.tables[table.name] = (table.columns || []).map((col) => ({
          field: col.name,
          type: col.type,
          required: col.required ?? false,
          primary: col.primary ?? false,
          unique: col.unique ?? false,
          enum: col.enum ?? null,
          check: col.check ?? null,
          writeOnly: col.writeOnly ?? false,
          validation: col.validation ?? null,
        }));
      }
    } else if (arch.database_type === 'nosql') {
      for (const col of arch.collections || []) {
        report.collections[col.name] = (col.document_shape || []).map((field) => ({
          field: field.name,
          type: field.type,
          required: field.required ?? false,
          unique: field.unique ?? false,
          enum: field.enum ?? null,
          writeOnly: field.writeOnly ?? false,
          validation: field.validation ?? null,
        }));
      }
    }
  }

  return report;
};

module.exports = {
  enrichSchemaConstraints,
  validateSchemaWithAjv,
  buildValidationReport,
};
