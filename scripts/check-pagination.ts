import puppeteer from 'puppeteer';

async function checkPagination() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  await page.goto('https://www.yamamotonutrition.com/int/blog/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  const paginationInfo = await page.evaluate(() => {
    // Chercher les éléments de pagination
    const paginationEl = document.querySelector('.pagination, .pager, .pages');
    const nextButton = document.querySelector('.next, .pagination .next, a[rel="next"]');
    const pageLinks = Array.from(document.querySelectorAll('.pagination a, .pages a, .pager a'));

    return {
      hasPagination: paginationEl !== null,
      hasNextButton: nextButton !== null,
      pageLinks: pageLinks.map(link => ({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim()
      })),
      paginationHTML: paginationEl?.outerHTML || 'Pas de pagination trouvée'
    };
  });

  console.log('Pagination info:', JSON.stringify(paginationInfo, null, 2));

  await browser.close();
}

checkPagination().catch(console.error);
