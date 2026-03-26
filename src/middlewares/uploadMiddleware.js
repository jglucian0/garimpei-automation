const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tempDir = path.resolve(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `front_upload_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

module.exports = upload;