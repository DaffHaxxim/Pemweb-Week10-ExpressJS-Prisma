import type { Request, Response } from 'express';

export function getHello(req: Request, res: Response) {
  const nama = typeof req.query.nama === 'string' ? req.query.nama : 'World';
  res.status(200).json({
    message: `Halo, ${nama}!`,
  });
}
