const { connectToDatabase } = require('./db');
const crypto = require('crypto');

// Simple hash function for PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');

    // GET - Check if user exists (has PIN set)
    if (event.httpMethod === 'GET') {
      const user = await collection.findOne({ _id: 'main_user' });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          hasPin: !!user,
          username: user?.username || null
        })
      };
    }

    // POST - Register or Login
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const { action, pin, username } = data;

      // Register new PIN
      if (action === 'register') {
        if (!pin || pin.length < 4) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'PIN must be at least 4 digits' })
          };
        }

        const existingUser = await collection.findOne({ _id: 'main_user' });
        if (existingUser) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User already exists. Use login.' })
          };
        }

        const hashedPin = hashPin(pin);
        await collection.insertOne({
          _id: 'main_user',
          username: username || 'User',
          pinHash: hashedPin,
          createdAt: new Date()
        });

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ success: true, message: 'PIN created successfully' })
        };
      }

      // Login with PIN
      if (action === 'login') {
        if (!pin) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'PIN is required' })
          };
        }

        const user = await collection.findOne({ _id: 'main_user' });
        if (!user) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'No user found. Please register first.' })
          };
        }

        const hashedPin = hashPin(pin);
        if (hashedPin !== user.pinHash) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid PIN' })
          };
        }

        // Generate simple session token
        const token = crypto.randomBytes(32).toString('hex');
        
        await collection.updateOne(
          { _id: 'main_user' },
          { $set: { sessionToken: token, lastLogin: new Date() } }
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            token: token,
            username: user.username
          })
        };
      }

      // Verify token
      if (action === 'verify') {
        const { token } = data;
        if (!token) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ valid: false })
          };
        }

        const user = await collection.findOne({ _id: 'main_user', sessionToken: token });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            valid: !!user,
            username: user?.username || null
          })
        };
      }

      // Logout
      if (action === 'logout') {
        const { token } = data;
        await collection.updateOne(
          { _id: 'main_user' },
          { $unset: { sessionToken: '' } }
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
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
      body: JSON.stringify({ error: 'Server error', message: error.message })
    };
  }
};

