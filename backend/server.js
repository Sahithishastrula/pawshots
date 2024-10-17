const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const uploadPath = path.join(__dirname, 'uploads');
const processedPath = path.join(__dirname, 'processed');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

if (!fs.existsSync(processedPath)) {
  fs.mkdirSync(processedPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const filename = path.basename(filePath, path.extname(filePath));

    const transformations = [
      { suffix: '_cute1', width: 300, height: 300, rotate: 0 },
      { suffix: '_cute2', width: 300, height: 300, rotate: 90 },
      { suffix: '_cute3', width: 300, height: 300, rotate: 180 },
      { suffix: '_cute4', width: 300, height: 300, rotate: 270 },
    ];

    const processedImages = await Promise.all(
      transformations.map(async (transformation) => {
        const outputFilename = `${filename}${transformation.suffix}.jpg`;
        const outputPath = path.join(processedPath, outputFilename);
        await sharp(filePath)
          .resize(transformation.width, transformation.height)
          .rotate(transformation.rotate)
          .toFormat('jpeg')
          .toFile(outputPath);
        return `/processed/${outputFilename}`;
      })
    );

    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete file:', err);
    });

    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrls = processedImages.map((imgPath) => `${protocol}://${host}${imgPath}`);

    res.json({ images: imageUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing image' });
  }
});

app.use('/processed', express.static(processedPath));
app.use('/uploads', express.static(uploadPath));

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
