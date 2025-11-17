<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class IDRenewal extends Model
{
    use HasFactory;

    protected $table = 'id_renewals';
    protected $primaryKey = 'id';

    protected $fillable = [
        'member_id',
        'old_card_image_path',
        'medical_certificate_path',
        'status',
        'notes',
        'reviewed_by',
        'submitted_at',
        'reviewed_at'
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime'
    ];

    // Relationships
    public function member()
    {
        return $this->belongsTo(PWDMember::class, 'member_id', 'userID');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'userID');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // Helper methods
    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }
}
