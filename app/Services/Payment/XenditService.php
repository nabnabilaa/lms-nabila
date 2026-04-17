<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class XenditService
{
    private $apiKey;
    private $isProduction;

    public function __construct()
    {
        $this->apiKey = env('XENDIT_API_KEY');
        // If no API key, we assume dev/mock mode unless explicitly set otherwise
        $this->isProduction = !empty($this->apiKey) && env('APP_ENV') === 'production';
    }

    /**
     * Create an Invoice.
     * 
     * @param string $externalId An ID of your choice (e.g. order-123)
     * @param int $amount Amount in IDR
     * @param string $payerEmail Email of the user paying
     * @param string $description Description of the item
     * @param string $successRedirectUrl URL to redirect after success
     * @return array ['invoice_url' => string, 'id' => string]
     */
    public function createInvoice($externalId, $amount, $payerEmail, $description, $successRedirectUrl)
    {
        // 1. MOCK MODE (Localhost / No API Key)
        if (empty($this->apiKey)) {
            Log::info("XenditService: Mock Invoice Created for $externalId");

            // Return a URL to our own "Mock Payment Page"
            // We encode the details in the URL query params for simplicity in this mock
            $mockUrl = route('payment.mock_page', [
                'external_id' => $externalId,
                'amount' => $amount,
                'status' => 'PENDING',
                'description' => urlencode($description),
                'redirect_url' => urlencode($successRedirectUrl)
            ]);

            return [
                'invoice_url' => $mockUrl,
                'id' => 'mock_' . uniqid(),
                'status' => 'PENDING'
            ];
        }

        // 2. REAL XENDIT API (V2)
        // Docs: https://developers.xendit.co/api-reference/invoices/create-invoice

        $url = 'https://api.xendit.co/v2/invoices';
        $auth = base64_encode($this->apiKey . ':');

        $payload = [
            'external_id' => (string) $externalId,
            'amount' => $amount,
            'payer_email' => $payerEmail,
            'description' => $description,
            'success_redirect_url' => $successRedirectUrl,
            'currency' => 'IDR',
            // 'failure_redirect_url' => ...
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $auth,
                'Content-Type' => 'application/json'
            ])->post($url, $payload);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'invoice_url' => $data['invoice_url'],
                    'id' => $data['id'],
                    'status' => $data['status']
                ];
            } else {
                Log::error('Xendit Invoice Failed', ['body' => $response->body()]);
                throw new \Exception('Xendit Invoice Error: ' . $response->body());
            }

        } catch (\Exception $e) {
            Log::error('Xendit Connection Exception', ['message' => $e->getMessage()]);
            throw $e;
        }
    }
}
