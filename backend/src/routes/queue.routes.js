const express = require('express');
const classificationController = require('../controllers/classification.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { USER_ROLES } = require('../constants/enums');

const router = express.Router();

// All queue management endpoints require Admin or Support roles
router.use(protect);
router.use(restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT));

// 1. List Queue Jobs
router.get('/jobs', classificationController.listQueueJobs);

// 2. Get Single Queue Job
router.get('/jobs/:id', classificationController.getQueueJobById);

// 3. Manually Trigger Queue Processing Batch
router.post('/process', classificationController.triggerProcessQueue);

module.exports = router;
