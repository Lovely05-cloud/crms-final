<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Treasury Letter - Late Benefit Claim</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #2C3E50;
        }
        .header p {
            margin: 5px 0;
            color: #7F8C8D;
        }
        .content {
            margin: 30px 0;
        }
        .member-info {
            background-color: #F8F9FA;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .member-info p {
            margin: 8px 0;
        }
        .benefit-info {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #0b87ac;
            background-color: #E8F0FE;
        }
        .signature-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #E0E0E0;
        }
        .signature-line {
            margin-top: 60px;
            border-top: 1px solid #000;
            width: 300px;
            text-align: center;
            padding-top: 5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #7F8C8D;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>OFFICE OF THE TREASURER</h1>
        <p>Municipality of Cabuyao, Laguna</p>
        <p>Republic of the Philippines</p>
    </div>

    <div class="content">
        <p><strong>Date:</strong> {{ $date }}</p>
        
        <p>To Whom It May Concern:</p>
        
        <p style="text-align: justify; margin: 20px 0;">
            This is to certify that <strong>{{ $member->firstName }} {{ $member->lastName }}</strong> 
            (PWD ID: <strong>{{ $member->pwd_id }}</strong>) is a registered member of the Persons with Disabilities 
            Affairs Office (PDAO) of Cabuyao, Laguna.
        </p>

        <div class="member-info">
            <p><strong>Member Information:</strong></p>
            <p><strong>Name:</strong> {{ $member->firstName }} {{ $member->middleName ?? '' }} {{ $member->lastName }} {{ $member->suffix ?? '' }}</p>
            <p><strong>PWD ID:</strong> {{ $member->pwd_id }}</p>
            <p><strong>Address:</strong> {{ $member->address }}</p>
            <p><strong>Barangay:</strong> {{ $member->barangay }}</p>
            <p><strong>Contact Number:</strong> {{ $member->contactNumber }}</p>
        </div>

        <div class="benefit-info">
            <p><strong>Benefit Information:</strong></p>
            <p><strong>Benefit Type:</strong> {{ $benefit->title ?? $benefit->type }}</p>
            <p><strong>Amount:</strong> ₱{{ number_format($benefit->amount ?? 0, 2) }}</p>
            <p><strong>Original Expiry Date:</strong> {{ \Carbon\Carbon::parse($benefit->expiryDate)->format('F d, Y') }}</p>
        </div>

        <p style="text-align: justify; margin: 20px 0;">
            The above-named member is requesting approval for a <strong>late claim</strong> of the benefit mentioned above, 
            which has expired. This letter serves as a request for the Treasury Office to approve and process the late 
            benefit claim.
        </p>

        <p style="text-align: justify; margin: 20px 0;">
            We respectfully request your office to review and approve this late claim request. The member has been 
            informed of the late claim process and understands the requirements.
        </p>

        <p style="margin: 30px 0;">
            Thank you for your consideration.
        </p>

        <p style="margin: 20px 0;">
            Very truly yours,
        </p>

        <div class="signature-section">
            <div class="signature-line">
                <p><strong>_________________________</strong></p>
                <p>Treasurer</p>
                <p>Municipality of Cabuyao, Laguna</p>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This is a system-generated document for late benefit claim processing.</p>
        <p>Generated on: {{ $date }}</p>
    </div>
</body>
</html>

