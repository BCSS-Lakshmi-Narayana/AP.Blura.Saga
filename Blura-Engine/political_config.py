"""
Political Saga configuration for Andhra Pradesh — Blura Engine.
RSS feeds, keywords, category rules — covering Indian national politics,
Andhra Pradesh state, and constituency-level news (TDP / YSRCP / Jana Sena).
"""

# ── RSS Feeds ──────────────────────────────────────────────────────────────────
RSS_FEEDS = [
    # ── National English ────────────────────────────────────────
    {"url": "https://www.ndtv.com/feed/india-news",                         "source_name": "NDTV India",               "language": "en"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "source_name": "Times of India National",  "language": "en"},
    {"url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "source_name": "Hindustan Times India","language": "en"},
    {"url": "https://www.thehindu.com/news/national/feeder/default.rss",    "source_name": "The Hindu National",       "language": "en"},
    {"url": "https://www.theprint.in/feed/",                                "source_name": "The Print",                "language": "en"},
    {"url": "https://scroll.in/feed",                                       "source_name": "Scroll India",             "language": "en"},
    {"url": "https://www.indiatoday.in/rss/1206514",                        "source_name": "India Today",              "language": "en"},
    {"url": "https://www.news18.com/rss/politics/politics.xml",             "source_name": "News18 Politics",          "language": "en"},
    {"url": "https://www.business-standard.com/rss/politics-and-economy-0.rss", "source_name": "Business Standard Politics", "language": "en"},
    {"url": "https://www.livemint.com/rss/politics",                        "source_name": "LiveMint Politics",        "language": "en"},

    # ── Andhra Pradesh English Feeds & Google News ─────────────────
    {"url": "https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss", "source_name": "The Hindu Andhra Pradesh", "language": "en"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/866693868.cms",   "source_name": "TOI Hyderabad & AP",        "language": "en"},
    {"url": "https://www.deccanchronicle.com/rss/nation/current-affairs",   "source_name": "Deccan Chronicle",         "language": "en"},
    {"url": "https://news.google.com/rss/search?q=%22Andhra+Pradesh+politics%22+OR+TDP+OR+YSRCP+OR+%22Jana+Sena%22&hl=en-IN&gl=IN&ceid=IN:en", "source_name": "Google News – AP Politics EN", "language": "en", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=%22Chandrababu+Naidu%22+OR+%22YS+Jagan%22+OR+%22Pawan+Kalyan%22+OR+%22Lokesh+Nara%22&hl=en-IN&gl=IN&ceid=IN:en", "source_name": "Google News – AP Leaders EN", "language": "en", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Amaravati+OR+Polavaram+OR+Rayalaseema+politics&hl=en-IN&gl=IN&ceid=IN:en", "source_name": "Google News – AP Capital & Dev", "language": "en", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=%22Andhra+Pradesh%22+government+OR+welfare+OR+pension&hl=en-IN&gl=IN&ceid=IN:en", "source_name": "Google News – AP Welfare EN", "language": "en", "follow_redirect": True},

    # ── Telugu Portals & Feeds (Google News Telugu) ─────────────────
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+politics&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News Telugu – AP Politics", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=%E0%B0%9A%E0%B0%82%E0%B0%A6%E0%B1%8D%E0%B0%B0%E0%B0%AC%E0%B0%BE%E0%B0%AC%E0%B1%81+%E0%B0%A8%E0%B0%BE%E0%B0%AF%E0%B0%A1%E0%B1%81+OR+%E0%B0%9C%E0%B0%97%E0%B0%A8%E0%B1%8D+OR+%E0%B0%AA%E0%B0%B5%E0%B0%A8%E0%B1%8D+%E0%B0%95%E0%B0%B2%E0%B1%8D%E0%B0%AF%E0%B0%BE%E0%B0%A3%E0%B1%8D&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News Telugu – AP Leaders", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+source:Eenadu&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News – Eenadu AP", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+source:Sakshi&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News – Sakshi AP", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+source:Andhrajyothy&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News – Andhrajyothy AP", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+source:TV9+Telugu&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News – TV9 Telugu AP", "language": "te", "follow_redirect": True},
    {"url": "https://telugu.oneindia.com/rss/feeds/telugu-ap-news-fb.xml", "source_name": "OneIndia Telugu AP News", "language": "te"},
    {"url": "https://telugu.samayam.com/andhra-pradesh/rssfeeds/48317772.cms", "source_name": "Samayam Telugu AP", "language": "te"},
    {"url": "https://www.v6velugu.com/feed/", "source_name": "V6 Velugu News Portal", "language": "te"},
    {"url": "https://telugu.greatandhra.com/rss.php", "source_name": "GreatAndhra Telugu", "language": "te"},
    {"url": "https://news.google.com/rss/search?q=Anantapur+OR+Kurnool+OR+Kadapa+OR+Chittoor+OR+Nellore+news&hl=en-IN&gl=IN&ceid=IN:en", "source_name": "Google News – Rayalaseema & South AP", "language": "en", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=%E0%B0%85%E0%B0%A8%E0%B0%82%E0%B0%A4%E0%B0%AA%E0%B1%81%E0%B0%B0%E0%B0%82&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News Telugu – Anantapur", "language": "te", "follow_redirect": True},

    # ── Constituency-focused Telugu papers (Kuppam & Mangalagiri) ──────
    # Per-outlet feeds so we can see WHICH paper (Sakshi / Eenadu /
    # Andhrajyothy / NTV) is covering our seats and what they publish — the
    # source_name carries the outlet, which powers booth-level narrative
    # monitoring. (Google News source: queries are used because these portals
    # don't publish per-district RSS directly.)
    {"url": "https://news.google.com/rss/search?q=Kuppam+source:Sakshi&hl=te&gl=IN&ceid=IN:te",           "source_name": "Sakshi – Kuppam",            "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Kuppam+source:Eenadu&hl=te&gl=IN&ceid=IN:te",           "source_name": "Eenadu – Kuppam",            "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Kuppam+source:Andhrajyothy&hl=te&gl=IN&ceid=IN:te",     "source_name": "Andhrajyothy – Kuppam",      "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Kuppam+source:NTV+Telugu&hl=te&gl=IN&ceid=IN:te",       "source_name": "NTV Telugu – Kuppam",        "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Mangalagiri+source:Sakshi&hl=te&gl=IN&ceid=IN:te",       "source_name": "Sakshi – Mangalagiri",       "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Mangalagiri+source:Eenadu&hl=te&gl=IN&ceid=IN:te",       "source_name": "Eenadu – Mangalagiri",       "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Mangalagiri+source:Andhrajyothy&hl=te&gl=IN&ceid=IN:te", "source_name": "Andhrajyothy – Mangalagiri", "language": "te", "follow_redirect": True},
    {"url": "https://news.google.com/rss/search?q=Mangalagiri+source:NTV+Telugu&hl=te&gl=IN&ceid=IN:te",   "source_name": "NTV Telugu – Mangalagiri",   "language": "te", "follow_redirect": True},
    # General AP coverage from the four target outlets (NTV was missing).
    {"url": "https://news.google.com/rss/search?q=Andhra+Pradesh+source:NTV+Telugu&hl=te&gl=IN&ceid=IN:te", "source_name": "Google News – NTV Telugu AP", "language": "te", "follow_redirect": True},
]

# ── Per-district Telugu coverage (all 26 AP districts) ───────────────────────
# The Telugu portals (Sakshi, Eenadu, …) organise news by district but don't
# expose per-district RSS, so we pull each district's Telugu news via Google
# News. detect_district() tags each article to its district, and the backend's
# `constituencymasters` collection maps district -> constituencies — so this
# one feed-per-district set covers every constituency (Kuppam ⊂ Chittoor,
# Mangalagiri ⊂ Guntur, …) for booth-level narrative monitoring.
# (canonical district — MUST match constituencymasters.district exactly so the
#  backend can map it to constituencies, search term — what to query on Google News)
AP_DISTRICTS = [
    ('Anantapur',                    'Anantapur'),
    ('Annamayya',                    'Annamayya Rajampet'),
    ('Bapatla',                      'Bapatla'),
    ('Chittoor',                     'Chittoor'),
    ('East Godavari',                'East Godavari Rajahmundry'),
    ('Eluru',                        'Eluru'),
    ('Guntur',                       'Guntur'),
    ('Kakinada',                     'Kakinada'),
    ('Dr. B.R. Ambedkar Konaseema',  'Konaseema Amalapuram'),
    ('Krishna',                      'Krishna Machilipatnam'),
    ('Kurnool',                      'Kurnool'),
    ('Nandyal',                      'Nandyal'),
    ('NTR',                          'Vijayawada NTR district'),
    ('Palnadu',                      'Palnadu Narasaraopet'),
    ('Prakasam',                     'Prakasam Ongole'),
    ('Sri Potti Sriramulu Nellore',  'Nellore'),
    ('Sri Sathya Sai',               'Sri Sathya Sai Puttaparthi'),
    ('Srikakulam',                   'Srikakulam'),
    ('Tirupati',                     'Tirupati'),
    ('Visakhapatnam',                'Visakhapatnam'),
    ('Vizianagaram',                 'Vizianagaram'),
    ('West Godavari',                'West Godavari Bhimavaram'),
    ('YSR Kadapa',                   'Kadapa YSR district'),
    ('Alluri Sitharama Raju',        'Alluri Sitharama Raju Paderu'),
    ('Anakapalli',                   'Anakapalli'),
    ('Parvathipuram Manyam',         'Parvathipuram Manyam'),
]


def _district_feed(canonical, search):
    from urllib.parse import quote_plus
    query = quote_plus(f"{search} Andhra Pradesh")
    return {
        "url": f"https://news.google.com/rss/search?q={query}&hl=te&gl=IN&ceid=IN:te",
        "source_name": f"AP District – {canonical}",
        "language": "te",
        "district": canonical,   # attached to each article (see political_rss.process_feed)
        "follow_redirect": True,
    }


RSS_FEEDS += [_district_feed(canonical, search) for canonical, search in AP_DISTRICTS]

# Fetch Telugu (and the district) feeds FIRST each cycle. A single run can be
# slow, so front-loading the priority Telugu coverage guarantees it's collected
# even if a run doesn't get through every English national feed. Python's sort
# is stable, so the original order within each language group is preserved.
RSS_FEEDS.sort(key=lambda f: 0 if f.get('language') == 'te' else 1)

# ── Relevance filter keywords (any 1 match = relevant) ───────────────────────
POLITICAL_RELEVANCE_KEYWORDS = [
    # ── Key AP Leaders ──
    'chandrababu naidu', 'chandrababu', 'naidu', 'cbn', 'nara lokesh', 'lokesh nara', 'lokesh',
    'ys jagan', 'jagan mohan reddy', 'jagan reddy', 'jagan', 'ysr', 'ysrcp',
    'pawan kalyan', 'pawan', 'kalyan', 'jana sena', 'janasena', 'jsp',
    'purandeswari', 'bhuvaneshwari', 'ys sharmila', 'sharmila', 'balakrishna',
    'చంద్రబాబు', 'నాయుడు', 'జగన్', 'పవన్ కళ్యాణ్', 'లోకేష్', 'వైఎస్ఆర్',

    # ── Key AP Parties & Topics ──
    'tdp', 'telugu desam', 'telugu desam party', 'ysr congress', 'ysrcp', 'janasena party',
    'andhra pradesh politics', 'ap politics', 'ap elections', 'andhra assembly', 'assembly elections',
    'nda alliance', 'bjp ap', 'congress ap', 'super six', 'super 6',
    'తెలుగుదేశం', 'వైసీపీ', 'జనసేన', 'ఆంధ్రప్రదేశ్ రాజకీయాలు', 'కూటమి',

    # ── Key AP Regions/Issues ──
    'amaravati', 'polavaram', 'rayalaseema', 'vizag', 'visakhapatnam', 'vijayawada', 'guntur',
    'kuppam', 'mangalagiri', 'pulivendula', 'pension', 'welfare scheme', 'land titling',
    'అమరావతి', 'పోలవరం', 'రాయలసీమ', 'విశాఖపట్నం', 'విజయవాడ', 'గుంటూరు', 'కుప్పం', 'మంగళరి', 'పెన్షన్'
]

# ── Category classification keywords ─────────────────────────────────────────
CATEGORY_KEYWORDS = {
    'crime': [
        # English
        'crime', 'murder', 'theft', 'robbery', 'rape', 'assault', 'arrested', 'gangster',
        'drug', 'drugs', 'narcotics', 'smuggling', 'fraud', 'scam', 'kidnap', 'extortion',
        'police', 'fir', 'case registered', 'nabbed', 'caught', 'crime branch',
        'corruption', 'bribery', 'embezzlement', 'money laundering', 'disproportionate assets',
        # Telugu
        'నేరం', 'హత్య', 'అరెస్ట్', 'దోపిడీ', 'అవినీతి', 'స్మగ్లింగ్', 'పోలీస్'
    ],
    'politics': [
        # English
        'politics', 'political', 'election', 'vote', 'tdp', 'ysrcp', 'jana sena', 'mla', 'mp',
        'minister', 'cabinet', 'assembly', 'parliament', 'rally', 'campaign',
        'chandrababu', 'jagan', 'pawan kalyan', 'lokesh',
        'lok sabha', 'vidhan sabha', 'constituency', 'party', 'governance',
        'opposition', 'ruling', 'coalition', 'alliance', 'seat', 'candidate',
        # Telugu
        'రాజకీయాలు', 'ఎన్నికలు', 'ఓటు', 'అసెంబ్లీ', 'ముఖ్యమంత్రి', 'కూటమి', 'ప్రభుత్వం'
    ],
    'development': [
        # English
        'development', 'infrastructure', 'project', 'scheme', 'highway', 'bridge',
        'metro', 'flyover', 'smart city', 'industrial', 'investment', 'tender',
        'construction', 'inaugurate', 'launch', 'upgrade', 'fund released',
        'mission', 'welfare', 'yojana', 'amaravati capital', 'polavaram project',
        'sewage', 'drain', 'drainage', 'road repair', 'streetlight', 'water supply',
        # Telugu
        'అభివృద్ధి', 'ప్రాజెక్ట్', 'పథకం', 'నిర్మాణం', 'మెట్రో', 'అమరావతి', 'పోలవరం'
    ],
    'communal': [
        # English
        'communal', 'riot', 'religious', 'temple', 'mosque', 'church', 'mandir', 'masjid',
        'conversion', 'tirumala laddu controversy', 'tirupati laddu', 'temple land',
        'festival', 'minority', 'majority', 'hindu', 'muslim', 'christian',
        # Telugu
        'మతపరమైన', 'ఆలయం', 'లడ్డు వివాదం', 'తిరుమల', 'మత మార్పిడి'
    ],
    'law_order': [
        # English
        'law', 'order', 'curfew', 'protest', 'agitation', 'strike', 'bandh',
        'section 144', 'lathi charge', 'riot', 'unrest', 'demonstration',
        'crackdown', 'operation', 'nia', 'cbi', 'cid', 'police clash',
        # Telugu
        'శాంతిభద్రతలు', 'నిరసన', 'లాఠీఛార్జ్', 'ధర్నా', 'బంధ్', 'కర్ఫ్యూ'
    ]
}

# ── Andhra Pradesh Location mapping ───────────────────────────────────────────
LOCATION_KEYWORDS = {
    'Amaravati':     ['amaravati', 'అమరావతి', 'ap capital'],
    'Mangalagiri':   ['mangalagiri', 'మంగళగిరి'],
    'Visakhapatnam': ['visakhapatnam', 'vizag', 'విశాఖపట్నం', 'waltair'],
    'Vijayawada':    ['vijayawada', 'విజయవాడ', 'bezawada'],
    'Guntur':        ['guntur', 'గుంటూరు'],
    'Nellore':       ['nellore', 'నెల్లూరు'],
    'Kurnool':       ['kurnool', 'కర్నూలు'],
    'Tirupati':      ['tirupati', 'తిరుపతి', 'tirumala', 'chandragiri'],
    'Kuppam':        ['kuppam', 'కుప్పం'],
    'Pulivendula':   ['pulivendula', 'పులివెందుల'],
    'Anantapur':     ['anantapur', 'అనంతపురం'],
    'Kadapa':        ['kadapa', 'ysr district', 'కడప'],
    'Eluru':         ['eluru', 'ఏలూరు'],
    'Ongole':        ['ongole', 'ఒంగోలు', 'prakasam'],
    'Srikakulam':    ['srikakulam', 'శ్రీకాకుళం'],
    'Vizianagaram':  ['vizianagaram', 'విజయనగరం'],
    'Kakinada':      ['kakinada', 'కాకినాడ', 'east godavari'],
    'Rajahmundry':   ['rajahmundry', 'రాజమండ్రి', 'rajamahendravaram'],
    'Bhimavaram':    ['bhimavaram', ' West Godavari', 'భీమవరం']
}

# ── Andhra Pradesh Centroid Lat/Lng ───────────────────────────────────────────
ANDHRA_LAT = 15.9129
ANDHRA_LNG = 79.7400

# Aliases for compatibility
TELANGANA_LAT = ANDHRA_LAT
TELANGANA_LNG = ANDHRA_LNG
