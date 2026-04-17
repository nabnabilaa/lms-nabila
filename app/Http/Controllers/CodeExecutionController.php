<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CodeExecutionController extends Controller
{
    // Map language names to local executables
    private array $supportedLanguages = [
        'javascript' => 'node',
        'python' => 'python',
        'php' => 'php',
    ];

    public function run(Request $request)
    {
        $request->validate([
            'language' => 'required|string',
            'code' => 'required|string|max:20000',
            'stdin' => 'nullable|string|max:5000',
        ]);

        $lang = strtolower($request->language);

        if (!isset($this->supportedLanguages[$lang])) {
            return response()->json([
                'error' => "Language '{$lang}' is not supported locally."
            ], 422);
        }

        try {
            // Create sandbox directory if it doesn't exist
            if (!Storage::disk('local')->exists('sandbox')) {
                Storage::disk('local')->makeDirectory('sandbox');
            }

            // Generate unique filename
            $filename = 'sandbox/code_' . time() . '_' . Str::random(8) . '.' . $this->getExtension($lang);
            Storage::disk('local')->put($filename, $request->code);

            // Get absolute path
            $filePath = Storage::disk('local')->path($filename);

            // Build command
            $executable = $this->supportedLanguages[$lang];
            $command = "{$executable} \"{$filePath}\"";

            // Run process with fixed 10 seconds timeout
            $process = Process::timeout(10);

            if ($request->filled('stdin')) {
                $process = $process->input($request->stdin);
            }

            $result = $process->run($command);

            // Cleanup temp file
            Storage::disk('local')->delete($filename);

            return response()->json([
                'stdout' => $result->output(),
                'stderr' => $result->errorOutput(),
                'exit_code' => $result->exitCode() ?? 0,
                'language' => $lang,
                'version' => 'local',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'stdout' => '',
                'stderr' => 'Local Execution Error: ' . $e->getMessage(),
                'exit_code' => 1,
            ], 500);
        }
    }

    private function getExtension(string $lang): string
    {
        return match ($lang) {
            'javascript' => 'js',
            'python' => 'py',
            'php' => 'php',
            default => 'txt',
        };
    }
}
