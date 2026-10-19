import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const key = 'jaringvisual.network.v1';
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
const graph = async (page: Page) => { const { entities, relations } = await stored(page); return { entities, relations }; };
const undo = (page: Page) => page.getByRole('button', { name: 'Urungkan', exact: true });
async function deleteEntity(page: Page) {
  await page.getByRole('button', { name: 'Hapus entitas', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, hapus', exact: true }).click();
}
async function restore(page: Page, before: unknown) {
  await page.reload();
  await expect(undo(page)).toBeEnabled();
  await undo(page).click();
  await expect.poll(() => graph(page)).toEqual(before);
  await expect(undo(page)).toBeDisabled();
  await page.reload();
  await expect(undo(page)).toBeDisabled();
  expect(await graph(page)).toEqual(before);
}
for (const mobile of [false, true]) {
  test.describe(mobile ? 'ponsel' : 'desktop', () => {
    test.use(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    test('hapus entitas dan semua hubungan, undo setelah reload hanya sekali', async ({ page }) => {
      await page.goto('/');
      const before = await graph(page);
      await expect(undo(page)).toBeDisabled();
      await deleteEntity(page);
      await restore(page, before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
    for (const detail of [false, true]) test(`hapus hubungan ${detail ? 'detail' : 'daftar'} lalu undo`, async ({ page }) => {
      await page.goto('/'); const before = await graph(page);
      if (detail) {
        await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
        await page.getByRole('button', { name: 'Hapus hubungan', exact: true }).click();
      } else await page.getByRole('button', { name: 'Hapus hubungan Andi dengan Budi', exact: true }).click();
      expect((await graph(page)).relations).toHaveLength(before.relations.length - 1);
      await restore(page, before);
    });
    test('reset dapat dibatalkan tanpa mengembalikan aksi sebelumnya', async ({ page }) => {
      await page.goto('/'); await deleteEntity(page); const before = await graph(page);
      await page.getByRole('button', { name: 'Reset contoh' }).click();
      await page.getByRole('button', { name: 'Reset jaringan', exact: true }).click();
      await restore(page, before);
    });
    test('drag bertahap menjadi satu aksi termasuk pointer sentuh', async ({ page }) => {
      await page.goto('/'); const before = await graph(page);
      const node = page.getByRole('button', { name: 'Orang Budi', exact: true });
      await node.scrollIntoViewIfNeeded();
      const box = (await node.locator('.node-shape').boundingBox())!;
      if (mobile) {
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 5; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 7, y: y + i * 5 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + 50, { steps: 8 }); await page.mouse.up();
      }
      await expect.poll(() => graph(page)).not.toEqual(before);
      await restore(page, before);
    });
  });
}
test('impor merge, ekspor tanpa history, impor invalid/kosong tidak menghabiskan undo', async ({ page }) => {
  await page.goto('/'); const before = await graph(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'merge.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(before)) });
  await expect(page.locator('.graph-node')).toHaveCount(24);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor data' }).click();
  const downloaded = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8'));
  expect(Object.keys(downloaded).sort()).toEqual(['entities', 'relations']);
  for (const content of ['{}', '{"entities":[],"relations":[]}']) {
    await page.locator('input[type=file]').setInputFiles({ name: 'noop.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await expect(undo(page)).toBeEnabled();
  }
  await restore(page, before);
});
test('data lama dan riwayat rusak tidak mengaktifkan undo', async ({ page }) => {
  await page.goto('/'); const before = await graph(page);
  for (const value of [before, { ...before, undo: { version: 1, previous: {} } }, { ...before, undo: { version: 99, previous: before } }]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
    await page.reload(); await expect(undo(page)).toBeDisabled(); expect(await graph(page)).toEqual(before);
  }
});
test('klik tanpa gerak dan drag terputus tidak mengganti undo sebelumnya', async ({ page }) => {
  await page.goto('/'); const before = await graph(page);
  await page.getByRole('button', { name: 'Hapus hubungan Andi dengan Budi', exact: true }).click();
  const after = await graph(page);
  const node = page.getByRole('button', { name: 'Orang Budi', exact: true });
  await node.click();
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + 50, { steps: 4 });
  await page.locator('svg.network-svg').dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  expect(await graph(page)).toEqual(after);
  await restore(page, before);
});
test('gagal localStorage tetap dapat undo di sesi dan menunjukkan peringatan', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
  await page.goto('/'); await deleteEntity(page);
  await expect(page.locator('.save-state')).toContainText('Belum tersimpan');
  await undo(page).click(); await expect(page.locator('.graph-node')).toHaveCount(12);
  await expect(undo(page)).toBeDisabled();
});
test('impor async memakai jaringan terbaru dan undo mempertahankan edit selama pembacaan', async ({ page }) => {
  await page.goto('/'); const original = await graph(page);
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>(resolve => {
        (window as unknown as { finishImport: () => void }).finishImport = () => { void read.call(file).then(resolve); };
      });
    };
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'delayed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original)) });
  await deleteEntity(page); const beforeImport = await graph(page);
  await page.evaluate(() => (window as unknown as { finishImport: () => void }).finishImport());
  await expect(page.locator('.graph-node')).toHaveCount(23);
  const merged = await graph(page);
  expect(new Set(merged.entities.map((e: { id: string }) => e.id)).size).toBe(23);
  await restore(page, beforeImport);
});
test('edit berikutnya mengganti slot undo, navigasi tidak menggantinya', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Atur panjang hubungan Andi dengan Budi', exact: true }).click();
  await page.getByLabel('Putus-putus', { exact: true }).check();
  const before = await graph(page);
  await page.getByRole('button', { name: 'Perpanjang garis', exact: true }).click();
  await page.getByRole('button', { name: 'Perbesar peta', exact: true }).click();
  await page.getByLabel('Cari entitas', { exact: true }).fill('Budi');
  await restore(page, before);
});
