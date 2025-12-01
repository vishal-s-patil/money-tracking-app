const { connectToDatabase } = require('./db');

// Helper to get userId from token
async function getUserFromToken(db, token) {
  if (!token) return null;
  const user = await db.collection('users').findOne({ sessionToken: token });
  return user;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    const collection = db.collection('expenses');

    if (event.httpMethod === 'GET') {
      const expenses = await collection
        .find({ userId: userId })
        .sort({ date: -1, _id: -1 })
        .toArray();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(expenses)
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const expense = {
        id: data.id || Date.now().toString(),
        userId: userId,
        date: data.date,
        amount: parseFloat(data.amount),
        description: data.description || 'Fixed expense',
        type: data.type || 'account',
        createdAt: new Date()
      };

      await collection.insertOne(expense);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(expense)
      };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);
      await collection.deleteOne({ id: id, userId: userId });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Expenses error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }
};
