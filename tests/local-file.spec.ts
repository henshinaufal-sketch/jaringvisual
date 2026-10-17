import { expect, test, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const fileUrl = new URL('../JaringVisual.html', import.meta.url).href;
const fixtureUrl = 'http://127.0.0.1:4174/JaringVisual.html';
const appUrl = (info: TestInfo) => info.config.metadata.directFile ? fileUrl : fixtureUrl;

test.beforeEach(async ({ context }, info) => {
  if (!info.config.metadata.directFile) {
    // Exercise the exact distributed HTML in a stable origin without network.
    // The cloud's managed Chromium blocks file: navigation. Direct file mode
    // remains available separately on machines whose policy permits it.
    await context.route(fixtureUrl, route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: readFileSync(fileURLToPath(fileUrl)),
    }));
  }
});

test('bundle HTML berjalan offline dan data bertahan setelah dibuka ulang', async ({ page }, info) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && request.url() !== fixtureUrl) externalRequests.push(request.url()); });
  await page.goto(appUrl(info));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lihat hubungan');
  await expect(page.locator('.graph-node')).toHaveCount(12);
  await page.getByRole('button', { name: 'Tambah entitas', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Nama entitas/).fill('Naufal Offline');
  await dialog.getByRole('button', { name: 'Tambah entitas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orang Naufal Offline', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Orang Naufal Offline', exact: true })).toBeVisible();
  await page.goto('about:blank');
  await page.goto(appUrl(info));
  await expect(page.getByRole('button', { name: 'Orang Naufal Offline', exact: true })).toBeVisible();
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  await page.getByRole('slider', { name: 'Panjang garis' }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('.length-control output')).toHaveText('600');
  await page.getByRole('slider', { name: 'Ketebalan garis' }).focus();
  await page.keyboard.press('End');
  await page.getByRole('radio', { name: 'Putus-putus', exact: true }).check();
  await page.reload();
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  await expect(page.locator('.length-control output')).toHaveText('600');
  await expect(page.getByRole('slider', { name: 'Ketebalan garis' })).toHaveValue('8');
  await expect(page.getByRole('radio', { name: 'Putus-putus', exact: true })).toBeChecked();
  const fontCount = await page.evaluate(async () => (await document.fonts.load('400 14px Poppins')).length);
  expect(fontCount).toBeGreaterThan(0);
  await expect(page.locator('body')).toHaveCSS('font-family', /^Poppins,/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 247, 251)');
  await page.screenshot({ path: '/tmp/jaringvisual-lokal.png', fullPage: true });
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('hubungan dan ekspor impor berfungsi dari bundle HTML saat offline', async ({ page }, info) => {
  await page.goto(appUrl(info));
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('jaringvisual.network.v1')!));
  await page.getByRole('button', { name: 'Tambah hubungan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Dari entitas').selectOption('p0');
  await dialog.getByLabel('Ke entitas').selectOption('p3');
  await dialog.getByLabel(/Nama hubungan/).fill('Mitra offline');
  await dialog.getByRole('button', { name: 'Simpan hubungan' }).click();
  await expect(page.getByRole('status')).toContainText('Hubungan baru berhasil');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor data' }).click();
  const download = await downloaded;
  const file = await download.path();
  const exported = JSON.parse(readFileSync(file!, 'utf8'));
  expect(exported.relations).toHaveLength(before.relations.length + 1);
  expect(exported.relations).toContainEqual(expect.objectContaining({ source: 'p0', target: 'p3', label: 'Mitra offline' }));
  await page.locator('input[type=file]').setInputFiles(file!);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('jaringvisual.network.v1')!));
  expect(after.entities.length).toBe(before.entities.length * 2);
  expect(after.relations.length).toBe((before.relations.length + 1) * 2);
});

test('ZIP berisi HTML yang sama persis dengan versi yang diuji dan panduan penggunaan', () => {
  const zip = unzipSync(readFileSync(fileURLToPath(new URL('../JaringVisual-lokal.zip', import.meta.url))));
  const html = readFileSync(fileURLToPath(new URL('../JaringVisual.html', import.meta.url)));
  expect(Buffer.from(zip['JaringVisual.html']).equals(html)).toBe(true);
  expect(new TextDecoder().decode(zip['BACA-DULU.txt'])).toContain('CARA MEMBUKA');
  expect(Object.keys(zip).sort()).toEqual(['BACA-DULU.txt', 'JaringVisual.html']);
});
