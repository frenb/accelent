import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize the Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

export async function POST(request: Request) {
  try {
    const { data } = await request.json();

    // Create a new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Generated Sheet ${new Date().toISOString()}`,
        },
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;

    // Prepare the data for the sheet
    let values: any[][] = [];
    
    // If data is an array of objects, use the first object's keys as headers
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      values = [headers];
      
      // Add the data rows
      data.forEach(item => {
        values.push(headers.map(header => item[header]));
      });
    } else if (typeof data === 'object') {
      // If data is a single object, create a two-column sheet
      values = [['Key', 'Value']];
      Object.entries(data).forEach(([key, value]) => {
        values.push([key, JSON.stringify(value)]);
      });
    }

    // Write the data to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    // Get the sharing URL
    const file = await drive.files.get({
      fileId: spreadsheetId,
    });

    return NextResponse.json({
      sheetUrl: file.data.webViewLink,
    });
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    return NextResponse.json(
      { error: 'Failed to create Google Sheet' },
      { status: 500 }
    );
  }
} 