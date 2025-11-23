<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PWD Application Rejected</title>
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
            background-color: #E74C3C;
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
        .info-box {
            background-color: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
        .rejection-reason {
            background-color: #f8d7da;
            padding: 15px;
            border-left: 4px solid #dc3545;
            margin: 20px 0;
        }
        .reference-number {
            background-color: #d1ecf1;
            padding: 15px;
            border-left: 4px solid #17a2b8;
            margin: 20px 0;
            text-align: center;
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
        <h1>⚠️ Application Status Update</h1>
        <h2>PWD Application - Rejected</h2>
    </div>
    
    <div class="content">
        <p>Dear <strong><?php echo e($firstName); ?> <?php echo e($lastName); ?></strong>,</p>
        
        <p>We regret to inform you that your PWD (Persons with Disabilities) application has been reviewed and <strong>rejected</strong> by the Cabuyao PDAO (Persons with Disabilities Affairs Office).</p>
        
        <div class="reference-number">
            <h3>📋 Your Application Reference Number</h3>
            <p style="font-size: 24px; font-weight: bold; color: #17a2b8;"><?php echo e($referenceNumber); ?></p>
            <p style="font-size: 12px; margin-top: 5px;">Please keep this reference number for future reference</p>
        </div>
        
        <div class="rejection-reason">
            <h3>❌ Rejection Reason</h3>
            <p style="white-space: pre-wrap;"><?php echo e($rejectionReason); ?></p>
        </div>
        
        <div class="info-box">
            <h3>ℹ️ Important Information</h3>
            <p><strong>Your application data and submitted documents have been retained.</strong></p>
            <p>You do not need to re-apply from scratch. If your rejection was due to incorrect or insufficient documents, you can:</p>
            <ul>
                <li>Access the application status dashboard using your reference number</li>
                <li>Re-upload or replace the documents that need correction</li>
                <li>Resubmit your application after making the necessary corrections</li>
            </ul>
        </div>
        
        <div style="text-align: center;">
            <a href="<?php echo e($statusCheckUrl); ?>" class="button">Check Application Status</a>
        </div>
        
        <h3>📞 Need Help?</h3>
        <p>If you have any questions about the rejection or need assistance, please contact our support team.</p>
        
        <p>Thank you for your interest in Cabuyao PDAO RMS.</p>
        
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

<?php /**PATH C:\Users\LOVELY\OneDrive\Desktop\System2\crms-final\pwd-backend\resources\views/emails/application-rejected.blade.php ENDPATH**/ ?>