const express = require('express');
const router = express.Router();
const { listVoterProfiles, getVoterProfile } = require('../controllers/voterProfileController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, listVoterProfiles);
router.get('/:constituency', protect, getVoterProfile);

module.exports = router;
