const multer = require("multer");
const path = require("path");
const fs = require("fs");

function getUploadMiddleware(folderName = "general") {

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {

      // Get dynamic folder name from request body (default to 'general')
      let subFolderName = req.body.target || "general";
      subFolderName = subFolderName.replace(/[^a-zA-Z0-9_-]/g, ""); // sanitize input

      const uploadDir = path.join(__dirname, `../uploads/${folderName}/${subFolderName}`);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const uniqueName =
        Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf", "application/msword", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file format"), false);
  };

  return multer({ storage, fileFilter });
}

module.exports = getUploadMiddleware;
