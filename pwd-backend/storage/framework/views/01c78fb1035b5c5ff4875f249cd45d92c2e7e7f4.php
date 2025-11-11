<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email Verification Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1976D2;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .verification-code {
            background-color: #1976D2;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            letter-spacing: 5px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PWD Application Verification</h1>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        
        <p>Thank you for submitting your PWD application. To complete your submission, please verify your email address using the verification code below:</p>
        
        <div class="verification-code">
            <?php echo e($verificationCode); ?>

        </div>
        
        <p>Please enter this code in the verification form to proceed with your application submission.</p>
        
        <div class="warning">
            <strong>Important:</strong> This verification code will expire in 10 minutes. If you don't use it within this time, you'll need to request a new code.
        </div>
        
        <p>If you didn't request this verification code, please ignore this email or contact our support team.</p>
        
        <p>Thank you for your patience!</p>
        
        <p>Best regards,<br>
        Cabuyao PDAO RMS Team</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
<?php /**PATH F:\final please\crms\pwd-backend\resources\views/emails/verification-code.blade.php ENDPATH**/ ?>