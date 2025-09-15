<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Zahlung erfolgreich - {{ config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @vite(['resources/css/app.css'])
</head>
<body class="font-sans antialiased bg-gradient-to-br from-green-50 to-blue-50">
    <div class="min-h-screen flex items-center justify-center px-4">
        <div class="max-w-md w-full">
            <!-- Success Card -->
            <div class="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div class="px-8 pt-8 pb-6 text-center">
                    <!-- Success Icon -->
                    <div class="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    
                    <!-- Title -->
                    <h1 class="text-2xl font-bold text-gray-900 mb-3">
                        Zahlung erfolgreich!
                    </h1>
                    
                    <!-- Message -->
                    <div class="text-gray-600 mb-6 space-y-2">
                        @if(request('invoice'))
                            <p>Vielen Dank für die Zahlung der Rechnung <strong>{{ request('invoice') }}</strong>.</p>
                        @elseif(request('mahnung'))
                            <p>Vielen Dank für die Zahlung der Mahnung <strong>{{ request('mahnung') }}</strong>.</p>
                        @else
                            <p>Vielen Dank für Ihre Zahlung.</p>
                        @endif
                        <p class="text-sm">Ihre Zahlung wurde erfolgreich verarbeitet und Sie erhalten in Kürze eine Bestätigung per E-Mail.</p>
                    </div>
                </div>
                
                <!-- Details Section -->
                <div class="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-gray-500 mb-1">Status</div>
                            <div class="font-semibold text-green-600 flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                Bezahlt
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-500 mb-1">Datum</div>
                            <div class="font-semibold text-gray-900">{{ now()->format('d.m.Y H:i') }}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="px-8 py-6 bg-white border-t">
                    <div class="space-y-3">
                        <a href="{{ route('dashboard') }}" class="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-center font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-md hover:shadow-lg">
                            Zum Dashboard
                        </a>
                        <p class="text-center text-xs text-gray-500">
                            Bei Fragen kontaktieren Sie uns unter <a href="mailto:info@drivable.app" class="text-orange-600 hover:text-orange-700">info@drivable.app</a>
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Company Info -->
            <div class="mt-8 text-center text-sm text-gray-500">
                <div class="flex items-center justify-center mb-2">
                    <img src="{{ asset('images/logo_drive_withoutText.png') }}" alt="Drivable Logo" class="w-8 h-8 mr-2">
                    <span class="font-semibold text-orange-600">Drivable</span>
                </div>
                <p>Sichere Zahlung mit Stripe</p>
            </div>
        </div>
    </div>
</body>
</html>