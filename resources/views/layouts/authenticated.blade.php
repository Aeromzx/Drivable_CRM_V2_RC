<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $title ?? config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @vite(['resources/css/app.css'])
    {{ $head ?? '' }}
</head>
<body class="font-sans antialiased">
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <!-- Modern Navigation -->
        <nav class="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <!-- Logo Section -->
                    <div class="flex items-center">
                        <a href="{{ route('dashboard') }}" class="flex items-center space-x-3 group">
                            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 p-2">
                                <img
                                    src="https://drivable.app/images/logo_drive_withoutText.png"
                                    alt="Drivable Logo"
                                    class="w-full h-full object-contain"
                                />
                            </div>
                            <div class="hidden sm:block">
                                <h1 class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                                    Drivable
                                </h1>
                                <p class="text-xs text-gray-500 -mt-1">CRM System</p>
                            </div>
                        </a>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden lg:flex items-center space-x-1">
                        <a href="{{ route('dashboard') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('dashboard') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">Dashboard</span>
                            @unless(request()->is('dashboard'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                        <a href="{{ route('vermieter') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('vermieter*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">Vermieter</span>
                            @unless(request()->is('vermieter*'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                        <a href="{{ route('mieten') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('mieten*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">Mieten</span>
                            @unless(request()->is('mieten*'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                        <a href="{{ route('user') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('user*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">User</span>
                            @unless(request()->is('user*'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                        <a href="{{ route('autos') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('autos*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">Autos</span>
                            @unless(request()->is('autos*'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                        <a href="{{ route('invoicing') }}" class="group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden {{ request()->is('invoicing*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <span class="relative z-10">Rechnungen</span>
                            @unless(request()->is('invoicing*'))
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            @endunless
                        </a>
                    </div>

                    <!-- User Section (Desktop) -->
                    <div class="hidden lg:flex items-center space-x-4">
                        <!-- User Avatar -->
                        <div class="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group">
                            <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md group-hover:shadow-lg transition-all duration-200">
                                {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                            </div>
                            <div class="text-left hidden xl:block">
                                <p class="text-sm font-semibold text-gray-900">{{ auth()->user()->name }}</p>
                                <p class="text-xs text-gray-500">Administrator</p>
                            </div>
                        </div>

                        <!-- Logout -->
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button type="submit" class="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50/80 rounded-xl transition-all duration-200">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Abmelden
                            </button>
                        </form>
                    </div>

                    <!-- Mobile menu button -->
                    <div class="lg:hidden">
                        <button onclick="toggleMobileMenu()" class="p-2 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50/80 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all duration-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile Navigation Menu -->
            <div id="mobileMenu" class="lg:hidden max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out">
                <div class="px-4 py-6 bg-white/95 backdrop-blur-md border-t border-gray-200/50">
                    <!-- Mobile Navigation Links -->
                    <div class="space-y-2 mb-6">
                        <a href="{{ route('dashboard') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('dashboard') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            Dashboard
                        </a>
                        <a href="{{ route('vermieter') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('vermieter*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            Vermieter
                        </a>
                        <a href="{{ route('mieten') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('mieten*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                            </svg>
                            Mieten
                        </a>
                        <a href="{{ route('user') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('user*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                            </svg>
                            User
                        </a>
                        <a href="{{ route('autos') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('autos*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
                            </svg>
                            Autos
                        </a>
                        <a href="{{ route('invoicing') }}" class="flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 {{ request()->is('invoicing*') ? 'text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/80' }}">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Rechnungen
                        </a>
                    </div>

                    <!-- Mobile User Section -->
                    <div class="pt-6 border-t border-gray-200/50">
                        <div class="flex items-center px-4 py-3 mb-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md mr-4">
                                {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                            </div>
                            <div>
                                <p class="text-base font-semibold text-gray-900">{{ auth()->user()->name }}</p>
                                <p class="text-sm text-gray-500">{{ auth()->user()->email }}</p>
                            </div>
                        </div>
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button type="submit" class="flex items-center w-full px-4 py-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50/80 transition-all duration-200">
                                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Abmelden
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </nav>

        <script>
            function toggleMobileMenu() {
                const menu = document.getElementById('mobileMenu');
                if (menu.classList.contains('max-h-0')) {
                    menu.classList.remove('max-h-0', 'opacity-0');
                    menu.classList.add('max-h-screen', 'opacity-100');
                } else {
                    menu.classList.add('max-h-0', 'opacity-0');
                    menu.classList.remove('max-h-screen', 'opacity-100');
                }
            }
        </script>

        <!-- Main Content -->
        <main class="py-8">
            {{ $slot }}
        </main>
    </div>
</body>
</html>