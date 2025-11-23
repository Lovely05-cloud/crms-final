<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;

class EmailService
{
    private $gmailService;

    public function __construct()
    {
        // Only initialize Gmail service if Google API is available
        try {
            $this->gmailService = new GmailService();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Gmail service not available, using SMTP only', [
                'error' => $e->getMessage()
            ]);
            $this->gmailService = null;
        }
    }

    /**
     * Send application approval email with login credentials
     *
     * @param array $data
     * @return bool
     */
    /**
     * Calculate card claim date (10 business days from now)
     * 
     * @param \Carbon\Carbon|null $startDate
     * @return string
     */
    private function calculateCardClaimDate($startDate = null)
    {
        $date = $startDate ? \Carbon\Carbon::parse($startDate) : \Carbon\Carbon::now();
        $businessDays = 0;
        $currentDate = $date->copy();
        
        while ($businessDays < 10) {
            $currentDate->addDay();
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($currentDate->dayOfWeek !== \Carbon\Carbon::SATURDAY && $currentDate->dayOfWeek !== \Carbon\Carbon::SUNDAY) {
                $businessDays++;
            }
        }
        
        return $currentDate->format('F d, Y');
    }

    public function sendApplicationApprovalEmail($data)
    {
        // Calculate card claim date (10 business days from approval)
        $cardClaimDate = $this->calculateCardClaimDate();
        
        $emailData = [
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => $data['password'],
            'pwdId' => $data['pwdId'],
            'loginUrl' => $data['loginUrl'] ?? config('app.frontend_url', 'http://localhost:3000/login'),
            'cardClaimDate' => $cardClaimDate
        ];

        $subject = 'PWD Application Approved - Account Created';
        $to = $data['email']; // This is the applicant's email address

        Log::info('Attempting to send approval email', [
            'to' => $to,
            'pwdId' => $data['pwdId'],
            'gmail_service_available' => $this->gmailService !== null,
            'gmail_configured' => $this->gmailService ? $this->gmailService->isConfigured() : false,
            'client_id_set' => !empty(config('services.google.client_id')),
            'client_secret_set' => !empty(config('services.google.client_secret')),
            'refresh_token_set' => !empty(config('services.google.refresh_token'))
        ]);

        // Try SMTP first (more reliable for now)
        try {
            Log::info('Attempting SMTP send', [
                'to' => $to,
                'subject' => $subject
            ]);

            Mail::send('emails.application-approved', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Application approval email sent via SMTP', [
                'to' => $to,
                'pwdId' => $data['pwdId'],
                'from' => 'sarinonhoelivan29@gmail.com'
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('SMTP failed, trying Gmail API', [
                'error' => $e->getMessage(),
                'to' => $to,
                'trace' => $e->getTraceAsString()
            ]);
        }

        // Fallback to Gmail API if SMTP fails
        if ($this->gmailService && $this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make('emails.application-approved', $emailData)->render();
                
                Log::info('Attempting Gmail API send', [
                    'to' => $to,
                    'subject' => $subject,
                    'body_length' => strlen($htmlBody)
                ]);
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Application approval email sent via Gmail API', [
                        'to' => $to,
                        'pwdId' => $data['pwdId'],
                        'from' => 'sarinonhoelivan29@gmail.com'
                    ]);
                    return true;
                } else {
                    Log::warning('Gmail API send returned false', [
                        'to' => $to,
                        'pwdId' => $data['pwdId']
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Gmail API failed', [
                    'error' => $e->getMessage(),
                    'to' => $to,
                    'trace' => $e->getTraceAsString()
                ]);
            }
        } else {
            Log::warning('Gmail API not configured', [
                'to' => $to,
                'client_id_set' => !empty(config('services.google.client_id')),
                'client_secret_set' => !empty(config('services.google.client_secret')),
                'refresh_token_set' => !empty(config('services.google.refresh_token'))
            ]);
        }

        Log::error('Failed to send application approval email via both SMTP and Gmail API', [
            'to' => $to,
            'pwdId' => $data['pwdId']
        ]);

        return false;
    }

    /**
     * Send a generic email
     *
     * @param string $to
     * @param string $subject
     * @param string $template
     * @param array $data
     * @return bool
     */
    public function sendEmail($to, $subject, $template, $data = [])
    {
        // Try Gmail API first if configured
        if ($this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make($template, $data)->render();
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Email sent via Gmail API', [
                        'to' => $to,
                        'subject' => $subject,
                        'from' => 'sarinonhoelivan29@gmail.com'
                    ]);
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('Gmail API failed, falling back to SMTP', [
                    'error' => $e->getMessage(),
                    'to' => $to
                ]);
            }
        }

        // Fallback to regular SMTP
        try {
            Mail::send($template, $data, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Email sent via SMTP', [
                'to' => $to,
                'subject' => $subject,
                'from' => 'sarinonhoelivan29@gmail.com'
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Failed to send email', [
                'error' => $e->getMessage(),
                'to' => $to,
                'subject' => $subject
            ]);

            return false;
        }
    }

    /**
     * Send document correction request email
     *
     * @param string $email
     * @param string $applicantName
     * @param array $documentsToCorrect
     * @param string $notes
     * @param string $correctionToken
     * @return bool
     */
    public static function sendCorrectionRequestEmail($email, $applicantName, $documentsToCorrect, $notes, $correctionToken)
    {
        $emailData = [
            'applicantName' => $applicantName,
            'documentsToCorrect' => $documentsToCorrect,
            'notes' => $notes,
            'correctionUrl' => config('app.frontend_url', 'http://localhost:3000') . '/document-correction/' . $correctionToken,
            'expiryDays' => 7
        ];

        $subject = 'Document Correction Required - PWD Application';
        $to = $email;

        Log::info('Attempting to send correction request email', [
            'to' => $to,
            'applicantName' => $applicantName,
            'documentsCount' => count($documentsToCorrect)
        ]);

        // Try SMTP first
        try {
            Mail::send('emails.document-correction-request', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Document correction request email sent via SMTP', [
                'to' => $to,
                'applicantName' => $applicantName
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Failed to send document correction request email', [
                'error' => $e->getMessage(),
                'to' => $to,
                'applicantName' => $applicantName
            ]);

            return false;
        }
    }

    /**
     * Send application rejection email with reason and reference number
     *
     * @param array $data
     * @return bool
     */
    public function sendApplicationRejectionEmail($data)
    {
        $referenceNumber = $data['referenceNumber'] ?? 'N/A';
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $statusCheckUrl = "{$frontendUrl}/check-status/{$referenceNumber}";
        
        // Build rejection message with just the remarks/notes
        $rejectionMessage = !empty($data['remarks']) ? $data['remarks'] : ($data['rejectionReason'] ?? 'Your application has been rejected.');
        
        $emailData = [
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'referenceNumber' => $referenceNumber,
            'rejectionReason' => $rejectionMessage,
            'statusCheckUrl' => $statusCheckUrl
        ];

        $subject = 'PWD Application Status Update - Rejected';
        $to = $data['email'];

        Log::info('Attempting to send rejection email', [
            'to' => $to,
            'referenceNumber' => $data['referenceNumber']
        ]);

        // Try SMTP first
        try {
            Mail::send('emails.application-rejected', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Application rejection email sent via SMTP', [
                'to' => $to,
                'referenceNumber' => $data['referenceNumber']
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('SMTP failed for rejection email, trying Gmail API', [
                'error' => $e->getMessage(),
                'to' => $to,
                'trace' => $e->getTraceAsString()
            ]);
        }

        // Fallback to Gmail API if SMTP fails
        if ($this->gmailService && $this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make('emails.application-rejected', $emailData)->render();
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Application rejection email sent via Gmail API', [
                        'to' => $to,
                        'referenceNumber' => $data['referenceNumber']
                    ]);
                    return true;
                }
            } catch (\Exception $e) {
                Log::error('Gmail API failed for rejection email', [
                    'error' => $e->getMessage(),
                    'to' => $to
                ]);
            }
        }

        Log::error('Failed to send application rejection email via both SMTP and Gmail API', [
            'to' => $to,
            'referenceNumber' => $data['referenceNumber']
        ]);

        return false;
    }

    /**
     * Send application submission confirmation email with reference number
     *
     * @param array $data
     * @return bool
     */
    public function sendApplicationSubmissionEmail($data)
    {
        $emailData = [
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'referenceNumber' => $data['referenceNumber'],
            'submissionDate' => $data['submissionDate'],
            'statusCheckUrl' => config('app.frontend_url', 'http://localhost:3000') . '/check-application-status'
        ];

        $subject = 'PWD Application Submitted Successfully';
        $to = $data['email'];

        Log::info('Attempting to send submission confirmation email', [
            'to' => $to,
            'referenceNumber' => $data['referenceNumber']
        ]);

        // Try SMTP first
        try {
            Mail::send('emails.application-submitted', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Application submission email sent via SMTP', [
                'to' => $to,
                'referenceNumber' => $data['referenceNumber']
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('SMTP failed for submission email, trying Gmail API', [
                'error' => $e->getMessage(),
                'to' => $to,
                'trace' => $e->getTraceAsString()
            ]);
        }

        // Fallback to Gmail API if SMTP fails
        if ($this->gmailService && $this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make('emails.application-submitted', $emailData)->render();
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Application submission email sent via Gmail API', [
                        'to' => $to,
                        'referenceNumber' => $data['referenceNumber']
                    ]);
                    return true;
                }
            } catch (\Exception $e) {
                Log::error('Gmail API failed for submission email', [
                    'error' => $e->getMessage(),
                    'to' => $to
                ]);
            }
        }

        Log::error('Failed to send application submission email via both SMTP and Gmail API', [
            'to' => $to,
            'referenceNumber' => $data['referenceNumber']
        ]);

        return false;
    }

    /**
     * Send PWD card expiration notification email
     *
     * @param array $data
     * @return bool
     */
    public function sendCardExpirationEmail($data)
    {
        $emailData = [
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'pwdId' => $data['pwdId'],
            'expirationDate' => $data['expirationDate'],
            'daysUntilExpiration' => $data['daysUntilExpiration'] ?? 30,
            'renewalUrl' => $data['renewalUrl'] ?? config('app.frontend_url', 'http://localhost:3000') . '/renewal',
            'loginUrl' => $data['loginUrl'] ?? config('app.frontend_url', 'http://localhost:3000') . '/login',
        ];

        $subject = 'Important: Your PWD ID Card Expires in 30 Days';
        $to = $data['email'];

        Log::info('Attempting to send card expiration email', [
            'to' => $to,
            'pwdId' => $data['pwdId'],
            'expirationDate' => $data['expirationDate']
        ]);

        // Try SMTP first
        try {
            Mail::send('emails.card-expiration-notice', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Card expiration email sent via SMTP', [
                'to' => $to,
                'pwdId' => $data['pwdId']
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('SMTP failed for expiration email, trying Gmail API', [
                'error' => $e->getMessage(),
                'to' => $to,
                'trace' => $e->getTraceAsString()
            ]);
        }

        // Fallback to Gmail API if SMTP fails
        if ($this->gmailService && $this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make('emails.card-expiration-notice', $emailData)->render();
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Card expiration email sent via Gmail API', [
                        'to' => $to,
                        'pwdId' => $data['pwdId']
                    ]);
                    return true;
                }
            } catch (\Exception $e) {
                Log::error('Gmail API failed for expiration email', [
                    'error' => $e->getMessage(),
                    'to' => $to
                ]);
            }
        }

        Log::error('Failed to send card expiration email via both SMTP and Gmail API', [
            'to' => $to,
            'pwdId' => $data['pwdId']
        ]);

        return false;
    }

    /**
     * Send ID renewal approval email
     *
     * @param array $data
     * @return bool
     */
    public function sendRenewalApprovalEmail($data)
    {
        $emailData = [
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'pwdId' => $data['pwdId'],
            'newExpirationDate' => $data['newExpirationDate'],
            'renewalDate' => $data['renewalDate'] ?? now()->format('F d, Y'),
            'notes' => $data['notes'] ?? '',
            'loginUrl' => $data['loginUrl'] ?? config('app.frontend_url', 'http://localhost:3000') . '/login'
        ];

        $subject = 'PWD ID Card Renewal Approved';
        $to = $data['email'];

        Log::info('Attempting to send renewal approval email', [
            'to' => $to,
            'pwdId' => $data['pwdId'],
            'newExpirationDate' => $data['newExpirationDate']
        ]);

        // Try SMTP first
        try {
            Mail::send('emails.renewal-approved', $emailData, function ($message) use ($to, $subject) {
                $message->to($to)
                       ->subject($subject)
                       ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
            });

            Log::info('Renewal approval email sent via SMTP', [
                'to' => $to,
                'pwdId' => $data['pwdId']
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('SMTP failed for renewal approval email, trying Gmail API', [
                'error' => $e->getMessage(),
                'to' => $to,
                'trace' => $e->getTraceAsString()
            ]);
        }

        // Fallback to Gmail API if SMTP fails
        if ($this->gmailService && $this->gmailService->isConfigured()) {
            try {
                $htmlBody = View::make('emails.renewal-approved', $emailData)->render();
                
                if ($this->gmailService->sendEmail($to, $subject, $htmlBody)) {
                    Log::info('Renewal approval email sent via Gmail API', [
                        'to' => $to,
                        'pwdId' => $data['pwdId']
                    ]);
                    return true;
                }
            } catch (\Exception $e) {
                Log::error('Gmail API failed for renewal approval email', [
                    'error' => $e->getMessage(),
                    'to' => $to
                ]);
            }
        }

        Log::error('Failed to send renewal approval email via both SMTP and Gmail API', [
            'to' => $to,
            'pwdId' => $data['pwdId']
        ]);

        return false;
    }

    /**
     * Get Gmail service instance for OAuth operations
     *
     * @return GmailService
     */
    public function getGmailService()
    {
        return $this->gmailService;
    }
}
