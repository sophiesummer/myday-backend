const express = require('express');
const {
  createSeries,
  getUserSeries,
  querySeries,
  getSeriesById,
  updateSeriesById,
  deleteSeriesById,
} = require('../controllers/seriesController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

router.use(verifyFirebaseToken);

router.get('/user', getUserSeries);
router.get('/', querySeries);
router.get('/:id', getSeriesById);
router.post('/', createSeries);
router.put('/:id', updateSeriesById);
router.delete('/:id', deleteSeriesById);

module.exports = router;

