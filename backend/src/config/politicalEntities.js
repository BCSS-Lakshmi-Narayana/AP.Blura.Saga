/**
 * politicalEntities.js
 * Andhra Pradesh + TDP-centric political entity graph.
 *
 * NOTE:
 * Existing service contracts still expect legacy key names (`bsk`,
 * `bsk_son`, `bjp_telangana`). To avoid breaking downstream logic, those
 * keys are preserved while their canonical meaning is remapped to the AP
 * target universe.
 */

const POLITICAL_ENTITIES = {
    // Primary target (legacy key kept): N. Chandrababu Naidu
    bsk: {
        canonical: 'Nara Chandrababu Naidu',
        type: 'person',
        party: 'tdp',
        role: 'Chief Minister of Andhra Pradesh; TDP National President',
        alignment: 'ally',
        priority: 100,
        aliases: [
            'nara chandrababu naidu', 'chandrababu naidu', 'cbn', 'babu',
            'cm chandrababu', 'chandrababu garu', '@ncbn', '#cbn', '#chandrababu',
            'చంద్రబాబు', 'నారా చంద్రబాబు నాయుడు', 'చంద్రబాబు నాయుడు', 'సిఎం చంద్రబాబు',
            'चंद्रबाबू नायडू', 'नारा चंद्रबाबू',
        ],
    },

    // Family extension target (legacy key kept): Nara Lokesh
    bsk_son: {
        canonical: 'Nara Lokesh',
        type: 'person',
        party: 'tdp',
        role: 'TDP General Secretary; AP Minister',
        alignment: 'ally',
        priority: 95,
        aliases: [
            'nara lokesh', 'lokesh', 'lokesh babu', 'minister lokesh',
            '@naralokesh', '#naralokesh', '#lokesh',
            'నారా లోకేష్', 'లోకేష్', 'లోకేష్ బాబు',
            'नारा लोकेश',
        ],
    },

    // Legacy key kept for compatibility: now represents TDP AP ecosystem.
    bjp_telangana: {
        canonical: 'TDP Andhra Pradesh',
        type: 'party',
        party: 'tdp',
        alignment: 'ally',
        priority: 85,
        aliases: [
            'tdp', 'telugu desam party', 'tdp andhra', 'tdp ap', '@jaitdp', '#tdp',
            'cycle party', 'yellow party',
            'తెలుగుదేశం పార్టీ', 'తెలుగు దేశం', 'టీడీపీ',
            'तेलुगु देशम पार्टी',
        ],
    },

    pawan_kalyan: {
        canonical: 'Pawan Kalyan',
        type: 'person',
        party: 'jsp',
        role: 'Deputy Chief Minister, Andhra Pradesh',
        alignment: 'ally',
        priority: 80,
        aliases: [
            'pawan kalyan', 'janasena pawan', '@pawankalyan', '#pawankalyan',
            'పవన్ కళ్యాణ్', 'జనసేన పవన్',
            'पवन कल्याण',
        ],
    },

    modi: {
        canonical: 'Narendra Modi',
        type: 'person',
        party: 'bjp',
        role: 'Prime Minister of India',
        alignment: 'ally',
        priority: 70,
        aliases: [
            'narendra modi', 'modi', 'modi ji', '@narendramodi', '#modi',
            'నరేంద్ర మోదీ', 'మోదీ',
            'नरेंद्र मोदी', 'मोदी',
        ],
    },

    bjp_national: {
        canonical: 'BJP',
        type: 'party',
        party: 'bjp',
        alignment: 'ally',
        priority: 65,
        aliases: [
            'bjp', 'bharatiya janata party', '@bjp4india', '#bjp',
            'భారతీయ జనతా పార్టీ', 'బిజెపి',
            'भारतीय जनता पार्टी', 'भाजपा',
        ],
    },

    // Opposition in AP context.
    ysrcp: {
        canonical: 'YSR Congress Party',
        type: 'party',
        party: 'ysrcp',
        alignment: 'opposition',
        priority: 90,
        aliases: [
            'ysrcp', 'ycp', 'ysr congress', 'ysr congress party', '@ysrcparty', '#ysrcp',
            'fan party', 'fyan party',
            'వైఎస్ఆర్ కాంగ్రెస్', 'వైఎస్సార్సీపీ', 'వైసీపీ',
            'वाईएसआर कांग्रेस',
        ],
    },

    jagan: {
        canonical: 'Y S Jagan Mohan Reddy',
        type: 'person',
        party: 'ysrcp',
        role: 'YSRCP President; Former CM of Andhra Pradesh',
        alignment: 'opposition',
        priority: 92,
        aliases: [
            'jagan', 'jagan mohan reddy', 'ys jagan', 'jagan anna',
            '@ysjagan', '#ysjagan', '#jagan',
            'జగన్', 'జగన్ మోహన్ రెడ్డి', 'వైఎస్ జగన్',
            'जगन मोहन रेड्डी', 'वाईएस जगन',
        ],
    },

    bharathi: {
        canonical: 'Y S Bharathi',
        type: 'person',
        party: 'ysrcp',
        role: 'Senior YSRCP leader',
        alignment: 'opposition',
        priority: 70,
        aliases: [
            'ys bharathi', 'bharathi reddy', 'jagan wife',
            'భారతి', 'వైఎస్ భారతి',
            'वाईएस भारती',
        ],
    },

    inc: {
        canonical: 'Indian National Congress',
        type: 'party',
        party: 'inc',
        alignment: 'opposition',
        priority: 50,
        aliases: [
            'congress', 'indian national congress', 'inc', '#congress',
            'కాంగ్రెస్',
            'कांग्रेस',
        ],
    },

    // Neutral civic institutions.
    andhra_police: {
        canonical: 'Andhra Pradesh Police',
        type: 'institution',
        alignment: 'neutral',
        priority: 40,
        aliases: [
            'andhra pradesh police', 'ap police', '@appolice100',
            'ఆంధ్రప్రదేశ్ పోలీస్', 'ఏపీ పోలీస్',
            'आंध्र प्रदेश पुलिस',
        ],
    },

    ap_sec: {
        canonical: 'Election Commission',
        type: 'institution',
        alignment: 'neutral',
        priority: 30,
        aliases: [
            'election commission', 'eci', 'ceo andhra',
            'ఎన్నికల సంఘం',
            'निर्वाचन आयोग',
        ],
    },
};

/**
 * Build a flat, lowercase-keyed reverse index from alias → entity key.
 * Tokens are sorted longest-first so multi-word matches win over
 * shorter substrings.
 */
const buildAliasIndex = () => {
    const entries = [];
    for (const [key, ent] of Object.entries(POLITICAL_ENTITIES)) {
        for (const alias of ent.aliases) {
            entries.push({
                alias: String(alias).toLowerCase().trim(),
                entityKey: key,
            });
        }
    }
    entries.sort((a, b) => b.alias.length - a.alias.length);
    return entries;
};

const ALIAS_INDEX = buildAliasIndex();

const PRIMARY_TARGET_KEY = 'bsk';

const isAlly       = (key) => POLITICAL_ENTITIES[key]?.alignment === 'ally';
const isOpposition = (key) => POLITICAL_ENTITIES[key]?.alignment === 'opposition';
const isNeutral    = (key) => POLITICAL_ENTITIES[key]?.alignment === 'neutral';
const isBskTarget  = (key) => key === 'bsk' || key === 'bsk_son';

module.exports = {
    POLITICAL_ENTITIES,
    ALIAS_INDEX,
    PRIMARY_TARGET_KEY,
    isAlly,
    isOpposition,
    isNeutral,
    isBskTarget,
};
