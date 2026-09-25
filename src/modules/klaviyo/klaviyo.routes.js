const express = require("express");
const validate = require("../../core/middleware/validation.middleware");
const controller = require("./klaviyo.controller");
const { subscribeSchema } = require("./klaviyo.validator");

const router = express.Router();

router.post("/subscribe", validate(subscribeSchema), controller.subscribe);

module.exports = router;
