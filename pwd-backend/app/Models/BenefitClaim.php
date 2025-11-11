<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BenefitClaim extends Model
{
    use HasFactory;

    protected $table = 'benefit_claim';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'pwdID',
        'benefitID',
        'claimDate',
        'status',
        'claimantType',
        'claimantName',
        'claimantRelation',
        'authorizationLetter'
    ];

    protected $casts = [
        'claimDate' => 'date',
        'status' => 'string'
    ];

    // Relationships
    public function pwdMember()
    {
        return $this->belongsTo(PWDMember::class, 'pwdID', 'userID');
    }

    public function benefit()
    {
        return $this->belongsTo(Benefit::class, 'benefitID', 'id');
    }
}