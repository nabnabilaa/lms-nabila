<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Mock Payment Routes (Localhost)
use App\Http\Controllers\PaymentController;
Route::get('/payment/mock', [PaymentController::class, 'mockPage'])->name('payment.mock_page');
Route::post('/payment/mock/success', [PaymentController::class, 'mockSuccess'])->name('payment.mock_success');

// Catch-all route for React Frontend
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
