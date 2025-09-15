<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Rechnungen & Mahnwesen - {{ config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @vite(['resources/css/app.css', 'resources/js/invoicing.js'])
</head>
<body class="font-sans antialiased">


    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            if (menu.style.maxHeight === '0px' || !menu.style.maxHeight) {
                menu.style.maxHeight = menu.scrollHeight + 'px';
                menu.style.opacity = '1';
            } else {
                menu.style.maxHeight = '0px';
                menu.style.opacity = '0';
            }
        }
    </script>
</body>
</html>
