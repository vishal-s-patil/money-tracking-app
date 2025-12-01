const { connectToDatabase } = require('./db');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('settings');

    if (event.httpMethod === 'GET') {
      let settings = await collection.findOne({ _id: 'user_settings' });
      
      if (!settings) {
        settings = {
          accountBudget: 10000,
          cardBudget: 5000
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accountBudget: settings.accountBudget,
          cardBudget: settings.cardBudget
        })
      };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      
      const settings = {
        _id: 'user_settings',
        accountBudget: parseFloat(data.accountBudget) || 10000,
        cardBudget: parseFloat(data.cardBudget) || 5000,
        updatedAt: new Date()
      };

      await collection.replaceOne(
        { _id: 'user_settings' },
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }
};
