<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotify B&W Wireframes - Font Awesome</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --wire-black: #000000;
            --wire-gray: #888888;
            --wire-light: #f0f0f0;
            --wire-white: #ffffff;
            --phone-width: 320px;
            --phone-height: 680px;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif; /* Mengganti font agar lebih modern seperti app */
            background-color: #e0e0e0;
            padding: 40px;
            display: flex;
            flex-wrap: wrap;
            gap: 50px;
            justify-content: center;
        }

        /* --- PHONE CHASSIS --- */
        .phone-frame {
            width: var(--phone-width);
            height: var(--phone-height);
            background: var(--wire-white);
            border: 4px solid var(--wire-black);
            border-radius: 0px;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 15px 15px 0px rgba(0,0,0,0.1);
        }

        /* Dark Mode Variant */
        .phone-frame.dark-mode {
            background: #121212;
            color: white;
        }
        .phone-frame.dark-mode .wire-text-sec { color: #aaa; }
        .phone-frame.dark-mode .nav-bar { background: #000; border-top: 1px solid #333; }
        .phone-frame.dark-mode .mini-player { background: #333; border: 1px solid #555; }
        .phone-frame.dark-mode .status-bar { border-bottom: 1px solid #333; }

        /* --- UTILITIES --- */
        .status-bar { 
            height: 25px; 
            flex-shrink: 0;
            border-bottom: 1px solid #eee; 
            display: flex; 
            justify-content: space-between; 
            padding: 0 15px; 
            align-items: center; 
            font-size: 10px; 
            font-weight: bold;
        }

        .content { 
            flex: 1; 
            overflow: hidden; 
            padding-bottom: 100px; 
            position: relative;
        }

        .wire-img {
            background-color: #333;
            border: 1px solid #555;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #777;
            position: relative;
            overflow: hidden;
        }
        
        .wire-img::after, .wire-img::before { content: ''; position: absolute; background: #444; }
        .wire-img::after { width: 1px; height: 150%; transform: rotate(45deg); }
        .wire-img::before { width: 1px; height: 150%; transform: rotate(-45deg); }

        .wire-circle { border-radius: 50%; }
        
        .wire-btn { border: 1px solid white; padding: 5px 20px; border-radius: 20px; font-weight: bold; text-align: center; display: inline-block; font-size: 12px;}
        .wire-btn-fill { background: white; color: black; border-color: white; }
        
        .section-title { font-weight: bold; font-size: 18px; margin: 15px 10px 10px; }
        .wire-text-sec { font-size: 11px; color: var(--wire-gray); margin: 0 10px; }

        /* --- FIXED COMPONENTS --- */
        .mini-player {
            position: absolute; 
            bottom: 55px; /* Sedikit dinaikkan */
            left: 2.5%; 
            width: 95%; 
            height: 50px;
            background: var(--wire-white); 
            border-radius: 6px;
            display: flex; 
            align-items: center; 
            padding: 5px 10px; 
            z-index: 10;
        }
        .nav-bar {
            position: absolute; 
            bottom: 0; 
            width: 100%; 
            height: 50px;
            background: var(--wire-white); 
            border-top: 1px solid #333;
            display: flex; 
            justify-content: space-around; 
            align-items: center; 
            z-index: 11; 
            font-size: 20px;
            color: #b3b3b3;
        }
        
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 10px;
            gap: 4px;
        }
        .nav-item i { font-size: 20px; }
        .nav-item.active { color: white; }

        .frame-wrapper { position: relative; }
        .frame-label {
            position: absolute; 
            top: -30px; 
            left: 0; 
            font-weight: bold; 
            font-family: sans-serif;
            font-size: 14px;
            color: #333;
        }

        /* --- SPECIFIC LAYOUT CLASSES --- */
        .flex-row { display: flex; align-items: center; }
        .space-between { justify-content: space-between; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
        .grid-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px; }
        
        .card-sq { height: 60px; border: none; padding: 10px; font-size: 11px; font-weight: bold; display: flex; align-items: flex-start; color: white; border-radius: 4px; }
        
        .card-vert { display: flex; flex-direction: column; gap: 5px; }
        .card-title { font-size: 11px; font-weight: bold; margin-top: 5px; line-height: 1.2; }
        
        .list-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #222; }
        .list-text { flex: 1; margin-left: 12px; }
        .list-title { font-weight: bold; font-size: 13px; display: block; margin-bottom: 2px;}
        .list-sub { font-size: 11px; color: #aaa; }

        .search-bar { margin: 10px; height: 40px; border: none; border-radius: 4px; display: flex; align-items: center; padding-left: 10px; font-size: 13px; background: white; color: black; gap: 10px;}
        .pill-row { display: flex; gap: 8px; padding: 0 10px; overflow-x: hidden; margin-bottom: 10px;}
        .pill { border: 1px solid #777; color: white; border-radius: 15px; padding: 6px 14px; font-size: 11px; white-space: nowrap; }
        .phone-frame.dark-mode .pill.active { background: #1DB954; border-color: #1DB954; color: black; font-weight: bold; }

    </style>
</head>
<body>

    <div class="frame-wrapper">
        <div class="frame-label">1. Home (04-01)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div class="content">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:20px 10px 10px;">
                    <div class="section-title" style="margin:0;">Good morning</div>
                    <div style="display:flex; gap:15px;">
                        <i class="fa-regular fa-bell"></i>
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        <i class="fa-solid fa-gear"></i>
                    </div>
                </div>
                
                <div class="grid-2">
                    <div class="list-item" style="background:#333; border-radius:4px; padding:0; height:50px; border:none; overflow:hidden;">
                        <div class="wire-img" style="width:50px; height:100%; border:none;"></div>
                        <span style="font-size:10px; margin-left:8px; font-weight:bold;">Anand Bakshi</span>
                    </div>
                    <div class="list-item" style="background:#333; border-radius:4px; padding:0; height:50px; border:none; overflow:hidden;">
                        <div class="wire-img" style="width:50px; height:100%; border:none;"></div>
                        <span style="font-size:10px; margin-left:8px; font-weight:bold;">E123: Sankar</span>
                    </div>
                    <div class="list-item" style="background:#333; border-radius:4px; padding:0; height:50px; border:none; overflow:hidden;">
                        <div class="wire-img" style="width:50px; height:100%; border:none;"></div>
                        <span style="font-size:10px; margin-left:8px; font-weight:bold;">Indie India</span>
                    </div>
                    <div class="list-item" style="background:#333; border-radius:4px; padding:0; height:50px; border:none; overflow:hidden;">
                        <div class="wire-img" style="width:50px; height:100%; border:none;"></div>
                        <span style="font-size:10px; margin-left:8px; font-weight:bold;">RADAR India</span>
                    </div>
                </div>

                <div class="section-title">Voices from Indie Music</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div style="width:120px;">
                        <div class="wire-img" style="width:120px; height:120px;"></div>
                        <div style="font-size:11px; font-weight:bold; margin-top:8px;">Indie India</div>
                    </div>
                    <div style="width:120px;">
                        <div class="wire-img" style="width:120px; height:120px;"></div>
                        <div style="font-size:11px; font-weight:bold; margin-top:8px;">RADAR India</div>
                    </div>
                </div>
                
                <div class="section-title">Your shows</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div class="wire-img" style="width:120px; height:120px; border-radius:8px;"></div>
                    <div class="wire-img" style="width:120px; height:120px; border-radius:8px;"></div>
                </div>
            </div>
            
            <div class="mini-player">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Numb</span><span class="list-sub" style="font-size:10px;">Elderbrook</span></div>
                <div style="display:flex; gap:15px; align-items:center; margin-right:10px;">
                    <i class="fa-brands fa-bluetooth-b" style="font-size:16px; color:#1DB954;"></i>
                    <i class="fa-regular fa-heart" style="font-size:18px;"></i>
                    <i class="fa-solid fa-play" style="font-size:18px;"></i>
                </div>
            </div>

            <div class="nav-bar">
                <div class="nav-item active"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">2. Search (04-02)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div class="content">
                <div class="section-title" style="font-size:24px; margin-top:20px;">Search</div>
                <div class="search-bar">
                    <i class="fa-solid fa-magnifying-glass" style="color:#333;"></i> 
                    <span style="color:#555;">What do you want to listen to?</span>
                </div>
                
                <div class="section-title" style="font-size:14px;">Browse all</div>
                <div class="grid-cards">
                    <div class="card-sq" style="background:#E13300;">Podcasts</div>
                    <div class="card-sq" style="background:#7358FF;">Made For You</div>
                    <div class="card-sq" style="background:#E91429;">Charts</div>
                    <div class="card-sq" style="background:#D84000;">New Releases</div>
                    <div class="card-sq" style="background:#1E3264;">Discover</div>
                    <div class="card-sq" style="background:#509BF5;">Live Events</div>
                    <div class="card-sq" style="background:#E91429;">Bollywood</div>
                    <div class="card-sq" style="background:#D84000;">Punjabi</div>
                </div>
            </div>
            
            <div class="mini-player">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Numb</span><span class="list-sub" style="font-size:10px;">Elderbrook</span></div>
                <i class="fa-solid fa-play" style="font-size:18px; margin-right:10px;"></i>
            </div>

            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item active"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">3. Search Results (04-03)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:10px; display:flex; gap:15px; align-items:center;">
                <i class="fa-solid fa-arrow-left" style="font-size:20px;"></i>
                <div class="search-bar" style="flex:1; margin:0; height:35px; background:#333; color:white; border:1px solid #555;">
                    <span style="flex:1;">coldplay</span>
                    <i class="fa-solid fa-xmark"></i>
                </div>
            </div>
            <div class="pill-row">
                <span class="pill active">Top</span>
                <span class="pill">Artists</span>
                <span class="pill">Playlists</span>
                <span class="pill">Songs</span>
            </div>
            <div class="content">
                <div class="list-item">
                    <div class="wire-img wire-circle" style="width:50px; height:50px;"></div>
                    <div class="list-text">
                        <span class="list-title">Coldplay <i class="fa-solid fa-circle-check" style="color:#1DB954; font-size:12px;"></i></span>
                        <span class="list-sub">Artist</span>
                    </div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>

                <div class="section-title" style="font-size:14px;">Featuring Coldplay</div>
                <div style="display:flex; gap:10px; padding:0 10px;">
                    <div style="width:100px;">
                        <div class="wire-img" style="width:100px; height:100px;"></div>
                        <div style="font-size:10px; font-weight:bold; margin-top:5px;">This Is Coldplay</div>
                    </div>
                    <div style="width:100px;">
                        <div class="wire-img" style="width:100px; height:100px;"></div>
                        <div style="font-size:10px; font-weight:bold; margin-top:5px;">Coldplay Radio</div>
                    </div>
                </div>

                <div class="list-item">
                    <div class="wire-img" style="width:40px; height:40px;"></div>
                    <div class="list-text"><span class="list-title">This Is Coldplay</span><span class="list-sub">Playlist</span></div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
                <div class="list-item">
                    <div class="wire-img" style="width:40px; height:40px;"></div>
                    <div class="list-text"><span class="list-title">A Sky Full of Stars</span><span class="list-sub">Song • Coldplay</span></div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
            </div>
            
            <div class="mini-player">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Numb</span><span class="list-sub" style="font-size:10px;">Elderbrook</span></div>
                <i class="fa-solid fa-play" style="font-size:18px; margin-right:10px;"></i>
            </div>

            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item active"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">4. Playlist (04-04)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div class="content">
                <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
                <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:20px 10px; background: linear-gradient(to bottom, #444, #121212);">
                    <div class="wire-img" style="width:160px; height:160px; box-shadow:0 8px 15px rgba(0,0,0,0.5);"></div>
                    <div class="section-title">This Is Coldplay</div>
                    <div class="wire-text-sec">The essential tracks, all in one playlist.</div>
                    <div class="wire-text-sec" style="margin-top:5px;"><i class="fa-brands fa-spotify" style="color:#1DB954;"></i> Spotify • 3,630,231 likes</div>
                </div>

                <div class="flex-row space-between" style="padding:0 15px; margin-bottom:10px;">
                    <div style="font-size:22px; color:#aaa; display:flex; gap:20px;">
                        <i class="fa-regular fa-heart"></i>
                        <i class="fa-solid fa-circle-arrow-down"></i>
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </div>
                    <div class="wire-btn wire-circle wire-btn-fill" style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; padding:0; background:#1DB954; border:none;">
                        <i class="fa-solid fa-play" style="font-size:20px; color:black; margin-left:3px;"></i>
                    </div>
                </div>

                <div style="padding-top:10px;">
                    <div class="list-item">
                        <span style="color:#888; margin-right:15px; font-size:12px;">1</span>
                        <div class="list-text"><span class="list-title">Paradise</span><span class="list-sub">Coldplay</span></div>
                        <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                    </div>
                    <div class="list-item">
                        <span style="color:#888; margin-right:15px; font-size:12px;">2</span>
                        <div class="list-text"><span class="list-title">Fix You</span><span class="list-sub">Coldplay</span></div>
                        <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                    </div>
                    <div class="list-item">
                        <span style="color:#888; margin-right:15px; font-size:12px;">3</span>
                        <div class="list-text"><span class="list-title">Yellow</span><span class="list-sub">Coldplay</span></div>
                        <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                    </div>
                    <div class="list-item">
                        <span style="color:#888; margin-right:15px; font-size:12px;">4</span>
                        <div class="list-text"><span class="list-title">Hymn for the Weekend</span><span class="list-sub">Coldplay</span></div>
                        <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                    </div>
                </div>
            </div>
            <div class="mini-player">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Numb</span><span class="list-sub" style="font-size:10px;">Elderbrook</span></div>
                <i class="fa-solid fa-play" style="font-size:18px; margin-right:10px;"></i>
            </div>
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">5. Artist (04-05)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div class="content">
                <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
                <div class="wire-img" style="width:100%; height:150px; border:none; display:flex; flex-direction:column; background:transparent;">
                    <div class="wire-img wire-circle" style="width:80px; height:80px; align-self:center;"></div>
                    <h2 style="text-align:center; margin:10px 0 5px;">Coldplay</h2>
                </div>
                <div class="wire-text-sec" style="text-align:center; margin-bottom:15px;">45,823,094 Monthly Listeners</div>
                
                <div class="flex-row space-between" style="padding:0 15px;">
                    <div class="wire-btn" style="border-color:#aaa; color:white;">Follow</div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <i class="fa-solid fa-ellipsis-vertical" style="font-size:20px; color:#aaa;"></i>
                        <div class="wire-btn wire-circle wire-btn-fill" style="width:45px; height:45px; display:flex; align-items:center; justify-content:center; padding:0; background:#1DB954; border:none;">
                            <i class="fa-solid fa-play" style="font-size:18px; color:black; margin-left:3px;"></i>
                        </div>
                    </div>
                </div>

                <div class="section-title" style="font-size:16px;">Popular</div>
                <div class="list-item">
                    <span style="margin-right:15px; font-size:12px;">1</span>
                    <div class="wire-img" style="width:35px; height:35px; margin-right:10px;"></div>
                    <div class="list-text"><span class="list-title">Yellow</span><span class="list-sub">1,751,851,465</span></div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
                <div class="list-item">
                    <span style="margin-right:15px; font-size:12px;">2</span>
                    <div class="wire-img" style="width:35px; height:35px; margin-right:10px;"></div>
                    <div class="list-text"><span class="list-title">Viva La Vida</span><span class="list-sub">1,500,000,000</span></div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>

                <div class="section-title" style="font-size:16px;">Albums</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div style="width:110px;">
                        <div class="wire-img" style="width:110px; height:110px;"></div>
                        <div style="font-size:11px; margin-top:8px;">Music of the Spheres</div>
                    </div>
                    <div style="width:110px;">
                        <div class="wire-img" style="width:110px; height:110px;"></div>
                        <div style="font-size:11px; margin-top:8px;">Parachutes</div>
                    </div>
                </div>
            </div>
            
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">6. Context Menu (04-06)</div>
        <div class="phone-frame dark-mode" style="background:rgba(0,0,0,0.85);">
            <div style="padding:20px; text-align:center; margin-top:50px;">
                <div class="wire-img" style="width:140px; height:140px; margin:0 auto; display:block;"></div>
                <h2 style="color:white; margin:15px;">Coldplay</h2>
            </div>
            
            <div style="padding:20px; color:white;">
                <div class="flex-row" style="margin-bottom:25px; cursor:pointer;">
                    <i class="fa-solid fa-xmark" style="font-size:24px; margin-right:20px; color:#ccc; width:25px;"></i>
                    <span style="font-weight:bold; font-size:16px;">Stop Following</span>
                </div>
                <div class="flex-row" style="margin-bottom:25px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:20px; margin-right:20px; color:#ccc; width:25px;"></i>
                    <span style="font-weight:bold; font-size:16px;">Report</span>
                </div>
                <div class="flex-row" style="margin-bottom:25px;">
                    <i class="fa-solid fa-share-nodes" style="font-size:22px; margin-right:20px; color:#ccc; width:25px;"></i>
                    <span style="font-weight:bold; font-size:16px;">Share</span>
                    <div style="border:1px solid white; border-radius:15px; padding:2px 10px; font-size:10px; margin-left:15px;">Following</div>
                </div>
            </div>

            <div style="margin-top:auto; padding:20px; text-align:center; border-top:1px solid #444;">
                <span style="font-weight:bold;">Close</span>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">Gambar 4.1 Usulan Perbaikan (Redesign)</div>
        <div class="phone-frame dark-mode">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px;">
                <i class="fa-solid fa-chevron-down" style="font-size:20px;"></i>
                <span style="font-size:11px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">NOW PLAYING</span>
                <i class="fa-solid fa-ellipsis" style="font-size:20px;"></i>
            </div>
            
            <div style="padding:10px 25px;">
                <div class="wire-img" style="width:100%; aspect-ratio:1; background:#333; border:none; box-shadow: 0 10px 20px rgba(0,0,0,0.5); border-radius: 12px;"></div>
            </div>

            <div style="padding:0 25px; margin-top: auto; margin-bottom: 40px;">
                
                <div class="flex-row space-between" style="margin-bottom: 25px;">
                    <div>
                        <div style="font-size:24px; font-weight:bold; color:white; margin-bottom:5px;">Yellow</div>
                        <div style="color:#aaa; font-size:16px;">Coldplay</div>
                    </div>
                    <i class="fa-regular fa-heart" style="font-size:28px;"></i>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="height:6px; background:#444; width:100%; border-radius:3px; position:relative;">
                        <div style="height:6px; background:#1DB954; width:30%; border-radius:3px; position:absolute;"></div>
                        <div style="width:14px; height:14px; background:white; border-radius:50%; position:absolute; left:30%; top:-4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>
                    </div>
                    <div class="flex-row space-between" style="font-size:12px; color:#aaa; margin-top:8px; font-family: sans-serif;">
                        <span>1:20</span>
                        <span>4:26</span>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px;">
                    
                    <div style="background-color: #1DB954; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        <i class="fa-solid fa-shuffle" style="font-size:18px; color:black;"></i>
                    </div>

                    <i class="fa-solid fa-backward-step" style="font-size:36px; color:white;"></i>
                    
                    <div style="width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; box-shadow: 0 5px 20px rgba(0,0,0,0.5);">
                        <i class="fa-solid fa-pause" style="font-size:32px;"></i>
                    </div>

                    <i class="fa-solid fa-forward-step" style="font-size:36px; color:white;"></i>
                    
                    <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-repeat" style="font-size:20px; color:#666;"></i>
                    </div>
                </div>
                
                <div class="flex-row space-between" style="font-size:20px; color:#ccc; padding:0 10px;">
                    <i class="fa-solid fa-computer"></i>
                    <i class="fa-solid fa-share-nodes"></i>
                </div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">8. Home Podcasts (04-08)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
            <div class="content">
                <div class="section-title" style="font-size:22px;">Best episodes of the week</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div style="width:130px;">
                        <div class="wire-img" style="width:130px; height:130px; border:none; background:#333; border-radius:8px;"></div>
                        <div style="font-size:11px; margin-top:8px;">S01 E02 - Mohammed...</div>
                    </div>
                    <div style="width:130px;">
                        <div class="wire-img" style="width:130px; height:130px; border:none; background:#333; border-radius:8px;"></div>
                        <div style="font-size:11px; margin-top:8px;">#177 Mimicry Artist...</div>
                    </div>
                </div>

                <div class="section-title">Fresh Finds</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div style="width:130px;">
                        <div class="wire-img" style="width:130px; height:130px; border:none; background:#333; border-radius:8px;"></div>
                        <div style="font-size:11px; margin-top:8px; font-weight:bold;">Detective Mathimaran</div>
                        <div style="font-size:10px; color:#aaa;">Spotify Studios</div>
                    </div>
                    <div style="width:130px;">
                        <div class="wire-img" style="width:130px; height:130px; border:none; background:#333; border-radius:8px;"></div>
                        <div style="font-size:11px; margin-top:8px; font-weight:bold;">Meetha aur Teekha</div>
                        <div style="font-size:10px; color:#aaa;">Spotify Studios</div>
                    </div>
                </div>

                <div class="section-title">Categories</div>
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div class="wire-img" style="width:150px; height:80px; background:#444; border:none; border-radius:8px;"></div>
                    <div class="wire-img" style="width:150px; height:80px; background:#444; border:none; border-radius:8px;"></div>
                </div>
            </div>
            
            <div class="mini-player" style="background:#440000; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#662222; border:none; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Yellow</span><span class="list-sub" style="color:#ccc; font-size:10px;">Coldplay</span></div>
                <div style="display:flex; gap:15px; align-items:center; margin-right:10px;">
                    <i class="fa-regular fa-heart" style="font-size:18px;"></i>
                    <i class="fa-solid fa-play" style="font-size:18px;"></i>
                </div>
            </div>
            
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">9. Live Events (04-10)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:15px 15px 0; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-arrow-left" style="font-size:20px;"></i>
                <span>Live Events</span>
            </div>
            <div class="section-title" style="margin-top:10px; font-size:24px;">Live Events</div>
            
            <div class="flex-row" style="padding:0 10px; gap:25px; border-bottom:1px solid #333; padding-bottom:10px; font-weight:bold; font-size:13px;">
                <span style="color:#aaa;">For you</span>
                <span style="border-bottom:2px solid #1DB954; padding-bottom:10px; color:white;">All events</span>
                <span style="color:#aaa;">Sold by Spotify</span>
            </div>

            <div class="content" style="padding-top:15px;">
                <div style="margin:10px; padding:8px 15px; background:#333; border-radius:20px; display:inline-block; font-size:12px; font-weight:bold;">
                    <i class="fa-solid fa-location-dot" style="margin-right:5px;"></i> Bangalore
                </div>

                <div style="padding:15px;">
                    <div style="font-weight:bold; margin-bottom:15px;">Sunday, July 30, 2023</div>
                    <div style="display:flex; gap:15px;">
                        <div class="wire-img" style="width:100px; height:100px; background:#333; border:none; border-radius:4px;"></div>
                        <div>
                            <div style="font-size:11px; color:#1DB954; font-weight:bold; margin-bottom:5px;">Sun, Jul 30, 6 PM</div>
                            <div style="font-weight:bold; font-size:15px; margin:5px 0;">Hozho</div>
                            <div style="font-size:11px; color:#aaa;">Sunburn Union, Bengaluru</div>
                        </div>
                    </div>
                </div>

                <div style="padding:15px;">
                    <div style="font-weight:bold; margin-bottom:15px;">Sunday, August 20, 2023</div>
                    <div style="display:flex; gap:15px;">
                        <div class="wire-img" style="width:100px; height:100px; background:#333; border:none; border-radius:4px;"></div>
                        <div>
                            <div style="font-size:11px; color:#1DB954; font-weight:bold; margin-bottom:5px;">Sun, Aug 20, 9 PM</div>
                            <div style="font-weight:bold; font-size:15px; margin:5px 0;">Martin Roth</div>
                            <div style="font-size:11px; color:#aaa;">Magique, Bangalore</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mini-player" style="background:#440000; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#662222; border:none; border-radius:4px;"></div>
                <div class="list-text"><span class="list-title" style="font-size:12px;">Yellow</span><span class="list-sub" style="color:#ccc; font-size:10px;">Coldplay</span></div>
                <div style="display:flex; gap:15px; align-items:center; margin-right:10px;">
                    <i class="fa-regular fa-heart" style="font-size:18px;"></i>
                    <i class="fa-solid fa-play" style="font-size:18px;"></i>
                </div>
            </div>
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">10. Featured Charts (04-11)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
            <div class="content">
                <div class="section-title" style="font-size:24px;">Featured Charts</div>
                
                <div class="grid-2">
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#555; border:none; position:relative; border-radius:4px;">
                            <span style="position:absolute; top:10px; left:10px; font-weight:bold; color:white;">Top<br>Songs<br>Global</span>
                            <i class="fa-brands fa-spotify" style="position:absolute; top:10px; left:10px; font-size:18px;"></i>
                        </div>
                        <div class="card-title">Top Songs - Global</div>
                    </div>
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#555; border:none; position:relative; border-radius:4px;">
                            <span style="position:absolute; top:10px; left:10px; font-weight:bold; color:white;">Top<br>Songs<br>India</span>
                        </div>
                        <div class="card-title">Top Songs - India</div>
                    </div>
                </div>

                <div class="section-title" style="font-size:16px; margin-top:30px;">Weekly Song Charts</div>
                <div class="grid-2">
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#555; border:none; position:relative; border-radius:4px;">
                            <span style="position:absolute; top:10px; left:10px; font-weight:bold; color:white;">Top<br>Songs<br>Global</span>
                        </div>
                        <div class="card-title">Top Songs - Global</div>
                    </div>
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#555; border:none; position:relative; border-radius:4px;">
                            <span style="position:absolute; top:10px; left:10px; font-weight:bold; color:white;">Top<br>Songs<br>Argent..</span>
                        </div>
                        <div class="card-title">Top Songs - Argentina</div>
                    </div>
                </div>
            </div>

            <div class="mini-player" style="background:#441111; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#662222; border:none; border-radius:4px;"></div>
                <div class="list-text"><span style="font-weight:bold; display:block; font-size:12px;">Yellow</span><span style="font-size:10px; color:#ccc;">Coldplay</span></div>
                <div style="display:flex; gap:15px; align-items:center; margin-right:10px;">
                    <i class="fa-regular fa-heart" style="font-size:18px;"></i>
                    <i class="fa-solid fa-play" style="font-size:18px;"></i>
                </div>
            </div>
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">11. New Releases (04-12)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
            <div class="content">
                <div class="section-title" style="font-size:18px;">The best new releases</div>
                
                <div class="grid-2">
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#333; border:none; border-radius:4px;"></div>
                        <div class="card-title">New Music Friday</div>
                    </div>
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#333; border:none; border-radius:4px;"></div>
                        <div class="card-title">Release Radar</div>
                    </div>
                </div>

                <div class="section-title" style="font-size:18px; margin-top:30px;">New albums & singles</div>
                <div class="grid-2">
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#333; border:none; border-radius:4px;"></div>
                        <div class="card-title">Naa Ready (From "Leo")</div>
                    </div>
                    <div class="card-vert">
                        <div class="wire-img" style="width:100%; aspect-ratio:1; background:#333; border:none; border-radius:4px;"></div>
                        <div class="card-title">WATER COMES OUT...</div>
                    </div>
                </div>
            </div>

            <div class="mini-player" style="background:#441111; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#662222; border:none; border-radius:4px;"></div>
                <div class="list-text"><span style="font-weight:bold; display:block; font-size:12px;">Yellow</span><span style="font-size:10px; color:#ccc;">Coldplay</span></div>
                <div style="display:flex; gap:15px; align-items:center; margin-right:10px;">
                    <i class="fa-regular fa-heart" style="font-size:18px;"></i>
                    <i class="fa-solid fa-play" style="font-size:18px;"></i>
                </div>
            </div>
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">12. Search: Profiles (04-14)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="display:flex; align-items:center; padding:10px 15px;">
                <i class="fa-solid fa-arrow-left" style="font-size:20px; margin-right:15px;"></i>
                <div class="search-bar" style="flex:1; margin:0; background:#333; border:1px solid #555; color:white;">
                    <span style="flex:1">cozy</span>
                    <i class="fa-solid fa-xmark"></i>
                </div>
            </div>

            <div class="pill-row" style="margin-top:10px;">
                <span class="pill">Podcasts & Shows</span>
                <span class="pill">Albums</span>
                <span class="pill">Artists</span>
                <span class="pill active">Profiles</span>
            </div>

            <div class="content">
                <div class="list-item" style="border-bottom:none;">
                    <div class="wire-img wire-circle" style="width:50px; height:50px; background:#444; border:none;"></div>
                    <div class="list-text">
                        <div style="font-weight:bold; font-size:14px;">Cozy Coffeehouse <i class="fa-solid fa-circle-check" style="color:#3d91f4; font-size:12px;"></i></div>
                        <div style="font-size:12px; color:#aaa;">Profile</div>
                    </div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
                <div class="list-item" style="border-bottom:none;">
                    <div class="wire-img wire-circle" style="width:50px; height:50px; background:#444; border:none;"></div>
                    <div class="list-text">
                        <div style="font-weight:bold; font-size:14px;">Cozy</div>
                        <div style="font-size:12px; color:#aaa;">Profile</div>
                    </div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
                <div class="list-item" style="border-bottom:none;">
                    <div class="wire-img wire-circle" style="width:50px; height:50px; background:#444; border:none;"></div>
                    <div class="list-text">
                        <div style="font-weight:bold; font-size:14px;">cozy clouds <i class="fa-solid fa-circle-check" style="color:#3d91f4; font-size:12px;"></i></div>
                        <div style="font-size:12px; color:#aaa;">Profile</div>
                    </div>
                    <i class="fa-solid fa-ellipsis-vertical" style="color:#aaa;"></i>
                </div>
            </div>

            <div class="mini-player" style="background:#112244; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#223355; border:none; border-radius:4px;"></div>
                <div class="list-text">
                    <span style="font-weight:bold; display:block; font-size:12px;">The Art of Spending...</span>
                    <span style="font-size:10px; color:#ccc;">The Morgan Housel Pod...</span>
                </div>
                <i class="fa-solid fa-play" style="font-size:18px; margin-right:10px;"></i>
            </div>
            
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item active"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>

    <div class="frame-wrapper">
        <div class="frame-label">13. Genre Page (04-13)</div>
        <div class="phone-frame dark-mode">
            <div class="status-bar"><span>12:30</span><span><i class="fa-solid fa-battery-full"></i></span></div>
            <div style="padding:15px;"><i class="fa-solid fa-arrow-left" style="font-size:20px;"></i></div>
            <div class="content">
                <div class="section-title" style="font-size:32px; margin-bottom:20px;">Cozy</div>
                
                <div style="display:flex; gap:15px; padding:0 10px;">
                    <div style="width:140px; flex-shrink:0;">
                        <div class="wire-img" style="width:140px; height:140px; background:#333; border:none; border-radius:4px;"></div>
                        <div style="font-size:12px; margin-top:10px; font-weight:bold;">Warm Fuzzy Feeling</div>
                        <div style="font-size:10px; color:#aaa; margin-top:2px;">Warm Fuzzy Feeling</div>
                    </div>
                    <div style="width:140px; flex-shrink:0;">
                        <div class="wire-img" style="width:140px; height:140px; background:#333; border:none; border-radius:4px;"></div>
                        <div style="font-size:12px; margin-top:10px; font-weight:bold;">lush lofi</div>
                        <div style="font-size:10px; color:#aaa; margin-top:2px;">lush lofi</div>
                    </div>
                </div>
            </div>

            <div class="mini-player" style="background:#112244; border:none;">
                <div class="wire-img" style="width:38px; height:38px; margin-right:10px; background:#223355; border:none; border-radius:4px;"></div>
                <div class="list-text">
                    <span style="font-weight:bold; display:block; font-size:12px;">The Art of Spending...</span>
                    <span style="font-size:10px; color:#ccc;">The Morgan Housel Pod...</span>
                </div>
                <i class="fa-solid fa-play" style="font-size:18px; margin-right:10px;"></i>
            </div>
            
            <div class="nav-bar">
                <div class="nav-item"><i class="fa-solid fa-house"></i>Home</div>
                <div class="nav-item"><i class="fa-solid fa-magnifying-glass"></i>Search</div>
                <div class="nav-item"><i class="fa-solid fa-book"></i>Library</div>
                <div class="nav-item"><i class="fa-brands fa-spotify"></i>Premium</div>
            </div>
        </div>
    </div>
</body>
</html>