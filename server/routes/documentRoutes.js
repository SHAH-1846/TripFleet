const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const getUploadMiddleware = require("../utils/uploadMiddleware");
const uploadDoc = getUploadMiddleware("documents");
const access_control = require('../utils/access-control').accessControl;

const setAccessControl = (access_type) => {
    return (req, res, next) => {
        access_control(access_type, req, res, next);
    }
}

router.post("/upload", setAccessControl("*"), uploadDoc.array("documents", 10), documentController.uploadDoc);
router.delete("/:id", setAccessControl("*"), documentController.deleteDocumentById);

module.exports = router;