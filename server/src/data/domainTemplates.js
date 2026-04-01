/**
 * Domain template library.
 * Each domain defines the canonical MVP entities for SQL and NoSQL,
 * their core fields, and relationships — all deterministic, no AI.
 */

const DOMAIN_TEMPLATES = {
  ride_hailing: {
    label: 'Ride Hailing',
    keywords: ['uber', 'ola', 'ride', 'hailing', 'taxi', 'cab', 'driver', 'rider', 'trip', 'fare', 'pickup', 'dropoff'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Registered users who book rides.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'drivers',
          description: 'Drivers who accept and complete rides.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'license_number', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'vehicles',
          description: 'Vehicles assigned to drivers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'driver_id', type: 'uuid', required: true, foreign_key: 'drivers.id' },
            { name: 'plate_number', type: 'varchar', required: true },
            { name: 'model', type: 'varchar', required: true },
            { name: 'vehicle_type', type: 'varchar', required: true },
          ],
        },
        {
          name: 'trips',
          description: 'Ride trips from pickup to dropoff.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'rider_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'driver_id', type: 'uuid', required: true, foreign_key: 'drivers.id' },
            { name: 'vehicle_id', type: 'uuid', required: true, foreign_key: 'vehicles.id' },
            { name: 'pickup_address', type: 'text', required: true },
            { name: 'dropoff_address', type: 'text', required: true },
            { name: 'fare', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'started_at', type: 'timestamp', required: false },
            { name: 'completed_at', type: 'timestamp', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'ratings',
          description: 'Post-trip ratings between rider and driver.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'trip_id', type: 'uuid', required: true, foreign_key: 'trips.id' },
            { name: 'rated_by', type: 'uuid', required: true },
            { name: 'score', type: 'integer', required: true },
            { name: 'comment', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'users',
          description: 'Riders and their profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'full_name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'phone', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'drivers',
          description: 'Driver profiles and availability.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'full_name', type: 'string', required: true },
            { name: 'phone', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'vehicle', type: 'object', required: true },
          ],
        },
        {
          name: 'trips',
          description: 'Trip records with embedded location data.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'rider_id', type: 'objectId', required: true },
            { name: 'driver_id', type: 'objectId', required: true },
            { name: 'pickup', type: 'object', required: true },
            { name: 'dropoff', type: 'object', required: true },
            { name: 'fare', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  food_delivery: {
    label: 'Food Delivery',
    keywords: ['zomato', 'swiggy', 'food', 'delivery', 'restaurant', 'order', 'menu', 'dish', 'cuisine', 'cart', 'rider', 'takeout'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Customers who place food orders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'restaurants',
          description: 'Restaurants listed on the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'cuisine_type', type: 'varchar', required: false },
            { name: 'address', type: 'text', required: true },
            { name: 'is_active', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'menu_items',
          description: 'Dishes offered by restaurants.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'restaurant_id', type: 'uuid', required: true, foreign_key: 'restaurants.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'price', type: 'decimal', required: true },
            { name: 'is_available', type: 'boolean', required: true },
          ],
        },
        {
          name: 'orders',
          description: 'Customer orders placed at restaurants.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'restaurant_id', type: 'uuid', required: true, foreign_key: 'restaurants.id' },
            { name: 'delivery_partner_id', type: 'uuid', required: false, foreign_key: 'delivery_partners.id' },
            { name: 'total_amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'order_items',
          description: 'Individual items within an order.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'order_id', type: 'uuid', required: true, foreign_key: 'orders.id' },
            { name: 'menu_item_id', type: 'uuid', required: true, foreign_key: 'menu_items.id' },
            { name: 'quantity', type: 'integer', required: true },
            { name: 'unit_price', type: 'decimal', required: true },
          ],
        },
        {
          name: 'delivery_partners',
          description: 'Riders who deliver orders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'restaurants',
          description: 'Restaurant profiles with embedded menu.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'cuisine_type', type: 'string', required: false },
            { name: 'address', type: 'string', required: true },
            { name: 'menu_items', type: 'array', required: true },
            { name: 'is_active', type: 'boolean', required: true },
          ],
        },
        {
          name: 'orders',
          description: 'Orders with embedded items.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'restaurant_id', type: 'objectId', required: true },
            { name: 'items', type: 'array', required: true },
            { name: 'total_amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'users',
          description: 'Customer profiles and addresses.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'phone', type: 'string', required: true },
            { name: 'saved_addresses', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  ecommerce: {
    label: 'E-Commerce',
    keywords: ['amazon', 'flipkart', 'ecommerce', 'shop', 'store', 'marketplace', 'product', 'cart', 'checkout', 'seller', 'inventory', 'shipment', 'return', 'catalog'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Customers on the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'sellers',
          description: 'Sellers who list products.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'business_name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'categories',
          description: 'Product categories.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'parent_id', type: 'uuid', required: false, foreign_key: 'categories.id' },
          ],
        },
        {
          name: 'products',
          description: 'Products listed by sellers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'seller_id', type: 'uuid', required: true, foreign_key: 'sellers.id' },
            { name: 'category_id', type: 'uuid', required: true, foreign_key: 'categories.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'price', type: 'decimal', required: true },
            { name: 'stock', type: 'integer', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'orders',
          description: 'Customer purchase orders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'total_amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'order_items',
          description: 'Products within an order.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'order_id', type: 'uuid', required: true, foreign_key: 'orders.id' },
            { name: 'product_id', type: 'uuid', required: true, foreign_key: 'products.id' },
            { name: 'quantity', type: 'integer', required: true },
            { name: 'unit_price', type: 'decimal', required: true },
          ],
        },
        {
          name: 'shipments',
          description: 'Shipment tracking per order.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'order_id', type: 'uuid', required: true, foreign_key: 'orders.id' },
            { name: 'carrier', type: 'varchar', required: true },
            { name: 'tracking_number', type: 'varchar', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'shipped_at', type: 'timestamp', required: false },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'products',
          description: 'Product catalog with variants.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'seller_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'stock', type: 'number', required: true },
            { name: 'attributes', type: 'object', required: false },
          ],
        },
        {
          name: 'orders',
          description: 'Orders with embedded items and shipment.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'items', type: 'array', required: true },
            { name: 'total_amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'shipment', type: 'object', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'users',
          description: 'Customer profiles with addresses.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'addresses', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  social_media: {
    label: 'Social Media',
    keywords: ['instagram', 'facebook', 'twitter', 'social', 'feed', 'post', 'follow', 'follower', 'like', 'comment', 'share', 'profile', 'story', 'reel', 'hashtag'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'User accounts and profiles.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'bio', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'posts',
          description: 'User-published posts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'caption', type: 'text', required: false },
            { name: 'media_url', type: 'text', required: false },
            { name: 'media_type', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'follows',
          description: 'Follow relationships between users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'follower_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'followee_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'likes',
          description: 'Likes on posts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'post_id', type: 'uuid', required: true, foreign_key: 'posts.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'comments',
          description: 'Comments on posts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'post_id', type: 'uuid', required: true, foreign_key: 'posts.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'users',
          description: 'User profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'username', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'bio', type: 'string', required: false },
            { name: 'follower_count', type: 'number', required: false },
          ],
        },
        {
          name: 'posts',
          description: 'Posts with embedded engagement counts.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'caption', type: 'string', required: false },
            { name: 'media_url', type: 'string', required: false },
            { name: 'like_count', type: 'number', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'comments',
          description: 'Comments linked to posts.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'post_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  chat_app: {
    label: 'Chat / Messaging',
    keywords: ['whatsapp', 'telegram', 'chat', 'message', 'messaging', 'conversation', 'group', 'direct message', 'dm', 'attachment', 'read receipt', 'inbox'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Users of the messaging platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'conversations',
          description: 'One-to-one or group conversations.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'type', type: 'varchar', required: true },
            { name: 'title', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'conversation_members',
          description: 'Members of each conversation.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'conversation_id', type: 'uuid', required: true, foreign_key: 'conversations.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'joined_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'messages',
          description: 'Messages sent within conversations.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'conversation_id', type: 'uuid', required: true, foreign_key: 'conversations.id' },
            { name: 'sender_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: false },
            { name: 'attachment_url', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'read_receipts',
          description: 'Tracks which users have read which messages.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'message_id', type: 'uuid', required: true, foreign_key: 'messages.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'read_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'conversations',
          description: 'Conversations with embedded member list.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'type', type: 'string', required: true },
            { name: 'title', type: 'string', required: false },
            { name: 'member_ids', type: 'array', required: true },
            { name: 'last_message', type: 'object', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'messages',
          description: 'Messages with read receipt tracking.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'conversation_id', type: 'objectId', required: true },
            { name: 'sender_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: false },
            { name: 'attachment_url', type: 'string', required: false },
            { name: 'read_by', type: 'array', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'users',
          description: 'User profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'username', type: 'string', required: true },
            { name: 'phone', type: 'string', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  video_streaming: {
    label: 'Video Streaming',
    keywords: ['youtube', 'streaming', 'video', 'creator', 'channel', 'upload', 'playlist', 'subscribe', 'subscription', 'view', 'watch', 'comment', 'reaction'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Viewers and creators.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'channels',
          description: 'Creator channels.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'videos',
          description: 'Videos uploaded by creators.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'channel_id', type: 'uuid', required: true, foreign_key: 'channels.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'url', type: 'text', required: true },
            { name: 'duration_sec', type: 'integer', required: false },
            { name: 'visibility', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'subscriptions',
          description: 'User subscriptions to channels.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'channel_id', type: 'uuid', required: true, foreign_key: 'channels.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'comments',
          description: 'Comments on videos.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'video_id', type: 'uuid', required: true, foreign_key: 'videos.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'playlists',
          description: 'User-curated video playlists.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'videos',
          description: 'Video records with metadata.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'channel_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'url', type: 'string', required: true },
            { name: 'duration_sec', type: 'number', required: false },
            { name: 'visibility', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'channels',
          description: 'Creator channels.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'subscriber_count', type: 'number', required: false },
          ],
        },
        {
          name: 'comments',
          description: 'Comments on videos.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'video_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  fintech_wallet: {
    label: 'Fintech / Wallet',
    keywords: ['paytm', 'phonepe', 'wallet', 'fintech', 'payment', 'transfer', 'transaction', 'bank', 'account', 'kyc', 'upi', 'balance', 'merchant', 'fund'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Registered users of the wallet app.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'kyc_status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'wallets',
          description: 'User wallet balances.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'balance', type: 'decimal', required: true },
            { name: 'currency', type: 'varchar', required: true },
            { name: 'updated_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'bank_accounts',
          description: 'Linked bank accounts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'account_number', type: 'varchar', required: true },
            { name: 'bank_name', type: 'varchar', required: true },
            { name: 'is_verified', type: 'boolean', required: true },
          ],
        },
        {
          name: 'transactions',
          description: 'All wallet transactions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'sender_wallet_id', type: 'uuid', required: false, foreign_key: 'wallets.id' },
            { name: 'receiver_wallet_id', type: 'uuid', required: false, foreign_key: 'wallets.id' },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'type', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'merchants',
          description: 'Merchants who accept payments.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'business_name', type: 'varchar', required: true },
            { name: 'category', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'users',
          description: 'User profiles with KYC status.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'full_name', type: 'string', required: true },
            { name: 'phone', type: 'string', required: true },
            { name: 'kyc_status', type: 'string', required: true },
            { name: 'wallet', type: 'object', required: true },
          ],
        },
        {
          name: 'transactions',
          description: 'Transaction ledger.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'sender_id', type: 'objectId', required: false },
            { name: 'receiver_id', type: 'objectId', required: false },
            { name: 'amount', type: 'number', required: true },
            { name: 'type', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  hotel_booking: {
    label: 'Hotel / Property Booking',
    keywords: ['airbnb', 'booking', 'hotel', 'property', 'reservation', 'host', 'guest', 'stay', 'availability', 'listing', 'room', 'check-in', 'checkout'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Guests and hosts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'properties',
          description: 'Listings posted by hosts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'host_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'city', type: 'varchar', required: true },
            { name: 'property_type', type: 'varchar', required: true },
            { name: 'price_per_night', type: 'decimal', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'reservations',
          description: 'Bookings made by guests.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'property_id', type: 'uuid', required: true, foreign_key: 'properties.id' },
            { name: 'guest_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'check_in', type: 'date', required: true },
            { name: 'check_out', type: 'date', required: true },
            { name: 'total_amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'reviews',
          description: 'Guest reviews after stays.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'reservation_id', type: 'uuid', required: true, foreign_key: 'reservations.id' },
            { name: 'guest_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'rating', type: 'integer', required: true },
            { name: 'comment', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'properties',
          description: 'Property listings with availability.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'host_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'city', type: 'string', required: true },
            { name: 'price_per_night', type: 'number', required: true },
            { name: 'amenities', type: 'array', required: false },
          ],
        },
        {
          name: 'reservations',
          description: 'Booking records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'property_id', type: 'objectId', required: true },
            { name: 'guest_id', type: 'objectId', required: true },
            { name: 'check_in', type: 'date', required: true },
            { name: 'check_out', type: 'date', required: true },
            { name: 'total_amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
          ],
        },
      ],
    },
  },

  learning_platform: {
    label: 'Learning / EdTech',
    keywords: ['udemy', 'coursera', 'edtech', 'course', 'lesson', 'module', 'instructor', 'learner', 'student', 'enroll', 'enrollment', 'certificate', 'quiz', 'progress'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Learners and instructors.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'courses',
          description: 'Courses created by instructors.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'instructor_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'price', type: 'decimal', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'modules',
          description: 'Sections within a course.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'course_id', type: 'uuid', required: true, foreign_key: 'courses.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'order', type: 'integer', required: true },
          ],
        },
        {
          name: 'lessons',
          description: 'Individual lessons within modules.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'module_id', type: 'uuid', required: true, foreign_key: 'modules.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'video_url', type: 'text', required: false },
            { name: 'order', type: 'integer', required: true },
          ],
        },
        {
          name: 'enrollments',
          description: 'Learner enrollments in courses.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'course_id', type: 'uuid', required: true, foreign_key: 'courses.id' },
            { name: 'progress_pct', type: 'integer', required: true },
            { name: 'enrolled_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'courses',
          description: 'Courses with embedded modules and lessons.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'instructor_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'modules', type: 'array', required: true },
          ],
        },
        {
          name: 'enrollments',
          description: 'Enrollment progress tracking.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'course_id', type: 'objectId', required: true },
            { name: 'progress_pct', type: 'number', required: true },
            { name: 'enrolled_at', type: 'date', required: true },
          ],
        },
        {
          name: 'users',
          description: 'Learner and instructor profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
      ],
    },
  },

  quick_commerce: {
    label: 'Quick Commerce / Grocery',
    keywords: ['blinkit', 'instamart', 'grocery', 'quick commerce', 'dark store', 'inventory', 'slot', 'substitution', 'stock', 'sku', 'warehouse'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Customers placing grocery orders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'dark_stores',
          description: 'Fulfillment warehouses.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'city', type: 'varchar', required: true },
            { name: 'is_active', type: 'boolean', required: true },
          ],
        },
        {
          name: 'products',
          description: 'Grocery product catalog.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'category', type: 'varchar', required: true },
            { name: 'price', type: 'decimal', required: true },
          ],
        },
        {
          name: 'inventory',
          description: 'Stock levels per product per store.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'store_id', type: 'uuid', required: true, foreign_key: 'dark_stores.id' },
            { name: 'product_id', type: 'uuid', required: true, foreign_key: 'products.id' },
            { name: 'stock', type: 'integer', required: true },
            { name: 'updated_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'orders',
          description: 'Customer grocery orders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'store_id', type: 'uuid', required: true, foreign_key: 'dark_stores.id' },
            { name: 'total_amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'orders',
          description: 'Orders with substitutions.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'store_id', type: 'objectId', required: true },
            { name: 'items', type: 'array', required: true },
            { name: 'substitutions', type: 'array', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'inventory',
          description: 'Real-time inventory per store.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'store_id', type: 'objectId', required: true },
            { name: 'product_id', type: 'objectId', required: true },
            { name: 'stock', type: 'number', required: true },
            { name: 'updated_at', type: 'date', required: true },
          ],
        },
        {
          name: 'products',
          description: 'Grocery catalog.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
          ],
        },
      ],
    },
  },

  healthcare: {
    label: 'Healthcare',
    keywords: ['hospital', 'clinic', 'doctor', 'patient', 'appointment', 'prescription', 'medical', 'health', 'diagnosis', 'record', 'ehr', 'pharmacy'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'patients',
          description: 'Patient records.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'date_of_birth', type: 'date', required: true },
            { name: 'phone', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'doctors',
          description: 'Doctors and specialists.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'specialization', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
          ],
        },
        {
          name: 'appointments',
          description: 'Scheduled appointments.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'patient_id', type: 'uuid', required: true, foreign_key: 'patients.id' },
            { name: 'doctor_id', type: 'uuid', required: true, foreign_key: 'doctors.id' },
            { name: 'scheduled_at', type: 'timestamp', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'notes', type: 'text', required: false },
          ],
        },
        {
          name: 'prescriptions',
          description: 'Prescriptions issued after appointments.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'appointment_id', type: 'uuid', required: true, foreign_key: 'appointments.id' },
            { name: 'medication', type: 'varchar', required: true },
            { name: 'dosage', type: 'varchar', required: true },
            { name: 'issued_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'patients',
          description: 'Patient profiles with medical history.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'full_name', type: 'string', required: true },
            { name: 'date_of_birth', type: 'date', required: true },
            { name: 'medical_history', type: 'array', required: false },
          ],
        },
        {
          name: 'appointments',
          description: 'Appointments with embedded prescriptions.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'patient_id', type: 'objectId', required: true },
            { name: 'doctor_id', type: 'objectId', required: true },
            { name: 'scheduled_at', type: 'date', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'prescriptions', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  crm: {
    label: 'CRM / Sales',
    keywords: ['crm', 'sales', 'lead', 'contact', 'deal', 'pipeline', 'opportunity', 'customer', 'account', 'salesforce', 'hubspot'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Sales team members.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
          ],
        },
        {
          name: 'contacts',
          description: 'Leads and customers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: false },
            { name: 'company', type: 'varchar', required: false },
            { name: 'assigned_to', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'deals',
          description: 'Sales opportunities.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'contact_id', type: 'uuid', required: true, foreign_key: 'contacts.id' },
            { name: 'owner_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'value', type: 'decimal', required: false },
            { name: 'stage', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'activities',
          description: 'Calls, emails, and meetings logged against deals.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'deal_id', type: 'uuid', required: true, foreign_key: 'deals.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'type', type: 'varchar', required: true },
            { name: 'notes', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'contacts',
          description: 'Lead and customer profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: false },
            { name: 'company', type: 'string', required: false },
            { name: 'tags', type: 'array', required: false },
          ],
        },
        {
          name: 'deals',
          description: 'Sales pipeline deals.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'contact_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'value', type: 'number', required: false },
            { name: 'stage', type: 'string', required: true },
            { name: 'activities', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  project_management: {
    label: 'Project Management',
    keywords: ['jira', 'trello', 'asana', 'project', 'task', 'ticket', 'sprint', 'board', 'kanban', 'milestone', 'assignee', 'issue', 'backlog', 'team'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'organizations',
          description: 'Top-level tenant organizations.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'slug', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'departments',
          description: 'Departments within an organization.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organization_id', type: 'uuid', required: true, foreign_key: 'organizations.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'teams',
          description: 'Delivery or functional teams inside departments.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'department_id', type: 'uuid', required: true, foreign_key: 'departments.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'users',
          description: 'Employees and collaborators using the system.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organization_id', type: 'uuid', required: true, foreign_key: 'organizations.id' },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'employment_status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'team_members',
          description: 'Many-to-many membership between users and teams.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'team_id', type: 'uuid', required: true, foreign_key: 'teams.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'role_name', type: 'varchar', required: false },
            { name: 'joined_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'clients',
          description: 'Client accounts for billable projects.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organization_id', type: 'uuid', required: true, foreign_key: 'organizations.id' },
            { name: 'account_owner_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'industry', type: 'varchar', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'client_contacts',
          description: 'Primary and secondary client-side stakeholders.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'client_id', type: 'uuid', required: true, foreign_key: 'clients.id' },
            { name: 'full_name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'title', type: 'varchar', required: false },
            { name: 'phone', type: 'varchar', required: false },
          ],
        },
        {
          name: 'portfolios',
          description: 'Portfolio groupings for related projects.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organization_id', type: 'uuid', required: true, foreign_key: 'organizations.id' },
            { name: 'client_id', type: 'uuid', required: false, foreign_key: 'clients.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'projects',
          description: 'Core delivery projects tracked by the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organization_id', type: 'uuid', required: true, foreign_key: 'organizations.id' },
            { name: 'client_id', type: 'uuid', required: true, foreign_key: 'clients.id' },
            { name: 'portfolio_id', type: 'uuid', required: true, foreign_key: 'portfolios.id' },
            { name: 'project_manager_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'delivery_lead_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'account_owner_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'start_date', type: 'date', required: false },
            { name: 'end_date', type: 'date', required: false },
            { name: 'budget_amount', type: 'decimal', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'project_members',
          description: 'Users assigned to a project with delivery roles.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'role_name', type: 'varchar', required: false },
            { name: 'allocation_percent', type: 'decimal', required: false },
            { name: 'joined_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'milestones',
          description: 'Major checkpoints for project delivery.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'due_date', type: 'date', required: false },
          ],
        },
        {
          name: 'epics',
          description: 'Large bodies of work within a project.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'milestone_id', type: 'uuid', required: false, foreign_key: 'milestones.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'stories',
          description: 'User stories contained within epics.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'epic_id', type: 'uuid', required: true, foreign_key: 'epics.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'story_points', type: 'integer', required: false },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'sprints',
          description: 'Time-boxed delivery iterations.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'tasks',
          description: 'Actionable work items for delivery teams.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'milestone_id', type: 'uuid', required: false, foreign_key: 'milestones.id' },
            { name: 'story_id', type: 'uuid', required: false, foreign_key: 'stories.id' },
            { name: 'sprint_id', type: 'uuid', required: false, foreign_key: 'sprints.id' },
            { name: 'parent_task_id', type: 'uuid', required: false, foreign_key: 'tasks.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'priority', type: 'varchar', required: false },
            { name: 'due_date', type: 'date', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'task_assignments',
          description: 'Assignments for tasks that can have multiple assignees.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'task_id', type: 'uuid', required: true, foreign_key: 'tasks.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'assigned_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'task_dependencies',
          description: 'Blocking and dependent task links.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'task_id', type: 'uuid', required: true, foreign_key: 'tasks.id' },
            { name: 'depends_on_task_id', type: 'uuid', required: true, foreign_key: 'tasks.id' },
            { name: 'dependency_type', type: 'varchar', required: false },
          ],
        },
        {
          name: 'task_comments',
          description: 'Comments and discussion threads on tasks.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'task_id', type: 'uuid', required: true, foreign_key: 'tasks.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'time_entries',
          description: 'Tracked effort entries for delivery and billing.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'task_id', type: 'uuid', required: false, foreign_key: 'tasks.id' },
            { name: 'sprint_id', type: 'uuid', required: false, foreign_key: 'sprints.id' },
            { name: 'invoice_id', type: 'uuid', required: false, foreign_key: 'invoices.id' },
            { name: 'billing_code', type: 'varchar', required: false },
            { name: 'is_billable', type: 'boolean', required: true },
            { name: 'hours', type: 'decimal', required: true },
            { name: 'work_date', type: 'date', required: true },
          ],
        },
        {
          name: 'timesheets',
          description: 'Weekly approval wrapper for time entries.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'week_start', type: 'date', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'approved_by', type: 'uuid', required: false, foreign_key: 'users.id' },
          ],
        },
        {
          name: 'invoices',
          description: 'Billable client invoices from approved work and expenses.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'client_id', type: 'uuid', required: true, foreign_key: 'clients.id' },
            { name: 'project_id', type: 'uuid', required: false, foreign_key: 'projects.id' },
            { name: 'invoice_number', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'total_amount', type: 'decimal', required: true },
            { name: 'issued_at', type: 'timestamp', required: false },
            { name: 'due_at', type: 'timestamp', required: false },
          ],
        },
        {
          name: 'expenses',
          description: 'Project expenses for reimbursement and billing.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'submitted_by', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'category', type: 'varchar', required: true },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'incurred_on', type: 'date', required: true },
          ],
        },
        {
          name: 'resource_allocations',
          description: 'Planned and actual delivery capacity by user.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'sprint_id', type: 'uuid', required: false, foreign_key: 'sprints.id' },
            { name: 'month_label', type: 'varchar', required: false },
            { name: 'planned_hours', type: 'decimal', required: true },
            { name: 'actual_hours', type: 'decimal', required: false },
            { name: 'utilization_percent', type: 'decimal', required: false },
          ],
        },
        {
          name: 'risks',
          description: 'Risk register entries with mitigation details.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'owner_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'severity', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'mitigation_plan', type: 'text', required: false },
            { name: 'review_date', type: 'date', required: false },
          ],
        },
        {
          name: 'change_requests',
          description: 'Scope, timeline, and cost change requests.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'requested_by', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'approved_by', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'scope_impact', type: 'text', required: false },
            { name: 'cost_impact', type: 'decimal', required: false },
            { name: 'timeline_impact_days', type: 'integer', required: false },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'approvals',
          description: 'Reusable approval records for business actions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'entity_type', type: 'varchar', required: true },
            { name: 'entity_id', type: 'uuid', required: true },
            { name: 'requested_by', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'approver_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'status', type: 'varchar', required: true },
            { name: 'decided_at', type: 'timestamp', required: false },
          ],
        },
        {
          name: 'notifications',
          description: 'In-app and email notification records.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'channel', type: 'varchar', required: true },
            { name: 'type', type: 'varchar', required: true },
            { name: 'title', type: 'varchar', required: true },
            { name: 'is_read', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'documents',
          description: 'Project documents and attachments metadata.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'uploaded_by', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'file_url', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'audit_logs',
          description: 'Audit trail for changes across the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'entity_type', type: 'varchar', required: true },
            { name: 'entity_id', type: 'uuid', required: true },
            { name: 'actor_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'action', type: 'varchar', required: true },
            { name: 'before_snapshot', type: 'jsonb', required: false },
            { name: 'after_snapshot', type: 'jsonb', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'organizations',
          description: 'Tenant organizations with embedded department summaries.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'slug', type: 'string', required: true },
            { name: 'departments', type: 'array', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'clients',
          description: 'Client accounts with contact summaries.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'organization_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'contacts', type: 'array', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'account_owner_id', type: 'objectId', required: false },
          ],
        },
        {
          name: 'portfolios',
          description: 'Portfolio documents with project references.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'organization_id', type: 'objectId', required: true },
            { name: 'client_id', type: 'objectId', required: false },
            { name: 'name', type: 'string', required: true },
            { name: 'project_ids', type: 'array', required: false },
          ],
        },
        {
          name: 'projects',
          description: 'Projects with milestone and staffing snapshots.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'organization_id', type: 'objectId', required: true },
            { name: 'client_id', type: 'objectId', required: true },
            { name: 'portfolio_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'project_manager_id', type: 'objectId', required: false },
            { name: 'delivery_lead_id', type: 'objectId', required: false },
            { name: 'milestones', type: 'array', required: false },
            { name: 'members', type: 'array', required: false },
          ],
        },
        {
          name: 'tasks',
          description: 'Tasks with embedded comments, assignments, and checklist state.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: true },
            { name: 'milestone_id', type: 'objectId', required: false },
            { name: 'story_id', type: 'objectId', required: false },
            { name: 'sprint_id', type: 'objectId', required: false },
            { name: 'parent_task_id', type: 'objectId', required: false },
            { name: 'title', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'priority', type: 'string', required: false },
            { name: 'assignees', type: 'array', required: false },
            { name: 'dependencies', type: 'array', required: false },
            { name: 'comments', type: 'array', required: false },
          ],
        },
        {
          name: 'sprints',
          description: 'Sprint documents with capacity and velocity summaries.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            { name: 'capacity', type: 'object', required: false },
          ],
        },
        {
          name: 'timesheets',
          description: 'Weekly timesheets with embedded entries.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'week_start', type: 'date', required: true },
            { name: 'entries', type: 'array', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'approved_by', type: 'objectId', required: false },
          ],
        },
        {
          name: 'invoices',
          description: 'Invoice documents with billed time and expense rollups.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'client_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: false },
            { name: 'line_items', type: 'array', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'total_amount', type: 'number', required: true },
          ],
        },
        {
          name: 'risks',
          description: 'Risk register entries with mitigation and owner context.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: true },
            { name: 'owner_id', type: 'objectId', required: false },
            { name: 'title', type: 'string', required: true },
            { name: 'severity', type: 'string', required: true },
            { name: 'mitigation_plan', type: 'string', required: false },
            { name: 'review_date', type: 'date', required: false },
            { name: 'status', type: 'string', required: true },
          ],
        },
        {
          name: 'change_requests',
          description: 'Change requests with approvals and impact analysis.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: true },
            { name: 'requested_by', type: 'objectId', required: true },
            { name: 'approved_by', type: 'objectId', required: false },
            { name: 'title', type: 'string', required: true },
            { name: 'scope_impact', type: 'string', required: false },
            { name: 'cost_impact', type: 'number', required: false },
            { name: 'timeline_impact_days', type: 'number', required: false },
            { name: 'status', type: 'string', required: true },
          ],
        },
        {
          name: 'notifications',
          description: 'User notification inbox by channel.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'channel', type: 'string', required: true },
            { name: 'type', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'is_read', type: 'boolean', required: true },
          ],
        },
        {
          name: 'audit_logs',
          description: 'Immutable activity history for entity changes.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'entity_type', type: 'string', required: true },
            { name: 'entity_id', type: 'objectId', required: true },
            { name: 'actor_id', type: 'objectId', required: false },
            { name: 'action', type: 'string', required: true },
            { name: 'before_snapshot', type: 'object', required: false },
            { name: 'after_snapshot', type: 'object', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  blog_cms: {
    label: 'Blog / CMS',
    keywords: ['blog', 'cms', 'content', 'article', 'post', 'author', 'publish', 'tag', 'category', 'comment', 'wordpress', 'medium'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Authors and readers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'posts',
          description: 'Blog posts and articles.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'author_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'slug', type: 'varchar', required: true },
            { name: 'body', type: 'text', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'published_at', type: 'timestamp', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'tags',
          description: 'Tags for categorizing posts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
          ],
        },
        {
          name: 'post_tags',
          description: 'Many-to-many join between posts and tags.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'post_id', type: 'uuid', required: true, foreign_key: 'posts.id' },
            { name: 'tag_id', type: 'uuid', required: true, foreign_key: 'tags.id' },
          ],
        },
        {
          name: 'comments',
          description: 'Reader comments on posts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'post_id', type: 'uuid', required: true, foreign_key: 'posts.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'posts',
          description: 'Articles with embedded tags.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'author_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'slug', type: 'string', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'tags', type: 'array', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'published_at', type: 'date', required: false },
          ],
        },
        {
          name: 'comments',
          description: 'Post comments.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'post_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  iot_platform: {
    label: 'IoT Platform',
    keywords: ['iot', 'device', 'sensor', 'telemetry', 'firmware', 'gateway', 'mqtt', 'alert', 'reading', 'connected device', 'smart home'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Device owners.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
          ],
        },
        {
          name: 'devices',
          description: 'Registered IoT devices.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'owner_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'device_type', type: 'varchar', required: true },
            { name: 'firmware_version', type: 'varchar', required: false },
            { name: 'is_online', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'telemetry',
          description: 'Sensor readings from devices.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'device_id', type: 'uuid', required: true, foreign_key: 'devices.id' },
            { name: 'metric', type: 'varchar', required: true },
            { name: 'value', type: 'decimal', required: true },
            { name: 'recorded_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'alerts',
          description: 'Threshold-triggered alerts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'device_id', type: 'uuid', required: true, foreign_key: 'devices.id' },
            { name: 'message', type: 'text', required: true },
            { name: 'severity', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'devices',
          description: 'Device registry.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'owner_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'device_type', type: 'string', required: true },
            { name: 'is_online', type: 'boolean', required: true },
          ],
        },
        {
          name: 'telemetry',
          description: 'Time-series sensor data.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'device_id', type: 'objectId', required: true },
            { name: 'metric', type: 'string', required: true },
            { name: 'value', type: 'number', required: true },
            { name: 'recorded_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  marketplace: {
    label: 'C2C / Classifieds Marketplace',
    keywords: ['olx', 'ebay', 'etsy', 'craigslist', 'classifieds', 'listing', 'bid', 'auction', 'secondhand', 'buy sell', 'c2c'],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Buyers and sellers on the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'phone', type: 'varchar', required: false },
            { name: 'is_verified', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'categories',
          description: 'Listing categories (Electronics, Vehicles, etc.).',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'slug', type: 'varchar', required: true },
            { name: 'parent_id', type: 'uuid', required: false, foreign_key: 'categories.id' },
          ],
        },
        {
          name: 'listings',
          description: 'Items posted by sellers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'seller_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'category_id', type: 'uuid', required: true, foreign_key: 'categories.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'price', type: 'decimal', required: true },
            { name: 'condition', type: 'varchar', required: false },
            { name: 'location', type: 'varchar', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'listing_images',
          description: 'Photos attached to listings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'listing_id', type: 'uuid', required: true, foreign_key: 'listings.id' },
            { name: 'image_url', type: 'text', required: true },
            { name: 'position', type: 'integer', required: true },
          ],
        },
        {
          name: 'bids',
          description: 'Bids on auction-style listings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'listing_id', type: 'uuid', required: true, foreign_key: 'listings.id' },
            { name: 'bidder_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'messages',
          description: 'Buyer-seller conversations on listings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'listing_id', type: 'uuid', required: true, foreign_key: 'listings.id' },
            { name: 'sender_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'receiver_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'transactions',
          description: 'Completed purchase transactions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'listing_id', type: 'uuid', required: true, foreign_key: 'listings.id' },
            { name: 'buyer_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'seller_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'listings',
          description: 'Listings with embedded images and attributes.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'seller_id', type: 'objectId', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'condition', type: 'string', required: false },
            { name: 'images', type: 'array', required: false },
            { name: 'attributes', type: 'object', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'users',
          description: 'Buyer/seller profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'is_verified', type: 'boolean', required: true },
            { name: 'rating', type: 'number', required: false },
          ],
        },
        {
          name: 'messages',
          description: 'Buyer-seller chat per listing.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'listing_id', type: 'objectId', required: true },
            { name: 'sender_id', type: 'objectId', required: true },
            { name: 'receiver_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'transactions',
          description: 'Purchase records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'listing_id', type: 'objectId', required: true },
            { name: 'buyer_id', type: 'objectId', required: true },
            { name: 'seller_id', type: 'objectId', required: true },
            { name: 'amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
          ],
        },
      ],
    },
  },

  generic: {
    label: 'Generic Application',
    keywords: [],
    sql: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          description: 'Application users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'items',
          description: 'Core resource of the application.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      engine: 'mongodb',
      collections: [
        {
          name: 'users',
          description: 'Application users.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'items',
          description: 'Core resource documents.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },
};

/**
 * Returns the domain key that best matches the given keywords array.
 * Falls back to 'generic' if no match found.
 */
const resolveDomain = (keywords = []) => {
  // Filter out tokens shorter than 3 chars to avoid false partial matches
  const normalizedInput = keywords
    .map((k) => String(k).toLowerCase().trim())
    .filter((k) => k.length >= 3);

  let bestDomain = 'generic';
  let bestScore = 0;

  for (const [domainKey, template] of Object.entries(DOMAIN_TEMPLATES)) {
    if (domainKey === 'generic') continue;

    const score = template.keywords.reduce((count, kw) => {
      // A keyword matches if any input token equals it or contains it as a full word
      const matched = normalizedInput.some(
        (input) => input === kw || input.includes(kw)
      );
      return count + (matched ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDomain = domainKey;
    }
  }

  return bestDomain;
};

module.exports = { DOMAIN_TEMPLATES, resolveDomain };
