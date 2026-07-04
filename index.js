const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT && JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) || require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(undefined, 'default');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TAG_AFFILIATO = process.env.PAAPI_PARTNER_TAG;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Price Tracker Backend attivo' });
});

app.get('/test-db', async (req, res) => {
  try {
    await db.collection('test').doc('ping').set({ timestamp: new Date() });
    res.json({ status: 'ok', message: 'Connessione a Firestore riuscita' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Aggiunge un prodotto con dati inseriti manualmente dall'utente
app.post('/products', async (req, res) => {
  const { asin, userId, titolo, prezzo, prezzoSoglia, immagine } = req.body;

  if (!asin || !userId || !titolo || prezzo === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'asin, userId, titolo e prezzo sono obbligatori'
    });
  }

  try {
    const linkAffiliato = `https://www.amazon.it/dp/${asin}?tag=${TAG_AFFILIATO}`;

    const docRef = await db.collection('tracked_products').add({
      userId,
      asin,
      titolo,
      immagine: immagine || null,
      prezzoAttuale: prezzo,
      prezzoSoglia: prezzoSoglia || null,
      linkAffiliato,
      creatoIl: new Date()
    });

    await db.collection('price_history').doc(docRef.id).collection('entries').add({
      prezzo,
      data: new Date()
    });

    res.json({ status: 'ok', productId: docRef.id, titolo, prezzo, linkAffiliato });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Aggiorna manualmente il prezzo di un prodotto esistente
app.post('/products/:id/refresh', async (req, res) => {
  const { id } = req.params;
  const { prezzo } = req.body;

  if (prezzo === undefined) {
    return res.status(400).json({ status: 'error', message: 'prezzo è obbligatorio' });
  }

  try {
    await db.collection('tracked_products').doc(id).update({ prezzoAttuale: prezzo });

    await db.collection('price_history').doc(id).collection('entries').add({
      prezzo,
      data: new Date()
    });

    res.json({ status: 'ok', message: 'Prezzo aggiornato', prezzo });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// Recupera tutti i prodotti monitorati da un utente
app.get('/products/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const snapshot = await db.collection('tracked_products')
      .where('userId', '==', userId)
      .get();

    const prodotti = [];
    snapshot.forEach(doc => {
      prodotti.push({ id: doc.id, ...doc.data() });
    });

    res.json({ status: 'ok', prodotti });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Recupera lo storico prezzi di un prodotto
app.get('/products/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const snapshot = await db.collection('price_history')
      .doc(id)
      .collection('entries')
      .orderBy('data', 'asc')
      .get();

    const storico = [];
    snapshot.forEach(doc => {
      storico.push(doc.data());
    });

    res.json({ status: 'ok', storico });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
