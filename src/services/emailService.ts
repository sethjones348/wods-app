import { supabase } from '../lib/supabase';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Base64 encoded SamFit logo (SF on black background)
const SAMFIT_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMDAwMCIgcng9IjE1Ii8+CiAgPHRleHQgeD0iMTgiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNTgiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiNGRkZGRkYiIGxldHRlci1zcGFjaW5nPSItMyIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjAuNSI+UzwvdGV4dD4KICA8dGV4dCB4PSI1MCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI1OCIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iI0UxMTkzMSIgbGV0dGVyLXNwYWNpbmc9Ii0zIiBzdHJva2U9IiNFMTE5MzEiIHN0cm9rZS13aWR0aD0iMC41Ij5GPC90ZXh0Pgo8L3N2Zz4=';

const EMAIL_HEADER_WITH_LOGO = `
          <img src="${SAMFIT_LOGO_BASE64}" alt="SamFit" style="width: 40px; height: 40px; vertical-align: middle; margin-right: 10px; display: inline-block;" />
          <h1 style="margin: 0; color: #fff; display: inline-block; vertical-align: middle;">Sam<span style="color: #D21034;">Fit</span></h1>
`;

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
    console.error('Email service error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log('Email service response:', data);

  // Check if the response indicates success
  if (data && !data.success) {
    console.error('Email service returned non-success:', data);
    throw new Error(`Failed to send email: ${data.error || 'Unknown error'}`);
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
          ${EMAIL_HEADER_WITH_LOGO}
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
          ${EMAIL_HEADER_WITH_LOGO}
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
            font-size: 32px;
            text-align: center;
            margin: 20px 0;
          }
          .logo-img {
            width: 40px;
            height: 40px;
            vertical-align: middle;
            margin-right: 10px;
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
          ${EMAIL_HEADER_WITH_LOGO}
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
          ${EMAIL_HEADER_WITH_LOGO}
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

