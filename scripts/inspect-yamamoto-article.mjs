import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function inspectPage(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  console.log(`🔍 Inspecting: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait a bit for JS to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  const pageStructure = await page.evaluate(() => {
    // Get the HTML of the main content
    const bodyHTML = document.body.innerHTML;

    // Find all possible content containers
    const possibleContainers = [
      ...document.querySelectorAll('article'),
      ...document.querySelectorAll('[class*="post"]'),
      ...document.querySelectorAll('[class*="blog"]'),
      ...document.querySelectorAll('[class*="content"]'),
      ...document.querySelectorAll('main'),
    ];

    const containers = possibleContainers.map(el => ({
      tag: el.tagName,
      classes: el.className,
      id: el.id,
      textLength: el.innerText?.length || 0,
      firstText: el.innerText?.substring(0, 100) || ''
    }));

    return {
      title: document.title,
      containers: containers.filter(c => c.textLength > 100),
      bodyLength: bodyHTML.length
    };
  });

  await browser.close();
  return pageStructure;
}

const url = 'https://www.yamamotonutrition.com/int/blog/post/ashwagandha-a-valuable-ally-against-stress-a1952';

try {
  const structure = await inspectPage(url);
  console.log('\n📊 PAGE STRUCTURE:');
  console.log(JSON.stringify(structure, null, 2));

  writeFileSync('yamamoto-page-structure.json', JSON.stringify(structure, null, 2));
  console.log('\n✅ Saved to yamamoto-page-structure.json');

} catch (error) {
  console.error('❌ Inspection failed:', error.message);
  process.exit(1);
}
