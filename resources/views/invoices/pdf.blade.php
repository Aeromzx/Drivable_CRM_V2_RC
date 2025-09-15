<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Rechnung {{ $invoice->invoice_number }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        @page {
            margin: 0;
            size: A4 portrait;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #374151;
            background: white;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* FIXED ORANGE HEADER */
        .orange-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            width: 100vw;
            height: 110px;
            background: #f97316;
            color: white;
            z-index: 1000;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        .header-content {
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 100%;
            box-sizing: border-box;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .logo-container {
            background: white;
            padding: 8px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .company-logo {
            width: 40px;
            height: 40px;
            display: block;
        }

        .company-info h1 {
            font-size: 19px;
            font-weight: 600;
            margin-bottom: 3px;
            letter-spacing: 0.02em;
        }

        .company-tagline {
            font-size: 12px;
            opacity: 0.9;
            font-weight: 300;
        }

        .header-right {
            text-align: right;
        }

        .invoice-number {
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 6px;
        }

        .invoice-date {
            font-size: 11px;
            opacity: 0.85;
        }

        /* BRIEFKOPF ADDRESS SECTION */
        .address-wrapper {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .customer-section {
            flex: 1;
            max-width: 85mm;
        }

        .sender-line {
            font-size: 7px;
            color: #9ca3af;
            border-bottom: 0.5px solid #d1d5db;
            padding-bottom: 4px;
            margin-bottom: 6mm;
        }

        .customer-name {
            font-size: 14px;
            font-weight: 500;
            color: #111827;
            margin-bottom: 5px;
            margin-top: -5px;
        }

        .customer-address {
            font-size: 10px;
            line-height: 1.3;
            color: #4b5563;
        }

        .invoice-details {
            text-align: right;
            margin-top: 25px;
        }

        .detail-row {
            margin-bottom: 6px;
            font-size: 10px;
        }

        .detail-line {
            color: #6b7280;
            font-weight: 400;
        }

        .detail-line strong {
            color: #111827;
            font-weight: 500;
        }

        /* CLEAN TITLE */
        .invoice-title {
            font-size: 24px;
            font-weight: 500;
            color: #111827;
            letter-spacing: -0.3px;
            margin: 40px 0 15px!important;
        }

        /* GREETING SECTION */
        .greeting-section {
            margin-bottom: 20px;
        }

        .greeting-text {
            font-size: 11px;
            line-height: 1.5;
            color: #374151;
        }

        .greeting-text strong {
            color: #111827;
        }

        /* CLEAN ITEMS TABLE */
        .table-wrapper {
            background: white;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #d1d5db;
            margin-bottom: 20px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
        }

        .table-head {
            background: #f3f4f6;
            color: #374151;
        }

        .table-head th {
            padding: 15px 12px;
            font-size: 9px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            text-align: left;
            border-bottom: 1px solid #d1d5db;
        }

        .table-body tr {
            border-bottom: 1px solid #f9fafb;
        }

        .table-body tr:last-child {
            border-bottom: none;
        }

        .table-body tr:nth-child(even) {
            background-color: #fafafa;
        }

        .table-body td {
            padding: 12px;
            font-size: 10px;
            vertical-align: top;
        }

        .col-pos {
            width: 8%;
            text-align: center;
            font-weight: 500;
            color: #f97316;
        }
        .col-qty {
            width: 10%;
            text-align: center;
            font-weight: 400;
        }
        .col-unit {
            width: 12%;
            color: #6b7280;
        }
        .col-desc {
            width: 45%;
            font-weight: 400;
            color: #374151;
        }
        .col-price {
            width: 12.5%;
            text-align: right;
            font-weight: 500;
            color: #111827;
        }
        .col-total {
            width: 12.5%;
            text-align: right;
            font-weight: 500;
            font-size: 9px;
            color: #111827;
        }

        /* CLEAN TOTALS */
        .totals-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-top: 15px;
        }

        .totals-box {
            background: white;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            overflow: hidden;
            width: 300px;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }

        .total-row {
            border-bottom: 1px solid #f9fafb;
        }

        .total-row:last-child {
            border-bottom: none;
        }

        .total-row td {
            padding: 12px 18px;
            font-size: 10px;
        }

        .total-label {
            color: #6b7280;
            font-weight: 400;
        }

        .total-amount {
            text-align: right;
            font-weight: 500;
            color: #111827;
        }

        .tax-row {
            background: #f9fafb;
        }

        .tax-row .total-label {
            color: #6b7280;
        }

        .tax-row .total-amount {
            color: #374151;
        }

        .final-total {
            background: #f8f9fa;
            color: #111827;
            border-top: 2px solid #d1d5db;
        }

        .final-total td {
            padding: 12px 18px;
            font-size: 11px;
            font-weight: 600;
        }

        /* CLEAN PAYMENT SECTION */
        .payment-section {
            margin: 25px 0;
        }

        .payment-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
        }

        .payment-text {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.5;
            margin-bottom: 12px;
        }

        .payment-details {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 30px;
        }

        .payment-info {
            flex: 1;
        }

        .payment-reference {
            font-size: 11px;
            font-weight: 600;
            color: #f97316;
            margin-top: 10px;
        }

        /* STRIPE PAYMENT */
        .stripe-payment {
            flex: 0 0 auto;
            text-align: center;
        }

        .stripe-qr img {
            width: 60px;
            height: 60px;
            border-radius: 4px;
            display: block;
            margin: 0 auto 8px auto;
        }

        .online-pay-link {
            font-size: 9px;
            color: #f97316;
            font-weight: 500;
            text-decoration: underline;
            cursor: pointer;
            display: block;
        }

        /* CLOSING SECTION */
        .closing {
            margin: 20px 0 60px 0;
        }

        .closing-text {
            font-size: 10px;
            color: #6b7280;
            line-height: 1.4;
            margin-bottom: 8px;
        }

        .signature {
            font-size: 11px;
            font-weight: 500;
            color: #111827;
            margin-top: 15px;
        }

        /* FIXED FOOTER */
        .clean-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100vw;
            height: 80px;
            background: #f2f2f2;
            color: #6b7280;
            padding: 15px 30px;
            font-size: 8px;
            border-top: 1px solid #e5e7eb;
            box-sizing: border-box;
            z-index: 1000;
            margin: 0;
        }

        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 25px;
        }

        .footer-section h4 {
            color: #374151;
            font-size: 8px;
            font-weight: 500;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .footer-section {
            line-height: 1.3;
        }

        .content {
            margin-top: 150px;
            margin-bottom: 50px;
            padding: 0 30px;
        }

        .compact-spacing {
            margin-bottom: 15px;
        }

        /* UTILITY CLASSES */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
    </style>
</head>
<body>
<div class="content">
    <!-- ORANGE HEADER -->
    <div class="orange-header">
        <div class="header-content">
            <div class="header-left">
                <div class="logo-container">
                    <img src="{{ public_path('images/logo_drive_withoutText.png') }}" alt="Logo" class="company-logo">
                </div>
                <div class="company-info">
                    <h1>Drivable</h1>
                    <div class="company-tagline">Rent a Feeling</div>
                </div>
            </div>
            <div class="header-right">
                <div class="invoice-number">{{ $invoice->invoice_number }}</div>
                <div class="invoice-date">{{ \Carbon\Carbon::parse($invoice->invoice_date)->format('d.m.Y') }}</div>
            </div>
        </div>
    </div>

    <!-- CLEAN ADDRESS SECTION -->
    <div class="address-wrapper">
        <div class="customer-section">
            <div class="sender-line">
                {{ $company['name'] }} • {{ $company['address'] }} • {{ $company['city'] }}
            </div>
            <div class="customer-name">{{ $invoice->customer_name }}</div>
            @if($invoice->customer_address)
                <div class="customer-address">{!! nl2br(e($invoice->customer_address)) !!}</div>
            @endif
        </div>

        <div class="invoice-details">
            <div class="detail-row">
                <div class="detail-line">Rechnungsnummer: <strong>{{ $invoice->invoice_number }}</strong></div>
            </div>
            <div class="detail-row">
                <div class="detail-line">Datum: <strong>{{ \Carbon\Carbon::parse($invoice->invoice_date)->format('d.m.Y') }}</strong></div>
            </div>
        </div>
    </div>

    <!-- CLEAN TITLE -->
    <h1 class="invoice-title">Rechnung</h1>

    <!-- GREETING -->
    <div class="greeting-section">
        <div class="greeting-text">
            <strong>Sehr geehrte Damen und Herren,</strong><br><br>
            @if($invoice->notes)
                {!! nl2br(e($invoice->notes)) !!}
            @else
                vielen Dank für Ihr Vertrauen in unsere Dienstleistungen. Hiermit stellen wir Ihnen die nachfolgenden Leistungen in Rechnung.
            @endif
        </div>
    </div>

    <!-- CLEAN ITEMS TABLE -->
    <div class="table-wrapper">
        <table class="items-table">
            <thead class="table-head">
                <tr>
                    <th class="col-pos">Pos.</th>
                    <th class="col-qty">Menge</th>
                    <th class="col-unit">Einheit</th>
                    <th class="col-desc">Beschreibung</th>
                    <th class="col-price">Einzelpreis</th>
                    <th class="col-total">Gesamtpreis</th>
                </tr>
            </thead>
            <tbody class="table-body">
                @foreach($invoice->items as $item)
                <tr>
                    <td class="col-pos">{{ $item->position }}</td>
                    <td class="col-qty">{{ number_format($item->quantity, 0) }}</td>
                    <td class="col-unit">{{ $item->unit }}</td>
                    <td class="col-desc">{{ $item->description }}</td>
                    <td class="col-price">{{ number_format($item->unit_price, 2, ',', '.') }} €</td>
                    <td class="col-total">{{ number_format($item->total_price, 2, ',', '.') }} €</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- CLEAN TOTALS -->
    <div class="totals-wrapper">
        <div class="totals-box">
            <table class="totals-table">
                <tr class="total-row">
                    <td class="total-label">Zwischensumme:</td>
                    <td class="total-amount">{{ number_format($invoice->subtotal, 2, ',', '.') }} €</td>
                </tr>
                @if($invoice->tax_rate > 0)
                <tr class="total-row tax-row">
                    <td class="total-label">MwSt. {{ number_format($invoice->tax_rate, 0) }}%:</td>
                    <td class="total-amount">{{ number_format($invoice->tax_amount, 2, ',', '.') }} €</td>
                </tr>
                @endif
                <tr class="final-total">
                    <td>RECHNUNGSBETRAG</td>
                    <td class="text-right">{{ number_format($invoice->total_amount, 2, ',', '.') }} €</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- PAYMENT SECTION -->
    <div class="payment-section">
        <div class="payment-title">Zahlungsinformationen</div>
        <div class="payment-details">
            <div class="payment-info">
                <div class="payment-text">
                    Bitte überweisen Sie den Rechnungsbetrag @if($invoice->due_date) bis zum {{ \Carbon\Carbon::parse($invoice->due_date)->format('d.m.Y') }} @else innerhalb von 14 Tagen @endif auf das unten angegebene Konto.
                </div>
                <div class="payment-reference">
                    Verwendungszweck: {{ $invoice->invoice_number }}
                </div>
            </div>

            @if($invoice->stripe_payment_link_url && $invoice->getPaymentQrCode())
            <div class="stripe-payment">
                <img src="{{ $invoice->getPaymentQrCode() }}" alt="QR-Code">
                <a href="{{ $invoice->stripe_payment_link_url }}" class="online-pay-link">Online bezahlen</a>
            </div>
            @endif
        </div>
    </div>

    <!-- CLOSING -->
    <div class="closing">
        <div class="closing-text">
            Vielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit.
        </div>
        <div class="closing-text">
            Bei Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.
        </div>
        <div class="signature">
            Mit freundlichen Grüßen<br>
            {{ $company['name'] }}
        </div>
    </div>
</div>

<!-- CLEAN FOOTER -->
<div class="clean-footer">
    <div class="footer-grid">
        <div class="footer-section">
            <h4>Kontakt</h4>
            {{ $company['phone'] }}<br>
            {{ $company['email'] }}<br>
            {{ $company['website'] }}
        </div>
        <div class="footer-section">
            <h4>Bankverbindung</h4>
            {{ $company['bank'] }}<br>
            IBAN: {{ $company['iban'] }}<br>
            BIC: {{ $company['bic'] }}
        </div>
        <div class="footer-section">
            <h4>Rechtliches</h4>
            USt-ID: {{ $company['tax_id'] }}<br>
            {{ $company['ceo'] }}
        </div>
    </div>
</div>
</body>
</html>
