<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Str;

class SecurityController extends Controller
{
    /**
     * Update Password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|confirmed|min:8',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini salah.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password berhasil diperbarui.']);

        // [TRIGGER 7] Password Changed
        \App\Services\NotificationService::send(
            $user,
            'Keamanan: Password Diubah',
            'Password akun Anda baru saja diubah. Jika ini bukan Anda, segera hubungi dukungan.',
            'warning',
            '/settings/security',
            [
                'title_key' => 'notif.password_changed_title',
                'message_key' => 'notif.password_changed_message'
            ]
        );
    }

    /**
     * Enable 2FA (Start Setup)
     */
    public function enableTwoFactor(Request $request)
    {
        $request->validate([
            'password' => 'required|current_password',
        ]);

        $user = $request->user();
        $google2fa = new Google2FA();

        // Generate Secret if not exists or force regen
        if (!$user->two_factor_secret || $request->force) {
            $user->two_factor_secret = $google2fa->generateSecretKey();
            $user->save();
        }

        // Generate QR Url (OTP Auth Scheme)
        $otpAuthUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $user->two_factor_secret
        );

        return response()->json([
            'secret' => $user->two_factor_secret,
            'otpauth_url' => $otpAuthUrl
        ]);
    }

    /**
     * Confirm 2FA Setup
     */
    public function confirmTwoFactor(Request $request)
    {
        $request->validate(['code' => 'required']);
        $user = $request->user();

        if (!$user->two_factor_secret) {
            return response()->json(['message' => '2FA Setup belum dimulai.'], 400);
        }

        $google2fa = new Google2FA();

        try {
            $valid = $google2fa->verifyKey($user->two_factor_secret, $request->code);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Format Code Invalid.'], 422);
        }

        if ($valid) {
            $recoveryCodes = [];
            for ($i = 0; $i < 8; $i++)
                $recoveryCodes[] = Str::random(10) . '-' . Str::random(10);

            $user->forceFill([
                'two_factor_confirmed_at' => now(),
                'two_factor_recovery_codes' => json_encode($recoveryCodes), // Auto encrypted by model cast
            ])->save();

            return response()->json([
                'message' => 'Two-Factor Authentication activated.',
                'recovery_codes' => $recoveryCodes
            ]);

            // [TRIGGER 7] 2FA Enabled
            \App\Services\NotificationService::send(
                $user,
                'Keamanan: 2FA Diaktifkan',
                'Autentikasi Dua Faktor telah aktif. Akun Anda kini lebih aman.',
                'success',
                '/settings/security',
                [
                    'title_key' => 'notif.twofa_enabled_title',
                    'message_key' => 'notif.twofa_enabled_message'
                ]
            );
        }

        return response()->json(['message' => 'Invalid Code'], 422);
    }

    /**
     * Get Recovery Codes (Protected)
     */
    public function getRecoveryCodes(Request $request)
    {
        $this->validateSecurity($request);

        $user = $request->user();

        if (!$user->two_factor_recovery_codes) {
            return response()->json(['recovery_codes' => []]);
        }

        return response()->json([
            'recovery_codes' => json_decode($user->two_factor_recovery_codes, true)
        ]);
    }

    /**
     * Helper: Validate Action (Password OR 2FA)
     */
    private function validateSecurity(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_confirmed_at) {
            // Validate 2FA Code
            if (!$request->code) {
                throw ValidationException::withMessages([
                    'code' => ['Kode 2FA diperlukan.'],
                ]);
            }

            $google2fa = new Google2FA();
            $valid = $google2fa->verifyKey($user->two_factor_secret, $request->code);

            if (!$valid) {
                // Check recovery codes
                // Auto decrypted by model cast, then json_decode
                $recoveryCodes = $user->two_factor_recovery_codes ? json_decode($user->two_factor_recovery_codes, true) : [];

                if (in_array($request->code, $recoveryCodes)) {
                    // Remove used code
                    $recoveryCodes = array_values(array_diff($recoveryCodes, [$request->code]));
                    $user->two_factor_recovery_codes = json_encode($recoveryCodes); // Auto encrypted
                    $user->save();
                } else {
                    throw ValidationException::withMessages([
                        'code' => ['Kode OTP Salah.'],
                    ]);
                }
            }
        } else {
            // Validate Password
            if (!Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'password' => ['Password salah.'],
                ]);
            }
        }
    }

    /**
     * Disable 2FA
     */
    public function disableTwoFactor(Request $request)
    {
        $this->validateSecurity($request);

        $user = $request->user();
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        return response()->json(['message' => 'Two-Factor Authentication disabled.']);

        // [TRIGGER 7] 2FA Disabled
        \App\Services\NotificationService::send(
            $user,
            'Keamanan: 2FA Dinonaktifkan',
            'Autentikasi Dua Faktor telah dinonaktifkan. Kami sarankan mengaktifkannya kembali.',
            'warning',
            '/settings/security',
            [
                'title_key' => 'notif.twofa_disabled_title',
                'message_key' => 'notif.twofa_disabled_message'
            ]
        );
    }

    /**
     * Get Browser Sessions
     * Uses Sanctum tokens as "Sessions"
     */
    public function sessions(Request $request)
    {
        $currentId = $request->user()->currentAccessToken()->id;

        return $request->user()->tokens->map(function ($token) use ($currentId) {
            return [
                'id' => $token->id,
                'device' => 'Device', // Simplified, parsing User-Agent requires library
                'platform' => 'Unknown',
                'browser' => 'Unknown',
                'ip_address' => 'Unknown', // token doesn't store IP by default in Sanctum, only last_used_at
                'is_current_device' => $token->id === $currentId,
                'last_active' => $token->last_used_at ? $token->last_used_at->diffForHumans() : 'Just now',
            ];
        });
    }

    /**
     * Logout other sessions
     */
    public function destroySession(Request $request, $id)
    {
        $this->validateSecurity($request);

        $user = $request->user();

        // If ID is 'other', delete all except current
        if ($id === 'other') {
            $currentId = $user->currentAccessToken()->id;
            $user->tokens()->where('id', '!=', $currentId)->delete();
            return response()->json(['message' => 'Other sessions terminated.']);
        }

        // Delete specific
        $user->tokens()->where('id', $id)->delete();

        return response()->json(['message' => 'Session terminated.']);
    }
}
