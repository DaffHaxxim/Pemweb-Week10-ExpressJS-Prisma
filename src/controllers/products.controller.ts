import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Buku', price: 15000 },
  { id: 2, name: 'Pulpen', price: 5000 },
];

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

export function createProduct(req: Request, res: Response) {
  const { name, price } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '' || typeof price !== 'number') {
    return res.status(400).json({ message: 'name (teks) dan price (angka) wajib diisi' });
  }

  const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  const product: Product = { id: newId, name: name.trim(), price };
  products.push(product);

  res.status(201).json(product);
}
