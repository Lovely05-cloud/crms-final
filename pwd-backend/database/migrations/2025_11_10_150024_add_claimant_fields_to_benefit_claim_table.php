<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('benefit_claim', function (Blueprint $table) {
            $table->string('claimantType')->nullable()->after('status');
            $table->string('claimantName')->nullable()->after('claimantType');
            $table->string('claimantRelation')->nullable()->after('claimantName');
            $table->string('authorizationLetter')->nullable()->after('claimantRelation');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('benefit_claim', function (Blueprint $table) {
            $table->dropColumn(['claimantType', 'claimantName', 'claimantRelation', 'authorizationLetter']);
        });
    }
};
