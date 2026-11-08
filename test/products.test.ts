import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, describe, it } from 'node:test';
import { prisma } from '../src/lib/prisma.js';

// Pengujian integrasi: server Express dijalankan sebagai proses terpisah dan
// berbicara dengan PostgreSQL asli. Setiap produk yang dibuat pengujian dicatat
// lalu dihapus di akhir; tabel tidak dikosongkan.
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const createdIds: number[] = [];

let server: ChildProcess;

async function startServer(): Promise<ChildProcess> {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise<void>((resolve, reject) => {
    child.once('exit', () => reject(new Error('server berhenti sebelum siap')));
    child.stdout?.on('data', (chunk) => String(chunk).includes('Server berjalan') && resolve());
  });
  return child;
}

async function stopServer(child: ChildProcess) {
  child.kill();
  await once(child, 'exit');
}

async function call(method: string, path: string, body?: unknown, rawBody?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function createProduct(name: string, price: number) {
  const res = await call('POST', '/products', { name, price });
  assert.equal(res.status, 201);
  createdIds.push(res.json.id);
  return res.json as { id: number; name: string; price: number };
}

before(async () => {
  server = await startServer();
});

after(async () => {
  await stopServer(server);
  await prisma.product.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe('GET /products', () => {
  it('mengembalikan 200 dan array produk', async () => {
    const res = await call('GET', '/products');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });

  it('GET /products/:id mengembalikan produk hasil POST (bukan asumsi id 1)', async () => {
    const created = await createProduct('Uji GET id', 4200);
    const res = await call('GET', `/products/${created.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, created);
  });

  it('mengembalikan 404 untuk id yang tidak ada dan 400 untuk id tidak valid', async () => {
    const missing = await call('GET', '/products/2147483647');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.message, 'Produk tidak ditemukan');

    for (const bad of ['abc', '0', '-1', '1.5']) {
      assert.equal((await call('GET', `/products/${bad}`)).status, 400, `id ${bad}`);
    }
  });
});

describe('POST /products', () => {
  it('menyimpan produk dan memberi dua produk id database yang berbeda', async () => {
    const a = await createProduct('Uji POST A', 1000);
    const b = await createProduct('Uji POST B', 2000);
    assert.notEqual(a.id, b.id);
    assert.equal(b.id > a.id, true);
  });

  it('memangkas spasi pada name', async () => {
    const created = await createProduct('  Uji trim  ', 500);
    assert.equal(created.name, 'Uji trim');
  });

  it('mengembalikan 400 untuk data tidak valid', async () => {
    const cases: unknown[] = [
      {},
      { name: 'Tanpa harga' },
      { price: 1000 },
      { name: '', price: 1000 },
      { name: 'Harga teks', price: '1000' },
      { name: 'Harga desimal', price: 1.5 },
      { name: 'Harga negatif', price: -1 },
      { name: 'x'.repeat(101), price: 1 },
      [],
    ];
    for (const body of cases) {
      const res = await call('POST', '/products', body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.json.message, 'Validasi gagal');
      assert.ok(Array.isArray(res.json.errors) && res.json.errors.length > 0);
    }
  });

  it('mengembalikan 400 untuk body yang bukan JSON valid', async () => {
    const res = await call('POST', '/products', undefined, '{"name": "rusak"');
    assert.equal(res.status, 400);
    assert.equal(res.json.message, 'Body bukan JSON yang valid');
  });
});

describe('PUT /products', () => {
  it('mengubah produk berdasarkan id pada body', async () => {
    const created = await createProduct('Uji PUT lama', 1000);
    const res = await call('PUT', '/products', { id: created.id, name: 'Uji PUT baru', price: 2500 });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { id: created.id, name: 'Uji PUT baru', price: 2500 });

    const check = await call('GET', `/products/${created.id}`);
    assert.deepEqual(check.json, res.json);
  });

  it('mengembalikan 404 untuk id yang tidak ada dan 400 untuk data tidak valid', async () => {
    const missing = await call('PUT', '/products', { id: 2147483647, name: 'Hantu', price: 1 });
    assert.equal(missing.status, 404);

    assert.equal((await call('PUT', '/products', { name: 'Tanpa id', price: 1 })).status, 400);
    assert.equal((await call('PUT', '/products', { id: 'x', name: 'Id teks', price: 1 })).status, 400);
    assert.equal((await call('PUT', '/products', { id: 1, name: '', price: 1 })).status, 400);
  });
});

describe('DELETE /products/:id', () => {
  it('menghapus produk lalu GET mengembalikan 404', async () => {
    const created = await createProduct('Uji DELETE', 300);
    const res = await call('DELETE', `/products/${created.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.product, created);

    assert.equal((await call('GET', `/products/${created.id}`)).status, 404);
  });

  it('mengembalikan 404 untuk id yang sudah terhapus dan 400 untuk id tidak valid', async () => {
    const created = await createProduct('Uji DELETE dua kali', 300);
    assert.equal((await call('DELETE', `/products/${created.id}`)).status, 200);
    assert.equal((await call('DELETE', `/products/${created.id}`)).status, 404);
    assert.equal((await call('DELETE', '/products/abc')).status, 400);
  });
});

describe('route tidak dikenal', () => {
  it('mengembalikan 404 berformat JSON', async () => {
    const res = await call('GET', '/tidak-ada');
    assert.equal(res.status, 404);
    assert.match(res.json.message, /tidak ditemukan/);
  });
});

describe('persistensi setelah Express dimulai ulang', () => {
  it('produk hasil POST masih ada setelah proses Express dimatikan dan dijalankan lagi', async () => {
    const created = await createProduct('Uji restart', 7777);

    await stopServer(server);
    await assert.rejects(fetch(`${BASE}/products`), 'server harus mati');

    server = await startServer();
    const res = await call('GET', `/products/${created.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, created);
  });
});
