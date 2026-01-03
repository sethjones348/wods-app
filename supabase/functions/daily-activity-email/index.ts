// Supabase Edge Function for daily activity emails
// This function is called by pg_cron daily to send activity summaries to all users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase automatically provides these environment variables in Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Verify this is an internal call (from pg_cron)
    // In production, you might want to add additional security checks
    
    // Get all users who should receive daily emails
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, settings')
      .or('settings->>emailNotifications.is.null,settings->>emailNotifications.eq.true');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to email', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users) {
      try {
        // Get activity data for the last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        // Get users this user is following
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = following?.map(f => f.following_id) || [];

        // Get friend workouts
        const { data: friendWorkouts } = followingIds.length > 0 ? await supabase
          .from('workouts')
          .select(`
            id,
            name,
            date,
            created_at,
            users!inner(id, name)
          `)
          .eq('privacy', 'public')
          .gte('created_at', yesterday.toISOString())
          .in('user_id', followingIds) : { data: [] };

        // Get user's workout IDs
        const { data: userWorkouts } = await supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user.id);

        const workoutIds = userWorkouts?.map(w => w.id) || [];

        // Get comments on user's workouts
        const { data: comments } = workoutIds.length > 0 ? await supabase
          .from('comments')
          .select('id')
          .gte('created_at', yesterday.toISOString())
          .in('workout_id', workoutIds) : { data: [] };

        // Get reactions on user's workouts
        const { data: reactions } = workoutIds.length > 0 ? await supabase
          .from('reactions')
          .select('id')
          .gte('created_at', yesterday.toISOString())
          .in('workout_id', workoutIds) : { data: [] };

        const activitySummary = {
          newWorkouts: friendWorkouts?.length || 0,
          newComments: comments?.length || 0,
          newReactions: reactions?.length || 0,
          friendWorkouts: (friendWorkouts || []).slice(0, 10).map((w: any) => ({
            name: w.name,
            user: w.users?.name || 'Unknown',
            date: w.date,
          })),
        };

        // Call send-email function
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: `Your WODsApp Daily Summary - ${new Date().toLocaleDateString()}`,
            html: generateEmailHTML(user.name || 'User', activitySummary),
          },
        });

        if (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Daily emails processed',
        success: successCount,
        errors: errorCount,
        total: users.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHTML(userName: string, activity: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #000;
            color: #fff;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #fff;
            padding: 30px;
            border: 1px solid #e5e5e5;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .stat {
            display: inline-block;
            background-color: #f5f5f5;
            padding: 15px 20px;
            margin: 10px;
            border-radius: 8px;
            text-align: center;
            min-width: 100px;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #D21034;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-top: 5px;
          }
          .button {
            display: inline-block;
            background-color: #D21034;
            color: #fff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; color: #fff;">WODs<span style="color: #D21034;">App</span></h1>
        </div>
        <div class="content">
          <h2>Your Daily Activity Summary</h2>
          <p>Hi ${userName},</p>
          <p>Here's what happened on WODsApp today:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div class="stat">
              <div class="stat-number">${activity.newWorkouts}</div>
              <div class="stat-label">New Workouts</div>
            </div>
            <div class="stat">
              <div class="stat-number">${activity.newComments}</div>
              <div class="stat-label">Comments</div>
            </div>
            <div class="stat">
              <div class="stat-number">${activity.newReactions}</div>
              <div class="stat-label">Fist Bumps</div>
            </div>
          </div>

          ${activity.friendWorkouts.length > 0 ? `
            <h3>Recent Friend Activity</h3>
            ${activity.friendWorkouts.map((w: any) => `
              <div style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                <strong>${w.user}</strong> posted: ${w.name}
                <br><small style="color: #666;">${new Date(w.date).toLocaleDateString()}</small>
              </div>
            `).join('')}
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://wodsapp.online" class="button">View Feed</a>
          </div>

          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p><a href="https://wodsapp.online/profile" style="color: #D21034;">Manage notification settings</a></p>
            <p>&copy; ${new Date().getFullYear()} WODsApp. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

