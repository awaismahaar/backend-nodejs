import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp"); // Directory where files will be saved
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to original file name
    },
  });
  
  // Initialize Multer
export const upload = multer({ storage: storage });