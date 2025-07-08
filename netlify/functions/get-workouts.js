// netlify/functions/get-workouts.js

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; 
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Läsbehörighet
});

// Här är den viktiga raden: exports.handler
exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed - Use GET' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Läs upp till t.ex. 200 rader för att vara säker på att få tillräckligt med data för att filtrera de senaste 20
    // Anpassa intervallet 'A:G' baserat på hur många kolumner du använder
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:G', // Justera detta om du har fler/färre kolumner som ska läsas
    });

    const values = response.data.values || [];

    // Anta att första raden är headers
    const headers = values[0];
    const dataRows = values.slice(1);

    // Konvertera rader till objekt för enklare hantering
    const workouts = dataRows.map(row => {
      let workout = {};
      headers.forEach((header, index) => {
        workout[header] = row[index];
      });
      return workout;
    });

    // Sortera efter Datum & Tid (om det är den första kolumnen och i ett jämförbart format)
    // Och ta de senaste 20
    const latestWorkouts = workouts
      .filter(w => w.DateTime) // Se till att DateTime finns
      .sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime))
      .slice(0, 20); // Ta bara de 20 senaste

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, workouts: latestWorkouts }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error reading from Google Sheet:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to retrieve workouts: ' + error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};