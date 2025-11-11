<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PWD Application Submitted</title>
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
        .success-box {
            background-color: #d4edda;
            padding: 15px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
        }
        .reference-number {
            background-color: #d1ecf1;
            padding: 15px;
            border-left: 4px solid #17a2b8;
            margin: 20px 0;
            text-align: center;
        }
        .info-box {
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
        <h1>✅ Application Submitted Successfully!</h1>
        <h2>Thank You for Your Application</h2>
    </div>
    
    <div class="content">
        <p>Dear <strong><?php echo e($firstName); ?> <?php echo e($lastName); ?></strong>,</p>
        
        <div class="success-box">
            <h3>🎉 Your Application Has Been Received</h3>
            <p>Your PWD (Persons with Disabilities) application has been successfully submitted to the Cabuyao PDAO (Persons with Disabilities Affairs Office).</p>
        </div>
        
        <div class="reference-number">
            <h3>📋 Your Application Reference Number</h3>
            <p style="font-size: 24px; font-weight: bold; color: #17a2b8;"><?php echo e($referenceNumber); ?></p>
            <p style="font-size: 12px; margin-top: 5px;">Please save this reference number for future reference</p>
        </div>
        
        <div class="info-box">
            <h3>ℹ️ What Happens Next?</h3>
            <ul>
                <li>Your application will be reviewed by the barangay office first</li>
                <li>After barangay approval, it will be forwarded to the admin for final review</li>
                <li>You will receive email notifications about any status updates</li>
                <li>You can check your application status anytime using your reference number</li>
            </ul>
            <p><strong>Submission Date:</strong> <?php echo e(\Carbon\Carbon::parse($submissionDate)->format('F d, Y')); ?></p>
        </div>
        
        <div style="text-align: center;">
            <a href="<?php echo e($statusCheckUrl); ?>" class="button">Check Application Status</a>
        </div>
        
        <h3>📞 Need Help?</h3>
        <p>If you have any questions or need assistance, please contact our support team.</p>
        
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

<?php /**PATH F:\final please\crms\pwd-backend\resources\views/emails/application-submitted.blade.php ENDPATH**/ ?>