<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Admin: List Coupons
     */
    public function index()
    {
        $user = auth()->user();
        if ($user->role !== 'admin' && $user->role !== 'instructor') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'instructor') {
            // Instructors only need active QR coupons to link to their courses
            $coupons = Coupon::where('is_qr_coupon', true)->where('is_active', true)->latest()->get();
            return response()->json($coupons);
        }

        // Admin sees all
        $coupons = Coupon::latest()->get();
        return response()->json($coupons);
    }

    /**
     * Admin: Create Coupon
     */
    /**
     * Admin: Create Coupon
     */
    public function store(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'code' => 'required|string|unique:coupons,code|uppercase',
            'type' => 'required|in:fixed,percent',
            'value' => 'required|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
            // QR fields
            'is_qr_coupon' => 'boolean',
            'qr_rotation_minutes' => 'nullable|integer|min:1',
            'min_completed_courses' => 'nullable|integer|min:0',
            'min_active_days' => 'nullable|integer|min:0',
            'eligible_user_ids' => 'nullable|array',
            'eligible_user_ids.*' => 'integer|exists:users,id',
        ]);

        $coupon = Coupon::create($validated);

        // Auto-generate first QR token if is_qr_coupon
        if ($coupon->is_qr_coupon) {
            $coupon->rotateQrToken();
        }

        return response()->json(['message' => 'Coupon created', 'coupon' => $coupon], 201);
    }

    /**
     * Admin: Delete Coupon
     */
    public function destroy($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return response()->json(['message' => 'Coupon deleted']);
    }

    /**
     * Admin: Update Coupon
     */
    public function update(Request $request, $id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|uppercase|unique:coupons,code,' . $coupon->id,
            'type' => 'required|in:fixed,percent',
            'value' => 'required|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
            // QR fields
            'is_qr_coupon' => 'boolean',
            'qr_rotation_minutes' => 'nullable|integer|min:1',
            'min_completed_courses' => 'nullable|integer|min:0',
            'min_active_days' => 'nullable|integer|min:0',
            'eligible_user_ids' => 'nullable|array',
            'eligible_user_ids.*' => 'integer|exists:users,id',
        ]);

        $coupon->update($validated);

        return response()->json(['message' => 'Coupon updated', 'coupon' => $coupon]);
    }

    /**
     * Public/Student: Check Coupon
     */
    public function check(Request $request)
    {
        $code = $request->query('code');
        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            return response()->json(['message' => 'Kupon tidak ditemukan'], 404);
        }

        if (!$coupon->isValid()) {
            return response()->json(['message' => 'Kupon tidak valid atau sudah habis'], 400);
        }

        return response()->json([
            'message' => 'Kupon valid',
            'coupon' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value
            ]
        ]);
    }

    /**
     * Student: List available QR coupons with eligibility status
     */
    public function qrCoupons()
    {
        $user = auth()->user();
        $coupons = Coupon::where('is_qr_coupon', true)
            ->where('is_active', true)
            ->get()
            ->map(function ($coupon) use ($user) {
                return [
                    'id' => $coupon->id,
                    'code' => $coupon->code,
                    'type' => $coupon->type,
                    'value' => $coupon->value,
                    'expires_at' => $coupon->expires_at,
                    'min_completed_courses' => $coupon->min_completed_courses,
                    'min_active_days' => $coupon->min_active_days,
                    'eligible' => $coupon->isUserEligible($user),
                    'qr_rotation_minutes' => $coupon->qr_rotation_minutes,
                ];
            });

        return response()->json($coupons);
    }

    /**
     * Admin: Get current QR token for a coupon (to display QR code)
     */
    public function getQrToken($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $coupon = Coupon::findOrFail($id);

        // Auto-rotate if expired or no token exists
        if (!$coupon->qr_current_token || ($coupon->qr_token_expires_at && now()->gt($coupon->qr_token_expires_at))) {
            $coupon->rotateQrToken();
        }

        return response()->json([
            'token' => $coupon->qr_current_token,
            'expires_at' => $coupon->qr_token_expires_at,
            'rotation_minutes' => $coupon->qr_rotation_minutes,
        ]);
    }

    /**
     * Admin: Force rotate QR token
     */
    public function rotateQrToken($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $coupon = Coupon::findOrFail($id);
        $token = $coupon->rotateQrToken();

        return response()->json([
            'message' => 'Token rotated',
            'token' => $token,
            'expires_at' => $coupon->qr_token_expires_at,
        ]);
    }

    /**
     * Student: Check eligibility for a specific QR coupon
     */
    public function checkEligibility(Request $request)
    {
        $user = auth()->user();
        if (!$user)
            return response()->json(['eligible' => false], 401);

        $couponId = $request->input('coupon_id');
        $coupon = $couponId ? Coupon::find($couponId) : null;

        if ($coupon && $coupon->is_qr_coupon) {
            $eligible = $coupon->isUserEligible($user);
            return response()->json([
                'eligible' => $eligible,
                'message' => $eligible
                    ? 'Anda berhak mendapatkan diskon eksklusif!'
                    : 'Maaf, Anda belum memenuhi syarat. Selesaikan ' . $coupon->min_completed_courses . ' kursus dan aktif ' . $coupon->min_active_days . ' hari.',
            ]);
        }

        // Fallback: check all QR coupons
        $qrCoupons = Coupon::where('is_qr_coupon', true)->where('is_active', true)->get();
        $eligibleCoupons = $qrCoupons->filter(fn($c) => $c->isUserEligible($user));

        return response()->json([
            'eligible' => $eligibleCoupons->count() > 0,
            'eligible_count' => $eligibleCoupons->count(),
            'message' => $eligibleCoupons->count() > 0
                ? 'Anda berhak mendapatkan ' . $eligibleCoupons->count() . ' diskon eksklusif!'
                : 'Maaf, belum ada kupon QR yang bisa Anda klaim.'
        ]);
    }

    /**
     * Student: Claim coupon by QR token
     */
    public function claimByQr(Request $request)
    {
        $user = auth()->user();
        $token = $request->input('token');
        $couponId = $request->input('coupon_id');

        if (!$token || !$couponId) {
            return response()->json(['message' => 'Token dan coupon_id diperlukan.'], 400);
        }

        $coupon = Coupon::find($couponId);
        if (!$coupon) {
            return response()->json(['message' => 'Kupon tidak ditemukan.'], 404);
        }

        // Validate QR token
        if (!$coupon->isQrValid($token)) {
            return response()->json(['message' => 'Kode QR tidak valid atau sudah kedaluwarsa. Silakan scan ulang.'], 400);
        }

        // Check eligibility
        if (!$coupon->isUserEligible($user)) {
            return response()->json(['message' => 'Anda belum memenuhi syarat untuk kupon ini.'], 403);
        }

        // Increment usage
        $coupon->increment('used_count');

        return response()->json([
            'message' => 'Selamat! Kupon berhasil diklaim.',
            'coupon' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'description' => 'Kupon ' . ($coupon->type === 'percent' ? $coupon->value . '%' : 'Rp ' . number_format($coupon->value, 0)) . ' OFF'
            ]
        ]);
    }
}
