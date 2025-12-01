const { connectToDatabase } = require('./db');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('expenses');

    if (event.httpMethod === 'GET') {
      const expenses = await collection.find({}).sort({ date: -1, _id: -1 }).toArray();
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
      await collection.deleteOne({ id: id });
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }
};
