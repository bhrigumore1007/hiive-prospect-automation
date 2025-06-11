const express = require('express');
const app = express();

console.log('🔍 Creating Express app with direct routing...');

// Use app.get() directly instead of router
app.get('/test1', (req, res) => {
  console.log('Direct Test 1 called');
  res.json({ endpoint: 'test1', method: 'direct', status: 'working' });
});

app.get('/test2', (req, res) => {
  console.log('Direct Test 2 called');
  res.json({ endpoint: 'test2', method: 'direct', status: 'working' });
});

app.get('/test3', (req, res) => {
  console.log('Direct Test 3 called');
  res.json({ endpoint: 'test3', method: 'direct', status: 'working' });
});

app.get('/test4', (req, res) => {
  console.log('Direct Test 4 called');
  res.json({ endpoint: 'test4', method: 'direct', status: 'working' });
});

console.log('✅ All direct routes added');

app.listen(3001, () => {
  console.log('Direct routing test server on port 3001');
  console.log('Test: http://localhost:3001/test1');
  console.log('Test: http://localhost:3001/test2');
  console.log('Test: http://localhost:3001/test3');
  console.log('Test: http://localhost:3001/test4');
}); 