// OpenAPI 3 specification: rendered by Swagger UI at /api/docs
const json = (schema) => ({ 'application/json': { schema } });
const ok = (description) => ({ description });
const errors = {
  400: { description: 'Validation failed' },
  401: { description: 'Missing or invalid access token' },
  403: { description: 'Not allowed' },
  404: { description: 'Not found' },
};
const secured = [{ bearerAuth: [] }];
const pathId = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const pathSlug = { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'goa' };
const q = (name, type, extra = {}) => ({ name, in: 'query', schema: { type, ...extra } });

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Travel Destination Platform API',
    version: '1.0.0',
    description:
      'REST API with JWT auth, RBAC, full-text search, cursor pagination, reviews, ' +
      'concurrency-safe bookings, Redis caching and rate limiting.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Health' }, { name: 'Auth' }, { name: 'Destinations' }, { name: 'Reviews' },
    { name: 'Packages & Bookings' }, { name: 'Admin' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Credentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'murlee@test.com' },
          password: { type: 'string', example: 'Travel123' },
        },
      },
      Register: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'New User' },
          email: { type: 'string', example: 'new@test.com' },
          password: { type: 'string', example: 'Travel123' },
        },
      },
      DestinationInput: {
        type: 'object',
        required: ['name', 'description', 'countryId', 'city', 'categoryIds'],
        properties: {
          name: { type: 'string', example: 'Rishikesh' },
          description: { type: 'string', example: 'Yoga capital of the world with river rafting on the Ganges.' },
          countryId: { type: 'integer', example: 1 },
          city: { type: 'string', example: 'Rishikesh' },
          latitude: { type: 'number', example: 30.0869 },
          longitude: { type: 'number', example: 78.2676 },
          bestTimeToVisit: { type: 'string', example: 'September to November' },
          categoryIds: { type: 'array', items: { type: 'integer' }, example: [4, 6] },
        },
      },
      ReviewInput: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', example: 'Amazing place!' },
        },
      },
      BookingInput: {
        type: 'object',
        required: ['departureId', 'seats'],
        properties: {
          departureId: { type: 'integer', example: 1 },
          seats: { type: 'integer', minimum: 1, maximum: 10, example: 2 },
        },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['Health'], summary: 'Server, database and cache status', responses: { 200: ok('Healthy') } } },

    '/auth/register': {
      post: { tags: ['Auth'], summary: 'Create an account', requestBody: { content: json({ $ref: '#/components/schemas/Register' }) },
        responses: { 201: ok('Created; refresh token set as httpOnly cookie'), 409: ok('Email already registered'), 429: ok('Too many requests') } },
    },
    '/auth/login': {
      post: { tags: ['Auth'], summary: 'Log in', requestBody: { content: json({ $ref: '#/components/schemas/Credentials' }) },
        responses: { 200: ok('Access token in body, refresh token in cookie'), 401: ok('Invalid email or password'), 429: ok('Too many failed attempts') } },
    },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token (uses cookie)', responses: { 200: ok('New tokens'), 401: ok('Invalid, expired or reused token') } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Revoke refresh token', responses: { 204: ok('Logged out') } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('User'), 401: errors[401] } } },

    '/destinations': {
      get: {
        tags: ['Destinations'], summary: 'Search with filters, sorting and cursor pagination',
        parameters: [
          q('q', 'string'), q('country', 'string', { example: 'IN' }), q('category', 'string', { example: 'beach,nature' }),
          q('minRating', 'number'), q('minPrice', 'number'), q('maxPrice', 'number'),
          q('sort', 'string', { enum: ['newest', 'rating', 'popular', 'name'] }),
          q('limit', 'integer', { default: 10 }), q('cursor', 'string'),
        ],
        responses: { 200: ok('List + meta.nextCursor (X-Cache header shows HIT/MISS)'), 400: errors[400] },
      },
      post: { tags: ['Destinations'], summary: 'Create (admin)', security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/DestinationInput' }) },
        responses: { 201: ok('Created'), 400: errors[400], 401: errors[401], 403: errors[403] } },
    },
    '/destinations/{slug}': {
      get: { tags: ['Destinations'], summary: 'Details with country, categories, images, packages', parameters: [pathSlug], responses: { 200: ok('Destination'), 404: errors[404] } },
    },
    '/destinations/{id}': {
      patch: { tags: ['Destinations'], summary: 'Partial update (admin)', security: secured, parameters: [pathId],
        requestBody: { content: json({ $ref: '#/components/schemas/DestinationInput' }) }, responses: { 200: ok('Updated'), 403: errors[403], 404: errors[404] } },
      delete: { tags: ['Destinations'], summary: 'Soft delete (admin)', security: secured, parameters: [pathId], responses: { 204: ok('Deleted'), 403: errors[403], 404: errors[404] } },
    },
    '/destinations/{id}/images': {
      post: { tags: ['Destinations'], summary: 'Upload images (admin, field "images", max 5 x 5 MB)', security: secured, parameters: [pathId],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } },
        responses: { 201: ok('Images saved'), 400: errors[400], 403: errors[403] } },
    },

    '/destinations/{slug}/reviews': {
      get: { tags: ['Reviews'], summary: 'Reviews, newest first (cursor pagination)', parameters: [pathSlug, q('limit', 'integer'), q('cursor', 'string')], responses: { 200: ok('Reviews') } },
    },
    '/destinations/{slug}/rating-summary': {
      get: { tags: ['Reviews'], summary: '5★ to 1★ distribution', parameters: [pathSlug], responses: { 200: ok('Summary') } },
    },
    '/destinations/{id}/reviews': {
      post: { tags: ['Reviews'], summary: 'Write a review (one per user)', security: secured, parameters: [pathId],
        requestBody: { content: json({ $ref: '#/components/schemas/ReviewInput' }) }, responses: { 201: ok('Created'), 409: ok('Already reviewed') } },
    },
    '/reviews/{id}': {
      patch: { tags: ['Reviews'], summary: 'Edit own review', security: secured, parameters: [pathId],
        requestBody: { content: json({ $ref: '#/components/schemas/ReviewInput' }) }, responses: { 200: ok('Updated'), 403: errors[403] } },
      delete: { tags: ['Reviews'], summary: 'Delete own review (or any, as admin)', security: secured, parameters: [pathId], responses: { 204: ok('Deleted'), 403: errors[403] } },
    },

    '/packages/{id}': {
      get: { tags: ['Packages & Bookings'], summary: 'Package with upcoming departures and seats left', parameters: [pathId], responses: { 200: ok('Package'), 404: errors[404] } },
    },
    '/bookings': {
      post: {
        tags: ['Packages & Bookings'], summary: 'Book seats (row-locked, no overbooking)', security: secured,
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, example: 'my-unique-key-123' }],
        requestBody: { content: json({ $ref: '#/components/schemas/BookingInput' }) },
        responses: { 201: ok('Booked'), 200: ok('Idempotent replay of an earlier request'), 409: ok('Sold out / not enough seats') },
      },
    },
    '/bookings/me': { get: { tags: ['Packages & Bookings'], summary: 'My bookings', security: secured, parameters: [q('status', 'string', { enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] })], responses: { 200: ok('Bookings') } } },
    '/bookings/{id}': { get: { tags: ['Packages & Bookings'], summary: 'One booking (owner or admin)', security: secured, parameters: [pathId], responses: { 200: ok('Booking'), 404: errors[404] } } },
    '/bookings/{id}/cancel': { post: { tags: ['Packages & Bookings'], summary: 'Cancel and release seats', security: secured, parameters: [pathId], responses: { 200: ok('Cancelled'), 409: ok('Already cancelled') } } },

    '/users': { get: { tags: ['Admin'], summary: 'List users', security: secured, parameters: [q('page', 'integer'), q('limit', 'integer')], responses: { 200: ok('Users'), 403: errors[403] } } },
    '/users/{id}/role': {
      patch: { tags: ['Admin'], summary: 'Change role', security: secured, parameters: [pathId],
        requestBody: { content: json({ type: 'object', properties: { role: { type: 'string', enum: ['user', 'admin'] } } }) }, responses: { 200: ok('Updated') } },
    },
    '/reports/top-rated': { get: { tags: ['Admin'], summary: 'Bayesian weighted ranking', security: secured, parameters: [q('minVotes', 'integer'), q('limit', 'integer')], responses: { 200: ok('Report') } } },
    '/reports/country-stats': { get: { tags: ['Admin'], summary: 'Per-country aggregates (LEFT JOIN + GROUP BY)', security: secured, responses: { 200: ok('Report') } } },
    '/reports/best-per-country': { get: { tags: ['Admin'], summary: 'Top destination per country (window function)', security: secured, responses: { 200: ok('Report') } } },
    '/reports/top-reviewers': { get: { tags: ['Admin'], summary: 'Most active reviewers (HAVING)', security: secured, parameters: [q('minReviews', 'integer')], responses: { 200: ok('Report') } } },
  },
};