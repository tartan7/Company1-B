# Image Upload API Documentation

## Overview

The Image Upload feature allows activity operators to upload, manage, and optimize images for their activities. Images are automatically validated, optimized, and stored in AWS S3 with CDN integration support.

## Features

- **Image Validation**: Supports JPEG, PNG, WebP, AVIF formats with 10MB size limit
- **Image Optimization**: Automatic resizing and compression using Sharp
- **S3 Storage**: AWS SDK v3 integration for reliable cloud storage
- **CDN Integration**: Support for custom CDN URLs for fast image delivery
- **Multiple Versions**: Stores original, optimized (1200x800), and thumbnail (200x200) versions

## Environment Configuration

Required environment variables:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=tourism-booking-images

# Optional CDN Configuration
CDN_URL=https://cdn.example.com
```

## API Endpoints

### Upload Image

**POST** `/activities/:id/upload-image`

Upload a new image for an activity. Only the activity operator can upload images.

#### Request

- **Authentication**: Required (Bearer token)
- **Content-Type**: multipart/form-data
- **Authorization**: Operator only

```bash
curl -X POST http://localhost:3000/activities/activity_123/upload-image \
  -H "Authorization: Bearer <jwt-token>" \
  -F "image=@/path/to/image.jpg"
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| image | File | Yes | Image file (JPEG, PNG, WebP, AVIF) |

#### Response

**201 Created**

```json
{
  "message": "Image uploaded successfully",
  "image": {
    "originalUrl": "https://cdn.example.com/activities/activity_123/original_1234567890.webp",
    "optimizedUrl": "https://cdn.example.com/activities/activity_123/optimized_1234567890.webp",
    "thumbnail": "https://cdn.example.com/activities/activity_123/thumbnail_1234567890.webp",
    "s3Key": "activities/activity_123/optimized_1234567890.webp"
  },
  "activity": {
    "id": "activity_123",
    "title": "Mountain Hiking Tour",
    "description": "...",
    "images": [
      {
        "originalUrl": "https://cdn.example.com/activities/activity_123/original_1234567890.webp",
        "optimizedUrl": "https://cdn.example.com/activities/activity_123/optimized_1234567890.webp",
        "thumbnail": "https://cdn.example.com/activities/activity_123/thumbnail_1234567890.webp",
        "s3Key": "activities/activity_123/optimized_1234567890.webp"
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request** - No image provided

```json
{
  "error": "No image file provided"
}
```

**400 Bad Request** - Invalid file type

```json
{
  "error": "File type application/pdf is not allowed. Allowed types: image/jpeg, image/png, image/webp, image/avif"
}
```

**400 Bad Request** - File too large

```json
{
  "error": "File size exceeds 10MB limit"
}
```

**403 Forbidden** - Not the activity operator

```json
{
  "error": "Only the activity operator can upload images"
}
```

**404 Not Found** - Activity not found

```json
{
  "error": "Activity not found"
}
```

**503 Service Unavailable** - S3 not configured

```json
{
  "error": "S3 is not configured. Image upload is currently unavailable."
}
```

### Delete Image

**DELETE** `/activities/:id/images/:s3Key`

Remove an image from an activity. Only the activity operator can delete images.

#### Request

- **Authentication**: Required (Bearer token)
- **Authorization**: Operator only

```bash
curl -X DELETE http://localhost:3000/activities/activity_123/images/activities%2Factivity_123%2Foptimized_1234567890.webp \
  -H "Authorization: Bearer <jwt-token>"
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| s3Key | String | Yes | S3 key of the image (URL encoded) |

#### Response

**200 OK**

```json
{
  "message": "Image removed successfully",
  "activity": {
    "id": "activity_123",
    "title": "Mountain Hiking Tour",
    "images": []
  }
}
```

#### Error Responses

**403 Forbidden** - Not the activity operator

```json
{
  "error": "Unauthorized: only the activity operator can remove images"
}
```

**404 Not Found** - Activity not found

```json
{
  "error": "Activity not found"
}
```

## Image Optimization Specifications

### Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- AVIF (.avif)

### Size Limits

- Maximum file size: 10MB
- Recommended: < 5MB for optimal upload speed

### Optimized Versions

1. **Original**: Compressed to WebP, original aspect ratio preserved
2. **Optimized**: 1200x800px, cover crop, 80% quality
3. **Thumbnail**: 200x200px, cover crop, 75% quality

All images are converted to WebP format for optimal compression and compatibility.

## Activity Data Structure

Updated Activity type includes images array:

```typescript
type ActivityImage = {
  originalUrl: string;      // Full resolution image
  optimizedUrl: string;     // 1200x800 optimized version
  thumbnail: string;        // 200x200 thumbnail
  s3Key: string;           // S3 bucket key for deletion
};

type Activity = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  location: string;
  operatorId: string;
  maxParticipants: number;
  images?: ActivityImage[];  // Array of uploaded images
  createdAt: Date;
  updatedAt: Date;
};
```

## Integration Guide

### For Frontend Applications

1. Use a file input or drag-and-drop interface to select images
2. Send multipart/form-data POST request to `/activities/:id/upload-image`
3. Include JWT token in Authorization header
4. Display uploaded image URLs from the response
5. Store the activity with images array

Example:

```typescript
const uploadImage = async (activityId: string, file: File, token: string) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `/activities/${activityId}/upload-image`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  return response.json();
};
```

### S3 Bucket Configuration

Required S3 bucket settings:

1. **Public Read Access**: Images should be publicly readable for CDN delivery
2. **CORS Configuration**: If serving from different domain
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["*"],
         "AllowedMethods": ["GET"],
         "AllowedHeaders": ["*"]
       }
     ]
   }
   ```
3. **Lifecycle Policies**: Optional - automatically delete old images after X days

### CDN Configuration

Use CloudFront or similar CDN to cache images:

1. Set `CDN_URL` environment variable to your CDN domain
2. Images will be served through CDN instead of direct S3 URL
3. Implements automatic caching with long expiration headers

Example CDN URL:
```
CDN_URL=https://images-cdn.example.com
```

Images will be served as:
```
https://images-cdn.example.com/activities/activity_123/optimized_1234567890.webp
```

## Performance Considerations

- **Upload Time**: 1-2MB files typically < 2 seconds with 4G/LTE
- **Processing Time**: Sharp optimization typically < 500ms
- **Storage**: Original + optimized + thumbnail ≈ 30-40% of original file size
- **Delivery**: CDN recommended for global distribution (< 200ms latency)

## Security Features

- **File Type Validation**: MIME type and magic byte verification
- **Size Limits**: Maximum 10MB to prevent DoS
- **Authorization**: Only activity operators can upload/delete
- **S3 Access**: Restricted to service account with least privilege
- **URL Encoding**: S3 keys properly encoded in URLs

## Future Enhancements

- [ ] Batch upload multiple images
- [ ] Image watermarking for branding
- [ ] EXIF data preservation/removal
- [ ] Webp conversion fallback for older browsers
- [ ] Image rotation/cropping UI
- [ ] Cloudinary integration as S3 alternative
- [ ] On-the-fly image filtering (blur, grayscale, etc.)
