<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Correction Required</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #0b87ac 0%, #1B2631 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .alert-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #f39c12;
        }
        .alert-box h3 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 18px;
        }
        .documents-list {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .documents-list h4 {
            margin: 0 0 15px 0;
            color: #2C3E50;
            font-size: 16px;
        }
        .document-item {
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 8px 0;
            display: flex;
            align-items: center;
        }
        .document-item::before {
            content: "📄";
            margin-right: 10px;
            font-size: 16px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #0b87ac 0%, #1B2631 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.2s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .notes-section {
            background-color: #e8f4fd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #0b87ac;
        }
        .notes-section h4 {
            margin: 0 0 10px 0;
            color: #2C3E50;
            font-size: 16px;
        }
        .footer {
            background-color: #2C3E50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        .expiry-notice {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
            text-align: center;
            font-weight: 600;
        }
        .security-notice {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📋 Document Correction Required</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Cabuyao PDAO RMS</p>
        </div>

        <div class="content">
            <h2>Dear <?php echo e($applicantName); ?>,</h2>
            
            <p>We hope this message finds you well. After reviewing your PWD application, our staff has identified some documents that require correction or re-upload.</p>

            <div class="alert-box">
                <h3>⚠️ Action Required</h3>
                <p>Please re-upload the following documents to complete your application process:</p>
            </div>

            <div class="documents-list">
                <h4>📋 Documents Requiring Correction:</h4>
                <?php $__currentLoopData = $documentsToCorrect; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $document): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <div class="document-item">
                        <?php echo e(ucfirst(str_replace(['medicalCertificate', 'clinicalAbstract', 'voterCertificate', 'idPictures', 'birthCertificate', 'wholeBodyPicture', 'affidavit', 'barangayCertificate'], 
                            ['Medical Certificate', 'Clinical Abstract/Assessment', 'Voter Certificate', 'ID Pictures (2pcs)', 'Birth Certificate', 'Whole Body Picture', 'Affidavit of Guardianship/Loss', 'Barangay Certificate of Residency'], $document))); ?>

                    </div>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </div>

            <?php if($notes): ?>
            <div class="notes-section">
                <h4>📝 Additional Instructions:</h4>
                <p><?php echo e($notes); ?></p>
            </div>
            <?php endif; ?>

            <div class="expiry-notice">
                ⏰ <strong>Important:</strong> This correction request expires in <?php echo e($expiryDays); ?> days. Please complete the corrections before the deadline.
            </div>

            <div style="text-align: center;">
                <a href="<?php echo e($correctionUrl); ?>" class="cta-button">
                    🔗 Upload Corrected Documents
                </a>
            </div>

            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> This link is unique to your application and will expire after <?php echo e($expiryDays); ?> days for security purposes. Do not share this link with others.
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

            <p>Thank you for your cooperation in completing your PWD application.</p>

            <p>Best regards,<br>
            <strong>Cabuyao PDAO RMS Team</strong></p>
        </div>

        <div class="footer">
            <p><strong>Cabuyao Persons with Disabilities Affairs Office</strong></p>
            <p>Records Management System</p>
            <p>📧 Email: support@pdao-cabuyao.gov.ph</p>
            <p>📞 Phone: (049) 123-4567</p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
<?php /**PATH C:\Users\LOVELY\OneDrive\Desktop\System2\crms-final\pwd-backend\resources\views/emails/document-correction-request.blade.php ENDPATH**/ ?>