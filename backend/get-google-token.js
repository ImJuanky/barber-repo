/**
 * Script auxiliar para obtener el refresh_token de Google Calendar.
 * Uso:
 *   1. Rellena GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu archivo .env
 *   2. Ejecuta: node get-google-token.js
 *   3. Abre en el navegador la URL que se muestra e inicia sesión con la
 *      cuenta de Google cuyo calendario quieres usar, y autoriza el acceso.
 *   4. Google redirigirá automáticamente a este script (no hace falta copiar
 *      ningún código a mano) y se imprimirá el refresh_token en la terminal.
 *   5. Copia ese refresh_token en GOOGLE_REFRESH_TOKEN dentro de .env
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const PORT = 4567;
const REDIRECT_URI = `http://localhost:${PORT}`;

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

console.log('Abre esta URL en tu navegador y autoriza el acceso con la cuenta de Google que quieras usar:\n');
console.log(authUrl);
console.log('\nEsperando la autorización... (no cierres esta ventana)');

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, REDIRECT_URI);
    const code = requestUrl.searchParams.get('code');

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>No se recibió ningún código. Puedes cerrar esta pestaña.</h2>');
      return;
    }

    const { tokens } = await oAuth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>¡Autorización completada! Ya puedes cerrar esta pestaña y volver a la terminal.</h2>');

    console.log('\n¡Listo! Añade esta línea a tu archivo .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nTambién actualiza esta línea (el redirect_uri usado para obtenerlo):');
    console.log(`GOOGLE_REDIRECT_URI=${REDIRECT_URI}`);

    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Error obteniendo el token:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Ocurrió un error. Revisa la terminal.</h2>');
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, () => {
  console.log(`\n(Servidor local temporal escuchando en ${REDIRECT_URI} para recibir la respuesta de Google)`);
});
