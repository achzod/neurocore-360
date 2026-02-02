declare module "jsonwebtoken";
declare module "multer";
declare module "pdf-parse";

declare namespace Express {
  interface Request {
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    };
    files?: unknown;
  }
}
