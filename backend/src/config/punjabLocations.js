/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║     TELANGANA LOCATION DATABASE — BSK WATCH GEO DETECTION LAYER        ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Districts, Lok Sabha PCs, Assembly Constituencies and major towns of   ║
 * ║  Telangana, India — with deeper coverage of Karimnagar Lok Sabha PC     ║
 * ║  (legacy seat reference).                                                ║
 * ║                                                                          ║
 * ║  NOTE: File name and export identifiers retain the "punjab" prefix      ║
 * ║  for backwards compatibility with imports across the codebase. All       ║
 * ║  *data* inside is Telangana.                                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// ─── 33 DISTRICTS OF TELANGANA ──────────────────────────────────────────────
const PUNJAB_DISTRICTS = [
    'adilabad', 'bhadradri kothagudem', 'bhadradri', 'kothagudem',
    'hanamkonda', 'hyderabad', 'jagtial', 'jangaon',
    'jayashankar bhupalpally', 'bhupalpally', 'jogulamba gadwal', 'gadwal',
    'kamareddy', 'karimnagar', 'khammam',
    'kumuram bheem asifabad', 'komaram bheem asifabad', 'asifabad',
    'mahabubabad', 'mahbubnagar', 'mancherial', 'medak',
    'medchal-malkajgiri', 'medchal malkajgiri', 'medchal', 'malkajgiri',
    'mulugu', 'nagarkurnool', 'nalgonda', 'narayanpet', 'nirmal',
    'nizamabad', 'peddapalli', 'rajanna sircilla', 'sircilla',
    'rangareddy', 'sangareddy', 'siddipet', 'suryapet',
    'vikarabad', 'wanaparthy', 'warangal', 'warangal urban', 'warangal rural',
    'yadadri bhuvanagiri', 'yadadri', 'bhuvanagiri'
];

// ─── 119 ASSEMBLY CONSTITUENCIES OF TELANGANA ───────────────────────────────
const PUNJAB_CONSTITUENCIES = [
    // ─── Karimnagar Lok Sabha PC (BSK's seat) ─────────────────────
    'karimnagar', 'choppadandi', 'vemulawada', 'sircilla',
    'manakondur', 'husnabad', 'huzurabad',

    // ─── Peddapalli PC ────────────────────────────────────────────
    'peddapalli', 'dharmapuri', 'ramagundam', 'manthani', 'chennur',
    'bellampalli', 'mancherial',

    // ─── Adilabad PC ──────────────────────────────────────────────
    'adilabad', 'boath', 'khanapur', 'mudhole', 'nirmal', 'sirpur', 'asifabad',

    // ─── Nizamabad PC ─────────────────────────────────────────────
    'armoor', 'bodhan', 'jukkal', 'banswada', 'yellareddy',
    'kamareddy', 'nizamabad urban', 'nizamabad rural', 'balkonda',

    // ─── Zahirabad PC ─────────────────────────────────────────────
    'zahirabad', 'andole', 'narayankhed', 'medak', 'narsapur', 'jharasangam',

    // ─── Medak PC ─────────────────────────────────────────────────
    'siddipet', 'gajwel', 'dubbak', 'patancheru', 'sangareddy',

    // ─── Malkajgiri PC ────────────────────────────────────────────
    'malkajgiri', 'medchal', 'quthbullapur', 'kukatpally', 'uppal', 'lal bahadur nagar', 'secunderabad cantonment',

    // ─── Secunderabad PC ──────────────────────────────────────────
    'secunderabad', 'musheerabad', 'amberpet', 'khairatabad', 'jubilee hills', 'sanathnagar', 'nampally',

    // ─── Hyderabad PC ─────────────────────────────────────────────
    'malakpet', 'karwan', 'goshamahal', 'charminar', 'chandrayangutta', 'yakutpura', 'bahadurpura',

    // ─── Chevella PC ──────────────────────────────────────────────
    'maheshwaram', 'rajendranagar', 'serilingampally', 'chevella', 'pargi', 'vikarabad', 'tandur',

    // ─── Mahbubnagar PC ───────────────────────────────────────────
    'kodangal', 'narayanpet', 'mahbubnagar', 'jadcherla', 'devarkadra', 'makthal', 'shadnagar',

    // ─── Nagarkurnool PC (SC) ─────────────────────────────────────
    'nagarkurnool', 'achampet', 'kalwakurthy', 'kollapur', 'wanaparthy', 'gadwal', 'alampur',

    // ─── Nalgonda PC ──────────────────────────────────────────────
    'devarakonda', 'nagarjuna sagar', 'miryalaguda', 'huzurnagar', 'nalgonda', 'munugode', 'nakrekal',

    // ─── Bhongir PC ───────────────────────────────────────────────
    'bhongir', 'nakirekallu', 'tungaturthy', 'alair', 'jangaon', 'bhuvanagiri',

    // ─── Warangal PC (SC) ─────────────────────────────────────────
    'station ghanpur', 'palakurthi', 'parkal', 'warangal east', 'warangal west', 'wardhannapet', 'janagaon',

    // ─── Mahabubabad PC (ST) ──────────────────────────────────────
    'dornakal', 'mahabubabad', 'narsampet', 'mulug', 'pinapaka', 'yellandu',

    // ─── Khammam PC ───────────────────────────────────────────────
    'khammam', 'palair', 'madhira', 'wyra', 'sathupally', 'kothagudem', 'aswaraopeta'
];

// ─── CITIES, TOWNS, MANDALS, VILLAGES ───────────────────────────────────────
const PUNJAB_CITIES_AND_VILLAGES = [
    // ═══════════════════════════════════
    // MAJOR CITIES
    // ═══════════════════════════════════
    'hyderabad', 'secunderabad', 'warangal', 'karimnagar', 'khammam',
    'nizamabad', 'ramagundam', 'mahbubnagar', 'nalgonda', 'adilabad',
    'suryapet', 'siddipet', 'jagtial', 'mancherial', 'sangareddy',
    'medak', 'miryalaguda', 'jangaon', 'kothagudem', 'bhadrachalam',
    'kamareddy', 'mahabubabad', 'wanaparthy', 'nagarkurnool',
    'gadwal', 'vikarabad', 'kothapeta', 'palwancha', 'bhongir',
    'sircilla', 'rajanna sircilla', 'peddapalli', 'mulugu', 'bhupalpally',

    // ═══════════════════════════════════
    // KARIMNAGAR DISTRICT (BSK home)
    // ═══════════════════════════════════
    'karimnagar', 'karimnagar city', 'karimnagar rural', 'karimnagar urban',
    'huzurabad', 'jammikunta', 'gangadhara', 'thimmapur', 'choppadandi',
    'manakondur', 'kothapalli', 'ramadugu', 'karimnagar municipal',
    'shankarapatnam', 'saidapur', 'chigurumamidi', 'veenavanka',
    'elkathurthy', 'illanthakunta', 'mustabad', 'thangallapally',

    // ═══════════════════════════════════
    // RAJANNA SIRCILLA DISTRICT
    // ═══════════════════════════════════
    'sircilla', 'rajanna sircilla', 'vemulawada', 'gambhiraopet',
    'konaraopeta', 'mustabad sircilla', 'ellanthakunta', 'rudrangi',
    'boinpalli', 'thangallapally', 'yellareddypet',

    // ═══════════════════════════════════
    // SIDDIPET / HUSNABAD AREA
    // ═══════════════════════════════════
    'husnabad', 'siddipet', 'gajwel', 'dubbak', 'cherial',
    'akkannapeta', 'doulthabad', 'mirdoddi', 'thoguta', 'koheda',
    'chinnakodur', 'nangnur', 'kondapak',

    // ═══════════════════════════════════
    // HYDERABAD / GHMC
    // ═══════════════════════════════════
    'secunderabad', 'begumpet', 'hitec city', 'gachibowli', 'madhapur',
    'kondapur', 'banjara hills', 'jubilee hills', 'somajiguda', 'ameerpet',
    'sr nagar', 'kukatpally', 'miyapur', 'lb nagar', 'dilsukhnagar',
    'uppal', 'tarnaka', 'malakpet', 'charminar', 'old city', 'mehdipatnam',
    'tolichowki', 'attapur', 'rajendranagar', 'shamshabad', 'shamirpet',
    'medchal', 'kompally', 'alwal', 'bowenpally', 'sanathnagar',

    // ═══════════════════════════════════
    // WARANGAL
    // ═══════════════════════════════════
    'warangal', 'hanamkonda', 'kazipet', 'parkal', 'narsampet',
    'station ghanpur', 'wardhannapet', 'mahabubabad', 'thorrur',
    'mulugu', 'eturnagaram', 'venkatapur',

    // ═══════════════════════════════════
    // KHAMMAM / BHADRADRI
    // ═══════════════════════════════════
    'khammam', 'kothagudem', 'bhadrachalam', 'palvancha', 'yellandu',
    'sathupally', 'madhira', 'wyra', 'aswaraopeta', 'manuguru',

    // ═══════════════════════════════════
    // NIZAMABAD / KAMAREDDY
    // ═══════════════════════════════════
    'nizamabad', 'armoor', 'bodhan', 'kamareddy', 'banswada',
    'yellareddy', 'jukkal', 'pitlam', 'gandhari', 'lingampet',

    // ═══════════════════════════════════
    // ADILABAD / NIRMAL / MANCHERIAL / ASIFABAD
    // ═══════════════════════════════════
    'adilabad', 'nirmal', 'khanapur', 'boath', 'mudhole',
    'mancherial', 'bellampalli', 'chennur', 'asifabad', 'sirpur',
    'kagaznagar', 'jainoor', 'utnoor',

    // ═══════════════════════════════════
    // JAGTIAL / PEDDAPALLI / RAMAGUNDAM
    // ═══════════════════════════════════
    'jagtial', 'korutla', 'dharmapuri', 'metpalli', 'mallapur',
    'peddapalli', 'ramagundam', 'manthani', 'godavarikhani', 'sultanabad',

    // ═══════════════════════════════════
    // NALGONDA / SURYAPET / YADADRI / BHONGIR
    // ═══════════════════════════════════
    'nalgonda', 'miryalaguda', 'devarakonda', 'huzurnagar', 'nakrekal',
    'munugode', 'suryapet', 'kodad', 'thungathurthi',
    'bhongir', 'bhuvanagiri', 'yadadri', 'alair', 'choutuppal',
    'nagarjuna sagar',

    // ═══════════════════════════════════
    // MAHBUBNAGAR / NAGARKURNOOL / WANAPARTHY / GADWAL / NARAYANPET / VIKARABAD
    // ═══════════════════════════════════
    'mahbubnagar', 'jadcherla', 'shadnagar', 'devarkadra', 'makthal',
    'nagarkurnool', 'achampet', 'kalwakurthy', 'kollapur',
    'wanaparthy', 'gadwal', 'alampur', 'aiza', 'maldakal',
    'narayanpet', 'kodangal', 'vikarabad', 'tandur', 'pargi',

    // ═══════════════════════════════════
    // SANGAREDDY / MEDAK / ZAHIRABAD / SIDDIPET (greater)
    // ═══════════════════════════════════
    'sangareddy', 'patancheru', 'medak', 'narsapur', 'zahirabad',
    'andole', 'narayankhed', 'jharasangam',

    // ═══════════════════════════════════
    // RANGAREDDY / MEDCHAL-MALKAJGIRI
    // ═══════════════════════════════════
    'rangareddy', 'maheshwaram', 'ibrahimpatnam', 'hayathnagar',
    'medchal', 'malkajgiri', 'quthbullapur', 'serilingampally',
    'lb nagar', 'lal bahadur nagar', 'shamshabad',

    // ═══════════════════════════════════
    // CBN / TDP ANDHRA PRADESH ASSOCIATION KEYWORDS
    // ═══════════════════════════════════
    'chandrababu naidu', 'nara chandrababu naidu', 'cbn', 'tdp kuppam',
    'tdp andhra pradesh', 'cm chandrababu', 'nara lokesh',
    'chief minister chandrababu', 'cm naidu',

    // ═══════════════════════════════════
    // STATE REFERENCES
    // ═══════════════════════════════════
    'telangana', 'state of telangana', 'govt of telangana',
    'government of telangana', 'telangana state', 'ts'
];

const ALL_PUNJAB_LOCATIONS = new Set();

const addToSet = (arr) => {
    for (const item of arr) {
        const lower = item.toLowerCase().trim();
        if (lower) ALL_PUNJAB_LOCATIONS.add(lower);
    }
};

addToSet(PUNJAB_DISTRICTS);
addToSet(PUNJAB_CONSTITUENCIES);
addToSet(PUNJAB_CITIES_AND_VILLAGES);

// Cross-border / unrelated terms to never treat as Telangana locations
const PAKISTAN_EXCLUSION_TERMS = [
    'pakistan', 'lahore', 'faisalabad', 'rawalpindi', 'islamabad',
    'gujranwala', 'multan', 'peshawar', 'karachi', 'quetta'
];

/**
 * Check if a location name matches the Telangana location database.
 * Function name kept as isPunjabLocation for backwards compatibility.
 */
const isPunjabLocation = (name) => {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();

    if (PAKISTAN_EXCLUSION_TERMS.some(term => lower.includes(term))) return false;

    if (ALL_PUNJAB_LOCATIONS.has(lower)) return true;
    // Substring fallback for major Telangana anchors
    if (lower.includes('telangana')) return true;
    if (lower.includes('hyderabad')) return true;
    if (lower.includes('karimnagar')) return true;
    if (lower.includes('warangal')) return true;
    if (lower.includes('khammam')) return true;
    if (lower.includes('nizamabad')) return true;
    if (lower.includes('mahbubnagar')) return true;
    if (lower.includes('nalgonda')) return true;
    if (lower.includes('sircilla')) return true;
    if (lower.includes('adilabad')) return true;
    if (lower.includes('jagtial')) return true;
    if (lower.includes('peddapalli')) return true;
    if (lower.includes('siddipet')) return true;
    if (lower.includes('sangareddy')) return true;
    if (lower.includes('medchal')) return true;
    if (lower.includes('rangareddy')) return true;
    return false;
};

module.exports = {
    PUNJAB_DISTRICTS,
    PUNJAB_CONSTITUENCIES,
    PUNJAB_CITIES_AND_VILLAGES,
    ALL_PUNJAB_LOCATIONS,
    isPunjabLocation,
    // Telangana-named aliases for new code paths:
    TELANGANA_DISTRICTS: PUNJAB_DISTRICTS,
    TELANGANA_CONSTITUENCIES: PUNJAB_CONSTITUENCIES,
    TELANGANA_CITIES_AND_VILLAGES: PUNJAB_CITIES_AND_VILLAGES,
    ALL_TELANGANA_LOCATIONS: ALL_PUNJAB_LOCATIONS,
    isTelanganaLocation: isPunjabLocation
};
