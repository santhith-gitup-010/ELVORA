/**
 * Firebase Realtime Database API Service
 * External data source for Smart Library books
 * 
 * Base URL: https://smartlibrary-4c139-default-rtdb.firebaseio.com
 * 
 * Field Bindings:
 *   title  → Book Title
 *   author → Author Name
 *   available → Availability
 */

const FIREBASE_BASE_URL = 'https://smartlibrary-4c139-default-rtdb.firebaseio.com';

// Field binding map: Firebase key → Display label
export const FIELD_BINDINGS = {
  'title': 'Book Title',
  'author': 'Author Name',
  'available': 'Availability',
};

/**
 * Fetch a single book by ID from Firebase
 * @param {string} bookId - e.g. 'B1'
 * @returns {Promise<object>} - { title, author, available }
 */
export const getFirebaseBook = async (bookId) => {
  const res = await fetch(`${FIREBASE_BASE_URL}/Books/${bookId}.json`);
  if (!res.ok) throw new Error(`Firebase API error: ${res.status}`);
  const data = await res.json();
  if (!data) throw new Error('Book not found in Firebase');

  // Normalize keys (Firebase has trailing spaces in some keys)
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    normalized[key.trim()] = value;
  }
  return normalized;
};

/**
 * Fetch all books from Firebase
 * @returns {Promise<Array>} - Array of { id, title, author, available }
 */
export const getAllFirebaseBooks = async () => {
  const res = await fetch(`${FIREBASE_BASE_URL}/Books.json`);
  if (!res.ok) throw new Error(`Firebase API error: ${res.status}`);
  const data = await res.json();
  if (!data) return [];

  // Convert the Firebase object to an array, filtering only book entries (with title)
  const books = [];
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && (value.title || value['title '])) {
      const normalized = {};
      for (const [k, v] of Object.entries(value)) {
        normalized[k.trim()] = v;
      }
      books.push({ id: key, ...normalized });
    }
  }
  return books;
};

/**
 * Test the Firebase API connection
 * @returns {Promise<object>} - { success, data, message }
 */
export const testFirebaseConnection = async () => {
  try {
    const book = await getFirebaseBook('B1');
    return {
      success: true,
      data: book,
      message: 'Firebase API connected successfully',
      bindings: Object.entries(FIELD_BINDINGS).map(([key, label]) => ({
        field: key,
        label,
        value: book[key] || 'N/A'
      }))
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      message: err.message,
      bindings: []
    };
  }
};
