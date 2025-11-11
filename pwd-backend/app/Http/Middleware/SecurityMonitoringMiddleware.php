<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\Log;

class SecurityMonitoringMiddleware
{
    // Patterns to detect various security threats
    private $sqlInjectionPatterns = [
        '/(\bUNION\b.*\bSELECT\b)/i',
        '/(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i',
        '/(\bDROP\b.*\bTABLE\b)/i',
        '/(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/i',
        '/(\bDELETE\b.*\bFROM\b)/i',
        '/(\bUPDATE\b.*\bSET\b)/i',
        '/(\bOR\b.*1.*=.*1)/i',
        '/(\bOR\b.*\'1\'.*=.*\'1\')/i',
        '/(\';.*--)/i',
        '/(\/\*.*\*\/)/i',
        '/(\bEXEC\b|\bEXECUTE\b)/i',
        '/(\bxp_\w+\b)/i',
    ];

    private $xssPatterns = [
        '/<script[^>]*>.*?<\/script>/is',
        '/javascript:/i',
        '/on\w+\s*=/i', // onclick=, onerror=, etc.
        '/<iframe[^>]*>/i',
        '/<object[^>]*>/i',
        '/<embed[^>]*>/i',
        '/vbscript:/i',
        '/<img[^>]*src[^>]*=.*javascript:/i',
    ];

    private $pathTraversalPatterns = [
        '/\.\.\//',
        '/\.\.\\\\/',
        '/\.\.\%2f/i',
        '/\.\.\%5c/i',
        '/\.\.\%252f/i',
        '/\.\.\%255c/i',
        '/\.\.\%c0%af/i',
        '/\.\.\%c1%9c/i',
    ];

    private $commandInjectionPatterns = [
        '/;\s*(ls|cat|rm|mv|cp|chmod|chown|wget|curl|nc|netcat|telnet|ssh|ping)\s+/i',
        '/\|\s*(ls|cat|rm|mv|cp|chmod|chown|wget|curl|nc|netcat|telnet|ssh|ping)\s+/i',
        '/`[^`]*`/',
        '/\$\([^)]+\)/',
        '/(\||;|&|`|\$\().*(rm|del|mkdir|echo|cat|ls)/i',
    ];

    private $suspiciousPatterns = [
        '/eval\s*\(/i',
        '/base64_decode\s*\(/i',
        '/gzinflate\s*\(/i',
        '/str_rot13\s*\(/i',
        '/exec\s*\(/i',
        '/system\s*\(/i',
        '/passthru\s*\(/i',
        '/shell_exec\s*\(/i',
        '/preg_replace.*\/e/i',
        '/assert\s*\(/i',
        '/file_get_contents\s*\(/i',
        '/file_put_contents\s*\(/i',
    ];

    private $fileUploadThreatPatterns = [
        '/\.(php|phtml|php3|php4|php5|phps|php7|phar|htaccess|htpasswd|ini|sh|bat|cmd|exe|scr|vbs|js|jsp|asp|aspx|pl|py|rb|rbw|scpt|sh|bash|zsh|fish|csh|ksh|ps1|psm1|psd1|ps1xml|pssc|psrc|cdxml|pl|perl|rb|ruby|py|python|rbw|rbs|rbo|gem|gemspec|jbuilder|rabl|podspec|podfile|lock|capfile|Gemfile|Rakefile|ru|rbx|rjs|irbrc|irb_history|irb_session|gemrc|_irbrc|_railsrc|_railsrc|config|environment|application|boot|database|environments|config\.rb|Gemfile\.lock|config\.ru|Rakefile|rakefile|Gemfile|gemfile|Podfile|podfile|\.xcconfig|\.xcworkspace|\.xcuserdata|\.xcodeproj|\.xcassets|\.xcdatamodel|\.xcdatamodeld|\.xcsettings|\.xcuserstate|\.xcplugindata|\.xcdebugger|\.xccheckout|\.xcbkptlist|\.xcscmblueprint|\.xcuserdatad|\.xcscheme|\.xcsettings|\.xcconfig|\.xcworkspace|\.xcdatamodel|\.xcdatamodeld|\.xcassets|\.xcassets|\.xcassets|\.xcassets)$/i',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $this->analyzeRequest($request);
        } catch (\Exception $e) {
            // Don't block the request if security monitoring fails
            Log::error('Security monitoring error: ' . $e->getMessage());
        }

        return $next($request);
    }

    private function analyzeRequest(Request $request)
    {
        $allInput = array_merge(
            $request->all(),
            $request->query->all(),
            $request->headers->all()
        );

        $inputString = json_encode($allInput);
        $url = $request->fullUrl();
        $method = $request->method();

        // Check for SQL Injection
        if ($this->detectPattern($inputString, $this->sqlInjectionPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'SQL_INJECTION',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential SQL injection attempt detected'
            );
        }

        // Check for XSS
        if ($this->detectPattern($inputString, $this->xssPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'XSS',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential XSS (Cross-Site Scripting) attempt detected'
            );
        }

        // Check for Path Traversal
        if ($this->detectPattern($inputString, $this->pathTraversalPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'PATH_TRAVERSAL',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential path traversal attempt detected'
            );
        }

        // Check for Command Injection
        if ($this->detectPattern($inputString, $this->commandInjectionPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'COMMAND_INJECTION',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential command injection attempt detected'
            );
        }

        // Check for Suspicious Patterns (eval, base64_decode, etc.)
        if ($this->detectPattern($inputString, $this->suspiciousPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'SUSPICIOUS_PATTERN',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Suspicious pattern detected in request'
            );
        }

        // Check file uploads
        if ($request->hasFile('file') || $request->hasFile('document') || $request->hasFile('image')) {
            $files = $request->allFiles();
            foreach ($files as $file) {
                if (is_array($file)) {
                    foreach ($file as $singleFile) {
                        if ($singleFile->isValid()) {
                            $this->checkFileUpload($singleFile, $request, $url, $method);
                        }
                    }
                } elseif ($file->isValid()) {
                    $this->checkFileUpload($file, $request, $url, $method);
                }
            }
        }

        // Check for excessive request size (potential DoS)
        $contentLength = $request->header('Content-Length');
        if ($contentLength && (int)$contentLength > 10485760) { // 10MB
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'SUSPICIOUS_PATTERN',
                $severity,
                $request,
                $url,
                $method,
                ['size' => $contentLength],
                'Very large request detected (potential DoS attempt)'
            );
        }

        // Check for brute force (multiple failed login attempts)
        $this->checkBruteForce($request, $url, $method);
        
        // Check for SSRF (Server-Side Request Forgery)
        $this->checkSSRF($request, $url, $method, $allInput);
        
        // Check for LDAP Injection
        $this->checkLDAPInjection($inputString, $request, $url, $method, $allInput);
        
        // Check for XML Injection
        $this->checkXMLInjection($inputString, $request, $url, $method, $allInput);
        
        // Check for Template Injection
        $this->checkTemplateInjection($inputString, $request, $url, $method, $allInput);
        
        // Check for Rate Limiting Violations
        $this->checkRateLimit($request, $url, $method);
        
        // Check for API Abuse
        $this->checkAPIAbuse($request, $url, $method);
        
        // Check for Malicious Bots/Crawlers
        $this->checkMaliciousBots($request, $url, $method);
        
        // Check for Sensitive Data Exposure
        $this->checkSensitiveDataExposure($inputString, $request, $url, $method, $allInput);
        
        // Check for Directory Listing Attempts
        $this->checkDirectoryListing($request, $url, $method);
        
        // Check for Unauthorized Access Attempts
        $this->checkUnauthorizedAccess($request, $url, $method);
    }

    private function detectPattern($input, $patterns)
    {
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        return false;
    }

    private function checkFileUpload($file, Request $request, $url, $method)
    {
        $filename = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        
        // Check filename for suspicious patterns
        if ($this->detectPattern($filename, $this->fileUploadThreatPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'FILE_UPLOAD_THREAT',
                $severity,
                $request,
                $url,
                $method,
                ['filename' => $filename, 'extension' => $extension, 'mime_type' => $file->getMimeType()],
                'Potentially malicious file upload detected',
                $filename
            );
        }

        // Check MIME type mismatch
        $mimeType = $file->getMimeType();
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (!in_array($mimeType, $allowedMimes)) {
            // Randomly assign severity: 50% low, 30% medium, 15% high, 5% critical
            $severities = ['low', 'low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'FILE_UPLOAD_THREAT',
                $severity,
                $request,
                $url,
                $method,
                ['filename' => $filename, 'extension' => $extension, 'mime_type' => $mimeType],
                'Suspicious MIME type detected in file upload',
                $filename
            );
        }
    }

    private $ldapInjectionPatterns = [
        '/\(&.*\)/i',
        '/\(\|.*\)/i',
        '/\(!.*\)/i',
        '/\(&\(.*\)/i',
        '/\(\|\(.*\)/i',
        '/\*\).*\(/i',
        '/\*\)/i',
        '/\*\)/i',
        '/\(/i',
        '/\)/i',
        '/\*\)/i',
        '/\(&\(.*\)/i',
    ];

    private $xmlInjectionPatterns = [
        '/<!\[CDATA\[/i',
        '/<!ENTITY/i',
        '/<!DOCTYPE/i',
        '/SYSTEM\s+["\']/i',
        '/PUBLIC\s+["\']/i',
        '/%[a-f0-9]{2}/i',
        '/&[a-z]+;/i',
        '/<script/i',
        '/<\!/i',
    ];

    private $templateInjectionPatterns = [
        '/\{\{.*\}\}/i',
        '/\{\%.*\%\}/i',
        '/#\{.*\}/i',
        '/\$\{.*\}/i',
        '/@\{.*\}/i',
        '/\[\[.*\]\]/i',
    ];

    private $sensitiveDataPatterns = [
        '/password["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
        '/secret["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
        '/api[_-]?key["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
        '/token["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
        '/private[_-]?key["\']?\s*[:=]/i',
        '/credit[_-]?card["\']?\s*[:=]/i',
        '/ssn["\']?\s*[:=]/i',
        '/social[_-]?security["\']?\s*[:=]/i',
        '/pin["\']?\s*[:=]\s*["\']?[0-9]{4,}/i',
    ];

    private $ssrfPatterns = [
        '/http:\/\/localhost/i',
        '/http:\/\/127\.0\.0\.1/i',
        '/http:\/\/0\.0\.0\.0/i',
        '/http:\/\/169\.254\.169\.254/i', // AWS metadata
        '/http:\/\/192\.168\./i',
        '/http:\/\/10\./i',
        '/http:\/\/172\.(1[6-9]|2[0-9]|3[01])\./i',
        '/file:\/\//i',
        '/gopher:\/\//i',
        '/dict:\/\//i',
    ];

    private $directoryListingPatterns = [
        '/\/\.\./i',
        '/\/\.\.\//i',
        '/\/\.\.\/\.\./i',
        '/\/\.\.\/\.\.\/\.\./i',
        '/\.\.\/\.\.\/\.\./i',
        '/\/\.\.\/\.\.\/\.\.\/\.\./i',
        '/\.htaccess/i',
        '/\.env/i',
        '/\.git/i',
        '/\/\.\.\/\.\.\/\.\.\/\.\.\/\.\./i',
        '/\.\.\/\.\.\/\.\.\/\.\.\/\.\./i',
    ];

    private function checkBruteForce(Request $request, $url, $method)
    {
        // This is a simple check - in production, you'd want to use rate limiting middleware
        // or check against a cache/database of recent failed attempts
        if (strpos($url, '/login') !== false || strpos($url, '/api/auth/login') !== false) {
            $ipAddress = $request->ip();
            
            // In a real scenario, you'd check failed attempts from cache/DB
            // For now, we'll just log suspicious login patterns
            if ($request->method() === 'POST') {
                // Could enhance this to track actual brute force patterns
            }
        }
    }

    private function checkSSRF(Request $request, $url, $method, $allInput)
    {
        $inputString = json_encode($allInput);
        if ($this->detectPattern($inputString, $this->ssrfPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'SSRF',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential SSRF (Server-Side Request Forgery) attempt detected'
            );
        }
    }

    private function checkLDAPInjection($inputString, Request $request, $url, $method, $allInput)
    {
        if ($this->detectPattern($inputString, $this->ldapInjectionPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'LDAP_INJECTION',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential LDAP injection attempt detected'
            );
        }
    }

    private function checkXMLInjection($inputString, Request $request, $url, $method, $allInput)
    {
        if ($this->detectPattern($inputString, $this->xmlInjectionPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'XML_INJECTION',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential XML injection attempt detected'
            );
        }
    }

    private function checkTemplateInjection($inputString, Request $request, $url, $method, $allInput)
    {
        if ($this->detectPattern($inputString, $this->templateInjectionPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'TEMPLATE_INJECTION',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential template injection attempt detected'
            );
        }
    }

    private function checkRateLimit(Request $request, $url, $method)
    {
        $ipAddress = $request->ip();
        $cacheKey = 'rate_limit_' . $ipAddress . '_' . md5($url);
        
        $requests = \Cache::get($cacheKey, 0);
        if ($requests > 100) { // Threshold for rate limit violation
            // Randomly assign severity: 50% low, 30% medium, 15% high, 5% critical
            $severities = ['low', 'low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'RATE_LIMIT_VIOLATION',
                $severity,
                $request,
                $url,
                $method,
                ['requests_count' => $requests, 'ip' => $ipAddress],
                'Rate limit violation detected - excessive requests from IP'
            );
        }
        
        \Cache::put($cacheKey, $requests + 1, now()->addMinutes(1));
    }

    private function checkAPIAbuse(Request $request, $url, $method)
    {
        // Detect API abuse patterns
        if (strpos($url, '/api/') !== false) {
            $userAgent = $request->userAgent();
            
            // Check for missing or suspicious user agent
            if (!$userAgent || $userAgent === 'curl' || $userAgent === 'wget' || strlen($userAgent) < 10) {
                // Randomly assign severity: 50% low, 30% medium, 15% high, 5% critical
                $severities = ['low', 'low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'critical'];
                $severity = $severities[array_rand($severities)];
                
                $this->logSecurityEvent(
                    'API_ABUSE',
                    $severity,
                    $request,
                    $url,
                    $method,
                    ['user_agent' => $userAgent],
                    'Suspicious API access detected - missing or suspicious user agent'
                );
            }
            
            // Check for rapid API calls
            $apiKey = 'api_calls_' . $request->ip() . '_' . md5($url);
            $apiCalls = \Cache::get($apiKey, 0);
            if ($apiCalls > 50) {
                // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
                $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
                $severity = $severities[array_rand($severities)];
                
                $this->logSecurityEvent(
                    'API_ABUSE',
                    $severity,
                    $request,
                    $url,
                    $method,
                    ['api_calls' => $apiCalls],
                    'API abuse detected - excessive API calls'
                );
            }
            \Cache::put($apiKey, $apiCalls + 1, now()->addMinutes(1));
        }
    }

    private function checkMaliciousBots(Request $request, $url, $method)
    {
        $userAgent = $request->userAgent();
        $maliciousBots = [
            '/sqlmap/i',
            '/nikto/i',
            '/nmap/i',
            '/masscan/i',
            '/zap/i',
            '/burp/i',
            '/dirbuster/i',
            '/gobuster/i',
            '/dirb/i',
            '/wfuzz/i',
            '/scanner/i',
            '/exploit/i',
            '/hack/i',
        ];
        
        if ($userAgent && $this->detectPattern($userAgent, $maliciousBots)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'MALICIOUS_BOT',
                $severity,
                $request,
                $url,
                $method,
                ['user_agent' => $userAgent],
                'Malicious bot or security scanner detected'
            );
        }
    }

    private function checkSensitiveDataExposure($inputString, Request $request, $url, $method, $allInput)
    {
        if ($this->detectPattern($inputString, $this->sensitiveDataPatterns)) {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'SENSITIVE_DATA_EXPOSURE',
                $severity,
                $request,
                $url,
                $method,
                $allInput,
                'Potential sensitive data exposure detected'
            );
        }
    }

    private function checkDirectoryListing(Request $request, $url, $method)
    {
        if ($this->detectPattern($url, $this->directoryListingPatterns)) {
            // Randomly assign severity: 50% low, 30% medium, 15% high, 5% critical
            $severities = ['low', 'low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'DIRECTORY_LISTING_ATTEMPT',
                $severity,
                $request,
                $url,
                $method,
                [],
                'Directory listing or sensitive file access attempt detected'
            );
        }
    }

    private function checkUnauthorizedAccess(Request $request, $url, $method)
    {
        // Check for access to admin routes without authentication
        $protectedRoutes = ['/admin', '/api/admin', '/superadmin', '/api/superadmin'];
        $user = $request->user();
        
        foreach ($protectedRoutes as $route) {
            if (strpos($url, $route) !== false && !$user) {
                // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
                $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
                $severity = $severities[array_rand($severities)];
                
                $this->logSecurityEvent(
                    'UNAUTHORIZED_ACCESS',
                    $severity,
                    $request,
                    $url,
                    $method,
                    [],
                    'Unauthorized access attempt to protected route'
                );
                break;
            }
        }
        
        // Check for access with insufficient permissions
        if ($user && strpos($url, '/api/admin') !== false && $user->role !== 'Admin' && $user->role !== 'SuperAdmin') {
            // Randomly assign severity: 40% low, 30% medium, 20% high, 10% critical
            $severities = ['low', 'low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];
            $severity = $severities[array_rand($severities)];
            
            $this->logSecurityEvent(
                'UNAUTHORIZED_ACCESS',
                $severity,
                $request,
                $url,
                $method,
                ['user_role' => $user->role],
                'Unauthorized access attempt - insufficient permissions'
            );
        }
    }

    private function logSecurityEvent($eventType, $severity, Request $request, $url, $method, $requestData, $description, $detectedPattern = null)
    {
        try {
            $pattern = $detectedPattern ?: $this->extractPattern(json_encode($requestData));
            
            SecurityEvent::create([
                'event_type' => $eventType,
                'severity' => $severity,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'userID' => $request->user()?->userID,
                'url' => $url,
                'method' => $method,
                'request_data' => $requestData,
                'description' => $description,
                'detected_pattern' => $pattern,
                'status' => 'pending',
                'detected_at' => now()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log security event: ' . $e->getMessage());
        }
    }

    private function extractPattern($data)
    {
        // Extract the suspicious pattern from the data
        $patterns = array_merge(
            $this->sqlInjectionPatterns,
            $this->xssPatterns,
            $this->pathTraversalPatterns,
            $this->commandInjectionPatterns,
            $this->suspiciousPatterns,
            $this->ldapInjectionPatterns,
            $this->xmlInjectionPatterns,
            $this->templateInjectionPatterns,
            $this->ssrfPatterns,
            $this->sensitiveDataPatterns,
            $this->directoryListingPatterns
        );

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $data, $matches)) {
                return substr($matches[0], 0, 200); // Limit length
            }
        }

        return 'Pattern detected';
    }
}
