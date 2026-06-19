// Andhra Pradesh 2024 Lok Sabha (Member of Parliament) results — 25 seats.
// Source: ECI / Wikipedia "2024 Indian general election in Andhra Pradesh".
// Tally: TDP 16, BJP 3, JSP 2, YSRCP 4 (NDA 21, YSRCP 4).
//
// `lsId` matches the `loksabha_constituency_id` field in
// /Constituencies_AndhraPradesh_2024.geojson.

export const AP_MPS = [
  { lsId: 'araku',         lsName: 'Araku (ST)',        mp: 'Gumma Thanuja Rani',           party: 'YSRCP', alliance: 'YSRCP' },
  { lsId: 'srikakulam',    lsName: 'Srikakulam',        mp: 'Kinjarapu Ram Mohan Naidu',    party: 'TDP',   alliance: 'NDA' },
  { lsId: 'vizianagaram',  lsName: 'Vizianagaram',      mp: 'Appala Naidu Kalisetti',       party: 'TDP',   alliance: 'NDA' },
  { lsId: 'visakhapatnam', lsName: 'Visakhapatnam',     mp: 'Mathukumilli Bharat',          party: 'TDP',   alliance: 'NDA' },
  { lsId: 'anakapalli',    lsName: 'Anakapalli',        mp: 'C. M. Ramesh',                 party: 'BJP',   alliance: 'NDA' },
  { lsId: 'kakinada',      lsName: 'Kakinada',          mp: 'Tangella Uday Srinivas',       party: 'JSP',   alliance: 'NDA' },
  { lsId: 'amalapuram',    lsName: 'Amalapuram (SC)',   mp: 'Ganti Harish Madhur',          party: 'TDP',   alliance: 'NDA' },
  { lsId: 'rajahmundry',   lsName: 'Rajahmundry',       mp: 'Daggubati Purandeswari',       party: 'BJP',   alliance: 'NDA' },
  { lsId: 'narasapuram',   lsName: 'Narasapuram',       mp: 'Bhupathi Raju Srinivasa Varma',party: 'BJP',   alliance: 'NDA' },
  { lsId: 'eluru',         lsName: 'Eluru',             mp: 'Putta Mahesh Kumar',           party: 'TDP',   alliance: 'NDA' },
  { lsId: 'machilipatnam', lsName: 'Machilipatnam',     mp: 'Vallabhaneni Balashowry',      party: 'JSP',   alliance: 'NDA' },
  { lsId: 'vijayawada',    lsName: 'Vijayawada',        mp: 'Kesineni Sivanath (Chinni)',   party: 'TDP',   alliance: 'NDA' },
  { lsId: 'guntur',        lsName: 'Guntur',            mp: 'Chandra Sekhar Pemmasani',     party: 'TDP',   alliance: 'NDA' },
  { lsId: 'narasaraopet',  lsName: 'Narasaraopet',      mp: 'Lavu Sri Krishna Devarayalu',  party: 'TDP',   alliance: 'NDA' },
  { lsId: 'bapatla',       lsName: 'Bapatla (SC)',      mp: 'Krishna Prasad Tenneti',       party: 'TDP',   alliance: 'NDA' },
  { lsId: 'ongole',        lsName: 'Ongole',            mp: 'Magunta Sreenivasulu Reddy',   party: 'TDP',   alliance: 'NDA' },
  { lsId: 'nandyal',       lsName: 'Nandyal',           mp: 'Byreddy Shabari',              party: 'TDP',   alliance: 'NDA' },
  { lsId: 'kurnool',       lsName: 'Kurnool',           mp: 'Bastipati Nagaraju Panchalingala', party: 'TDP', alliance: 'NDA' },
  { lsId: 'anantapur',     lsName: 'Anantapur',         mp: 'Ambika G. Lakshminarayana Valmiki', party: 'TDP', alliance: 'NDA' },
  { lsId: 'hindupur',      lsName: 'Hindupur',          mp: 'B. K. Parthasarathi',          party: 'TDP',   alliance: 'NDA' },
  { lsId: 'kadapa',        lsName: 'Kadapa',            mp: 'Y. S. Avinash Reddy',          party: 'YSRCP', alliance: 'YSRCP' },
  { lsId: 'nellore',       lsName: 'Nellore',           mp: 'Vemireddy Prabhakar Reddy',    party: 'TDP',   alliance: 'NDA' },
  { lsId: 'tirupati',      lsName: 'Tirupati (SC)',     mp: 'Maddila Gurumoorthy',          party: 'YSRCP', alliance: 'YSRCP' },
  { lsId: 'rajampet',      lsName: 'Rajampet',          mp: 'P. V. Midhun Reddy',           party: 'YSRCP', alliance: 'YSRCP' },
  { lsId: 'chittoor',      lsName: 'Chittoor (SC)',     mp: 'Daggumalla Prasada Rao',       party: 'TDP',   alliance: 'NDA' },
];

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const MP_BY_LS_ID = AP_MPS.reduce((acc, m) => {
  acc[m.lsId] = m;
  return acc;
}, {});

const MP_BY_LS_NAME = AP_MPS.reduce((acc, m) => {
  acc[normalize(m.lsName)] = m;
  // Also index without the (SC)/(ST) suffix.
  acc[normalize(m.lsName.replace(/\([^)]*\)/g, ''))] = m;
  return acc;
}, {});

export const getMpByLsId = (lsId) => MP_BY_LS_ID[String(lsId || '').toLowerCase()] || null;

export const getMpByLsName = (name) => {
  const k = normalize(name);
  return MP_BY_LS_NAME[k] || null;
};
