
import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// アップロード先フォルダ
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 許可する MIME
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type'));
  }
  cb(null, true);
};

// ファイル名をユニークに
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${basename}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ----------- ヘッダー認証ミドルウェア -----------
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization'];
  if (!token || token !== 'Bearer YOUR_SECRET_TOKEN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// フィールドごとに最大1ファイル
const uploadFields = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 }
]);

app.post('/upload', authMiddleware, uploadFields, (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const responseFiles = ['image1', 'image2', 'image3'].map((field) => {
    const file = files?.[field]?.[0];
    return file
      ? {
          field,
          originalname: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          savedPath: file.path
        }
      : null;
  });

  return res.json({
    message: 'uploaded',
    files: responseFiles,
    fields: req.body
  });
});

// エラーハンドラ
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.code, message: err.message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ error: err.name, message: err.message });
  }
  return res.status(500).json({ error: 'UnknownError' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
