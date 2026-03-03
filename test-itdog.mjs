import puppeteer from 'puppeteer-core';

const token = process.env.BROWSERLESS_TOKEN;
const ws = `wss://chrome.browserless.io?token=${token}`;
console.log('Connecting to Browserless...');

try {
  const browser = await puppeteer.connect({ 
    browserWSEndpoint: ws,
    protocolTimeout: 60000
  });
  console.log('Connected!');
  const page = await browser.newPage();
  
  page.setDefaultNavigationTimeout(30000);
  
  console.log('Navigating to ITDOG...');
  const startTime = Date.now();
  
  try {
    const response = await page.goto('https://www.itdog.cn/http/', { 
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });
    console.log('Status:', response?.status());
    console.log('Time:', Date.now() - startTime, 'ms');
    const title = await page.title();
    console.log('Title:', title);
    
    // Check page content
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('Body:', bodyText);
  } catch(navErr) {
    console.error('Navigation error:', navErr.message);
    console.log('Time elapsed:', Date.now() - startTime, 'ms');
  }
  
  await browser.close();
} catch(e) {
  console.error('Error:', e.message);
}
