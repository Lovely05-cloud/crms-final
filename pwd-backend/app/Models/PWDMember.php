<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PWDMember extends Model
{
    use HasFactory;

    protected $table = 'pwd_members';
    protected $primaryKey = 'id';
    public $incrementing = true;

    protected $fillable = [
        'userID',
        'pwd_id',
        'pwd_id_generated_at',
        'firstName',
        'lastName',
        'middleName',
        'suffix',
        'birthDate',
        'gender',
        'disabilityType',
        'address',
        'contactNumber',
        'email',
        'barangay',
        'emergencyContact',
        'emergencyPhone',
        'emergencyRelationship',
        'status',
        'cardClaimed',
        'cardIssueDate',
        'cardExpirationDate'
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'userID', 'userID');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'pwdID', 'userID');
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'pwdID', 'userID');
    }

    public function benefitClaims()
    {
        return $this->hasMany(BenefitClaim::class, 'pwdID', 'userID');
    }

    public function memberDocuments()
    {
        return $this->hasMany(MemberDocument::class, 'member_id', 'userID');
    }

    public function idRenewals()
    {
        return $this->hasMany(IDRenewal::class, 'member_id', 'userID');
    }

    protected $casts = [
        'birthDate' => 'date',
        'cardIssueDate' => 'date',
        'cardExpirationDate' => 'date',
        'cardClaimed' => 'boolean'
    ];
}