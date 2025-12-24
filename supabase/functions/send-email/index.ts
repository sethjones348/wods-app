// Supabase Edge Function to send emails using Resend
// To use this, you'll need to:
// 1. Install Resend: npm install resend
// 2. Set RESEND_API_KEY in Supabase dashboard (Settings > Edge Functions > Secrets)
// 3. Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resendApiKey = Deno.env.get('RESEND_API_KEY');
if (!resendApiKey) {
  console.error('RESEND_API_KEY is not set in Edge Function secrets');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

serve(async (req) => {
  console.log('=== Email Function Called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify request is from Supabase
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Check if Resend is configured
    console.log('Resend configured:', !!resend, 'API Key present:', !!resendApiKey);
    if (!resend || !resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Email service is not configured. Please set RESEND_API_KEY in Edge Function secrets.' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const body = await req.json();
    console.log('Request body received:', { 
      to: body.to, 
      subject: body.subject, 
      from: body.from,
      htmlLength: body.html?.length 
    });
    
    const { to, subject, html, from } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const fromAddress = from || 'SamFit <noreply@samfit.xyz>';
    console.log('=== Attempting to send email ===');
    console.log('To:', to);
    console.log('From:', fromAddress);
    console.log('Subject:', subject);
    console.log('HTML length:', html?.length || 0);
    
    const emailPayload = {
      from: fromAddress,
      to: [to],
      subject,
      html,
    };
    
    console.log('Calling Resend API...');
    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('=== Resend API Error ===');
      console.error('Error object:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Unknown error',
          details: error,
          errorType: error.name 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    console.log('=== Resend API Success ===');
    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log('Email ID:', data?.id);

    return new Response(
      JSON.stringify({ success: true, id: data?.id, resendData: data }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});

