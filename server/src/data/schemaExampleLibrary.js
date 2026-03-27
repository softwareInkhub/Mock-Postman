const SCHEMA_EXAMPLES = [
  {
    id: 'ride_hailing',
    title: 'Ride Hailing',
    prompt:
      'Design a ride-hailing backend similar to Uber or Ola where riders book trips, drivers accept rides, vehicles are assigned to drivers, fares are charged, and users can rate completed trips.',
    tags: ['uber', 'ola', 'taxi', 'ride hailing', 'transport'],
    sourceData: {
      riders: [{ id: 'rider_1', fullName: 'Aarav Shah', phone: '+91-9876543210' }],
      drivers: [{ id: 'driver_7', fullName: 'Neha Rao', status: 'online', vehicleId: 'veh_11' }],
      trips: [
        {
          id: 'trip_1001',
          riderId: 'rider_1',
          driverId: 'driver_7',
          pickup: { lat: 12.9716, lng: 77.5946, address: 'MG Road' },
          dropoff: { lat: 12.9352, lng: 77.6245, address: 'Koramangala' },
          fare: 328.5,
          status: 'completed',
        },
      ],
    },
  },
  {
    id: 'food_delivery',
    title: 'Food Delivery',
    prompt:
      'Create a food delivery backend like Zomato or Swiggy where customers browse restaurants, place orders, track delivery partners, pay online, and leave reviews.',
    tags: ['zomato', 'swiggy', 'food delivery', 'restaurant', 'delivery'],
    sourceData: {
      customers: [{ id: 'cust_14', name: 'Maya Patel', phone: '+1-202-555-0123' }],
      restaurants: [{ id: 'rest_4', name: 'Urban Tandoor', cuisine: 'Indian' }],
      orders: [
        {
          id: 'ord_91',
          customerId: 'cust_14',
          restaurantId: 'rest_4',
          items: [{ menuItemId: 'item_2', quantity: 2 }],
          deliveryPartnerId: 'dp_9',
          paymentStatus: 'paid',
        },
      ],
    },
  },
  {
    id: 'quick_commerce',
    title: 'Quick Commerce',
    prompt:
      'Generate a quick-commerce backend like Blinkit or Instamart where users order groceries from nearby dark stores, inventory updates in real time, substitutions are tracked, and delivery slots are assigned.',
    tags: ['blinkit', 'instamart', 'grocery', 'quick commerce', 'inventory'],
    sourceData: {
      darkStores: [{ id: 'store_3', name: 'HSR Dark Store', city: 'Bengaluru' }],
      products: [{ id: 'prod_8', name: 'Bananas', stock: 94, storeId: 'store_3' }],
      orders: [
        {
          id: 'qc_77',
          userId: 'user_22',
          storeId: 'store_3',
          slotId: 'slot_5',
          substitutions: [{ fromProductId: 'prod_8', toProductId: 'prod_11' }],
        },
      ],
    },
  },
  {
    id: 'chat_app',
    title: 'Chat App',
    prompt:
      'Design a messaging backend like WhatsApp or Telegram where users have profiles, one-to-one chats and groups exist, messages support attachments, and read receipts are tracked.',
    tags: ['whatsapp', 'telegram', 'chat', 'messaging', 'group chat'],
    sourceData: {
      users: [{ id: 'user_3', username: 'maya', phone: '+44-20-5555-0188' }],
      conversations: [{ id: 'conv_10', type: 'group', title: 'Weekend Plan' }],
      messages: [
        {
          id: 'msg_900',
          conversationId: 'conv_10',
          senderId: 'user_3',
          body: 'Let us meet at 7 PM',
          attachmentIds: ['att_5'],
        },
      ],
    },
  },
  {
    id: 'social_media',
    title: 'Social Media',
    prompt:
      'Create a social media backend similar to Instagram or Facebook where users publish posts, follow other users, like and comment on posts, and send direct messages.',
    tags: ['instagram', 'facebook', 'social media', 'feed', 'followers'],
    sourceData: {
      users: [{ id: 'user_55', handle: '@nina', displayName: 'Nina Gomez' }],
      posts: [{ id: 'post_12', authorId: 'user_55', mediaType: 'image', caption: 'Sunset walk' }],
      follows: [{ followerId: 'user_77', followeeId: 'user_55' }],
    },
  },
  {
    id: 'video_streaming',
    title: 'Video Streaming',
    prompt:
      'Generate a backend for a video streaming platform like YouTube where creators upload videos, playlists organize content, comments and reactions are stored, and subscriptions notify followers.',
    tags: ['youtube', 'streaming', 'video', 'creator', 'playlist'],
    sourceData: {
      creators: [{ id: 'creator_9', channelName: 'Code Trails' }],
      videos: [{ id: 'vid_300', creatorId: 'creator_9', visibility: 'public', durationSec: 642 }],
      playlists: [{ id: 'pl_11', ownerId: 'creator_9', title: 'Node Tutorials' }],
    },
  },
  {
    id: 'ecommerce_marketplace',
    title: 'E-Commerce Marketplace',
    prompt:
      'Design an e-commerce backend similar to Amazon or Flipkart where customers place orders, sellers manage products, inventory changes by warehouse, and shipments and returns are tracked.',
    tags: ['amazon', 'flipkart', 'ecommerce', 'marketplace', 'orders'],
    sourceData: {
      customers: [{ id: 'cust_1', email: 'maya@example.com', name: 'Maya' }],
      orders: [
        {
          id: 'ord_1',
          customerId: 'cust_1',
          items: [{ productId: 'prod_1', quantity: 2 }],
          shipment: { carrier: 'DHL', trackingNumber: 'TRK-1' },
        },
      ],
      products: [{ id: 'prod_1', categoryId: 'cat_1', sellerId: 'seller_1', price: 49.99 }],
    },
  },
  {
    id: 'learning_platform',
    title: 'Learning Platform',
    prompt:
      'Create an edtech backend like Udemy or Coursera where instructors publish courses, lessons belong to modules, learners enroll, progress is tracked, and certificates are issued.',
    tags: ['udemy', 'coursera', 'edtech', 'courses', 'learning'],
    sourceData: {
      instructors: [{ id: 'inst_8', name: 'Riya Sen' }],
      courses: [{ id: 'course_101', instructorId: 'inst_8', title: 'Intro to Node.js' }],
      enrollments: [{ id: 'enr_4', learnerId: 'learner_2', courseId: 'course_101', progressPct: 42 }],
    },
  },
  {
    id: 'hotel_booking',
    title: 'Hotel Booking',
    prompt:
      'Generate a hotel booking backend like Airbnb or Booking.com where hosts list properties, guests search availability, reservations include payments, and reviews are submitted after stays.',
    tags: ['airbnb', 'booking.com', 'hotel', 'property', 'reservation'],
    sourceData: {
      hosts: [{ id: 'host_3', name: 'Daniel Green' }],
      properties: [{ id: 'prop_5', hostId: 'host_3', city: 'Goa', propertyType: 'villa' }],
      reservations: [{ id: 'res_88', propertyId: 'prop_5', guestId: 'guest_6', totalAmount: 12999 }],
    },
  },
  {
    id: 'fintech_wallet',
    title: 'Fintech Wallet',
    prompt:
      'Design a fintech wallet backend like Paytm or PhonePe where users maintain wallets, bank accounts can be linked, peer-to-peer transfers happen, merchants accept payments, and KYC is tracked.',
    tags: ['paytm', 'phonepe', 'wallet', 'payments', 'fintech'],
    sourceData: {
      users: [{ id: 'user_900', fullName: 'Karan Mehta', kycStatus: 'verified' }],
      wallets: [{ id: 'wallet_11', userId: 'user_900', balance: 8750.34 }],
      transfers: [{ id: 'txn_441', senderWalletId: 'wallet_11', receiverWalletId: 'wallet_12', amount: 499 }],
    },
  },
];

module.exports = {
  SCHEMA_EXAMPLES,
};
