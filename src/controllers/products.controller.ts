import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error-handler.js';
import { parseIdParam, validateCreateProduct } from '../validators/product.validator.js';

export async function getProducts(req: Request, res: Response) {
  const result = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  res.status(200).json(result);
}

export async function getProductById(req: Request, res: Response) {
  const id = parseIdParam(String(req.params.id));
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new HttpError(404, 'Produk tidak ditemukan');
  }

  res.status(200).json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = validateCreateProduct(req.body);

  // id dibuat oleh PostgreSQL (autoincrement), bukan counter di memori Express.
  const product = await prisma.product.create({ data });

  res.status(201).json(product);
}
