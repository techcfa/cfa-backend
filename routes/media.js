const express = require('express');
const router = express.Router();
const Media = require('../models/Media');
const { auth, adminAuth } = require('../middleware/auth');
const { validateMedia } = require('../middleware/validation');
const { uploadSingle } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Media's unique identifier
 *         title:
 *           type: string
 *           description: Media title
 *         description:
 *           type: string
 *           description: Media description
 *         type:
 *           type: string
 *           enum: [article, video, podcast, update, alert]
 *           description: Type of media content
 *         content:
 *           type: string
 *           description: Media content (HTML/text)
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Media tags
 *         isPublished:
 *           type: boolean
 *           description: Whether media is published
 *         isBroadcast:
 *           type: boolean
 *           description: Whether media is broadcast to all users
 *         isActive:
 *           type: boolean
 *           description: Whether media is active
 *         viewCount:
 *           type: number
 *           description: Number of views
 *         createdBy:
 *           type: string
 *           description: Creator's ID
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMediaRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - type
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           example: "Cyber Security Best Practices"
 *         description:
 *           type: string
 *           example: "Learn about the latest cyber security practices"
 *         type:
 *           type: string
 *           enum: [article, video, podcast, update, alert]
 *           example: "article"
 *         content:
 *           type: string
 *           example: "<p>This is the content of the article...</p>"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["security", "cyber", "best-practices"]
 *         isPublished:
 *           type: boolean
 *           default: false
 *         isBroadcast:
 *           type: boolean
 *           default: false
 *     UpdateMediaRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [article, video, podcast, update, alert]
 *         content:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isPublished:
 *           type: boolean
 *         isBroadcast:
 *           type: boolean
 *     UploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "File uploaded successfully"
 *         fileUrl:
 *           type: string
 *           example: "/uploads/filename.jpg"
 *         filename:
 *           type: string
 *           example: "filename.jpg"
 *         originalName:
 *           type: string
 *           example: "original.jpg"
 *         size:
 *           type: number
 *           example: 1024
 */

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: Get all published media
 *     description: Retrieves all published and active media with pagination and filtering
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [article, video, podcast, update, alert]
 *         description: Filter by media type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *     responses:
 *       200:
 *         description: List of published media
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 media:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 totalPages:
 *                   type: number
 *                 currentPage:
 *                   type: number
 *                 total:
 *                   type: number
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get all published media (public)
router.get('/', async (req, res) => {
  try {
    const { type, page = 1, limit = 10, tag } = req.query;
    
    const query = { isPublished: true, isActive: true };
    if (type) query.type = type;
    if (tag) query.tags = { $in: [tag] };

    const media = await Media.find(query)
      .populate('createdBy', 'username')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Media.countDocuments(query);

    res.json({
      media,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get media by ID
 *     description: Retrieves a specific published media by ID and increments view count
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get media by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const media = await Media.findOne({ 
      _id: req.params.id, 
      isPublished: true, 
      isActive: true 
    }).populate('createdBy', 'username');

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Increment view count
    media.viewCount += 1;
    await media.save();

    res.json(media);
  } catch (error) {
    console.error('Get media by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/broadcast/updates:
 *   get:
 *     summary: Get broadcast updates
 *     description: Retrieves broadcast updates for subscribed users
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of broadcast updates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Media'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get broadcast updates (for subscribed users)
router.get('/broadcast/updates', auth, async (req, res) => {
  try {
    const updates = await Media.find({ 
      type: 'update', 
      isBroadcast: true, 
      isPublished: true, 
      isActive: true 
    })
    .populate('createdBy', 'username')
    .sort({ publishedAt: -1 })
    .limit(10);

    res.json(updates);
  } catch (error) {
    console.error('Get broadcast updates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media:
 *   post:
 *     summary: Create new media
 *     description: Creates a new media item (admin only)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMediaRequest'
 *     responses:
 *       201:
 *         description: Media created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Media created successfully"
 *                 media:
 *                   $ref: '#/components/schemas/Media'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Admin routes
// Create new media
router.post('/', adminAuth, validateMedia, async (req, res) => {
  try {
    const { title, description, type, content, tags, isPublished, isBroadcast } = req.body;

    const media = new Media({
      title,
      description,
      type,
      content,
      tags: tags || [],
      isPublished: isPublished || false,
      isBroadcast: isBroadcast || false,
      createdBy: req.admin._id,
      publishedAt: isPublished ? new Date() : null
    });

    await media.save();

    res.status(201).json({
      message: 'Media created successfully',
      media
    });
  } catch (error) {
    console.error('Create media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload media file
 *     description: Uploads a media file (admin only)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Upload media file
router.post('/upload', adminAuth, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   put:
 *     summary: Update media
 *     description: Updates an existing media item (admin only)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMediaRequest'
 *     responses:
 *       200:
 *         description: Media updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Media updated successfully"
 *                 media:
 *                   $ref: '#/components/schemas/Media'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Update media
router.put('/:id', adminAuth, validateMedia, async (req, res) => {
  try {
    const { title, description, type, content, tags, isPublished, isBroadcast } = req.body;

    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Update fields
    media.title = title;
    media.description = description;
    media.type = type;
    media.content = content;
    media.tags = tags || [];
    media.isPublished = isPublished || false;
    media.isBroadcast = isBroadcast || false;
    
    // Set publishedAt if publishing for the first time
    if (isPublished && !media.publishedAt) {
      media.publishedAt = new Date();
    }

    await media.save();

    res.json({
      message: 'Media updated successfully',
      media
    });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete media
 *     description: Soft deletes a media item (admin only)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Media deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Delete media
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Soft delete
    media.isActive = false;
    await media.save();

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/admin/all:
 *   get:
 *     summary: Get all media (admin)
 *     description: Retrieves all media items for admin management
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [article, video, podcast, update, alert]
 *         description: Filter by media type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, draft]
 *         description: Filter by publication status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of all media
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 media:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 totalPages:
 *                   type: number
 *                 currentPage:
 *                   type: number
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get all media (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    const query = { isActive: true };
    if (type) query.type = type;
    if (status === 'published') query.isPublished = true;
    if (status === 'draft') query.isPublished = false;

    const media = await Media.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Media.countDocuments(query);

    res.json({
      media,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/media/uploads/{filename}:
 *   get:
 *     summary: Serve uploaded file
 *     description: Serves an uploaded file by filename
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Filename to serve
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

module.exports = router; 