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
        Schema::table('pwd_members', function (Blueprint $table) {
            // Add qr_code_data and qr_code_generated_at columns if they don't exist
            if (!Schema::hasColumn('pwd_members', 'qr_code_data')) {
                $table->text('qr_code_data')->nullable()->after('pwd_id_generated_at');
            }
            if (!Schema::hasColumn('pwd_members', 'qr_code_generated_at')) {
                $table->timestamp('qr_code_generated_at')->nullable()->after('qr_code_data');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('pwd_members', function (Blueprint $table) {
            if (Schema::hasColumn('pwd_members', 'qr_code_data')) {
                $table->dropColumn('qr_code_data');
            }
            if (Schema::hasColumn('pwd_members', 'qr_code_generated_at')) {
                $table->dropColumn('qr_code_generated_at');
            }
        });
    }
};
