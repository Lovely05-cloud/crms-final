<?php
// app/Models/Application.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasFactory;

    protected $table = 'application';
    protected $primaryKey = 'applicationID';
    
    protected $fillable = [
        'referenceNumber',
        'pwdID',
        'firstName',
        'lastName',
        'middleName',
        'suffix',
        'birthDate',
        'gender',
        'civilStatus',
        'nationality',
        'disabilityType',
        'disabilityCause',
        'disabilityDate',
        'address',
        'barangay',
        'city',
        'province',
        'postalCode',
        'email',
        'contactNumber',
        'emergencyContact',
        'emergencyPhone',
        'emergencyRelationship',
        'idType',
        'idNumber',
        'medicalCertificate',
        'clinicalAbstract',
        'voterCertificate',
        'idPictures',
        'birthCertificate',
        'wholeBodyPicture',
        'affidavit',
        'barangayCertificate',
        'submissionDate',
        'status',
        'remarks',
        'scheduled_deletion_at'
    ];

    protected $casts = [
        'submissionDate' => 'date',
        'birthDate' => 'date',
        'disabilityDate' => 'date',
        'status' => 'string',
        'scheduled_deletion_at' => 'datetime'
    ];

    // Relationships
    public function pwdMember()
    {
        return $this->belongsTo(PWDMember::class, 'pwdID', 'userID');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'Approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'Rejected');
    }
}