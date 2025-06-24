const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imagesController");
const getUploadMiddleware = require("../utils/uploadMiddleware");
const uploadImage = getUploadMiddleware("images");
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post("/upload", setAccessControl('*'), uploadImage.array("images", 10), imageController.uploadImage);

module.exports = router;