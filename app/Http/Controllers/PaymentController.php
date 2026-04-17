<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CourseEnrollment;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Show the Mock Payment Page (Local Development Only).
     */
    public function mockPage(Request $request)
    {
        $externalId = $request->query('external_id');
        $amount = $request->query('amount');
        $description = urldecode($request->query('description', ''));
        $redirectUrl = urldecode($request->query('redirect_url', '/'));

        return view('payment.mock', compact('externalId', 'amount', 'description', 'redirectUrl'));
    }

    /**
     * Handle the "Success" action from the Mock Page.
     */
    public function mockSuccess(Request $request)
    {
        $externalId = $request->input('external_id');
        $redirectUrl = $request->input('redirect_url');

        // Find the enrollment by external ID
        // Note: In real Xendit, this happens via Webhook. 
        // Here we simulate the webhook effect immediately.

        $enrollment = CourseEnrollment::where('xendit_external_id', $externalId)->first();

        if ($enrollment) {
            $enrollment->update([
                'payment_status' => 'paid',
                'status' => 'active' // Activate existing logic if any
            ]);

            // You might want to trigger "New Student" notification here if not already done
        }

        return redirect($redirectUrl);
    }

    /**
     * Xendit Webhook Handler (For Production/Tunnel)
     */
    public function webhook(Request $request)
    {
        // Verify Xendit Token (Optional but recommended)
        $xenditToken = $request->header('x-callback-token');
        $myToken = env('XENDIT_CALLBACK_TOKEN'); // Set this in .env if needed

        if ($myToken && $xenditToken !== $myToken) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $data = $request->all();
        Log::info('Xendit Webhook Received', $data);

        // Check if invoice paid
        if (isset($data['status']) && $data['status'] === 'PAID') {
            $externalId = $data['external_id'];

            $enrollment = CourseEnrollment::where('xendit_external_id', $externalId)->first();

            if ($enrollment && $enrollment->payment_status !== 'paid') {
                $enrollment->update([
                    'payment_status' => 'paid',
                ]);
            }
        }

        return response()->json(['message' => 'OK']);
    }
}
