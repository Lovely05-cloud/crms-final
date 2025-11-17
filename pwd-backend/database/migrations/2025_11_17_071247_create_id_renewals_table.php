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
        Schema::create('id_renewals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id');
            $table->string('old_card_image_path')->nullable(); // Photo/scan of surrendered ID card
            $table->string('medical_certificate_path')->nullable(); // Recent medical certificate
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable(); // Admin notes or rejection reason
            $table->unsignedBigInteger('reviewed_by')->nullable(); // Admin who reviewed
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('member_id')->references('userID')->on('pwd_members')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('userID')->on('users')->onDelete('set null');

            // Indexes
            $table->index('member_id');
            $table->index('status');
            $table->index('submitted_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('id_renewals');
    }
};
