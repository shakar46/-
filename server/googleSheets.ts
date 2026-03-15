import { google } from "googleapis";

export interface Complaint {
  id: string;
  dateReceived: string;
  orderDate: string;
  classification: string;
  classificationSection: string;
  reasonComment: string;
  productOrEmployee: string;
  branchName: string;
  orderCheck: string;
  description: string;
  source: string;
  customerName: string;
  phone: string;
  samplePhoto: string;
  extraInfo: string;
  acceptedBy: string;
  sipRecord: string;
  responsible: string;
  deadline: string;
  quickFix: string;
  rootCauseAnalysis: string;
  status: string;
  correctiveAction: string;
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1SreBqz3uOdlewZMKvOcFlXnCNtmcfcUK";
const RANGE = "Sheet1!A2:W";

export async function getComplaints(): Promise<Complaint[]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = res.data.values || [];

    return rows.map((row) => ({
      id: row[0] || "",
      dateReceived: row[1] || "",
      orderDate: row[2] || "",
      classification: row[3] || "",
      classificationSection: row[4] || "",
      reasonComment: row[5] || "",
      productOrEmployee: row[6] || "",
      branchName: row[7] || "",
      orderCheck: row[8] || "",
      description: row[9] || "",
      source: row[10] || "",
      customerName: row[11] || "",
      phone: row[12] || "",
      samplePhoto: row[13] || "",
      extraInfo: row[14] || "",
      acceptedBy: row[15] || "",
      sipRecord: row[16] || "",
      responsible: row[17] || "",
      deadline: row[18] || "",
      quickFix: row[19] || "",
      rootCauseAnalysis: row[20] || "",
      status: row[21] || "",
      correctiveAction: row[22] || "",
    }));
  } catch (error) {
    console.error("Error getting complaints from Google Sheets:", error);
    return [];
  }
}

export async function addComplaint(data: Complaint) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:W",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            data.id,
            data.dateReceived,
            data.orderDate,
            data.classification,
            data.classificationSection,
            data.reasonComment,
            data.productOrEmployee,
            data.branchName,
            data.orderCheck,
            data.description,
            data.source,
            data.customerName,
            data.phone,
            data.samplePhoto,
            data.extraInfo,
            data.acceptedBy,
            data.sipRecord,
            data.responsible,
            data.deadline,
            data.quickFix,
            data.rootCauseAnalysis,
            data.status,
            data.correctiveAction,
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error adding complaint to Google Sheets:", error);
  }
}

export async function updateComplaint(row: number, data: Complaint) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${row}:W${row}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            data.id,
            data.dateReceived,
            data.orderDate,
            data.classification,
            data.classificationSection,
            data.reasonComment,
            data.productOrEmployee,
            data.branchName,
            data.orderCheck,
            data.description,
            data.source,
            data.customerName,
            data.phone,
            data.samplePhoto,
            data.extraInfo,
            data.acceptedBy,
            data.sipRecord,
            data.responsible,
            data.deadline,
            data.quickFix,
            data.rootCauseAnalysis,
            data.status,
            data.correctiveAction,
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error updating complaint in Google Sheets:", error);
  }
}

export async function findRowById(id: string): Promise<number | null> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:A",
    });
    const rows = res.data.values || [];
    const index = rows.findIndex(row => row[0] === id);
    return index !== -1 ? index + 1 : null;
  } catch (error) {
    console.error("Error finding row by ID:", error);
    return null;
  }
}

export async function deleteComplaint(rowIndex: number) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error deleting complaint from Google Sheets:", error);
  }
}
