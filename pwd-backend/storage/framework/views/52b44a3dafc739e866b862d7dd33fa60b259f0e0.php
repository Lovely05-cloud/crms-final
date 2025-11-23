<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PWD Application Approved</title>
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
            background-color: #2E86C1;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .highlight {
            background-color: #e8f5e8;
            padding: 15px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
        }
        .credentials {
            background-color: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background-color: #2E86C1;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
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
        <h1>🎉 Congratulations!</h1>
        <h2>Your PWD Application Has Been Approved</h2>
    </div>
    
    <div class="content">
        <p>Dear <strong><?php echo e($firstName); ?> <?php echo e($lastName); ?></strong>,</p>
        
        <p>We are pleased to inform you that your PWD (Persons with Disabilities) application has been <strong>approved</strong> by the Cabuyao PDAO (Persons with Disabilities Affairs Office).</p>
        
        <div class="highlight">
            <h3>✅ Application Status: APPROVED</h3>
            <p>You are now officially registered as a PWD member in our system.</p>
            <p><strong>Your PWD ID:</strong> <?php echo e($pwdId); ?></p>
        </div>
        
        <div class="credentials" style="background-color:#e8f5e8;border-left:4px solid #28a745;">
            <h3>🔐 Your Login Credentials</h3>
            <p><strong>Username:</strong> <?php echo e($username); ?></p>
            <p><strong>Password:</strong> <?php echo e($password); ?></p>
            <p><strong>Email:</strong> <?php echo e($email); ?></p>
            <p><strong>Important:</strong> You will be required to change this password on your first login for security purposes.</p>
        </div>
        
        <?php if(isset($cardClaimDate)): ?>
        <div class="highlight" style="background-color:#d1ecf1;border-left:4px solid #17a2b8;">
            <h3>📅 PWD Card Claim Information</h3>
            <p><strong>Important Notice:</strong> Your PWD ID card will be ready for claiming in <strong>2 weeks (10 business days)</strong> from the date of approval.</p>
            <p style="font-size: 18px; font-weight: bold; color: #17a2b8; margin-top: 10px;">
                📍 Card Available for Claim: <strong><?php echo e($cardClaimDate); ?></strong>
            </p>
            <p style="margin-top: 10px;">Please visit the Cabuyao PDAO office on or after this date to claim your PWD ID card. Remember to bring a valid ID for verification.</p>
        </div>
        <?php endif; ?>
        
        <h3>🚀 What's Next?</h3>
        <ul>
            <li>Access your PWD member dashboard</li>
            <li>View important announcements</li>
            <li>Access support services</li>
            <li>Track your benefits and services</li>
            <?php if(isset($cardClaimDate)): ?>
            <li>Claim your PWD ID card on <strong><?php echo e($cardClaimDate); ?></strong></li>
            <?php endif; ?>
        </ul>
        
        <div style="text-align: center;">
            <a href="<?php echo e($loginUrl); ?>" class="button">Login to Your Account</a>
        </div>
        
        <h3>📞 Need Help?</h3>
        <p>If you have any questions or need assistance, please contact our support team through the support desk in your dashboard.</p>
        
        <p>Thank you for choosing Cabuyao PDAO RMS!</p>
        
        <p>Best regards,<br>
        <strong>Cabuyao PDAO Team</strong><br>
        <em>Email: sarinonhoelivan29@gmail.com</em></p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>Cabuyao PDAO RMS - Empowering Persons with Disabilities</p>
    </div>
</body>
</html>
<?php /**PATH C:\Users\LOVELY\OneDrive\Desktop\System2\crms-final\pwd-backend\resources\views/emails/application-approved.blade.php ENDPATH**/ ?>