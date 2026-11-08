import type { NextFunction, Request, Response } from 'express';

// Error yang sengaja dilempar aplikasi dengan status HTTP tertentu.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: string[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} tidak ditemukan` });
}

// Express 5 meneruskan error dari handler async ke middleware ini secara otomatis.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err as { type?: string; code?: string; status?: number };

  // Body bukan JSON valid (dilempar oleh express.json()).
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Body bukan JSON yang valid' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Body terlalu besar' });
  }

  if (err instanceof HttpError) {
    const body: { message: string; errors?: string[] } = { message: err.message };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }

  // Kode Prisma P2025: data yang akan diubah atau dihapus tidak ditemukan.
  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  // Detail error hanya dicatat di log server, tidak dikirim ke client.
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server' });
}
