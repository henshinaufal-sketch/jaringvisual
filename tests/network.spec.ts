import { expect, test, type Page } from '@playwright/test';
import { sampleNetwork, STORAGE_KEY } from '../src/data';

const data = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('jaringvisual.network.v1')!));
const openAdd = (page: Page) => page.getByRole('button', { name: 'Tambah entitas', exact: true }).click();

test('menampilkan sepuluh orang, kelompok, dan detail jaringan tanpa error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  for (const name of ['Andi', 'Budi', 'Cidi', 'Didi', 'Edi', 'Fredi', 'Gisdi', 'Haidi', 'Idi', 'Jedi']) {
    await expect(page.getByRole('button', { name: `Orang ${name}`, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Kelompok Studio Utara', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Orang Jedi', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Detail entitas' }).getByRole('heading', { name: 'Jedi', exact: true })).toBeVisible();
  expect((await data(page)).entities).toHaveLength(12);
  expect((await data(page)).relations).toHaveLength(18);
  await page.screenshot({ path: '/tmp/jaringvisual-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('menambahkan dan mengedit orang serta warna, bertahan setelah reload', async ({ page }) => {
  await page.goto('/');
  await openAdd(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Nama entitas/).fill('Naufal');
  await dialog.getByLabel(/Catatan/).fill('Perancang jaringan pertama.');
  await dialog.getByRole('radio', { name: 'Warna biru', exact: true }).check();
  await dialog.getByRole('button', { name: 'Tambah entitas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orang Naufal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit entitas' }).click();
  await dialog.getByLabel(/Nama entitas/).fill('Naufal Baru');
  await dialog.getByLabel('Warna kustom').fill('#112233');
  await dialog.getByLabel('Warna kustom').fill('#445566');
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Orang Naufal Baru', exact: true })).toBeVisible();
  expect((await data(page)).entities.find((e: { name: string }) => e.name === 'Naufal Baru')).toMatchObject({ color: '#445566', note: 'Perancang jaringan pertama.' });
});

test('menambahkan kelompok dan hubungan berarah, menolak diri sendiri dan duplikat', async ({ page }) => {
  await page.goto('/');
  await openAdd(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Kelompok/ }).check();
  await dialog.getByLabel(/Nama entitas/).fill('Tim Baru');
  await dialog.getByRole('button', { name: 'Tambah entitas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kelompok Tim Baru', exact: true })).toBeVisible();
  const group = (await data(page)).entities.find((e: { name: string }) => e.name === 'Tim Baru');
  await page.getByRole('button', { name: 'Tambah hubungan', exact: true }).click();
  await dialog.getByLabel('Dari entitas').selectOption('p0');
  await dialog.getByLabel('Ke entitas').selectOption('p0');
  await dialog.getByLabel(/Nama hubungan/).fill('Pendiri');
  await dialog.getByRole('button', { name: 'Simpan hubungan' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Pilih dua entitas yang berbeda.');
  await dialog.getByLabel('Ke entitas').selectOption(group.id);
  await dialog.getByRole('button', { name: 'Simpan hubungan' }).click();
  expect((await data(page)).relations).toContainEqual(expect.objectContaining({ source: 'p0', target: group.id, label: 'Pendiri' }));
  await page.getByRole('button', { name: 'Tambah hubungan', exact: true }).click();
  await dialog.getByLabel('Dari entitas').selectOption('p0');
  await dialog.getByLabel('Ke entitas').selectOption(group.id);
  await dialog.getByLabel(/Nama hubungan/).fill('Pendiri');
  await dialog.getByRole('button', { name: 'Simpan hubungan' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Hubungan ini sudah ada.');
});

test('pencarian, filter jenis, direktori, dan zoom berfungsi', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Cari entitas').fill('Haidi');
  await expect(page.locator('.graph-node')).toHaveCount(1);
  await page.getByLabel('Cari entitas').fill('Tidak ada');
  await expect(page.getByText('Entitas tidak ditemukan')).toBeVisible();
  await page.getByRole('button', { name: 'Hapus filter' }).click();
  await page.getByRole('button', { name: 'Kelompok', exact: true }).click();
  await expect(page.locator('.graph-node')).toHaveCount(2);
  await page.getByRole('button', { name: 'Perbesar peta' }).click();
  await expect(page.locator('.zoom-controls')).toContainText('120%');
  await page.getByRole('button', { name: 'Sesuaikan peta' }).click();
  await page.getByRole('button', { name: /Semua entitas/ }).click();
  await expect(page.locator('.entity-card')).toHaveCount(2);
  await page.getByRole('button', { name: /Studio Utara.*hubungan/ }).click();
  await expect(page.getByRole('complementary', { name: 'Detail entitas' }).getByRole('heading', { name: 'Studio Utara' })).toBeVisible();
});

test('menghapus entitas beserta hubungannya tanpa meninggalkan referensi putus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hapus entitas', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orang Andi', exact: true })).toHaveCount(0);
  const n = await data(page);
  expect(n.entities).toHaveLength(11);
  expect(n.relations.some((r: { source: string; target: string }) => r.source === 'p0' || r.target === 'p0')).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Orang Andi', exact: true })).toHaveCount(0);
});

test('ekspor dapat diimpor dan file rusak tidak mengganti data', async ({ page }) => {
  await page.goto('/');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor data' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('jaringvisual.json');
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.locator('.graph-node')).toHaveCount(24);
  const n = await data(page);
  expect(new Set(n.entities.map((e: { id: string }) => e.id)).size).toBe(24);
  expect(n.relations).toHaveLength(36);
  const ids = new Set(n.entities.map((e: { id: string }) => e.id));
  expect(n.relations.every((r: { source: string; target: string }) => ids.has(r.source) && ids.has(r.target))).toBe(true);
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"entities":[]}') });
  await expect(page.getByRole('status')).toContainText('Impor gagal');
  expect((await data(page)).entities).toHaveLength(24);
});

test('titik bisa digeser, posisi disimpan, dan reset memerlukan konfirmasi', async ({ page }) => {
  await page.goto('/');
  const node = page.getByRole('button', { name: 'Orang Budi', exact: true });
  const box = await node.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 25);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 45, box!.y + 50, { steps: 5 });
  await page.mouse.up();
  expect((await data(page)).entities.find((e: { id: string }) => e.id === 'p1').x).not.toBe(535);
  await page.getByRole('button', { name: 'Reset contoh' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click();
  expect((await data(page)).entities.find((e: { id: string }) => e.id === 'p1').x).not.toBe(535);
  await page.getByRole('button', { name: 'Reset contoh' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset jaringan' }).click();
  expect((await data(page)).entities.find((e: { id: string }) => e.id === 'p1').x).toBe(535);
});

test('layar ponsel dapat menambah orang tanpa meluap horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/jaringvisual-mobile.png', fullPage: true });
  await openAdd(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Nama entitas/).fill('Orang Seluler');
  await dialog.getByRole('button', { name: 'Tambah entitas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orang Orang Seluler', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('panjang garis menggeser tujuan, memperbarui garis terkait, dan bertahan setelah reload', async ({ page }) => {
  await page.goto('/');
  const before = await data(page);
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Detail hubungan' });
  await expect(panel.getByRole('heading', { name: 'Berteman', exact: true })).toBeVisible();
  await panel.getByRole('slider', { name: 'Panjang garis' }).focus();
  await page.keyboard.press('End');
  await expect(panel.locator('output')).toHaveText('600');
  const after = await data(page);
  const source = after.entities.find((e: { id: string }) => e.id === 'p0');
  const target = after.entities.find((e: { id: string }) => e.id === 'p1');
  expect(source).toEqual(before.entities.find((e: { id: string }) => e.id === 'p0'));
  expect(Math.hypot(target.x - source.x, target.y - source.y)).toBeCloseTo(600);
  expect(after.entities.filter((e: { id: string }) => e.id !== 'p1')).toEqual(before.entities.filter((e: { id: string }) => e.id !== 'p1'));
  const linkedEdge = page.getByRole('button', { name: 'Atur panjang hubungan Budi ke Cidi: Bekerja sama', exact: true }).locator('.edge-line');
  expect(Number(await linkedEdge.getAttribute('x1'))).toBeCloseTo(target.x);
  expect(Number(await linkedEdge.getAttribute('y1'))).toBeCloseTo(target.y);
  await page.reload();
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  await expect(panel.locator('output')).toHaveText('600');
  await panel.getByRole('slider', { name: 'Panjang garis' }).focus();
  await page.keyboard.press('Home');
  await expect(panel.locator('output')).toHaveText('80');
  await expect(panel.getByRole('button', { name: 'Perpendek garis' })).toBeDisabled();
  await panel.getByRole('button', { name: 'Perpanjang garis' }).click();
  await expect(panel.locator('output')).toHaveText('105');
});

test('klik garis membuka kontrol tanpa menggeser peta, dan hapus menutup detail hubungan', async ({ page }) => {
  await page.goto('/');
  const transform = await page.locator('.network-svg > g').getAttribute('transform');
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi ke Budi: Berteman', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Detail hubungan' });
  await expect(panel.getByRole('slider')).toBeVisible();
  await expect(page.locator('.network-svg > g')).toHaveAttribute('transform', transform!);
  await panel.getByRole('button', { name: 'Perpanjang garis' }).click();
  await panel.getByRole('button', { name: 'Lihat seluruh jaringan' }).click();
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Hapus hubungan', exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect((await data(page)).relations).toHaveLength(17);
});

test('tema pink mempertahankan data lama, warna kustom, dan koordinat bertumpuk bisa dipisahkan', async ({ page }) => {
  const saved = sampleNetwork();
  saved.entities[0] = { ...saved.entities[0], name: 'Andi Lama', note: 'Catatan milik pengguna', color: '#173829' };
  saved.entities[1] = { ...saved.entities[1], x: saved.entities[0].x, y: saved.entities[0].y };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: STORAGE_KEY, value: saved });
  await page.goto('/');
  expect(await data(page)).toEqual(saved);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 247, 251)');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(255, 228, 240)');
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi Lama dengan Budi', exact: true }).click();
  await page.getByRole('button', { name: 'Perpanjang garis' }).click();
  const updated = await data(page);
  const a = updated.entities[0], b = updated.entities[1];
  expect(a).toEqual(saved.entities[0]);
  expect(Number.isFinite(b.x) && Number.isFinite(b.y)).toBe(true);
  expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(80);
});

test('kontrol panjang garis dapat dipakai di ponsel tanpa overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Detail hubungan' });
  await panel.getByRole('button', { name: 'Perpanjang garis' }).click();
  await expect(panel.getByRole('slider')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/jaringvisual-pink-mobile.png', fullPage: true });
});
