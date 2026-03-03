import puppeteer from 'puppeteer-core';

const token = process.env.BROWSERLESS_TOKEN;
console.log('Token exists:', !!token);
console.log('Token prefix:', token?.substring(0, 8));

const ws = `wss://chrome.browserless.io?token=${token}`;
console.log('Connecting to Browserless...');

try {
  const browser = await puppeteer.connect({ 
    browserWSEndpoint: ws,
    protocolTimeout: 15000
  });
  console.log('Connected!');
  const page = await browser.newPage();
  await page.goto('https://www.google.com', { timeout: 10000 });
  console.log('Page loaded:', await page.title());
  await browser.close();
  console.log('SUCCESS');
} catch(e) {
  console.error('Error:', e.message);
}
