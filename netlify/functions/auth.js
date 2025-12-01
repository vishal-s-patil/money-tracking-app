const { connectToDatabase } = require('./db');
const crypto = require('crypto');

// Hash function for PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const data = JSON.parse(event.body);
    const { action, pin, username, token } = data;

    // Register new user
    if (action === 'register') {
      if (!pin || pin.length !== 6) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'PIN must be exactly 6 digits' })
        };
      }

      if (!username || username.trim().length < 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username must be at least 2 characters' })
        };
      }

      const trimmedUsername = username.trim().toLowerCase();
      
      // Check if username already exists
      const existingUser = await usersCollection.findOne({ 
        usernameLower: trimmedUsername 
      });
      
      if (existingUser) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username already taken' })
        };
      }

      const hashedPin = hashPin(pin);
      const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Create user with embedded session token
      await usersCollection.insertOne({
        _id: userId,
        username: username.trim(),
        usernameLower: trimmedUsername,
        pinHash: hashedPin,
        sessionToken: sessionToken, // Store token directly in user document
        createdAt: new Date(),
        lastLogin: new Date()
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true, 
          token: sessionToken,
          userId: userId,
          username: username.trim()
        })
      };
    }

    // Login with username and PIN
    if (action === 'login') {
      if (!pin || pin.length !== 6) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'PIN must be 6 digits' })
        };
      }

      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username is required' })
        };
      }

      const trimmedUsername = username.trim().toLowerCase();
      const user = await usersCollection.findOne({ usernameLower: trimmedUsername });
      
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or PIN' })
        };
      }

      const hashedPin = hashPin(pin);
      if (hashedPin !== user.pinHash) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or PIN' })
        };
      }

      // Generate new session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Update user with new session token
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            sessionToken: sessionToken,
            lastLogin: new Date() 
          } 
        }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          token: sessionToken,
          userId: user._id,
          username: user.username
        })
      };
    }

    // Verify token
    if (action === 'verify') {
      if (!token) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: false })
        };
      }

      // Find user by session token
      const user = await usersCollection.findOne({ sessionToken: token });
      
      if (!user) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: false })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: true,
          userId: user._id,
          username: user.username
        })
      };
    }

    // Logout - clear session token
    if (action === 'logout') {
      if (token) {
        await usersCollection.updateOne(
          { sessionToken: token },
          { $unset: { sessionToken: '' } }
        );
      }
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

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', message: error.message })
    };
  }
};
