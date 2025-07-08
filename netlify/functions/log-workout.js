// netlify/functions/log-workout.js

const { google } = require('googleapis');

// Hämta Google Sheet ID från miljövariabler (eller sätt det direkt om du vill)
// Rekommenderas att använda miljövariabel
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; 

// Hämta service account-nycklarna från miljövariabler
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

// Skapa en Google Auth Client med service account
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

// Huvudfunktion för Netlify Function
exports.handler = async function(event, context) {
  // Endast tillåt POST-förfrågningar
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  let requestData;
  try {
    requestData = JSON.parse(event.body); // event.body innehåller POST-datan
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Invalid JSON in request body.' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  const { DateTime, Exercise, Weight, Reps, Sets, Intence, Comment } = requestData;

  // Enkel validering
  if (!DateTime || !Exercise) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Missing required fields (DateTime or Exercise).' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Hämta befintliga rubriker
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:ZZ1', // Läs första raden för rubriker
    });
    let headers = headerResponse.data.values ? headerResponse.data.values[0] : [];

    // Om inga rubriker finns, sätt standardrubriker
    if (!headers || headers.every(h => h === '')) {
      headers = ['DateTime', 'Exercise', 'Weight', 'Reps', 'Sets', 'Intence', 'Comment'];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });
    }

    // Skapa en ny rad baserat på rubrikordningen
    const newRow = [];
    headers.forEach(header => {
      switch(header) {
        case 'DateTime': newRow.push(DateTime); break;
        case 'Exercise': newRow.push(Exercise); break;
        case 'Weight': newRow.push(Weight || ''); break;
        case 'Reps': newRow.push(Reps || ''); break;
        case 'Sets': newRow.push(Sets || ''); break;
        case 'Intence': newRow.push(Intence || ''); break;
        case 'Comment': newRow.push(Comment || ''); break;
        default: newRow.push(''); // Lägg till tom sträng för okända rubriker
      }
    });

    // Lägg till den nya raden i Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1', // Lägger till efter sista raden
      valueInputOption: 'RAW',
      resource: { values: [newRow] },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Workout logged successfully!' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error writing to Google Sheet:', error); // Logga detaljerat fel till Netlify logs
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to log workout: ' + error.message }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};