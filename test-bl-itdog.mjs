import puppeteer from 'puppeteer-core';

const token = process.env.BROWSERLESS_TOKEN;
const ws = `wss://chrome.browserless.io?token=${token}`;
console.log('Connecting...');

const browser = await puppeteer.connect({ 
  browserWSEndpoint: ws,
  protocolTimeout: 60000
});
console.log('Connected!');
const page = await browser.newPage();
page.setDefaultNavigationTimeout(30000);

console.log('Navigating to ITDOG...');
const t0 = Date.now();
try {
  const resp = await page.goto('https://www.itdog.cn/http/rx6dhz.vip:8005/', { 
    timeout: 30000,
    waitUntil: 'domcontentloaded'
  });
  console.log('Status:', resp?.status(), 'Time:', Date.now()-t0, 'ms');
  const title = await page.title();
  console.log('Title:', title);
} catch(e) {
  console.error('Nav error:', e.message, 'after', Date.now()-t0, 'ms');
}
await browser.close();
