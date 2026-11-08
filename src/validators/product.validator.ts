import { HttpError } from '../middleware/error-handler.js';

const MAX_INT = 2147483647; // batas tipe INTEGER PostgreSQL
const MAX_NAME_LENGTH = 100;

function validationError(errors: string[]) {
  return new HttpError(400, 'Validasi gagal', errors);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_INT;
}

// id dari path (/products/:id) selalu berupa string.
export function parseIdParam(value: string): number {
  const id = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!isPositiveInt(id)) {
    throw validationError(['id harus berupa bilangan bulat positif']);
  }
  return id;
}

function collectNamePriceErrors(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const { name, price } = body;

  if (typeof name !== 'string' || name.trim() === '') {
    errors.push('name wajib diisi berupa teks tidak kosong');
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.push(`name maksimal ${MAX_NAME_LENGTH} karakter`);
  }

  if (typeof price !== 'number' || !Number.isInteger(price)) {
    errors.push('price wajib diisi berupa bilangan bulat');
  } else if (price < 0 || price > MAX_INT) {
    errors.push(`price harus antara 0 dan ${MAX_INT}`);
  }

  return errors;
}

// POST /products: { name, price }
export function validateCreateProduct(body: unknown): { name: string; price: number } {
  if (!isPlainObject(body)) {
    throw validationError(['body harus berupa objek JSON dengan name dan price']);
  }

  const errors = collectNamePriceErrors(body);
  if (errors.length > 0) throw validationError(errors);

  return { name: (body.name as string).trim(), price: body.price as number };
}

// PUT /products: body sama dengan POST, ditambah id.
export function validateUpdateProduct(body: unknown): { id: number; name: string; price: number } {
  if (!isPlainObject(body)) {
    throw validationError(['body harus berupa objek JSON dengan id, name, dan price']);
  }

  const errors = collectNamePriceErrors(body);
  if (!isPositiveInt(body.id)) {
    errors.unshift('id wajib diisi berupa bilangan bulat positif');
  }
  if (errors.length > 0) throw validationError(errors);

  return { id: body.id as number, name: (body.name as string).trim(), price: body.price as number };
}
