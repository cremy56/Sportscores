// functions/keyRotationReminder.js
// Cloud Function die getriggerd wordt door het Pub/Sub topic
// dat Google Secret Manager stuurt bij key rotation deadline.
//
// Deploy commando:
// gcloud functions deploy keyRotationReminder \
//   --runtime=nodejs20 \
//   --trigger-topic=secret-rotation-notifications \
//   --region=europe-west1 \
//   --project=sportscore-6774d

import { createTransport } from 'nodemailer';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// ─── Configuratie ─────────────────────────────────────────────────────────────
const ONTVANGER = 'cremy56@gmail.com';
const PROJECT_ID = 'sportscore-6774d';

async function getEmailPassword() {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/KEY_ROTATION_EMAIL_PASSWORD/versions/latest`
    });
    return version.payload.data.toString('utf8').trim();
}

// ─── E-mail inhoud ────────────────────────────────────────────────────────────
const getEmailHtml = () => `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; }
    .header { background: #7c3aed; color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .body { background: #f9fafb; padding: 24px; }
    .stap { background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #7c3aed; }
    .stap-nr { font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase; }
    .stap-titel { font-size: 16px; font-weight: bold; margin: 4px 0 8px; }
    .stap-uitleg { font-size: 14px; color: #555; line-height: 1.6; }
    .stap-link { display: inline-block; margin-top: 8px; background: #ede9fe; color: #7c3aed; padding: 4px 10px; border-radius: 6px; font-size: 13px; text-decoration: none; }
    .code { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 8px 0; white-space: pre; overflow-x: auto; }
    .waarschuwing { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 14px; }
    .footer { background: #e5e7eb; padding: 16px; border-radius: 0 0 12px 12px; font-size: 12px; color: #6b7280; text-align: center; }
    .checkbox { color: #7c3aed; font-weight: bold; }
  </style>
</head>
<body>

<div class="header">
  <div style="font-size: 24px; margin-bottom: 4px">🔑 Key Rotation Herinnering</div>
  <div style="opacity: 0.85; font-size: 14px">SportScores — Elke 90 dagen beveilig je de namen van je leerlingen opnieuw</div>
</div>

<div class="body">

  <div class="waarschuwing">
    ⚠️ <strong>Doe dit VÓÓR je begint:</strong> Maak een backup van je database.
    Dit duurt 2 minuten en beschermt je als er iets fout gaat.
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 1 van 7</div>
    <div class="stap-titel">📦 Maak een backup van je database</div>
    <div class="stap-uitleg">
      Denk aan een backup als een foto van je database. Als er iets fout gaat, zet je gewoon de foto terug.
      <br><br>
      1. Ga naar Google Cloud Console<br>
      2. Klik links op <strong>Firestore</strong><br>
      3. Klik op <strong>Import/Export</strong><br>
      4. Klik op <strong>Export</strong> → kies een bucket → klik <strong>Export</strong><br>
      5. Wacht tot het klaar is (groene vinkje)
    </div>
    <a class="stap-link" href="https://console.cloud.google.com/firestore/databases/-default-/import-export?project=sportscore-6774d">
      → Open Firestore Console
    </a>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 2 van 7</div>
    <div class="stap-titel">🔐 Maak een nieuwe geheime sleutel aan</div>
    <div class="stap-uitleg">
      Je geheime sleutel is als het wachtwoord waarmee namen versleuteld worden. Je maakt nu een nieuw, sterker wachtwoord aan — en laat het oude nog even staan.
      <br><br>
      1. Ga naar Secret Manager<br>
      2. Klik op <strong>MASTER_KEY_KABEVEREN</strong><br>
      3. Klik op <strong>+ New Version</strong><br>
      4. Genereer een nieuwe sleutel met dit commando in Cloud Shell:<br>
    </div>
    <div class="code">openssl rand -hex 32</div>
    <div class="stap-uitleg">
      5. Kopieer de output en plak die in het Secret Manager veld<br>
      6. Klik <strong>Add New Version</strong>
    </div>
    <a class="stap-link" href="https://console.cloud.google.com/security/secret-manager/secret/MASTER_KEY_KABEVEREN/versions?project=sportscore-6774d">
      → Open Secret Manager
    </a>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 3 van 7</div>
    <div class="stap-titel">✏️ Verander het versienummer in de code</div>
    <div class="stap-uitleg">
      In je code staat welke versie van de sleutel de app gebruikt voor nieuwe namen. Die moet je nu verhogen.
      <br><br>
      Open het bestand <strong>lib/apiHelpers.js</strong> en zoek deze regel:
    </div>
    <div class="code">const CURRENT_KEY_VERSION = 'v1';</div>
    <div class="stap-uitleg">Verander die naar:</div>
    <div class="code">const CURRENT_KEY_VERSION = 'v2';</div>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 4 van 7</div>
    <div class="stap-titel">🚀 Upload de aangepaste code</div>
    <div class="stap-uitleg">
      Sla de code op en stuur die naar Vercel. Typ dit in je terminal:
    </div>
    <div class="code">git add lib/apiHelpers.js
git commit -m "feat: key rotation v1 → v2"
git push</div>
    <div class="stap-uitleg">
      Wacht tot Vercel klaar is met deployen (±1 minuut).
    </div>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 5 van 7</div>
    <div class="stap-titel">🧪 Test eerst (dry run)</div>
    <div class="stap-uitleg">
      Voordat je iets echt aanpast, laat je het script eerst tellen hoeveel namen er gemigreerd moeten worden — zonder iets te veranderen. Dit is de veiligste manier.
      <br><br>
      Stuur dit bericht naar je app (via Postman, Insomnia of een andere API tool):
    </div>
    <div class="code">POST https://www.sportscores.be/api/admin/rotate-crypto
Authorization: Bearer JOUW_TOKEN

{
  "dryRun": true,
  "oldKeySecret": "1",
  "newKeySecret": "2"
}</div>
    <div class="stap-uitleg">
      Je krijgt een antwoord met het aantal namen dat gemigreerd zou worden. Controleer of dat klopt met het aantal leerlingen.
    </div>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 6 van 7</div>
    <div class="stap-titel">✅ Voer de echte migratie uit</div>
    <div class="stap-uitleg">
      Als de dry run er goed uitziet, voer je de echte migratie uit. Verander alleen <strong>dryRun: false</strong>:
    </div>
    <div class="code">POST https://www.sportscores.be/api/admin/rotate-crypto
Authorization: Bearer JOUW_TOKEN

{
  "dryRun": false,
  "oldKeySecret": "1",
  "newKeySecret": "2"
}</div>
    <div class="stap-uitleg">
      Het script versleutelt alle namen opnieuw met de nieuwe sleutel. Dit duurt enkele seconden tot minuten afhankelijk van het aantal leerlingen.
      <br><br>
      Controleer het antwoord: <strong>fouten: 0</strong> moet je zien. Als er fouten zijn, stuur me dan het antwoord door.
    </div>
  </div>

  <div class="stap">
    <div class="stap-nr">Stap 7 van 7</div>
    <div class="stap-titel">🗑️ Zet de oude sleutel op non-actief</div>
    <div class="stap-uitleg">
      Nu alle namen opnieuw versleuteld zijn met de nieuwe sleutel, heb je de oude sleutel niet meer nodig. Je zet hem op non-actief (niet verwijderen — voor audit-doeleinden).
      <br><br>
      1. Ga naar Secret Manager<br>
      2. Klik op <strong>MASTER_KEY_KABEVEREN</strong><br>
      3. Klik op de drie puntjes naast versie <strong>1</strong><br>
      4. Klik op <strong>Disable</strong>
    </div>
    <a class="stap-link" href="https://console.cloud.google.com/security/secret-manager/secret/MASTER_KEY_KABEVEREN/versions?project=sportscore-6774d">
      → Open Secret Manager
    </a>
  </div>

  <div style="background: #d1fae5; border-radius: 8px; padding: 16px; margin-top: 8px;">
    <strong>🎉 Klaar!</strong> De namen van je leerlingen zijn nu beveiligd met een nieuwe sleutel.
    De volgende herinnering komt automatisch over 90 dagen.
  </div>

</div>

<div class="footer">
  Dit is een automatische herinnering van SportScores.<br>
  Volgende rotatie: over 90 dagen · Vragen? Bekijk de code in <strong>api/admin/rotate-crypto.js</strong>
</div>

</body>
</html>
`;

// ─── Cloud Function handler ───────────────────────────────────────────────────
export const keyRotationReminder = async (message, context) => {
    console.log('Key rotation reminder getriggerd door Secret Manager');

    let emailPassword;
    try {
        emailPassword = await getEmailPassword();
    } catch (err) {
        console.error('Kon App Password niet ophalen uit Secret Manager:', err.message);
        return;
    }

    const transporter = createTransport({
        service: 'gmail',
        auth: {
            user: ONTVANGER,
            pass: emailPassword,
        },
    });

    try {
        await transporter.sendMail({
            from: `"SportScores Beveiliging" <${ONTVANGER}>`,
            to: ONTVANGER,
            subject: '🔑 Actie vereist: Key Rotation SportScores (90 dagen)',
            html: getEmailHtml(),
        });
        console.log('Herinnerings-e-mail verzonden naar', ONTVANGER);
    } catch (err) {
        console.error('E-mail verzenden mislukt:', err.message);
    }
};