const aws4 = require('aws4');
const https = require('https');
require('dotenv').config();

function getItemByAsin(asin) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      ItemIds: [asin],
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price'
      ],
      PartnerTag: process.env.PAAPI_PARTNER_TAG,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.it'
    });

    const opts = {
      host: process.env.PAAPI_HOST,
      path: '/paapi5/getitems',
      region: process.env.PAAPI_REGION,
      service: 'ProductAdvertisingAPI',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'amz-1.0',
        'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
      },
      body: payload
    };

    aws4.sign(opts, {
      accessKeyId: process.env.PAAPI_ACCESS_KEY,
      secretAccessKey: process.env.PAAPI_SECRET_KEY
    });

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Risposta non valida dalla PA-API: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { getItemByAsin };
