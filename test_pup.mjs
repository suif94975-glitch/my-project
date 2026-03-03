import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto('https://boce.aliyun.com/detect/http', { waitUntil: 'networkidle2', timeout: 30000 });

// 等待input#url1出现
await page.waitForSelector('#url1', { timeout: 15000 });
console.log('input#url1 found!');

// 填写域名
await page.focus('#url1');
await page.keyboard.type('baidu.com');

// 找到立即检测按钮
const btn = await page.$x("//button[contains(text(),'立即检测') or contains(text(),'OK')]");
if (btn.length > 0) {
  console.log('button found, clicking...');
  await btn[0].click();
} else {
  console.log('button NOT found');
}

await page.waitForTimeout(3000);
const title = await page.title();
console.log('title:', title);
await page.screenshot({ path: '/tmp/aliyun_test.png' });
console.log('screenshot saved');
await browser.close();
