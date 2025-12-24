import { supabase } from '../lib/supabase';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Supabase Edge Function
 * The Edge Function should be deployed at: /functions/send-email
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to send emails');
  }

  // Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from || 'SamFit <noreply@samfit.xyz>',
    },
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

/**
 * Send a friend invite email
 */
export async function sendFriendInviteEmail(
  toEmail: string,
  inviterName: string,
  inviterEmail: string
): Promise<void> {
  const html = `
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
          <h1 style="margin: 0; color: #fff;">Sam<span style="color: #D21034;">Fit</span></h1>
        </div>
        <div class="content">
          <h2>You've been invited to join SamFit!</h2>
          <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to connect on SamFit, a workout tracking app for CrossFit athletes.</p>
          <p>Join SamFit to:</p>
          <ul>
            <li>Track your workouts with AI-powered extraction</li>
            <li>Connect with friends and see their workouts</li>
            <li>Share your fitness journey</li>
          </ul>
          <a href="https://samfit.xyz" class="button">Join SamFit</a>
          <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} SamFit. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `${inviterName} invited you to join SamFit`,
    html,
  });
}

/**
 * Send daily activity summary email
 */
export async function sendDailyActivityEmail(
  toEmail: string,
  userName: string,
  activitySummary: {
    newWorkouts: number;
    newComments: number;
    newReactions: number;
    friendWorkouts: Array<{ name: string; user: string; date: string }>;
  }
): Promise<void> {
  const html = `
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
          .workout-item {
            padding: 15px;
            border-bottom: 1px solid #e5e5e5;
          }
          .workout-item:last-child {
            border-bottom: none;
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
          <h1 style="margin: 0; color: #fff;">Sam<span style="color: #D21034;">Fit</span></h1>
        </div>
        <div class="content">
          <h2>Your Daily Activity Summary</h2>
          <p>Hi ${userName},</p>
          <p>Here's what happened on SamFit today:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div class="stat">
              <div class="stat-number">${activitySummary.newWorkouts}</div>
              <div class="stat-label">New Workouts</div>
            </div>
            <div class="stat">
              <div class="stat-number">${activitySummary.newComments}</div>
              <div class="stat-label">Comments</div>
            </div>
            <div class="stat">
              <div class="stat-number">${activitySummary.newReactions}</div>
              <div class="stat-label">Fist Bumps</div>
            </div>
          </div>

          ${activitySummary.friendWorkouts.length > 0 ? `
            <h3>Recent Friend Activity</h3>
            ${activitySummary.friendWorkouts.map(workout => `
              <div class="workout-item">
                <strong>${workout.user}</strong> posted: ${workout.name}
                <br><small style="color: #666;">${new Date(workout.date).toLocaleDateString()}</small>
              </div>
            `).join('')}
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://samfit.xyz" class="button">View Feed</a>
          </div>

          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p><a href="https://samfit.xyz/profile" style="color: #D21034;">Manage notification settings</a></p>
            <p>&copy; ${new Date().getFullYear()} SamFit. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Your SamFit Daily Summary - ${new Date().toLocaleDateString()}`,
    html,
  });
}

/**
 * Send notification email when someone fist bumps a workout
 */
export async function sendReactionNotificationEmail(
  toEmail: string,
  workoutOwnerName: string,
  reactorName: string,
  workoutName: string,
  workoutId: string
): Promise<void> {
  const html = `
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
          .reaction-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
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
          <h1 style="margin: 0; color: #fff;">Sam<span style="color: #D21034;">Fit</span></h1>
        </div>
        <div class="content">
          <div class="reaction-icon">👊</div>
          <h2>${reactorName} gave you a fist bump!</h2>
          <p>Hi ${workoutOwnerName},</p>
          <p><strong>${reactorName}</strong> just gave you a fist bump on your workout:</p>
          <p style="font-size: 18px; font-weight: 600; color: #D21034; margin: 20px 0;">${workoutName || 'Your workout'}</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://samfit.xyz/workout/${workoutId}" class="button">View Workout</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p><a href="https://samfit.xyz/profile" style="color: #D21034;">Manage notification settings</a></p>
            <p>&copy; ${new Date().getFullYear()} SamFit. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `${reactorName} gave you a fist bump!`,
    html,
  });
}

/**
 * Send notification email when someone comments on a workout
 */
export async function sendCommentNotificationEmail(
  toEmail: string,
  workoutOwnerName: string,
  commenterName: string,
  commentText: string,
  workoutName: string,
  workoutId: string
): Promise<void> {
  const html = `
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
          .comment-box {
            background-color: #f5f5f5;
            border-left: 4px solid #D21034;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
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
          <h1 style="margin: 0; color: #fff;">Sam<span style="color: #D21034;">Fit</span></h1>
        </div>
        <div class="content">
          <h2>${commenterName} commented on your workout!</h2>
          <p>Hi ${workoutOwnerName},</p>
          <p><strong>${commenterName}</strong> just commented on your workout:</p>
          <p style="font-size: 18px; font-weight: 600; color: #D21034; margin: 20px 0;">${workoutName || 'Your workout'}</p>
          <div class="comment-box">
            <p style="margin: 0; font-style: italic;">"${commentText}"</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://samfit.xyz/workout/${workoutId}" class="button">View Comment</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p><a href="https://samfit.xyz/profile" style="color: #D21034;">Manage notification settings</a></p>
            <p>&copy; ${new Date().getFullYear()} SamFit. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `${commenterName} commented on your workout`,
    html,
  });
}

