// netlify/functions/log-workout.js

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Full skrivbehörighet
});

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed - Use POST' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const data = JSON.parse(event.body);

  // Extrahera alla fält, inkl. de nya och gör dem valfria
  // Använder tom sträng '' om värdet är null/undefined för att undvika 'null' i Google Sheet
  const DateTime = data.DateTime || '';
  const Exercise = data.Exercise || '';
  const Weight = data.Weight || '';
  const Reps = data.Reps || '';
  const Sets = data.Sets || '';
  const Intence = data.Intence || '';
  const Comment = data.Comment || '';
  const Distance = data.Distance || ''; // NYTT FÄLT
  const Time = data.Time || '';         // NYTT FÄLT

  if (!DateTime || !Exercise) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Missing required fields: DateTime and Exercise.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // VARNING: Säkerställ att ordningen på dessa värden matchar
    // kolumnordningen i DITT Google Sheet EXAKT.
    // Exempel: Om dina kolumner är A-I, och de är i ordningen:
    // Datum & Tid, Övning, Vikt, Reps, Sets, Intensitet, Kommentar, Distans (m), Tid (min)
    const values = [
      DateTime,
      Exercise,
      Weight,
      Reps,
      Sets,
      Intence,
      Comment,
      Distance, // NYTT VÄRDE
      Time,     // NYTT VÄRDE
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:I', // <<-- VIKTIGT: Justera detta till den sista kolumnen du nu använder (t.ex. 'A:I' om du har 9 kolumner)
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Workout logged successfully!' }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error logging workout:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to log workout: ' + error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};