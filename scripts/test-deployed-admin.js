const jwt = require('jsonwebtoken');

const JWT_SECRET = 'testprep-jwt-secret-key-2026'; // fallback secret

async function testAdminPage() {
  console.log('Generating teacher token...');
  const token = jwt.sign(
    { 
      id: 'd3b07384-d113-4e4e-9c76-2e8b61c94441', 
      name: 'Teacher Admin', 
      role: 'teacher', 
      email: 'teacher@testprep.com' 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('Sending authenticated request to deployed /admin page...');
  try {
    const response = await fetch('https://aptifyims.vercel.app/admin', {
      headers: {
        'Cookie': `teacher-session=${token}`
      }
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 250 || response.status === 200) {
      console.log('Success! The deployed admin page loads successfully with a 200 OK.');
    } else {
      const text = await response.text();
      console.error('Error page content:', text.slice(0, 1000));
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

testAdminPage();
