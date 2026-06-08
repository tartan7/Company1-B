import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
const IMAGE_VALIDATION = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
};
const RESIZE_SIZES = {
    thumbnail: { width: 200, height: 200 },
    optimized: { width: 1200, height: 800 },
};
export class ImageService {
    constructor(config) {
        this.s3Client = null;
        this.config = config;
        if (config.accessKeyId && config.secretAccessKey) {
            this.s3Client = new S3Client({
                region: config.region,
                credentials: {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                },
            });
        }
    }
    validateImage(file) {
        // Check file size
        if (file.size > IMAGE_VALIDATION.maxSize) {
            return { valid: false, error: `File size exceeds ${IMAGE_VALIDATION.maxSize / (1024 * 1024)}MB limit` };
        }
        // Check MIME type
        if (!IMAGE_VALIDATION.allowedMimeTypes.includes(file.mimetype)) {
            return { valid: false, error: `File type ${file.mimetype} is not allowed` };
        }
        return { valid: true };
    }
    async processImage(file, activityId) {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        // Generate optimized version
        const optimized = await sharp(file.buffer)
            .resize(RESIZE_SIZES.optimized.width, RESIZE_SIZES.optimized.height, {
            fit: 'cover',
            position: 'center',
        })
            .webp({ quality: 80 })
            .toBuffer();
        // Generate thumbnail
        const thumbnail = await sharp(file.buffer)
            .resize(RESIZE_SIZES.thumbnail.width, RESIZE_SIZES.thumbnail.height, {
            fit: 'cover',
            position: 'center',
        })
            .webp({ quality: 75 })
            .toBuffer();
        return {
            original: file.buffer,
            optimized,
            thumbnail,
        };
    }
    generateS3Key(activityId, variant) {
        const timestamp = Date.now();
        return `activities/${activityId}/${variant}_${timestamp}.webp`;
    }
    async uploadToS3(processedImages, activityId) {
        if (!this.s3Client) {
            throw new Error('S3 client not configured');
        }
        const uploadImage = async (buffer, variant) => {
            const key = this.generateS3Key(activityId, variant);
            const command = new PutObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
                Body: buffer,
                ContentType: 'image/webp',
                ACL: 'public-read',
            });
            await this.s3Client.send(command);
            return key;
        };
        try {
            const [originalKey, optimizedKey, thumbnailKey] = await Promise.all([
                uploadImage(processedImages.original, 'original'),
                uploadImage(processedImages.optimized, 'optimized'),
                uploadImage(processedImages.thumbnail, 'thumbnail'),
            ]);
            const baseUrl = this.config.cdnUrl || `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com`;
            return {
                originalUrl: `${baseUrl}/${originalKey}`,
                optimizedUrl: `${baseUrl}/${optimizedKey}`,
                thumbnail: `${baseUrl}/${thumbnailKey}`,
                s3Key: optimizedKey,
            };
        }
        catch (error) {
            throw new Error(`Failed to upload images to S3: ${error}`);
        }
    }
    async deleteFromS3(s3Key) {
        if (!this.s3Client) {
            throw new Error('S3 client not configured');
        }
        const command = new DeleteObjectCommand({
            Bucket: this.config.bucketName,
            Key: s3Key,
        });
        await this.s3Client.send(command);
    }
    async uploadImage(file, activityId) {
        // Validate image
        const validation = this.validateImage(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        // Process image (resize, optimize)
        const processedImages = await this.processImage(file, activityId);
        // Upload to S3
        const uploadResult = await this.uploadToS3(processedImages, activityId);
        return uploadResult;
    }
}
