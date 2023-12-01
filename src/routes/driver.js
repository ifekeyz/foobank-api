const express = require('express');
const driverController = require('../controllers/Driver');
const router = express.Router();

router.post('/', driverController.register);
router.post('/login', driverController.login);
router.post('/deliveryPickup', driverController.deliveryPickup);
router.post('/deliveryDropoff', driverController.deliveryDropoff);
router.get('/getApprovedOrders', driverController.getApprovedOrders);

module.exports = router;