exports.handler = async (event, context) => {
  console.log('Health check function called');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Netlify Functions are working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      nodeVersion: process.version
    }),
  };
};
