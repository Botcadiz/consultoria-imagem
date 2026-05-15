import fetch from 'node-fetch';

async function testAnalysis() {
  try {
    // Step 1: Register/Login
    console.log('📝 Registering user...');
    const registerRes = await fetch('http://localhost:3001/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });

    console.log('Login response:', registerRes.status);

    // Step 2: Login to get token
    console.log('\n🔑 Logging in...');
    const loginRes = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Token received:', token.substring(0, 20) + '...');

    // Step 3: Create a simple test image (1x1 pixel for testing)
    console.log('\n🖼️  Creating test image...');
    const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABQAFADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWm5ybnJ2eo6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS0tPU1dbX2Nna4uP0NTV2uHmKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uP0NTV2uHmKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1fb/2gAMAwEAAgEDEQA/APX6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==';

    // Step 4: Analyze image
    console.log('\n🚀 Sending image to analyze...');
    const analyzeRes = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageBase64: testImageBase64 })
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.text();
      console.log('❌ Error:', analyzeRes.status, error);
      return;
    }

    const result = await analyzeRes.json();
    console.log('\n✅ Analysis complete!');
    console.log('\n📊 Result summary:');
    console.log('- Estação cromática:', result.estacao);
    console.log('- Descrição:', result.descricao);
    console.log('- Subtom:', result.subtom);
    console.log('- Contraste:', result.contraste);

    if (result.imageUrl) {
      console.log('\n🎨 IMAGE GENERATED!');
      console.log('URL:', result.imageUrl);
    } else {
      console.log('\n⚠️  No image URL returned');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalysis();
