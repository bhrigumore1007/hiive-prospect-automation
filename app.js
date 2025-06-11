require('dotenv').config();
const express = require('express');
const cors = require('cors');

console.log('🔍 Creating Express app...');
const app = express();
console.log('✅ Express app created');

app.use(express.json());
app.use(cors());
console.log('✅ Middleware setup complete');

// DIRECT ROUTING - NO ROUTER
app.get('/api/fresh-health', (req, res) => {
  console.log('🎯 Fresh health endpoint called');
  res.json({ 
    status: 'fresh_healthy', 
    timestamp: new Date().toISOString(),
    message: 'Fresh health endpoint working' 
  });
});

app.get('/api/fresh-test', (req, res) => {
  console.log('🎯 Fresh test endpoint called');
  res.json({ 
    status: 'fresh_test_working', 
    message: 'Fresh test endpoint responding' 
  });
});

app.get('/api/exa-simple', (req, res) => {
  console.log('🔍 Simple exa route called');
  res.json({ 
    status: 'simple_route_working', 
    message: 'Route without parameters works' 
  });
});

app.get('/api/exa-param/:company', (req, res) => {
  console.log(`🔍 Param route called with: ${req.params.company}`);
  res.json({ 
    status: 'param_route_working', 
    company: req.params.company, 
    message: 'Route with parameters works' 
  });
});

app.get('/api/test-param/:id', (req, res) => {
  console.log(`🔍 Test param route called with: ${req.params.id}`);
  res.json({ status: 'test_param_working', id: req.params.id });
});

app.get('/api/exa-test/:company', (req, res) => {
  console.log(`🔍 Simple Exa endpoint called for: ${req.params.company}`);
  res.json({ status: 'exa_endpoint_working', company: req.params.company, message: 'Exa endpoint responding without imports' });
});

console.log('✅ All direct routes added');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💚 Fresh health: http://localhost:${PORT}/api/fresh-health`);
  console.log(`🔍 Fresh test: http://localhost:${PORT}/api/fresh-test`);
  console.log(`🔎 Exa simple: http://localhost:${PORT}/api/exa-simple`);
  console.log(`🔎 Exa param: http://localhost:${PORT}/api/exa-param/:company`);
  console.log(`🔎 Test param: http://localhost:${PORT}/api/test-param/:id`);
  console.log(`🔎 Exa test: http://localhost:${PORT}/api/exa-test/:company`);
});