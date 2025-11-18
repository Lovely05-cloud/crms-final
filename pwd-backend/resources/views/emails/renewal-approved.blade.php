<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ID Renewal Approved</title>
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
            background-color: #28a745;
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
        .info-box {
            background-color: #fff;
            padding: 15px;
            border-left: 4px solid #2E86C1;
            margin: 20px 0;
            border-radius: 4px;
        }
        .button {
            display: inline-block;
            background-color: #28a745;
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
        <h1>✅ ID Renewal Approved!</h1>
        <h2>Your PWD ID Card Has Been Renewed</h2>
    </div>
    
    <div class="content">
        <p>Dear <strong>{{ $firstName }} {{ $lastName }}</strong>,</p>
        
        <p>We are pleased to inform you that your PWD ID card renewal request has been <strong>approved</strong> by the Cabuyao PDAO (Persons with Disabilities Affairs Office).</p>
        
        <div class="highlight">
            <h3>✅ Renewal Status: APPROVED</h3>
            <p>Your PWD ID card has been successfully renewed and is now valid for another 3 years.</p>
        </div>
        
        <div class="info-box">
            <h3>📋 Renewal Details</h3>
            <p><strong>PWD ID Number:</strong> {{ $pwdId }}</p>
            <p><strong>New Expiration Date:</strong> {{ $newExpirationDate }}</p>
            <p><strong>Renewal Date:</strong> {{ $renewalDate }}</p>
            @if(!empty($notes))
            <p><strong>Notes:</strong> {{ $notes }}</p>
            @endif
        </div>
        
        <h3>🎉 What This Means</h3>
        <ul>
            <li>Your PWD ID card is now valid until <strong>{{ $newExpirationDate }}</strong></li>
            <li>You can continue to enjoy all PWD benefits and privileges</li>
            <li>Your card status has been updated in our system</li>
        </ul>
        
        <h3>📝 Important Reminders</h3>
        <ul>
            <li>Keep your PWD ID card safe and always carry it with you</li>
            <li>Your card is valid for discounts and benefits at participating establishments</li>
            <li>You will receive a reminder 30 days before your next expiration date</li>
        </ul>
        
        <div style="text-align: center;">
            <a href="{{ $loginUrl }}" class="button">Access Your Account</a>
        </div>
        
        <h3>📞 Need Help?</h3>
        <p>If you have any questions or need assistance, please contact our support team through the support desk in your dashboard or visit the PDAO office.</p>
        
        <p>Thank you for being a valued member of the Cabuyao PDAO community!</p>
        
        <p>Best regards,<br>
        <strong>Cabuyao PDAO Team</strong><br>
        Persons with Disabilities Affairs Office<br>
        City of Cabuyao, Laguna</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>© {{ date('Y') }} Cabuyao PDAO RMS. All rights reserved.</p>
    </div>
</body>
</html>

