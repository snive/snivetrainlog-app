// netlify/functions/get-workouts.js

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Läsbehörighet
});

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed - Use GET' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Kontrollera om frontend vill ha alla pass eller bara de 20 senaste
  const queryParams = event.queryStringParameters;
  const limit = queryParams && queryParams.limit === 'all' ? Infinity : 20; // Hämtar alla om 'limit=all'

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Läs alla kolumner upp till den sista du använder (t.ex. 'A:I')
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:I', // <<-- VIKTIGT: Justera detta om du har fler/färre kolumner som ska läsas, matchar log-workout.js
    });

    const values = response.data.values || [];

    if (values.length < 1) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, workouts: [] }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Anta att första raden är headers
    const headers = values[0];
    const dataRows = values.slice(1);

    // Konvertera rader till objekt för enklare hantering
    // Använder headers som nycklar, t.ex. "Distans (m)"
    const workouts = dataRows.map(row => {
      let workout = {};
      headers.forEach((header, index) => {
        workout[header] = row[index];
      });
      return workout;
    });

    // Sortera efter Datum & Tid (nyaste först)
    const sortedWorkouts = workouts
      .filter(w => w.DateTime) // Se till att DateTime finns
      .sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime));

    // Returnera begränsat antal eller alla baserat på 'limit'
    const workoutsToReturn = limit === Infinity ? sortedWorkouts : sortedWorkouts.slice(0, limit);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, workouts: workoutsToReturn }),
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