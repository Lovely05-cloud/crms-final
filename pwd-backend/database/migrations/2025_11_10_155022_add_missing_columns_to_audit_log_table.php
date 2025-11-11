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
        Schema::table('audit_log', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('audit_log', 'userID')) {
                $table->unsignedBigInteger('userID')->nullable()->after('id');
            }
            if (!Schema::hasColumn('audit_log', 'action')) {
                $table->string('action', 255)->nullable()->after('userID');
            }
            if (!Schema::hasColumn('audit_log', 'timestamp')) {
                $table->timestamp('timestamp')->nullable()->useCurrent()->after('action');
            }
            
            // Add index on userID if it doesn't exist
            if (!Schema::hasColumn('audit_log', 'userID')) {
                // Index will be added with the column
            } else {
                // Check if index exists
                $indexes = Schema::getConnection()->getDoctrineSchemaManager()->listTableIndexes('audit_log');
                $hasIndex = false;
                foreach ($indexes as $index) {
                    if (in_array('userID', $index->getColumns())) {
                        $hasIndex = true;
                        break;
                    }
                }
                if (!$hasIndex) {
                    $table->index('userID');
                }
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
        Schema::table('audit_log', function (Blueprint $table) {
            if (Schema::hasColumn('audit_log', 'userID')) {
                $table->dropIndex(['userID']);
                $table->dropColumn('userID');
            }
            if (Schema::hasColumn('audit_log', 'action')) {
                $table->dropColumn('action');
            }
            if (Schema::hasColumn('audit_log', 'timestamp')) {
                $table->dropColumn('timestamp');
            }
        });
    }
};
