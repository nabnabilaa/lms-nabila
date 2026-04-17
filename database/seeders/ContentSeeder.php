<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;
use App\Models\Content;
use App\Models\Resource;
use App\Models\Module;

class ContentSeeder extends Seeder
{
    public function run()
    {
        $course = Course::where('title->id', 'Fullstack Web Developer Professional')->first();

        if ($course) {
            // Mapping Module Title -> Content List
            $contentMap = [
                'Introduction to Fullstack' => [
                    [
                        'title' => 'Welcome & Course Roadmap',
                        'type' => 'video',
                        'duration' => 10,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Introduction to the course and what you will learn.',
                        'body' => null,
                        'preview' => true,
                    ],
                    [
                        'title' => 'Setting Up Your Environment (VS Code, XAMPP, Node.js)',
                        'type' => 'article',
                        'duration' => 15,
                        'url' => '#',
                        'desc' => 'Step-by-step guide to installing necessary tools.',
                        'body' => "## Setting Up Your Development Environment

To start with Fullstack Development, you need to prepare your tools.

### 1. Visual Studio Code
Download and install [VS Code](https://code.visualstudio.com/). It's the best editor for web dev.
Recommended extensions:
- PHP Intelephense
- ES7+ React/Redux/React-Native snippets
- Prettier

### 2. XAMPP
We need a local server for PHP and MySQL. Download [XAMPP](https://www.apachefriends.org/).
Start **Apache** and **MySQL** from the control panel.

### 3. Node.js
Required for running React. Download the LTS version from [nodejs.org](https://nodejs.org/).
Check installation:
```bash
node -v
npm -v
```",
                        'preview' => false,
                    ]
                ],
                'Database Design' => [
                    [
                        'title' => 'Understanding Relational Databases (ERD)',
                        'type' => 'video',
                        'duration' => 25,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Learn how to design efficient database schemas.',
                        'body' => null,
                        'preview' => false,
                    ],
                    [
                        'title' => 'SQL Basics Quiz',
                        'type' => 'quiz',
                        'duration' => 15,
                        'url' => '#',
                        'desc' => 'Test your knowledge on SELECT, INSERT, UPDATE, DELETE.',
                        'body' => json_encode([
                            [
                                'question' => 'What does SQL stand for?',
                                'options' => ['Structured Query Language', 'Strong Question Logic', 'Simple Query List'],
                                'correct' => 0
                            ],
                            [
                                'question' => 'Which statement is used to fetch data?',
                                'options' => ['INSERT', 'SELECT', 'UPDATE'],
                                'correct' => 1
                            ],
                            [
                                'question' => 'How do you delete a table?',
                                'options' => ['DELETE TABLE', 'DROP TABLE', 'REMOVE TABLE'],
                                'correct' => 1
                            ]
                        ]),
                        'preview' => false,
                    ]
                ],
                'Laravel Basics' => [
                    [
                        'title' => 'Routing & Controllers',
                        'type' => 'video',
                        'duration' => 20,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'How to handle HTTP requests in Laravel.',
                        'body' => null,
                        'preview' => false,
                    ],
                    [
                        'title' => 'Blade Templating vs API Mode',
                        'type' => 'article',
                        'duration' => 10,
                        'url' => '#',
                        'desc' => 'When to use Blade and when to build an API.',
                        'body' => "## Blade vs API

### Blade Templates
Blade is Laravel's powerful templating engine. It compiles into plain PHP code and cached until modified.
Use Blade when building **Monolithic** applications where Laravel handles both backend and frontend geometry.

### API Mode (Headless)
When using React/Vue as a frontend, Laravel acts purely as a JSON provider.
We use `return response()->json(...)` instead of `return view(...)`.

**Key differences:**
- Blade: Server-side rendering.
- API: Client-side rendering (SPA).",
                        'preview' => false,
                    ],
                    [
                        'title' => 'Mini Project: Build a Task List API',
                        'type' => 'assignment',
                        'duration' => 60,
                        'url' => '#',
                        'desc' => 'Create a simple CRUD API for managing tasks.',
                        'body' => "## Assignment: Task List API

Your goal is to build a RESTful API for a Task Manager.

### Requirements:
1.  **GET /api/tasks** - List all tasks.
2.  **POST /api/tasks** - Create a new task.
3.  **PUT /api/tasks/{id}** - Update a task.
4.  **DELETE /api/tasks/{id}** - Delete a task.

### Submission:
Upload your code to GitHub and submit the repository link.",
                        'preview' => false,
                    ]
                ],
                'API Development' => [
                    [
                        'title' => 'Authentication with Sanctum',
                        'type' => 'video',
                        'duration' => 30,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Secure your API using Laravel Sanctum.',
                        'body' => null,
                        'preview' => false,
                    ],
                    [
                        'title' => 'API Resources & Transformations',
                        'type' => 'video',
                        'duration' => 20,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Formatting JSON responses correctly.',
                        'body' => null,
                        'preview' => false,
                    ],
                    // -- SANDBOX ITEMS --
                    [
                        'title' => 'Code Sandbox: JavaScript Loops',
                        'type' => 'sandbox',
                        'duration' => 20,
                        'url' => '#',
                        'desc' => 'Interactive exercise to practice JavaScript loops.',
                        'body' => json_encode([
                            'language' => 'javascript',
                            'initialCode' => "/*\n Write a function that prints numbers from 1 to 5.\n*/\n\nfor (let i = 1; i <= 5; i++) {\n  console.log(i);\n}\n",
                            'stdin' => '',
                            'description' => 'Dalam latihan ini, jalankan kode JavaScript di samping untuk melihat hasil perulangan angka 1 sampai 5. Cobalah mengubah angka 5 menjadi 10 dan jalankan kembali!',
                            'testHint' => 'Tekan tombol "Run Code" untuk melihat output-nya di terminal bawah.'
                        ]),
                        'preview' => true,
                    ],
                    [
                        'title' => 'Code Sandbox: Python FizzBuzz',
                        'type' => 'sandbox',
                        'duration' => 30,
                        'url' => '#',
                        'desc' => 'Classic FizzBuzz programming challenge in Python.',
                        'body' => json_encode([
                            'language' => 'python',
                            'initialCode' => "# Get input from user\nn = int(input('Enter a number: '))\n\n# Implement FizzBuzz\nfor i in range(1, n + 1):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)\n",
                            'stdin' => '15',
                            'description' => 'FizzBuzz adalah salah satu soal interview programming paling terkenal. Lengkapi logika Python di samping. Program menerima input angka dari terminal dan mencetak Fizz, Buzz, atau FizzBuzz sesuai kelipatan angka tersebut.',
                            'testHint' => 'Ubah nilai di panel "Input (stdin)" untuk mencoba dengan batas angka yang berbeda, misalnya 20 atau 50.'
                        ]),
                        'preview' => true,
                    ],
                    [
                        'title' => 'Code Sandbox: PHP Arrays',
                        'type' => 'sandbox',
                        'duration' => 25,
                        'url' => '#',
                        'desc' => 'Manipulasi Array di PHP.',
                        'body' => json_encode([
                            'language' => 'php',
                            'initialCode' => "<?php\n\n// Array Manipulation\n\$fruits = ['Apple', 'Banana', 'Cherry'];\n\n// Add new item\narray_push(\$fruits, 'Durian');\n\n// Print array items\nforeach (\$fruits as \$index => \$fruit) {\n    echo (\$index + 1) . '. ' . \$fruit . \"\\n\";\n}\n\n?>",
                            'stdin' => '',
                            'description' => 'PHP sangat kuat dalam memproses Array. Coba tambahkan atau hapus buah pada kode di samping dan lihat hasilnya saat program dijalankan.',
                            'testHint' => 'Gunakan echo atau print_r() untuk menampilkan hasil di terminal Output.'
                        ]),
                        'preview' => false,
                    ]
                ],
                'React Frontend' => [
                    [
                        'title' => 'Functional Components & Props',
                        'type' => 'video',
                        'duration' => 20,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Building reusable UI blocks.',
                        'body' => null,
                        'preview' => false,
                    ],
                    [
                        'title' => 'React Hooks (useState, useEffect)',
                        'type' => 'video',
                        'duration' => 25,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Managing state and side effects in React.',
                        'body' => null,
                        'preview' => false,
                    ],
                    [
                        'title' => 'Final Exam: Fullstack Integration',
                        'type' => 'quiz',
                        'duration' => 45,
                        'url' => '#',
                        'desc' => 'Comprehensive quiz covering all topics.',
                        'body' => json_encode([
                            ['question' => 'What does SQL stand for?', 'options' => ['Structured Query Language', 'Simple Question Logic', 'System Query List'], 'correct' => 0],
                            ['question' => 'Which HTML tag is used for the largest heading?', 'options' => ['<h6>', '<head>', '<h1>'], 'correct' => 2],
                            ['question' => 'What is the correct way to output "Hello" in PHP?', 'options' => ['echo "Hello";', 'print "Hello";', 'Both'], 'correct' => 2],
                            ['question' => 'Which CSS property controls text size?', 'options' => ['font-style', 'text-size', 'font-size'], 'correct' => 2],
                            ['question' => 'In Laravel, where are routes defined?', 'options' => ['app/Routes.php', 'routes/web.php', 'config/app.php'], 'correct' => 1],
                            ['question' => 'What is the default port for MySQL?', 'options' => ['3306', '8080', '5432'], 'correct' => 0],
                            ['question' => 'Which hook is used for side effects in React?', 'options' => ['useState', 'useEffect', 'useReducer'], 'correct' => 1],
                            ['question' => 'What does API stand for?', 'options' => ['Application Programming Interface', 'App Private Interface', 'Apple Private Inc'], 'correct' => 0],
                            ['question' => 'Which HTTP method is used to update data?', 'options' => ['GET', 'POST', 'PUT/PATCH'], 'correct' => 2],
                            ['question' => 'What is the package manager for Node.js?', 'options' => ['Composer', 'NPM', 'Pip'], 'correct' => 1],
                            ['question' => 'Which command creates a new Laravel controller?', 'options' => ['php artisan make:controller', 'php artisan create:controller', 'laravel new controller'], 'correct' => 0],
                            ['question' => 'What is the virtual DOM in React?', 'options' => ['A direct copy of the DOM', 'A lightweight copy for performance', 'A database for React'], 'correct' => 1],
                            ['question' => 'How do you check if a file exists in PHP?', 'options' => ['file_exists()', 'is_file()', 'has_file()'], 'correct' => 0],
                            ['question' => 'Which symbol is used for jQuery?', 'options' => ['&', '%', '$'], 'correct' => 2],
                            ['question' => 'What is the purpose of migration in Laravel?', 'options' => ['To move files', 'To version control database schema', 'To migrate server'], 'correct' => 1],
                        ]),
                        'preview' => false,
                    ]
                ]
            ];

            foreach ($course->modules as $module) {
                // Clear existing content to avoid duplicates during re-seeding without refresh
                Content::where('module_id', $module->id)->delete();
                Resource::where('module_id', $module->id)->delete();

                if (isset($contentMap[$module->title])) {
                    $order = 1;
                    foreach ($contentMap[$module->title] as $item) {
                        Content::create([
                            'module_id' => $module->id,
                            'title' => $item['title'],
                            'type' => $item['type'],
                            'duration_minutes' => $item['duration'],
                            'content_url' => $item['url'],
                            'description' => $item['desc'],
                            'body' => $item['body'],
                            'order' => $order++,
                            'is_preview' => $item['preview'],
                        ]);
                    }

                    // Add a sample resource for each module
                    Resource::create([
                        'course_id' => $course->id,
                        'module_id' => $module->id,
                        'title' => $module->title . ' - Slides.pdf',
                        'type' => 'PDF',
                        'url' => '#',
                        'file_size' => '2.5 MB',
                    ]);
                }
            }
        }

        // --- COURSE 2: Cyber Security ---
        $course2 = Course::where('title->id', 'Cyber Security Fundamentals')->first();
        if ($course2) {

            $contentMap2 = [
                'Network Security Basics' => [
                    [
                        'title' => 'Introduction to Firewalls',
                        'type' => 'video',
                        'duration' => 20,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'How firewalls protect networks.',
                        'body' => null,
                        'preview' => true,
                    ],
                    [
                        'title' => 'OSI Model Explained',
                        'type' => 'article',
                        'duration' => 15,
                        'url' => '#',
                        'desc' => 'Understanding network layers.',
                        'body' => "## The OSI Model\n\n1. Physical\n2. Data Link\n3. Network\n4. Transport\n5. Session\n6. Presentation\n7. Application",
                        'preview' => false,
                    ]
                ],
                'Cryptography & Encryption' => [
                    [
                        'title' => 'Symmetric vs Asymmetric Encryption',
                        'type' => 'video',
                        'duration' => 30,
                        'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        'desc' => 'Public and Private keys explained.',
                        'body' => null,
                        'preview' => false,
                    ]
                ],
                'Ethical Hacking 101' => [
                    [
                        'title' => 'Final Exam: Cyber Security',
                        'type' => 'quiz',
                        'duration' => 60,
                        'url' => '#',
                        'desc' => 'Test your security knowledge.',
                        'body' => json_encode([
                            ['question' => 'What is CIA in security?', 'options' => ['Confidentiality, Integrity, Availability', 'Central Intelligence Agency', 'Code Integrity Access'], 'correct' => 0],
                            ['question' => 'Which port is HTTPS?', 'options' => ['80', '443', '21'], 'correct' => 1],
                            ['question' => 'What is a DDoS attack?', 'options' => ['Distributed Denial of Service', 'Direct Data on Server', 'Digital Domain System'], 'correct' => 0],
                            ['question' => 'Which is NOT a strong password?', 'options' => ['P@ssw0rd123!', '123456', 'Tr0ub4d0ur&3'], 'correct' => 1],
                            ['question' => 'What is Phishing?', 'options' => ['Fishing sport', 'Email scam to steal data', 'Virus scan'], 'correct' => 1],
                        ]),
                        'preview' => false,
                    ]
                ]
            ];

            foreach ($course2->modules as $module) {
                // Clear existing content
                Content::where('module_id', $module->id)->delete();
                Resource::where('module_id', $module->id)->delete();

                if (isset($contentMap2[$module->title])) {
                    $order = 1;
                    foreach ($contentMap2[$module->title] as $item) {
                        Content::create([
                            'module_id' => $module->id,
                            'title' => $item['title'],
                            'type' => $item['type'],
                            'duration_minutes' => $item['duration'],
                            'content_url' => $item['url'],
                            'description' => $item['desc'],
                            'body' => $item['body'],
                            'order' => $order++,
                            'is_preview' => $item['preview'],
                        ]);
                    }
                }
            }
        }
    }
}
