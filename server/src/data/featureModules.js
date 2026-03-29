/**
 * Feature Module Library
 *
 * Each module represents a single product concept/feature.
 * Multiple modules are composed together when the prompt spans concepts
 * that don't map cleanly to a single domain template.
 *
 * Format matches the domain template contract so schemaBuilderService
 * can treat them identically.
 */

const FEATURE_MODULES = {

  // ── Core ──────────────────────────────────────────────────────────────────

  auth: {
    keywords: ['login', 'signup', 'register', 'auth', 'authentication', 'oauth', 'sso', 'password', 'session'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Registered user accounts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'password_hash', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
            { name: 'is_verified', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'sessions',
          description: 'Active user login sessions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'token', type: 'text', required: true },
            { name: 'expires_at', type: 'timestamp', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'users',
          description: 'User accounts.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'password_hash', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
            { name: 'is_verified', type: 'boolean', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  profiles: {
    keywords: ['profile', 'profiles', 'bio', 'avatar', 'account', 'user profile', 'personal info'],
    sql: {
      tables: [
        {
          name: 'profiles',
          description: 'Extended user profile information.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'display_name', type: 'varchar', required: false },
            { name: 'bio', type: 'text', required: false },
            { name: 'avatar_url', type: 'text', required: false },
            { name: 'date_of_birth', type: 'date', required: false },
            { name: 'gender', type: 'varchar', required: false },
            { name: 'updated_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'profiles',
          description: 'Extended user profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'display_name', type: 'string', required: false },
            { name: 'bio', type: 'string', required: false },
            { name: 'avatar_url', type: 'string', required: false },
            { name: 'date_of_birth', type: 'date', required: false },
          ],
        },
      ],
    },
  },

  // ── Social / Community ───────────────────────────────────────────────────

  dating: {
    keywords: ['dating', 'match', 'matches', 'swipe', 'tinder', 'bumble', 'hinge', 'compatible', 'compatibility', 'like', 'love', 'romance', 'relationship', 'partner', 'date'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'App users looking for matches.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'profiles',
          description: 'Dating profiles with preferences.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'display_name', type: 'varchar', required: true },
            { name: 'bio', type: 'text', required: false },
            { name: 'avatar_url', type: 'text', required: false },
            { name: 'age', type: 'integer', required: true },
            { name: 'gender', type: 'varchar', required: false },
            { name: 'location', type: 'varchar', required: false },
            { name: 'interests', type: 'text', required: false },
          ],
        },
        {
          name: 'swipes',
          description: 'Like/pass actions between users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'swiper_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'swiped_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'direction', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'matches',
          description: 'Mutual likes resulting in a match.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_a_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'user_b_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'matched_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'conversations',
          description: 'Chat threads between matched users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'match_id', type: 'uuid', required: true, foreign_key: 'matches.id' },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'messages',
          description: 'Messages sent between matched users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'conversation_id', type: 'uuid', required: true, foreign_key: 'conversations.id' },
            { name: 'sender_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'profiles',
          description: 'Dating profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'display_name', type: 'string', required: true },
            { name: 'bio', type: 'string', required: false },
            { name: 'age', type: 'number', required: true },
            { name: 'gender', type: 'string', required: false },
            { name: 'interests', type: 'array', required: false },
          ],
        },
        {
          name: 'matches',
          description: 'Mutual match records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_a_id', type: 'objectId', required: true },
            { name: 'user_b_id', type: 'objectId', required: true },
            { name: 'matched_at', type: 'date', required: true },
          ],
        },
        {
          name: 'messages',
          description: 'Chat messages between matched users.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'match_id', type: 'objectId', required: true },
            { name: 'sender_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  astrology: {
    keywords: ['astrology', 'astrological', 'zodiac', 'horoscope', 'birth chart', 'star sign', 'sun sign', 'moon sign', 'rising', 'ascendant', 'tarot', 'numerology', 'cosmic', 'celestial', 'planet', 'planetary'],
    sql: {
      tables: [
        {
          name: 'zodiac_signs',
          description: 'The 12 zodiac signs with their attributes.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'symbol', type: 'varchar', required: false },
            { name: 'element', type: 'varchar', required: false },
            { name: 'ruling_planet', type: 'varchar', required: false },
            { name: 'date_range_start', type: 'varchar', required: false },
            { name: 'date_range_end', type: 'varchar', required: false },
          ],
        },
        {
          name: 'birth_charts',
          description: 'Astrological birth charts for users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'sun_sign_id', type: 'uuid', required: false, foreign_key: 'zodiac_signs.id' },
            { name: 'moon_sign_id', type: 'uuid', required: false, foreign_key: 'zodiac_signs.id' },
            { name: 'rising_sign_id', type: 'uuid', required: false, foreign_key: 'zodiac_signs.id' },
            { name: 'birth_date', type: 'date', required: true },
            { name: 'birth_time', type: 'varchar', required: false },
            { name: 'birth_place', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'horoscopes',
          description: 'Daily/weekly/monthly horoscope content per sign.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'zodiac_sign_id', type: 'uuid', required: true, foreign_key: 'zodiac_signs.id' },
            { name: 'period_type', type: 'varchar', required: true },
            { name: 'content', type: 'text', required: true },
            { name: 'valid_from', type: 'date', required: true },
            { name: 'valid_until', type: 'date', required: true },
          ],
        },
        {
          name: 'compatibility_scores',
          description: 'Compatibility ratings between zodiac sign pairs.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'sign_a_id', type: 'uuid', required: true, foreign_key: 'zodiac_signs.id' },
            { name: 'sign_b_id', type: 'uuid', required: true, foreign_key: 'zodiac_signs.id' },
            { name: 'score', type: 'integer', required: true },
            { name: 'description', type: 'text', required: false },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'zodiac_signs',
          description: 'Zodiac sign reference data.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'element', type: 'string', required: false },
            { name: 'ruling_planet', type: 'string', required: false },
            { name: 'traits', type: 'array', required: false },
          ],
        },
        {
          name: 'birth_charts',
          description: 'User birth charts with planetary positions.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'sun_sign', type: 'string', required: false },
            { name: 'moon_sign', type: 'string', required: false },
            { name: 'rising_sign', type: 'string', required: false },
            { name: 'birth_date', type: 'date', required: true },
            { name: 'planetary_positions', type: 'object', required: false },
          ],
        },
        {
          name: 'horoscopes',
          description: 'Periodic horoscope readings.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'zodiac_sign', type: 'string', required: true },
            { name: 'period_type', type: 'string', required: true },
            { name: 'content', type: 'string', required: true },
            { name: 'valid_from', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  // ── Fitness / Health ──────────────────────────────────────────────────────

  fitness: {
    keywords: ['fitness', 'workout', 'exercise', 'gym', 'training', 'health', 'calories', 'steps', 'run', 'running', 'cycling', 'yoga', 'weight', 'muscle', 'nutrition', 'diet', 'macro'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'App users.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'exercises',
          description: 'Exercise library with categories.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'category', type: 'varchar', required: true },
            { name: 'muscle_group', type: 'varchar', required: false },
            { name: 'description', type: 'text', required: false },
          ],
        },
        {
          name: 'workout_plans',
          description: 'Structured workout plans.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'goal', type: 'varchar', required: false },
            { name: 'frequency_per_week', type: 'integer', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'workout_sessions',
          description: 'Completed workout sessions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'plan_id', type: 'uuid', required: false, foreign_key: 'workout_plans.id' },
            { name: 'started_at', type: 'timestamp', required: true },
            { name: 'completed_at', type: 'timestamp', required: false },
            { name: 'calories_burned', type: 'integer', required: false },
            { name: 'notes', type: 'text', required: false },
          ],
        },
        {
          name: 'health_metrics',
          description: 'Tracked health measurements over time.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'metric_type', type: 'varchar', required: true },
            { name: 'value', type: 'decimal', required: true },
            { name: 'unit', type: 'varchar', required: false },
            { name: 'recorded_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'workout_sessions',
          description: 'Logged workout sessions with exercises.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'exercises', type: 'array', required: true },
            { name: 'started_at', type: 'date', required: true },
            { name: 'calories_burned', type: 'number', required: false },
          ],
        },
        {
          name: 'health_metrics',
          description: 'Time-series health data.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'metric_type', type: 'string', required: true },
            { name: 'value', type: 'number', required: true },
            { name: 'recorded_at', type: 'date', required: true },
          ],
        },
        {
          name: 'exercises',
          description: 'Exercise reference library.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'muscle_groups', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  // ── Entertainment ─────────────────────────────────────────────────────────

  gaming: {
    keywords: ['game', 'gaming', 'player', 'score', 'leaderboard', 'achievement', 'level', 'quest', 'guild', 'clan', 'match', 'tournament', 'multiplayer', 'inventory', 'character', 'rpg', 'puzzle'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Registered players.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'games',
          description: 'Available games on the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'title', type: 'varchar', required: true },
            { name: 'genre', type: 'varchar', required: false },
            { name: 'description', type: 'text', required: false },
          ],
        },
        {
          name: 'game_sessions',
          description: 'Individual play sessions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'game_id', type: 'uuid', required: true, foreign_key: 'games.id' },
            { name: 'player_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'score', type: 'integer', required: false },
            { name: 'level_reached', type: 'integer', required: false },
            { name: 'started_at', type: 'timestamp', required: true },
            { name: 'completed_at', type: 'timestamp', required: false },
          ],
        },
        {
          name: 'leaderboards',
          description: 'All-time and periodic high scores.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'game_id', type: 'uuid', required: true, foreign_key: 'games.id' },
            { name: 'player_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'score', type: 'integer', required: true },
            { name: 'period', type: 'varchar', required: false },
            { name: 'recorded_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'achievements',
          description: 'Unlockable in-game achievements.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'game_id', type: 'uuid', required: true, foreign_key: 'games.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'icon_url', type: 'text', required: false },
          ],
        },
        {
          name: 'player_achievements',
          description: 'Achievements earned by players.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'player_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'achievement_id', type: 'uuid', required: true, foreign_key: 'achievements.id' },
            { name: 'earned_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'game_sessions',
          description: 'Play sessions with embedded state.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'player_id', type: 'objectId', required: true },
            { name: 'game_id', type: 'objectId', required: true },
            { name: 'score', type: 'number', required: false },
            { name: 'state', type: 'object', required: false },
            { name: 'started_at', type: 'date', required: true },
          ],
        },
        {
          name: 'leaderboards',
          description: 'Score rankings.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'game_id', type: 'objectId', required: true },
            { name: 'player_id', type: 'objectId', required: true },
            { name: 'score', type: 'number', required: true },
            { name: 'recorded_at', type: 'date', required: true },
          ],
        },
        {
          name: 'achievements',
          description: 'Player achievement records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'player_id', type: 'objectId', required: true },
            { name: 'earned', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  music: {
    keywords: ['music', 'song', 'track', 'artist', 'album', 'playlist', 'podcast', 'audio', 'spotify', 'stream', 'listen', 'genre', 'band', 'lyrics', 'concert'],
    sql: {
      tables: [
        {
          name: 'artists',
          description: 'Music artists and bands.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'bio', type: 'text', required: false },
            { name: 'genre', type: 'varchar', required: false },
            { name: 'image_url', type: 'text', required: false },
          ],
        },
        {
          name: 'albums',
          description: 'Music albums.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'artist_id', type: 'uuid', required: true, foreign_key: 'artists.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'release_date', type: 'date', required: false },
            { name: 'cover_url', type: 'text', required: false },
          ],
        },
        {
          name: 'tracks',
          description: 'Individual songs/tracks.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'album_id', type: 'uuid', required: false, foreign_key: 'albums.id' },
            { name: 'artist_id', type: 'uuid', required: true, foreign_key: 'artists.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'duration_sec', type: 'integer', required: false },
            { name: 'audio_url', type: 'text', required: true },
            { name: 'genre', type: 'varchar', required: false },
          ],
        },
        {
          name: 'playlists',
          description: 'User-curated playlists.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'is_public', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'playlist_tracks',
          description: 'Tracks within playlists.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'playlist_id', type: 'uuid', required: true, foreign_key: 'playlists.id' },
            { name: 'track_id', type: 'uuid', required: true, foreign_key: 'tracks.id' },
            { name: 'position', type: 'integer', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'tracks',
          description: 'Music tracks with metadata.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'artist_id', type: 'objectId', required: true },
            { name: 'album_id', type: 'objectId', required: false },
            { name: 'duration_sec', type: 'number', required: false },
            { name: 'audio_url', type: 'string', required: true },
            { name: 'genre', type: 'string', required: false },
          ],
        },
        {
          name: 'playlists',
          description: 'User playlists with embedded track list.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'track_ids', type: 'array', required: true },
            { name: 'is_public', type: 'boolean', required: true },
          ],
        },
        {
          name: 'artists',
          description: 'Artist profiles.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'genre', type: 'string', required: false },
            { name: 'follower_count', type: 'number', required: false },
          ],
        },
      ],
    },
  },

  // ── Commerce / Marketplace ────────────────────────────────────────────────

  marketplace: {
    keywords: ['marketplace', 'listing', 'bid', 'auction', 'buy', 'sell', 'secondhand', 'classifieds', 'ebay', 'craigslist', 'gig', 'freelance', 'fiverr'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Buyers and sellers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'listings',
          description: 'Items or services listed for sale.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'seller_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'price', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'category', type: 'varchar', required: false },
            { name: 'image_url', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'bids',
          description: 'Bids on auction listings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'listing_id', type: 'uuid', required: true, foreign_key: 'listings.id' },
            { name: 'bidder_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'amount', type: 'decimal', required: true },
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
      collections: [
        {
          name: 'listings',
          description: 'Marketplace listings.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'seller_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'images', type: 'array', required: false },
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
            { name: 'amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  // ── Travel ───────────────────────────────────────────────────────────────

  travel: {
    keywords: ['travel', 'trip', 'destination', 'itinerary', 'flight', 'hotel', 'hostel', 'tour', 'booking', 'tourist', 'backpack', 'visa', 'passport', 'vacation', 'holiday'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Travellers on the platform.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'destinations',
          description: 'Travel destinations.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'country', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'image_url', type: 'text', required: false },
          ],
        },
        {
          name: 'trips',
          description: 'User-planned travel trips.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'itinerary_items',
          description: 'Day-by-day activities within a trip.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'trip_id', type: 'uuid', required: true, foreign_key: 'trips.id' },
            { name: 'destination_id', type: 'uuid', required: false, foreign_key: 'destinations.id' },
            { name: 'day', type: 'integer', required: true },
            { name: 'activity', type: 'text', required: true },
            { name: 'scheduled_at', type: 'timestamp', required: false },
          ],
        },
        {
          name: 'bookings',
          description: 'Flight, hotel, and tour bookings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'trip_id', type: 'uuid', required: true, foreign_key: 'trips.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'booking_type', type: 'varchar', required: true },
            { name: 'reference', type: 'varchar', required: false },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'trips',
          description: 'Travel plans with embedded itinerary.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            { name: 'destinations', type: 'array', required: false },
            { name: 'itinerary', type: 'array', required: false },
          ],
        },
        {
          name: 'destinations',
          description: 'Travel destination info.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'country', type: 'string', required: true },
            { name: 'tags', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  // ── Professional / Work ───────────────────────────────────────────────────

  job_board: {
    keywords: ['job', 'jobs', 'career', 'hiring', 'recruit', 'resume', 'cv', 'apply', 'application', 'candidate', 'employer', 'vacancy', 'linkedin', 'internship', 'talent'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Job seekers and employers.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'companies',
          description: 'Hiring companies.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'industry', type: 'varchar', required: false },
            { name: 'size', type: 'varchar', required: false },
            { name: 'website', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'job_listings',
          description: 'Open job positions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'company_id', type: 'uuid', required: true, foreign_key: 'companies.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: true },
            { name: 'location', type: 'varchar', required: false },
            { name: 'job_type', type: 'varchar', required: false },
            { name: 'salary_min', type: 'decimal', required: false },
            { name: 'salary_max', type: 'decimal', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'applications',
          description: 'Job applications from candidates.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'job_id', type: 'uuid', required: true, foreign_key: 'job_listings.id' },
            { name: 'applicant_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'resume_url', type: 'text', required: false },
            { name: 'cover_letter', type: 'text', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'applied_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'job_listings',
          description: 'Job postings.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'company_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'description', type: 'string', required: true },
            { name: 'skills_required', type: 'array', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'applications',
          description: 'Job applications.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'job_id', type: 'objectId', required: true },
            { name: 'applicant_id', type: 'objectId', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'applied_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  // ── Content ───────────────────────────────────────────────────────────────

  recipe: {
    keywords: ['recipe', 'cook', 'cooking', 'food', 'ingredient', 'meal', 'dish', 'cuisine', 'chef', 'kitchen', 'bake', 'nutrition', 'allrecipes', 'yummly'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Cooks and food enthusiasts.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
          ],
        },
        {
          name: 'recipes',
          description: 'Recipe entries with instructions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'author_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'instructions', type: 'text', required: true },
            { name: 'prep_time_min', type: 'integer', required: false },
            { name: 'cook_time_min', type: 'integer', required: false },
            { name: 'servings', type: 'integer', required: false },
            { name: 'cuisine_type', type: 'varchar', required: false },
            { name: 'image_url', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'ingredients',
          description: 'Ingredient reference library.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'category', type: 'varchar', required: false },
            { name: 'unit', type: 'varchar', required: false },
          ],
        },
        {
          name: 'recipe_ingredients',
          description: 'Ingredients used in each recipe.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'recipe_id', type: 'uuid', required: true, foreign_key: 'recipes.id' },
            { name: 'ingredient_id', type: 'uuid', required: true, foreign_key: 'ingredients.id' },
            { name: 'quantity', type: 'decimal', required: true },
            { name: 'unit', type: 'varchar', required: false },
          ],
        },
        {
          name: 'meal_plans',
          description: 'Weekly or daily meal plans.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'week_start', type: 'date', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'recipes',
          description: 'Recipes with embedded ingredients.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'author_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'ingredients', type: 'array', required: true },
            { name: 'instructions', type: 'string', required: true },
            { name: 'cuisine_type', type: 'string', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'meal_plans',
          description: 'User meal plans.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'week_start', type: 'date', required: true },
            { name: 'meals', type: 'array', required: true },
          ],
        },
      ],
    },
  },

  // ── Life / Services ───────────────────────────────────────────────────────

  pet: {
    keywords: ['pet', 'dog', 'cat', 'animal', 'veterinary', 'vet', 'breed', 'adoption', 'shelter', 'grooming', 'paw', 'puppy', 'kitten'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Pet owners.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
          ],
        },
        {
          name: 'pets',
          description: 'Registered pets.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'owner_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'species', type: 'varchar', required: true },
            { name: 'breed', type: 'varchar', required: false },
            { name: 'date_of_birth', type: 'date', required: false },
            { name: 'avatar_url', type: 'text', required: false },
          ],
        },
        {
          name: 'vet_appointments',
          description: 'Veterinary appointment records.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'pet_id', type: 'uuid', required: true, foreign_key: 'pets.id' },
            { name: 'vet_name', type: 'varchar', required: false },
            { name: 'reason', type: 'text', required: false },
            { name: 'scheduled_at', type: 'timestamp', required: true },
            { name: 'notes', type: 'text', required: false },
          ],
        },
        {
          name: 'health_records',
          description: 'Pet health and vaccination records.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'pet_id', type: 'uuid', required: true, foreign_key: 'pets.id' },
            { name: 'record_type', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'recorded_at', type: 'date', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'pets',
          description: 'Pet profiles with health summary.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'owner_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'species', type: 'string', required: true },
            { name: 'breed', type: 'string', required: false },
            { name: 'vaccinations', type: 'array', required: false },
          ],
        },
        {
          name: 'vet_appointments',
          description: 'Appointment and health records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'pet_id', type: 'objectId', required: true },
            { name: 'reason', type: 'string', required: false },
            { name: 'scheduled_at', type: 'date', required: true },
            { name: 'notes', type: 'string', required: false },
          ],
        },
      ],
    },
  },

  mental_health: {
    keywords: ['mental health', 'therapy', 'therapist', 'counselling', 'meditation', 'mindfulness', 'mood', 'anxiety', 'depression', 'wellbeing', 'wellness', 'journal', 'self care', 'breathe', 'calm', 'headspace'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'App users seeking mental health support.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'therapists',
          description: 'Licensed therapists and counsellors.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'specialization', type: 'varchar', required: false },
            { name: 'bio', type: 'text', required: false },
            { name: 'is_available', type: 'boolean', required: true },
          ],
        },
        {
          name: 'therapy_sessions',
          description: 'Scheduled or completed therapy sessions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'therapist_id', type: 'uuid', required: true, foreign_key: 'therapists.id' },
            { name: 'scheduled_at', type: 'timestamp', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'notes', type: 'text', required: false },
          ],
        },
        {
          name: 'mood_logs',
          description: 'Daily mood and emotion tracking.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'mood_score', type: 'integer', required: true },
            { name: 'notes', type: 'text', required: false },
            { name: 'logged_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'journal_entries',
          description: 'Private journaling entries.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'mood_logs',
          description: 'Mood tracking entries.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'mood_score', type: 'number', required: true },
            { name: 'emotions', type: 'array', required: false },
            { name: 'logged_at', type: 'date', required: true },
          ],
        },
        {
          name: 'therapy_sessions',
          description: 'Session records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'therapist_id', type: 'objectId', required: true },
            { name: 'scheduled_at', type: 'date', required: true },
            { name: 'status', type: 'string', required: true },
          ],
        },
      ],
    },
  },

  sports: {
    keywords: ['sport', 'sports', 'team', 'league', 'tournament', 'match', 'fixture', 'athlete', 'coach', 'stadium', 'football', 'cricket', 'basketball', 'tennis', 'rugby', 'baseball', 'nfl', 'nba', 'ipl'],
    sql: {
      tables: [
        {
          name: 'teams',
          description: 'Sports teams.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'sport', type: 'varchar', required: true },
            { name: 'city', type: 'varchar', required: false },
            { name: 'logo_url', type: 'text', required: false },
          ],
        },
        {
          name: 'players',
          description: 'Athletes in the system.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'team_id', type: 'uuid', required: false, foreign_key: 'teams.id' },
            { name: 'name', type: 'varchar', required: true },
            { name: 'position', type: 'varchar', required: false },
            { name: 'jersey_number', type: 'integer', required: false },
            { name: 'date_of_birth', type: 'date', required: false },
          ],
        },
        {
          name: 'leagues',
          description: 'Sports leagues and competitions.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'sport', type: 'varchar', required: true },
            { name: 'season', type: 'varchar', required: false },
          ],
        },
        {
          name: 'fixtures',
          description: 'Scheduled matches between teams.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'league_id', type: 'uuid', required: true, foreign_key: 'leagues.id' },
            { name: 'home_team_id', type: 'uuid', required: true, foreign_key: 'teams.id' },
            { name: 'away_team_id', type: 'uuid', required: true, foreign_key: 'teams.id' },
            { name: 'scheduled_at', type: 'timestamp', required: true },
            { name: 'venue', type: 'varchar', required: false },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'scores',
          description: 'Match results and scores.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'fixture_id', type: 'uuid', required: true, foreign_key: 'fixtures.id' },
            { name: 'home_score', type: 'integer', required: false },
            { name: 'away_score', type: 'integer', required: false },
            { name: 'updated_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'fixtures',
          description: 'Match schedule and results.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'league_id', type: 'objectId', required: true },
            { name: 'home_team_id', type: 'objectId', required: true },
            { name: 'away_team_id', type: 'objectId', required: true },
            { name: 'scheduled_at', type: 'date', required: true },
            { name: 'result', type: 'object', required: false },
          ],
        },
        {
          name: 'teams',
          description: 'Team profiles with roster.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'sport', type: 'string', required: true },
            { name: 'players', type: 'array', required: false },
          ],
        },
      ],
    },
  },

  real_estate: {
    keywords: ['real estate', 'property', 'house', 'apartment', 'flat', 'rent', 'buy', 'mortgage', 'agent', 'broker', 'listing', 'zillow', 'magicbricks', 'floor plan', 'lease'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Buyers, sellers, and agents.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'role', type: 'varchar', required: true },
          ],
        },
        {
          name: 'properties',
          description: 'Real estate listings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'agent_id', type: 'uuid', required: false, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'property_type', type: 'varchar', required: true },
            { name: 'address', type: 'text', required: true },
            { name: 'city', type: 'varchar', required: true },
            { name: 'price', type: 'decimal', required: true },
            { name: 'bedrooms', type: 'integer', required: false },
            { name: 'bathrooms', type: 'integer', required: false },
            { name: 'area_sqft', type: 'decimal', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'inquiries',
          description: 'Buyer inquiries on properties.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'property_id', type: 'uuid', required: true, foreign_key: 'properties.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'message', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'viewings',
          description: 'Property viewing appointments.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'property_id', type: 'uuid', required: true, foreign_key: 'properties.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'scheduled_at', type: 'timestamp', required: true },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'properties',
          description: 'Property listings with images.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'property_type', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'city', type: 'string', required: true },
            { name: 'images', type: 'array', required: false },
            { name: 'amenities', type: 'array', required: false },
            { name: 'status', type: 'string', required: true },
          ],
        },
        {
          name: 'inquiries',
          description: 'Buyer inquiry records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'property_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'message', type: 'string', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  forum: {
    keywords: ['forum', 'community', 'thread', 'post', 'upvote', 'downvote', 'reddit', 'discussion', 'reply', 'vote', 'subreddit', 'comment', 'moderation'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Community members.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'username', type: 'varchar', required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'categories',
          description: 'Forum categories or subreddits.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'name', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'slug', type: 'varchar', required: true },
          ],
        },
        {
          name: 'threads',
          description: 'Discussion threads within categories.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'category_id', type: 'uuid', required: true, foreign_key: 'categories.id' },
            { name: 'author_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'body', type: 'text', required: true },
            { name: 'upvotes', type: 'integer', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'replies',
          description: 'Replies to threads.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'thread_id', type: 'uuid', required: true, foreign_key: 'threads.id' },
            { name: 'author_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'body', type: 'text', required: true },
            { name: 'upvotes', type: 'integer', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'threads',
          description: 'Forum threads with reply count.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'category_id', type: 'objectId', required: true },
            { name: 'author_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'upvotes', type: 'number', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
        {
          name: 'replies',
          description: 'Thread replies.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'thread_id', type: 'objectId', required: true },
            { name: 'author_id', type: 'objectId', required: true },
            { name: 'body', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  events: {
    keywords: ['event', 'events', 'ticket', 'concert', 'conference', 'meetup', 'rsvp', 'attendee', 'venue', 'schedule', 'calendar', 'booking', 'eventbrite', 'festival'],
    sql: {
      tables: [
        {
          name: 'users',
          description: 'Event organisers and attendees.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'email', type: 'varchar', required: true },
            { name: 'name', type: 'varchar', required: true },
          ],
        },
        {
          name: 'events',
          description: 'Events available for attendance.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'organiser_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'venue', type: 'varchar', required: false },
            { name: 'starts_at', type: 'timestamp', required: true },
            { name: 'ends_at', type: 'timestamp', required: false },
            { name: 'capacity', type: 'integer', required: false },
            { name: 'ticket_price', type: 'decimal', required: false },
            { name: 'status', type: 'varchar', required: true },
          ],
        },
        {
          name: 'tickets',
          description: 'Tickets purchased for events.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'event_id', type: 'uuid', required: true, foreign_key: 'events.id' },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'ticket_code', type: 'varchar', required: true },
            { name: 'price_paid', type: 'decimal', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'purchased_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'events',
          description: 'Event details with attendee count.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'organiser_id', type: 'objectId', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'venue', type: 'string', required: false },
            { name: 'starts_at', type: 'date', required: true },
            { name: 'ticket_price', type: 'number', required: false },
            { name: 'status', type: 'string', required: true },
          ],
        },
        {
          name: 'tickets',
          description: 'Event ticket records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'event_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'ticket_code', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
          ],
        },
      ],
    },
  },

  payments: {
    keywords: ['payment', 'billing', 'invoice', 'subscription', 'stripe', 'razorpay', 'checkout', 'credit card', 'refund', 'payout', 'revenue'],
    sql: {
      tables: [
        {
          name: 'payments',
          description: 'Payment records.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'currency', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'provider', type: 'varchar', required: false },
            { name: 'provider_ref', type: 'varchar', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
        {
          name: 'subscriptions',
          description: 'Recurring subscription plans.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'plan', type: 'varchar', required: true },
            { name: 'status', type: 'varchar', required: true },
            { name: 'started_at', type: 'timestamp', required: true },
            { name: 'expires_at', type: 'timestamp', required: false },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'payments',
          description: 'Payment transactions.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'amount', type: 'number', required: true },
            { name: 'currency', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  notifications: {
    keywords: ['notification', 'push notification', 'alert', 'inbox', 'bell', 'reminder', 'email notification'],
    sql: {
      tables: [
        {
          name: 'notifications',
          description: 'User notifications.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'user_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'type', type: 'varchar', required: true },
            { name: 'title', type: 'varchar', required: true },
            { name: 'body', type: 'text', required: false },
            { name: 'is_read', type: 'boolean', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'notifications',
          description: 'Notification records.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'user_id', type: 'objectId', required: true },
            { name: 'type', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'is_read', type: 'boolean', required: true },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

  reviews: {
    keywords: ['review', 'rating', 'feedback', 'testimonial', 'star', 'recommend'],
    sql: {
      tables: [
        {
          name: 'reviews',
          description: 'User reviews and ratings.',
          columns: [
            { name: 'id', type: 'uuid', primary: true, required: true },
            { name: 'reviewer_id', type: 'uuid', required: true, foreign_key: 'users.id' },
            { name: 'subject_id', type: 'uuid', required: true },
            { name: 'subject_type', type: 'varchar', required: true },
            { name: 'rating', type: 'integer', required: true },
            { name: 'comment', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true },
          ],
        },
      ],
    },
    nosql: {
      collections: [
        {
          name: 'reviews',
          description: 'Reviews and ratings.',
          document_shape: [
            { name: '_id', type: 'objectId', required: true },
            { name: 'reviewer_id', type: 'objectId', required: true },
            { name: 'subject_id', type: 'objectId', required: true },
            { name: 'subject_type', type: 'string', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'comment', type: 'string', required: false },
            { name: 'created_at', type: 'date', required: true },
          ],
        },
      ],
    },
  },

};

/**
 * Detect which feature modules are relevant to a prompt.
 * Returns an array of matched module keys, ordered by relevance score.
 */
const detectFeatures = (tokens) => {
  const norm = tokens.map((t) => String(t).toLowerCase().trim()).filter((t) => t.length >= 3);
  const normText = norm.join(' ');

  const scored = Object.entries(FEATURE_MODULES).map(([key, module]) => {
    const score = module.keywords.reduce((count, kw) => {
      return count + (normText.includes(kw) ? 1 : 0);
    }, 0);
    return { key, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.key);
};

module.exports = { FEATURE_MODULES, detectFeatures };
