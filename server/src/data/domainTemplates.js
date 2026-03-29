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
          name: 'users',
          description: 'Team members.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
          ],
        },
        {
          name: 'projects',
          description: 'Projects containing tasks.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'owner_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'tasks',
          description: 'Individual work items.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'project_id', type: 'uuid', required: true, foreign_key: 'projects.id' },
            { name: 'assignee_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'priority', type: 'varchar', required: false },
            { name: 'due_date', type: 'date', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'comments',
          description: 'Comments on tasks.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'task_id', type: 'uuid', required: true, foreign_key: 'tasks.id' },
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
          name: 'projects',
          description: 'Projects with member list.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'owner_id', type: 'objectId', required: true },
            { name: 'member_ids', type: 'array', required: false },
          ],
        },
        {
          name: 'tasks',
          description: 'Tasks with comments embedded.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'project_id', type: 'objectId', required: true },
            { name: 'assignee_id', type: 'objectId', required: false },
            { name: 'title', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'priority', type: 'string', required: false },
            { name: 'due_date', type: 'date', required: false },
            { name: 'comments', type: 'array', required: false },
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
