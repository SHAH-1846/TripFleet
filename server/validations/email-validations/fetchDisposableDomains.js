const https = require('https');
const fs = require('fs');
const path = require('path');

const DOMAIN_LIST_URL =
  'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt';

const FILE_PATH = path.join(__dirname, 'disposable_email_blacklist.conf');

function fetchDisposableEmailDomains() {
  https.get(DOMAIN_LIST_URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to fetch domain list. Status code: ${res.statusCode}`);
      return;
    }

    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      fs.writeFile(FILE_PATH, data, (err) => {
        if (err) {
          console.error('Failed to write domain list to file:', err);
        } else {
          console.log('Disposable email domain list updated successfully.');
        }
      });
    });
  }).on('error', (err) => {
    console.error('Error fetching domain list:', err);
  });
}

// Run the function (for manual test)
if (require.main === module) {
  fetchDisposableEmailDomains();
}

module.exports = fetchDisposableEmailDomains;
