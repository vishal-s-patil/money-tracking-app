const { connectToDatabase } = require('./db');

// Helper to get user from token
async function getUserFromToken(db, token) {
  if (!token) return null;
  const user = await db.collection('users').findOne({ sessionToken: token });
  return user;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { db } = await connectToDatabase();
    
    // Get token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    const user = await getUserFromToken(db, token);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized. Please login.' })
      };
    }

    const userId = user._id;
    const { type } = JSON.parse(event.body);

    if (type === 'month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];

      await db.collection('expenses').deleteMany({
        userId: userId,
        date: { $gte: startStr, $lte: endStr }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Month cleared' })
      };
    }

    if (type === 'all') {
      await db.collection('expenses').deleteMany({ userId: userId });
      await db.collection('settings').deleteMany({ userId: userId });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'All data cleared' })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid clear type' })
    };

  } catch (error) {
    console.error('Clear error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }
};
