import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getProducts(req: Request, res: Response) {
  const result = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  res.status(200).json(result);
}

export async function getProductById(req: Request, res: Response) {
  const id = Number(req.params.id);

  // id bukan bilangan bulat tidak mungkin ada di database.
  if (!Number.isSafeInteger(id)) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  res.status(200).json(product);
}

export async function createProduct(req: Request, res: Response) {
  const { name, price } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '' || !Number.isInteger(price)) {
    return res.status(400).json({ message: 'name (teks) dan price (angka) wajib diisi' });
  }

  // id dibuat oleh PostgreSQL (autoincrement), bukan counter di memori Express.
  const product = await prisma.product.create({ data: { name: name.trim(), price } });

  res.status(201).json(product);
}
