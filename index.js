const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createSheetHeaders, writeSheet } = require('./googleSheetService');

const app = express();

app.use(bodyParser.json()); // Parses incoming JSON requests
app.use(bodyParser.urlencoded({ extended: true })); // Parses form data
app.use(cookieParser()); // Parses cookies
app.use(cors()); // Enables CORS for all origins

const SPREADSHEET_ID = '1fsiaBNAbwX92V4nhO_UQUai9g_EvDyFGdx215DvZcdA'; // Your actual Sheet ID

// Create headers in the sheet (run once)
app.get('/create-headers', async (req, res) => {
  try {
    await createSheetHeaders(SPREADSHEET_ID);
    res.json({ message: 'Headers created' });
  } catch (error) {
    console.error('Error creating headers:', error);
    res.status(500).json({ error: 'Failed to create headers' });
  }
});

// Write form data to sheet
app.post('/submit-form', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, city, contactAs, helpType, message, preferredContact, bestTime } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !city || !message) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Optional fields can be empty strings if not provided
    const values = [[
      fullName,
      email,
      phoneNumber,
      city,
      contactAs || '',
      helpType || '',
      message,
      preferredContact || '',
      bestTime || ''
    ]];

    await writeSheet(SPREADSHEET_ID, values);

    res.json({ message: 'Data written to sheet' });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ error: 'Failed to write data to sheet' });
  }
});

const PORT = 5004;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));