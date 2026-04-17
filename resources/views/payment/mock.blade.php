<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Payment Gateway - Xendit Simulation</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="bg-[#1f2937] p-6 text-white flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold">X</div>
                <h1 class="font-bold text-xl">Xendit <span
                        class="text-xs font-normal opacity-70 bg-gray-700 px-2 py-0.5 rounded">TEST</span></h1>
            </div>
            <div class="text-right">
                <p class="text-xs opacity-70">Total Amount</p>
                <p class="font-mono font-bold text-lg">Rp {{ number_format($amount, 0, ',', '.') }}</p>
            </div>
        </div>

        <!-- Body -->
        <div class="p-8">
            <div class="mb-6">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                <p class="text-gray-800 font-medium">{{ $description }}</p>
            </div>

            <div class="mb-8">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice ID</p>
                <p class="font-mono text-sm bg-gray-50 p-2 rounded border text-gray-600">{{ $externalId }}</p>
            </div>

            <form action="{{ route('payment.mock_success') }}" method="POST" class="space-y-4">
                @csrf
                <input type="hidden" name="external_id" value="{{ $externalId }}">
                <input type="hidden" name="redirect_url" value="{{ $redirectUrl }}">

                <!-- Mock Payment Methods -->
                <div class="space-y-3">
                    <p class="text-sm font-bold text-gray-700">Select Payment Method (Simulation)</p>

                    <label
                        class="flex items-center p-4 border rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                        <input type="radio" name="method" value="bca" checked class="w-4 h-4 text-blue-600">
                        <div class="ml-3 flex-1">
                            <span class="block font-bold text-gray-800">Virtual Account BCA</span>
                            <span class="block text-xs text-gray-500">Pay automatically</span>
                        </div>
                        <span
                            class="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Instant</span>
                    </label>

                    <label
                        class="flex items-center p-4 border rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                        <input type="radio" name="method" value="mandiri" class="w-4 h-4 text-blue-600">
                        <div class="ml-3">
                            <span class="block font-bold text-gray-800">QRIS</span>
                            <span class="block text-xs text-gray-500">Scan to pay</span>
                        </div>
                    </label>
                </div>

                <div class="pt-4">
                    <button type="submit"
                        class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transform active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                        <span>Pay Now</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </button>
                    <p class="text-center text-xs text-gray-400 mt-4">This is a mock payment page for local development.
                    </p>
                </div>
            </form>
        </div>
    </div>
</body>

</html>