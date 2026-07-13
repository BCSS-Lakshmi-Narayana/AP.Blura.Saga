/**
 * ANDHRA PRADESH LOCATION DATABASE — TDP WATCH GEO DETECTION LAYER
 *
 * Districts (both the 13 legacy and the 26 post-2022-reorganisation names),
 * the 175 Assembly Constituencies, and major cities/towns of Andhra Pradesh.
 */

// ─── DISTRICTS — legacy (13) + post-2022 reorganisation (26) ───────────────
const AP_DISTRICTS = [
    // Legacy 13
    'visakhapatnam', 'vizianagaram', 'srikakulam', 'east godavari', 'west godavari',
    'krishna', 'guntur', 'prakasam', 'spsr nellore', 'nellore', 'chittoor',
    'ysr kadapa', 'kadapa', 'cuddapah', 'kurnool', 'ananthapuramu', 'anantapur',

    // Post-2022 reorganisation (26)
    'alluri sitharama raju', 'anakapalli', 'annamayya', 'bapatla',
    'dr b r ambedkar konaseema', 'konaseema', 'eluru', 'kakinada',
    'ntr', 'ntr district', 'palnadu', 'parvathipuram manyam',
    'sri sathya sai', 'tirupati', 'nandyal'
];

// ─── 175 ASSEMBLY CONSTITUENCIES OF ANDHRA PRADESH ─────────────────────────
const AP_CONSTITUENCIES = [
    'achanta', 'addanki', 'adoni', 'allagadda', 'alur', 'amadalavalasa',
    'amalapuram', 'anakapalle', 'anantapur urban', 'anaparthy', 'araku valley',
    'atmakur', 'avanigadda', 'badvel', 'banaganapalle', 'bapatla', 'bhimavaram',
    'bhimili', 'bobbili', 'chandragiri', 'cheepurupalle', 'chilakaluripet',
    'chintalapudi', 'chirala', 'chittoor', 'chodavaram', 'darsi', 'denduluru',
    'dharmavaram', 'dhone', 'eluru', 'etcherla', 'gajapathinagaram', 'gajuwaka',
    'gangadhara nellore', 'gannavaram', 'giddalur', 'gopalapuram', 'gudivada',
    'gudur', 'guntakal', 'guntur east', 'guntur west', 'gurajala', 'hindupur',
    'ichchapuram', 'jaggampeta', 'jaggayyapeta', 'jammalamadugu', 'kadapa',
    'kadiri', 'kaikalur', 'kakinada city', 'kakinada rural', 'kalyandurg',
    'kamalapuram', 'kandukur', 'kanigiri', 'kavali', 'kodumur', 'kodur',
    'kondapi', 'kothapeta', 'kovur', 'kovvur', 'kuppam', 'kurnool', 'kurupam',
    'macherla', 'machilipatnam', 'madakasira', 'madanapalle', 'madugula',
    'mandapeta', 'mangalagiri', 'mantralayam', 'markapuram', 'mummidivaram',
    'mydukur', 'mylavaram', 'nagari', 'nandigama', 'nandikotkur', 'nandyal',
    'narasannapeta', 'narasapuram', 'narasaraopet', 'narsipatnam', 'nellimarla',
    'nellore city', 'nellore rural', 'nidadavole', 'nuzvid', 'ongole', 'paderu',
    'palakollu', 'palakonda', 'palamaner', 'palasa', 'pamarru', 'panyam',
    'parchur', 'parvathipuram', 'pathapatnam', 'pattikonda', 'payakaraopet',
    'pedakurapadu', 'pedana', 'peddapuram', 'penamaluru', 'pendurthi',
    'penukonda', 'pileru', 'pithapuram', 'polavaram', 'ponnur', 'prathipadu',
    'proddatur', 'pulivendla', 'punganur', 'puthalapattu', 'rajahmundry city',
    'rajahmundry rural', 'rajam', 'rajampet', 'rajanagaram', 'ramachandrapuram',
    'rampachodavaram', 'raptadu', 'rayachoti', 'rayadurg', 'razole', 'repalle',
    'salur', 'santhanuthalapadu', 'sarvepalli', 'sattenapalle', 'satyavedu',
    'singanamala', 'srikakulam', 'srikalahasti', 'srisailam', 'srungavarapukota',
    'sullurpeta', 'tadepalligudem', 'tadikonda', 'tadpatri', 'tanuku', 'tekkali',
    'tenali', 'thamballapalle', 'tirupati', 'tiruvuru', 'tuni', 'udayagiri',
    'undi', 'unguturu', 'uravakonda', 'vemuru', 'venkatagiri',
    'vijayawada central', 'vijayawada east', 'vijayawada west',
    'vinukonda', 'visakhapatnam east', 'visakhapatnam north',
    'visakhapatnam south', 'visakhapatnam west', 'vizianagaram',
    'yelamanchili', 'yemmiganur', 'yerragondapalem'
];

// ─── CITIES, TOWNS, LANDMARKS ───────────────────────────────────────────────
const AP_CITIES_AND_VILLAGES = [
    'visakhapatnam', 'vizag', 'vskp', 'vishakhapatnam', 'anakapalli', 'anakapalle',
    'alluri sitharama raju',
    'vizianagaram', 'bobbili', 'parvathipuram manyam', 'parvathipuram',
    'srikakulam', 'ichapuram', 'palasa',
    'east godavari', 'kakinada', 'rajahmundry', 'rajamahendravaram',
    'amalapuram', 'konaseema', 'dr b r ambedkar konaseema',
    'west godavari', 'eluru', 'bhimavaram', 'tadepalligudem', 'narsapuram',
    'krishna', 'vijayawada', 'machilipatnam', 'gudivada', 'ntr', 'ntr district',
    'guntur', 'tenali', 'mangalagiri', 'amaravati', 'palnadu', 'narasaraopet', 'bapatla',
    'prakasam', 'ongole', 'chirala', 'markapur',
    'nellore', 'spsr nellore', 'sps nellore', 'sri potti sriramulu nellore', 'gudur', 'kavali',
    'chittoor', 'tirupati', 'madanapalle', 'punganur',
    'kadapa', 'cuddapah', 'ysr kadapa', 'ysr', 'proddatur', 'pulivendula',
    'annamayya', 'rayachoti',
    'kurnool', 'nandyal', 'adoni',
    'anantapur', 'ananthapuramu', 'anantapuramu', 'hindupur', 'dharmavaram',
    'tadipatri', 'sri sathya sai', 'puttaparthi',

    // TDP / CBN association keywords (parity with the party-context gate)
    'chandrababu naidu', 'nara chandrababu naidu', 'cbn', 'tdp kuppam',
    'tdp andhra pradesh', 'cm chandrababu', 'nara lokesh',
    'chief minister chandrababu', 'cm naidu',

    // State references
    'andhra pradesh', 'state of andhra pradesh', 'govt of andhra pradesh',
    'government of andhra pradesh', 'andhra pradesh state', 'ap'
];

const ALL_AP_LOCATIONS = new Set();

const addToSet = (arr) => {
    for (const item of arr) {
        const lower = item.toLowerCase().trim();
        if (lower) ALL_AP_LOCATIONS.add(lower);
    }
};

addToSet(AP_DISTRICTS);
addToSet(AP_CONSTITUENCIES);
addToSet(AP_CITIES_AND_VILLAGES);

/**
 * Check if a location name matches the Andhra Pradesh location database.
 */
const isAndhraPradeshLocation = (name) => {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();

    if (ALL_AP_LOCATIONS.has(lower)) return true;
    // Substring fallback for major AP anchors
    if (lower.includes('andhra pradesh')) return true;
    if (lower.includes('visakhapatnam') || lower.includes('vizag')) return true;
    if (lower.includes('vijayawada')) return true;
    if (lower.includes('guntur')) return true;
    if (lower.includes('tirupati')) return true;
    if (lower.includes('kurnool')) return true;
    if (lower.includes('nellore')) return true;
    if (lower.includes('chittoor')) return true;
    if (lower.includes('kadapa')) return true;
    if (lower.includes('anantapur')) return true;
    if (lower.includes('kakinada')) return true;
    if (lower.includes('rajahmundry') || lower.includes('rajamahendravaram')) return true;
    if (lower.includes('eluru')) return true;
    if (lower.includes('srikakulam')) return true;
    if (lower.includes('vizianagaram')) return true;
    if (lower.includes('amaravati')) return true;
    return false;
};

module.exports = {
    AP_DISTRICTS,
    AP_CONSTITUENCIES,
    AP_CITIES_AND_VILLAGES,
    ALL_AP_LOCATIONS,
    isAndhraPradeshLocation
};
