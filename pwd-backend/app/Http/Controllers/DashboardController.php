<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PWDMember;
use App\Models\Application;
use App\Models\BenefitClaim;
use App\Models\SupportTicket;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get monthly PWD registration statistics
     */
    public function getMonthlyStats(Request $request)
    {
        try {
            $year = $request->get('year', date('Y'));
            
            // Cache monthly stats for 5 minutes
            $cacheKey = "dashboard.monthly_stats.{$year}";
            
            $chartData = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($year) {
                // Check if pwd_member table exists, if not use approved applications
                $monthlyData = collect();
                try {
                    $monthlyData = PWDMember::select(
                        DB::raw('MONTH(created_at) as month'),
                        DB::raw('COUNT(*) as registered_count')
                    )
                    ->whereYear('created_at', $year)
                    ->groupBy(DB::raw('MONTH(created_at)'))
                    ->orderBy('month')
                    ->get();
                } catch (\Exception $e) {
                    // Table doesn't exist or has issues, use approved applications as PWD members
                    $monthlyData = Application::select(
                        DB::raw('MONTH(created_at) as month'),
                        DB::raw('COUNT(*) as registered_count')
                    )
                    ->where('status', 'Approved')
                    ->whereYear('created_at', $year)
                    ->groupBy(DB::raw('MONTH(created_at)'))
                    ->orderBy('month')
                    ->get();
                }

                // Prepare the response data for all 12 months
                $months = [
                    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
                ];

                // Convert to array for easier access
                $monthlyArray = $monthlyData->pluck('registered_count', 'month')->toArray();
                
                $chartData = [];
                for ($i = 1; $i <= 12; $i++) {
                    $chartData[] = [
                        'month' => $months[$i - 1],
                        'registered' => $monthlyArray[(string)$i] ?? 0
                    ];
                }
                
                return $chartData;
            });

            return response()->json([
                'success' => true,
                'data' => $chartData,
                'year' => $year
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch monthly statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard overview statistics
     */
    public function getDashboardStats()
    {
        try {
            // Cache dashboard stats for 5 minutes
            $stats = Cache::remember('dashboard.stats', now()->addMinutes(5), function () {
                // Check if pwd_member table exists
                $pwdMemberCount = 0;
                try {
                    $pwdMemberCount = PWDMember::count();
                } catch (\Exception $e) {
                    // Table doesn't exist or has issues, use approved applications as PWD members
                    $pwdMemberCount = Application::where('status', 'Approved')->count();
                }

                // Get support tickets count
                $supportTicketsCount = 0;
                $resolvedTicketsCount = 0;
                try {
                    $supportTicketsCount = SupportTicket::count();
                    $resolvedTicketsCount = SupportTicket::whereIn('status', ['resolved', 'closed'])->count();
                    \Illuminate\Support\Facades\Log::info('Support tickets count:', ['count' => $supportTicketsCount, 'resolved' => $resolvedTicketsCount]);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error fetching support tickets count:', ['error' => $e->getMessage()]);
                    // Table doesn't exist or has issues, use default value
                    $supportTicketsCount = 0;
                    $resolvedTicketsCount = 0;
                }

                // Get claimed IDs count (members with cardClaimed = true)
                $claimedIDsCount = 0;
                try {
                    $claimedIDsCount = PWDMember::where('cardClaimed', true)
                        ->whereNull('archived_at')
                        ->count();
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error fetching claimed IDs count:', ['error' => $e->getMessage()]);
                    $claimedIDsCount = 0;
                }

                // Get renewed IDs count (members with cardClaimed = true and cardExpirationDate > cardIssueDate)
                $renewedIDsCount = 0;
                try {
                    $renewedIDsCount = PWDMember::where('cardClaimed', true)
                        ->whereNull('archived_at')
                        ->whereNotNull('cardIssueDate')
                        ->whereNotNull('cardExpirationDate')
                        ->whereColumn('cardExpirationDate', '>', 'cardIssueDate')
                        ->count();
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error fetching renewed IDs count:', ['error' => $e->getMessage()]);
                    $renewedIDsCount = 0;
                }

                // Get claimed benefits count (benefit_claim with status = 'Claimed')
                $claimedBenefitsCount = 0;
                try {
                    $claimedBenefitsCount = BenefitClaim::where('status', 'Claimed')->count();
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error fetching claimed benefits count:', ['error' => $e->getMessage()]);
                    $claimedBenefitsCount = 0;
                }

                return [
                    'totalPWDMembers' => $pwdMemberCount,
                    'pendingApplications' => Application::whereIn('status', ['Pending Barangay Approval', 'Pending Admin Approval'])->count(),
                    'approvedApplications' => Application::where('status', 'Approved')->count(),
                    'activeMembers' => $pwdMemberCount, // All PWD members are considered active
                    'supportTickets' => $supportTicketsCount,
                    'resolvedTickets' => $resolvedTicketsCount,
                    'claimedIDs' => $claimedIDsCount,
                    'renewedIDs' => $renewedIDsCount,
                    'claimedBenefits' => $claimedBenefitsCount
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activities
     */
    public function getRecentActivities()
    {
        try {
            // Cache recent activities for 2 minutes (frequently updated)
            $activities = Cache::remember('dashboard.recent_activities', now()->addMinutes(2), function () {
                return Application::orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get()
                    ->map(function ($app) {
                        return [
                            'id' => $app->applicationID,
                            'title' => 'New PWD Application',
                            'description' => "Application from {$app->firstName} {$app->lastName}",
                            'barangay' => $app->barangay,
                            'status' => $app->status === 'Approved' ? 'approved' : 'pending',
                            'icon' => 'person_add',
                            'color' => $app->status === 'Approved' ? '#27AE60' : '#F39C12',
                            'created_at' => $app->created_at
                        ];
                    });
            });

            return response()->json([
                'success' => true,
                'data' => $activities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get barangay coordination data
     */
    public function getBarangayCoordination()
    {
        try {
            // Cache barangay coordination data for 15 minutes (infrequent changes)
            $contacts = Cache::remember('dashboard.barangay_coordination', now()->addMinutes(15), function () {
                // Get barangay presidents with their contact information
                $barangayPresidents = \App\Models\BarangayPresident::with('user')
                    ->whereNotNull('barangay')
                    ->get();

                $contacts = [];

                foreach ($barangayPresidents as $president) {
                    $contacts[] = [
                        'barangay' => $president->barangay,
                        'president_name' => $president->user->username ?? 'Unknown',
                        'email' => $president->email ?? $president->user->email ?? 'No email',
                        'phone' => $president->contact_number ?? 'No contact number',
                        'address' => "Barangay {$president->barangay}, Cabuyao City, Laguna",
                        'pwd_count' => 0, // Not needed as per user request
                        'pending_applications' => 0, // Not needed as per user request
                        'status' => $president->user->status ?? 'active'
                    ];
                }

                // If no barangay presidents found, return empty array
                if (empty($contacts)) {
                    return [];
                }

                // Sort by barangay name
                usort($contacts, function ($a, $b) {
                    return strcmp($a['barangay'], $b['barangay']);
                });

                return $contacts;
            });

            return response()->json([
                'success' => true,
                'data' => $contacts
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch barangay coordination data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
