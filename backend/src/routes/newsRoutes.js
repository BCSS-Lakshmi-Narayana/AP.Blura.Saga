const express = require('express');
const router  = express.Router();
const { getArticles, getStats } = require('../controllers/newsController');
const { protect } = require('../middleware/authMiddleware');
const { loadScope } = require('../middleware/scopeMiddleware');

router.get('/',       protect, loadScope, getArticles);
router.get('/stats',  protect, loadScope, getStats);

module.exports = router;
