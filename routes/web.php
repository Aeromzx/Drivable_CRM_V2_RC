<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    $currentUser = auth()->user();
    if ($currentUser) {
        \App\Models\ActivityLog::log(
            'accessed',
            'Dashboard-Seite',
            null,
            'Dashboard',
            "Dashboard wurde von {$currentUser->name} aufgerufen"
        );
    }
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/vermieter', [App\Http\Controllers\VermieterController::class, 'index'])->middleware(['auth', 'verified'])->name('vermieter');

Route::get('/mieten', [App\Http\Controllers\MietenController::class, 'index'])->middleware(['auth', 'verified'])->name('mieten');

Route::get('/invoicing', function () {
    $currentUser = auth()->user();
    if ($currentUser) {
        \App\Models\ActivityLog::log(
            'accessed',
            'Invoicing-Seite',
            null,
            'Rechnungen & Mahnwesen',
            "Rechnungen & Mahnwesen wurde von {$currentUser->name} aufgerufen"
        );
    }
    return Inertia::render('Invoicing');
})->middleware(['auth', 'verified'])->name('invoicing');

// Payment Success Route (public)
Route::get('/payment-success', function () {
    return view('payment-success');
})->name('payment.success');

// Stripe Webhook Route (public, no middleware)
Route::post('/stripe/webhook', [App\Http\Controllers\StripeWebhookController::class, 'handleWebhook'])->name('stripe.webhook');

// Invoice Management Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/invoices', [App\Http\Controllers\InvoiceController::class, 'index']);
    Route::post('/invoices', [App\Http\Controllers\InvoiceController::class, 'store']);
    Route::get('/invoices/statistics', [App\Http\Controllers\InvoiceController::class, 'getStatistics']);
    Route::get('/invoices/{id}', [App\Http\Controllers\InvoiceController::class, 'show']);
    Route::put('/invoices/{id}', [App\Http\Controllers\InvoiceController::class, 'update']);
    Route::delete('/invoices/{id}', [App\Http\Controllers\InvoiceController::class, 'destroy']);
    Route::get('/invoices/{id}/pdf', [App\Http\Controllers\InvoiceController::class, 'generatePDF']);
    Route::patch('/invoices/{id}/status', [App\Http\Controllers\InvoiceController::class, 'updateStatus']);
    Route::post('/invoices/{id}/mahnung', [App\Http\Controllers\InvoiceController::class, 'createMahnung']);
    Route::post('/invoices/{id}/payment-link', [App\Http\Controllers\InvoiceController::class, 'createPaymentLink']);
    
    // Mahnung Management Routes
    Route::get('/mahnungen', [App\Http\Controllers\MahnungController::class, 'index']);
    Route::post('/mahnungen', [App\Http\Controllers\MahnungController::class, 'store']);
    Route::put('/mahnungen/{id}', [App\Http\Controllers\MahnungController::class, 'update']);
    Route::delete('/mahnungen/{id}', [App\Http\Controllers\MahnungController::class, 'destroy']);
    Route::post('/mahnungen/{id}/send', [App\Http\Controllers\MahnungController::class, 'send']);
    Route::post('/mahnungen/{id}/mark-paid', [App\Http\Controllers\MahnungController::class, 'markAsPaid']);
    Route::post('/mahnungen/{id}/cancel', [App\Http\Controllers\MahnungController::class, 'cancel']);
    Route::get('/mahnungen/{id}/pdf', [App\Http\Controllers\MahnungController::class, 'generatePDF']);
    Route::get('/invoices/{id}/mahnungen', [App\Http\Controllers\MahnungController::class, 'getInvoiceMahnungen']);
    Route::get('/mahnungen/dashboard-stats', [App\Http\Controllers\MahnungController::class, 'getDashboardStats']);
    Route::get('/invoices/needing-reminder', [App\Http\Controllers\MahnungController::class, 'getInvoicesNeedingReminder']);
});

// Mieten API Routes
Route::get('/getRentalStats', [App\Http\Controllers\MietenController::class, 'getRentalStats'])->middleware(['auth', 'verified']);
Route::get('/getRentals', [App\Http\Controllers\MietenController::class, 'getRentals'])->middleware(['auth', 'verified']);

Route::middleware(['auth', 'verified'])->prefix('api')->name('api.')->group(function () {
    Route::get('/rentals/{id}', [App\Http\Controllers\MietenController::class, 'show'])->name('rentals.show');
    Route::put('/rentals/{id}', [App\Http\Controllers\MietenController::class, 'update'])->name('rentals.update');
    Route::put('/rentals/{id}/status', [App\Http\Controllers\MietenController::class, 'updateStatus'])->name('rentals.updateStatus');
    Route::delete('/rentals/{id}', [App\Http\Controllers\MietenController::class, 'destroy'])->name('rentals.destroy');
    Route::get('/rentals/{id}/chat', [App\Http\Controllers\MietenController::class, 'getRentalChat'])->name('rentals.chat');
    Route::post('/messages/{message}/censor', [App\Http\Controllers\MietenController::class, 'censorMessage'])->name('messages.censor');
    Route::post('/messages/{message}/uncensor', [App\Http\Controllers\MietenController::class, 'uncensorMessage'])->name('messages.uncensor');
});

// CRM API Routes for documents (matching the external API pattern)
Route::prefix('api/crm')->name('crm.')->group(function () {
    Route::get('/license-image/{userId}/{type}', [App\Http\Controllers\MietenController::class, 'getLicenseImage'])->name('license-image');
    Route::get('/id-image/{userId}/{type}', [App\Http\Controllers\MietenController::class, 'getIdImage'])->name('id-image');
});


Route::get('/user', function () {
    $currentUser = auth()->user();
    if ($currentUser) {
        \App\Models\ActivityLog::log(
            'accessed',
            'User-Seite',
            null,
            'User-Verwaltung',
            "User-Seite wurde von {$currentUser->name} aufgerufen"
        );
    }
    return Inertia::render('User', [
        'search' => request('search'),
        'sort' => request('sort'),
        'filter' => request('filter')
    ]);
})->middleware(['auth', 'verified'])->name('user');

Route::get('/autos', [App\Http\Controllers\AutosController::class, 'index'])->middleware(['auth', 'verified'])->name('autos');

// User API Routes
Route::middleware(['auth', 'verified'])->prefix('api/users')->name('users.')->group(function () {
    Route::get('/basic', [App\Http\Controllers\UserController::class, 'getBasicUsers'])->name('basic');
    Route::get('/detail/{user}', [App\Http\Controllers\UserController::class, 'getUserDetails'])->name('detail');
    Route::get('/registration-stats', [App\Http\Controllers\UserController::class, 'getUserRegistrationStats'])->name('registration-stats');
    Route::get('/{user}/car-activity', [App\Http\Controllers\UserController::class, 'getUserCarActivity'])->name('car-activity');
    Route::get('/{user}/booking-activity', [App\Http\Controllers\UserController::class, 'getUserBookingActivity'])->name('booking-activity');
    Route::post('/{user}/whatsapp', [App\Http\Controllers\UserController::class, 'sendWhatsapp'])->name('whatsapp');
    Route::post('/{user}/push', [App\Http\Controllers\UserController::class, 'sendPushNotification'])->name('push');
    Route::put('/{user}/update', [App\Http\Controllers\UserController::class, 'updateUser'])->name('update');
    Route::get('/{user}/password-history', [App\Http\Controllers\UserController::class, 'getPasswordHistory'])->name('password-history');
    Route::post('/{user}/restore-password', [App\Http\Controllers\UserController::class, 'restorePassword'])->name('restore-password');
});

// Push Templates API Routes
Route::middleware(['auth', 'verified'])->prefix('api/push-templates')->name('push-templates.')->group(function () {
    Route::get('/', [App\Http\Controllers\UserController::class, 'getPushTemplates'])->name('index');
    Route::post('/', [App\Http\Controllers\UserController::class, 'createPushTemplate'])->name('create');
    Route::delete('/{templateId}', [App\Http\Controllers\UserController::class, 'deletePushTemplate'])->name('delete');
});

Route::get('/getUserVerificationStats', [App\Http\Controllers\UserController::class, 'getUserVerificationStats'])->middleware(['auth', 'verified']);

// Vermieter API Routes
Route::middleware(['auth', 'verified'])->prefix('api/vermieter')->name('vermieter.')->group(function () {
    Route::get('/{renter}', [App\Http\Controllers\VermieterController::class, 'show'])->name('show');
    Route::put('/{renter}', [App\Http\Controllers\VermieterController::class, 'update'])->name('update');
    Route::post('/{renter}/verify', [App\Http\Controllers\VermieterController::class, 'verify'])->name('verify');
    Route::post('/{renter}/unverify', [App\Http\Controllers\VermieterController::class, 'unverify'])->name('unverify');
    Route::get('/{renter}/can-verify', [App\Http\Controllers\VermieterController::class, 'canVerify'])->name('can-verify');
    Route::get('/{renter}/rentals', [App\Http\Controllers\VermieterController::class, 'refreshRentals'])->name('refresh-rentals');
    Route::post('/messages/{message}/uncensor', [App\Http\Controllers\VermieterController::class, 'uncensorMessage'])->name('messages.uncensor');
    Route::post('/messages/{message}/censor', [App\Http\Controllers\VermieterController::class, 'censorMessage'])->name('messages.censor');
    Route::post('/{renter}/chats/summarize', [App\Http\Controllers\VermieterController::class, 'summarizeChats'])->name('chats.summarize');
    Route::get('/{renter}/stripe/dashboard', [App\Http\Controllers\VermieterController::class, 'getStripeDashboard'])->name('stripe.dashboard');
    Route::post('/{renter}/stripe/dashboard-link', [App\Http\Controllers\VermieterController::class, 'createDashboardLink'])->name('stripe.dashboard-link');
    Route::post('/{renter}/stripe/manual-adjustment', [App\Http\Controllers\VermieterController::class, 'manualBalanceAdjustment'])->name('stripe.manual-adjustment');
    Route::post('/{renter}/stripe/payment-link/{paymentLinkId}/send-email', [App\Http\Controllers\VermieterController::class, 'sendPaymentLinkEmailRetroactive'])->name('stripe.send-payment-link-email')->where('paymentLinkId', '[a-zA-Z0-9_]+');
    Route::delete('/{renter}/stripe/payment-link/{paymentLinkId}', [App\Http\Controllers\VermieterController::class, 'deletePaymentLink'])->name('stripe.delete-payment-link')->where('paymentLinkId', '[a-zA-Z0-9_]+');
    Route::post('/{renter}/stripe/payment-link', [App\Http\Controllers\VermieterController::class, 'createPaymentLink'])->name('stripe.payment-link');
    Route::put('/{renter}/user', [App\Http\Controllers\VermieterController::class, 'updateUser'])->name('user.update');
});

// Cars API Routes
Route::middleware(['auth', 'verified'])->prefix('api/cars')->name('cars.')->group(function () {
    Route::put('/{car}', [App\Http\Controllers\AutosController::class, 'update'])->name('update');
    Route::delete('/{car}/images/{image}', [App\Http\Controllers\AutosController::class, 'deleteImage'])->name('images.delete');
    Route::delete('/{car}', [App\Http\Controllers\AutosController::class, 'destroy'])->name('destroy');
    Route::patch('/{car}/restore', [App\Http\Controllers\AutosController::class, 'restore'])->name('restore');
    
    // Fallback routes for existing Vermieter functionality
    Route::put('/{car}/vermieter-update', [App\Http\Controllers\VermieterController::class, 'updateCar'])->name('vermieter-update');
    Route::delete('/{car}/vermieter-images/{image}', [App\Http\Controllers\VermieterController::class, 'deleteCarImage'])->name('vermieter-images.delete');
    Route::patch('/{car}/soft-delete', [App\Http\Controllers\VermieterController::class, 'softDeleteCar'])->name('soft-delete');
    Route::patch('/{car}/vermieter-restore', [App\Http\Controllers\VermieterController::class, 'restoreCar'])->name('vermieter-restore');
});


// Activity Logs API Routes
Route::middleware(['auth', 'verified'])->prefix('api/activity-logs')->name('activity-logs.')->group(function () {
    Route::get('/', [App\Http\Controllers\ActivityLogController::class, 'index'])->name('index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
