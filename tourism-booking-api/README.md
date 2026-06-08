# Tourism Booking API

Tourism activity booking platform REST API with user authentication, activity management, image uploads, and booking system.

## Tech Stack
- Node.js + Express.js
- TypeScript
- PostgreSQL
- JWT authentication
- bcrypt for password hashing
- AWS S3 for image storage
- Sharp for image optimization
- Multer for file uploads

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Development

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build TypeScript
- `npm run typecheck` - Type check only
- `npm test` - Run tests with coverage

## Project Structure

- `src/routes/` - API endpoint routes
- `src/middleware/` - Express middleware (auth, validation, rate limiting)
- `src/services/` - Business logic (user service, auth service, etc.)
- `src/utils/` - Utility functions (validators, helpers)

## Implementation Status

### Phase 1: Foundation (COMPLETE)
- ✅ User authentication infrastructure
- ✅ JWT token generation & verification
- ✅ Password hashing with bcrypt

### Phase 2: Activity Management (COMPLETE)
- ✅ Activity CRUD operations (ESC-407)
  - POST /activities - Create activity
  - GET /activities/:id - Get activity
  - PATCH /activities/:id - Update activity
  - DELETE /activities/:id - Delete activity
  - GET /activities/search - Search and filter
- ✅ Image Upload (ESC-409)
  - POST /activities/:id/upload-image - Upload image
  - DELETE /activities/:id/images/:s3Key - Delete image
  - Image validation & optimization
  - S3 storage integration
  - CDN support

### Phase 3+
Coming soon...

## Database

Using PostgreSQL with the schema defined in `SQL_SCHEMA.md`. Run migrations with:

```bash
npm run db:migrate
```

## API Documentation

### Activity Management
- **Activity CRUD**: Create, read, update, delete activities
- **Search & Filter**: Full-text search, filtering by category/location/price

### Image Upload (ESC-409)
- **Upload images** for activities with automatic optimization
- **Multiple image versions**: Original, optimized (1200x800), thumbnail (200x200)
- **S3 storage** with CDN integration support
- **Image validation**: File type and size enforcement

See [IMAGE_UPLOAD_API.md](./IMAGE_UPLOAD_API.md) for complete image upload API documentation.

### Full API Spec
See `openapi.json` for full API specification.
