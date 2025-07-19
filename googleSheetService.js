const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: './google_auth.json', // Path to your service account key file (or fetch via getSecrets in prod)
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

const createSheetHeaders = async (spreadsheetId) => {
  const headers = [['Full Name', 'Email ID', 'Phone Number', 'City', 'Contacting As', 'Help Type', 'Message', 'Preferred Mode', 'Best Time']];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1:I1', // Updated range for 9 columns
    valueInputOption: 'RAW',
    requestBody: {
      values: headers
    }
  });

  console.log('Headers created');
};

const writeSheet = async (spreadsheetId, values) => {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A:I', // Updated range for 9 columns
    valueInputOption: 'RAW',
    requestBody: {
      values
    }
  });

  console.log('Data written:', response.data);
};

module.exports = { createSheetHeaders, writeSheet };