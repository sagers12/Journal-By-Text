import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sha256ToHex, corsHeadersFor, okCorsPreflight } from '../_shared/utils/security.ts';

const REDIRECT_URL = 'https://journalbytext.com/journal'; // fixed allowlisted redirect

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (!cors) return new Response('Forbidden', { status: 403 });
  const pre = okCorsPreflight(req, cors);
  if (pre) return pre;

  try {
    const { verification_token } = await req.json();
    if (!verification_token) {
      return new Response(JSON.stringify({ error: 'verification_token required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Hash the presented token
    const tokenHash = await sha256ToHex(verification_token);

    // 2) Atomically consume it
    const { data: consumed, error: consumeErr } = await supabase.rpc(
      'consume_phone_verification_token',
      { p_token_hash: tokenHash }
    );

    if (consumeErr || !consumed || consumed.length === 0) {
      console.error('Token consumption failed:', consumeErr);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const userId: string = consumed[0].user_id;

    // 3) Ensure phone is verified (server-side check)
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', userId)
      .eq('phone_verified', true)
      .single();

    if (profErr || !profile) {
      console.error('Phone verification check failed:', profErr);
      return new Response(JSON.stringify({ error: 'Phone not verified yet' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 4) Get user email for magic link generation
    const userEmail = await getUserEmail(supabase, userId);
    if (!userEmail) {
      console.error('Failed to get user email for userId:', userId);
      return new Response(JSON.stringify({ error: 'Failed to retrieve user email' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 5) Generate magic link for auto-signin
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo: REDIRECT_URL }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Magic link generation failed:', linkErr);
      return new Response(JSON.stringify({ error: 'Failed to generate sign-in link' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log('Successfully generated auth link for user:', userId);
    return new Response(JSON.stringify({
      success: true,
      auth_link: linkData.properties.action_link
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('verify-and-signin error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

async function getUserEmail(svc: ReturnType<typeof createClient>, userId: string) {
  try {
    // Get user from auth.users table using admin API
    const { data, error } = await svc.auth.admin.getUserById(userId);
    if (!error && data?.user?.email) {
      return data.user.email;
    }
    console.error('Failed to get user email:', error);
    return null;
  } catch (e) {
    console.error('Error fetching user email:', e);
    return null;
  }
}