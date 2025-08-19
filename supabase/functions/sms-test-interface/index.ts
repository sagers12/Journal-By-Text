import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  
  // Handle API requests for testing
  if (url.pathname.startsWith('/api/')) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Run health check
    if (url.pathname === '/api/health') {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-health-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Send test message
    if (url.pathname === '/api/test' && req.method === 'POST') {
      try {
        const { testType, phoneNumber } = await req.json()
        
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-test-suite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testType, phoneNumber })
        })
        
        const data = await response.json()
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Get recent logs
    if (url.pathname === '/api/logs') {
      try {
        const { data: logs } = await supabaseClient
          .from('sms_test_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        return new Response(JSON.stringify(logs || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  }

  // Return the HTML interface
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMS Testing Interface</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
      }
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
        background: white; 
        border-radius: 12px; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header { 
        background: linear-gradient(135deg, #2c3e50, #3498db); 
        color: white; 
        padding: 30px; 
        text-align: center; 
      }
      .header h1 { font-size: 28px; margin-bottom: 10px; }
      .header p { opacity: 0.9; }
      .content { padding: 30px; }
      .section { margin-bottom: 40px; padding: 25px; background: #f8f9fa; border-radius: 8px; }
      .section h2 { color: #2c3e50; margin-bottom: 20px; font-size: 20px; }
      .form-group { margin-bottom: 20px; }
      .form-group label { 
        display: block; 
        margin-bottom: 8px; 
        color: #555; 
        font-weight: 600; 
      }
      .form-group input, .form-group select { 
        width: 100%; 
        padding: 12px 16px; 
        border: 2px solid #e1e8ed; 
        border-radius: 6px; 
        font-size: 14px;
        transition: border-color 0.3s;
      }
      .form-group input:focus, .form-group select:focus { 
        outline: none; 
        border-color: #3498db; 
      }
      .btn { 
        padding: 12px 24px; 
        border: none; 
        border-radius: 6px; 
        font-size: 14px; 
        font-weight: 600;
        cursor: pointer; 
        transition: all 0.3s;
        margin-right: 10px;
        margin-bottom: 10px;
      }
      .btn-primary { 
        background: linear-gradient(135deg, #3498db, #2980b9); 
        color: white; 
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4); }
      .btn-secondary { 
        background: linear-gradient(135deg, #95a5a6, #7f8c8d); 
        color: white; 
      }
      .btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(149, 165, 166, 0.4); }
      .btn-success { 
        background: linear-gradient(135deg, #27ae60, #229954); 
        color: white; 
      }
      .btn-success:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(39, 174, 96, 0.4); }
      .results { 
        background: white; 
        border: 2px solid #e1e8ed; 
        border-radius: 6px; 
        padding: 20px; 
        margin-top: 20px; 
      }
      .results pre { 
        background: #f8f9fa; 
        padding: 15px; 
        border-radius: 4px; 
        overflow-x: auto; 
        font-size: 12px;
        line-height: 1.5;
      }
      .status { 
        padding: 8px 12px; 
        border-radius: 4px; 
        font-size: 12px; 
        font-weight: 600;
        display: inline-block;
        margin-bottom: 10px;
      }
      .status.success { background: #d4edda; color: #155724; }
      .status.error { background: #f8d7da; color: #721c24; }
      .status.warning { background: #fff3cd; color: #856404; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 768px) { 
        .grid { grid-template-columns: 1fr; }
        .container { margin: 10px; }
        .content { padding: 20px; }
      }
      .loading { opacity: 0.6; pointer-events: none; }
      .logs { max-height: 400px; overflow-y: auto; }
      .log-item { 
        padding: 10px; 
        border-bottom: 1px solid #eee; 
        font-size: 12px; 
      }
      .log-item:last-child { border-bottom: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>SMS Testing & Monitoring Interface</h1>
        <p>Comprehensive testing suite for SMS journal functionality</p>
      </div>
      
      <div class="content">
        <div class="grid">
          <div class="section">
            <h2>🧪 Test Message Generator</h2>
            <div class="form-group">
              <label for="phoneNumber">Phone Number (with country code)</label>
              <input type="tel" id="phoneNumber" placeholder="+1234567890" value="+18016021934">
            </div>
            <div class="form-group">
              <label for="testType">Message Type</label>
              <select id="testType">
                <option value="short">Short Message (~20 chars)</option>
                <option value="medium">Medium Message (~1,750 chars)</option>
                <option value="long">Long Message (~9,350 chars)</option>
                <option value="exactLimit">Exact Limit (10,000 chars)</option>
                <option value="oversized">Oversized Message (~11,550 chars)</option>
                <option value="unicode">Unicode & Emoji Test</option>
                <option value="empty">Empty Message</option>
                <option value="whitespace">Whitespace Only</option>
                <option value="phoneVerification">Phone Verification (YES)</option>
                <option value="subscription">Subscription Query</option>
                <option value="help">Help Request</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="sendTestMessage()">Send Test Message</button>
            <button class="btn btn-secondary" onclick="clearResults()">Clear Results</button>
            
            <div id="testResults" class="results" style="display:none;">
              <h3>Test Results</h3>
              <div id="testStatus"></div>
              <pre id="testOutput"></pre>
            </div>
          </div>
          
          <div class="section">
            <h2>💊 System Health Check</h2>
            <p style="margin-bottom: 20px; color: #666;">Run comprehensive health checks on the SMS processing system.</p>
            <button class="btn btn-success" onclick="runHealthCheck()">Run Health Check</button>
            <button class="btn btn-secondary" onclick="viewDashboard()">View Dashboard</button>
            
            <div id="healthResults" class="results" style="display:none;">
              <h3>Health Check Results</h3>
              <div id="healthStatus"></div>
              <pre id="healthOutput"></pre>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>📋 Recent Test Logs</h2>
          <button class="btn btn-secondary" onclick="loadLogs()">Refresh Logs</button>
          <div id="logs" class="logs results" style="display:none;">
            <div id="logsContent"></div>
          </div>
        </div>
        
        <div class="section">
          <h2>🔗 Quick Links</h2>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="window.open('/functions/v1/sms-monitoring-dashboard', '_blank')">Monitoring Dashboard</button>
            <button class="btn btn-secondary" onclick="window.open('/functions/v1/sms-health-check', '_blank')">Health Check API</button>
            <button class="btn btn-secondary" onclick="window.open('https://supabase.com/dashboard/project/${Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0] || 'project'}/functions', '_blank')">Edge Functions</button>
            <button class="btn btn-secondary" onclick="window.open('https://supabase.com/dashboard/project/${Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0] || 'project'}/logs/edge-functions', '_blank')">Function Logs</button>
          </div>
        </div>
      </div>
    </div>

    <script>
      async function sendTestMessage() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        const testType = document.getElementById('testType').value;
        
        if (!phoneNumber) {
          alert('Please enter a phone number');
          return;
        }
        
        const resultsDiv = document.getElementById('testResults');
        const statusDiv = document.getElementById('testStatus');
        const outputDiv = document.getElementById('testOutput');
        
        resultsDiv.style.display = 'block';
        statusDiv.innerHTML = '<div class="status warning">Running test...</div>';
        outputDiv.textContent = 'Sending test message...';
        
        try {
          const response = await fetch('/api/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testType, phoneNumber })
          });
          
          const result = await response.json();
          
          if (result.success) {
            statusDiv.innerHTML = '<div class="status success">✓ Test completed successfully</div>';
          } else {
            statusDiv.innerHTML = '<div class="status error">✗ Test failed</div>';
          }
          
          outputDiv.textContent = JSON.stringify(result, null, 2);
        } catch (error) {
          statusDiv.innerHTML = '<div class="status error">✗ Error running test</div>';
          outputDiv.textContent = 'Error: ' + error.message;
        }
      }
      
      async function runHealthCheck() {
        const resultsDiv = document.getElementById('healthResults');
        const statusDiv = document.getElementById('healthStatus');
        const outputDiv = document.getElementById('healthOutput');
        
        resultsDiv.style.display = 'block';
        statusDiv.innerHTML = '<div class="status warning">Running health checks...</div>';
        outputDiv.textContent = 'Checking system health...';
        
        try {
          const response = await fetch('/api/health');
          const result = await response.json();
          
          const statusClass = result.status === 'HEALTHY' ? 'success' : 
                             result.status === 'DEGRADED' ? 'warning' : 'error';
          
          statusDiv.innerHTML = \`<div class="status \${statusClass}">System Status: \${result.status}</div>\`;
          outputDiv.textContent = JSON.stringify(result, null, 2);
        } catch (error) {
          statusDiv.innerHTML = '<div class="status error">✗ Health check failed</div>';
          outputDiv.textContent = 'Error: ' + error.message;
        }
      }
      
      async function loadLogs() {
        const logsDiv = document.getElementById('logs');
        const contentDiv = document.getElementById('logsContent');
        
        logsDiv.style.display = 'block';
        contentDiv.innerHTML = '<p>Loading logs...</p>';
        
        try {
          const response = await fetch('/api/logs');
          const logs = await response.json();
          
          if (logs.length === 0) {
            contentDiv.innerHTML = '<p>No test logs found.</p>';
            return;
          }
          
          contentDiv.innerHTML = logs.map(log => \`
            <div class="log-item">
              <strong>\${log.test_type}</strong> - \${log.phone_number}<br>
              <small>\${new Date(log.created_at).toLocaleString()}</small><br>
              Characters: \${log.character_count} | Success: \${log.success ? '✓' : '✗'}
            </div>
          \`).join('');
        } catch (error) {
          contentDiv.innerHTML = '<p>Error loading logs: ' + error.message + '</p>';
        }
      }
      
      function clearResults() {
        document.getElementById('testResults').style.display = 'none';
        document.getElementById('healthResults').style.display = 'none';
        document.getElementById('logs').style.display = 'none';
      }
      
      function viewDashboard() {
        window.open('/functions/v1/sms-monitoring-dashboard', '_blank');
      }
      
      // Auto-load logs on page load
      window.onload = () => loadLogs();
    </script>
  </body>
  </html>
  `

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
  })
})