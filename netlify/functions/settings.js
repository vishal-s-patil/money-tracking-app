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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    const collection = db.collection('settings');

    if (event.httpMethod === 'GET') {
      let settings = await collection.findOne({ userId: userId });
      
      if (!settings) {
        settings = {
          accountBudget: 10000,
          cardBudget: 5000,
          windowSize: 5
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accountBudget: settings.accountBudget,
          cardBudget: settings.cardBudget,
          windowSize: settings.windowSize || 5
        })
      };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      
      const settings = {
        userId: userId,
        accountBudget: parseFloat(data.accountBudget) || 10000,
        cardBudget: parseFloat(data.cardBudget) || 5000,
        windowSize: parseInt(data.windowSize) || 5,
        updatedAt: new Date()
      };

      await collection.replaceOne(
        { userId: userId },
        settings,
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settings)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Settings error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }
};
