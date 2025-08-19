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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get recent SMS messages with processing status
    const { data: recentMessages } = await supabaseClient
      .from('sms_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50)

    // Get processing statistics
    const { data: messageStats } = await supabaseClient
      .from('sms_messages')
      .select('processed, error_message, truncated')
      .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Get oversized messages
    const { data: oversizedMessages } = await supabaseClient
      .from('oversized_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // Get recent journal entries for comparison
    const { data: recentEntries } = await supabaseClient
      .from('journal_entries')
      .select('id, created_at, source, user_id')
      .eq('source', 'sms')
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate statistics
    const totalMessages = messageStats?.length || 0
    const processedCount = messageStats?.filter(m => m.processed).length || 0
    const errorCount = messageStats?.filter(m => m.error_message).length || 0
    const truncatedCount = messageStats?.filter(m => m.truncated).length || 0
    const unprocessedCount = totalMessages - processedCount

    // Get user statistics
    const { data: userStats } = await supabaseClient
      .from('profiles')
      .select('phone_verified, reminder_enabled')

    const verifiedUsers = userStats?.filter(u => u.phone_verified).length || 0
    const totalUsers = userStats?.length || 0
    const reminderEnabledUsers = userStats?.filter(u => u.reminder_enabled).length || 0

    // Build dashboard data
    const dashboardData = {
      timestamp: new Date().toISOString(),
      statistics: {
        messages: {
          total: totalMessages,
          processed: processedCount,
          unprocessed: unprocessedCount,
          errors: errorCount,
          truncated: truncatedCount,
          processedRate: totalMessages > 0 ? (processedCount / totalMessages * 100).toFixed(2) + '%' : '0%'
        },
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          reminderEnabled: reminderEnabledUsers,
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) + '%' : '0%'
        },
        oversized: oversizedMessages?.length || 0,
        journalEntries: recentEntries?.length || 0
      },
      recentMessages: recentMessages?.map(msg => ({
        id: msg.id,
        phone: msg.phone_number.replace(/.(?=.{4})/g, '*'), // Mask phone
        received: msg.received_at,
        processed: msg.processed,
        error: msg.error_message,
        truncated: msg.truncated,
        charCount: msg.char_count,
        entryCreated: !!msg.entry_id
      })),
      oversizedMessages: oversizedMessages?.map(msg => ({
        id: msg.id,
        phone: msg.phone_number.replace(/.(?=.{4})/g, '*'),
        received: msg.received_at,
        charCount: msg.char_count,
        byteCount: msg.byte_count
      })),
      recentEntries: recentEntries?.map(entry => ({
        id: entry.id,
        created: entry.created_at,
        source: entry.source,
        userId: entry.user_id.substring(0, 8) + '...'
      }))
    }

    // Return HTML dashboard if no specific format requested
    const url = new URL(req.url)
    if (url.searchParams.get('format') === 'json') {
      return new Response(JSON.stringify(dashboardData, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Return HTML dashboard
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SMS Monitoring Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; }
        .error { color: #dc3545; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .refresh { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="dashboard">
        <h1>SMS Processing Monitoring Dashboard</h1>
        <p>Last Updated: ${new Date().toLocaleString()}</p>
        <button class="refresh" onclick="location.reload()">Refresh</button>
        
        <div class="card">
          <h2>Message Processing Statistics (Last 24 Hours)</h2>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${dashboardData.statistics.messages.total}</div>
              <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat">
              <div class="stat-value ${dashboardData.statistics.messages.processedRate === '100%' ? 'success' : 'warning'}">${dashboardData.statistics.messages.processedRate}</div>
              <div class="stat-label">Processing Rate</div>
            </div>
            <div class="stat">
              <div class="stat-value ${dashboardData.statistics.messages.errors > 0 ? 'error' : 'success'}">${dashboardData.statistics.messages.errors}</div>
              <div class="stat-label">Errors</div>
            </div>
            <div class="stat">
              <div class="stat-value">${dashboardData.statistics.messages.truncated}</div>
              <div class="stat-label">Truncated</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>User Statistics</h2>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${dashboardData.statistics.users.total}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat">
              <div class="stat-value">${dashboardData.statistics.users.verificationRate}</div>
              <div class="stat-label">Phone Verified</div>
            </div>
            <div class="stat">
              <div class="stat-value">${dashboardData.statistics.users.reminderEnabled}</div>
              <div class="stat-label">Reminders Enabled</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>Recent SMS Messages</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Received</th>
                <th>Processed</th>
                <th>Error</th>
                <th>Chars</th>
                <th>Entry Created</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.recentMessages?.map(msg => `
                <tr>
                  <td>${msg.phone}</td>
                  <td>${new Date(msg.received).toLocaleString()}</td>
                  <td class="${msg.processed ? 'success' : 'error'}">${msg.processed ? 'Yes' : 'No'}</td>
                  <td class="${msg.error ? 'error' : ''}">${msg.error || '-'}</td>
                  <td>${msg.charCount || '-'}</td>
                  <td class="${msg.entryCreated ? 'success' : 'warning'}">${msg.entryCreated ? 'Yes' : 'No'}</td>
                </tr>
              `).join('') || '<tr><td colspan="6">No messages found</td></tr>'}
            </tbody>
          </table>
        </div>

        ${dashboardData.oversizedMessages?.length ? `
        <div class="card">
          <h2>Oversized Messages</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Received</th>
                <th>Characters</th>
                <th>Bytes</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.oversizedMessages.map(msg => `
                <tr>
                  <td>${msg.phone}</td>
                  <td>${new Date(msg.received).toLocaleString()}</td>
                  <td class="warning">${msg.charCount}</td>
                  <td>${msg.byteCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="card">
          <h2>Testing</h2>
          <p>Use the SMS Test Suite to send test messages:</p>
          <button onclick="testMessage('short')" class="refresh">Test Short Message</button>
          <button onclick="testMessage('medium')" class="refresh">Test Medium Message</button>
          <button onclick="testMessage('long')" class="refresh">Test Long Message</button>
          <button onclick="testMessage('oversized')" class="refresh">Test Oversized Message</button>
        </div>
      </div>

      <script>
        async function testMessage(type) {
          const phone = prompt('Enter test phone number:');
          if (!phone) return;
          
          const response = await fetch('/functions/v1/sms-test-suite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testType: type, phoneNumber: phone })
          });
          
          const result = await response.json();
          alert(JSON.stringify(result, null, 2));
        }
      </script>
    </body>
    </html>
    `

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})