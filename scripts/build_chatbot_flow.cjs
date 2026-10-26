const fs = require('fs');
const path = require('path');

// 1. Read temp_websites.js
let code = fs.readFileSync(path.join(__dirname, '../temp_websites.js'), 'utf8').replace(/^\uFEFF/, '');
const lastBracket = code.lastIndexOf('];');
code = code.substring(0, lastBracket + 2);
const sites = eval(code.replace('const DEFAULT_WEBSITES =', ''));

console.log('Loaded sites count:', sites.length);

// Helper function to clean text: remove links and amounts
function cleanDescription(rawDesc, docs, notes) {
  if (!rawDesc) return '';
  let lines = rawDesc.split('\n');
  let cleanedLines = [];
  let inTable = false;

  for (let line of lines) {
    let trim = line.trim();
    if (!trim) continue;
    if (trim === '---') continue;
    if (trim.toLowerCase().startsWith('table:')) {
      inTable = true;
      continue;
    }

    // Skip table lines that have links or amounts
    if (inTable) {
      if (trim.includes('*LINK') || trim.includes('http://') || trim.includes('https://') || trim.includes('இணைப்பு') || trim.includes('Portal') || trim.includes('போர்டல்')) {
        continue;
      }
      if (trim.includes('₹') || trim.includes('கட்டணம்') || trim.includes('Fee') || trim.includes('கட்டண') || trim.includes('இலவசம்') || trim.includes('Free') || trim.includes('மாதம் ₹') || trim.includes('ரூ.')) {
        continue;
      }
      // If table row has $, format it nicely
      if (trim.includes('$')) {
        const parts = trim.split('$').map(p => p.trim());
        if (parts[0] && parts[1]) {
          cleanedLines.push('• ' + parts[0] + ': ' + parts[1]);
        }
        continue;
      }
    }

    // Skip lines with URLs or *LINK
    if (trim.includes('*LINK') || trim.includes('http://') || trim.includes('https://')) {
      continue;
    }

    // Skip lines with explicit fees / prices
    if (/கட்டணம்\s*₹|அரசு கட்டணம்|சேவைக் கட்டணம்|கட்டணமில்லா|கட்டணம்/i.test(trim)) {
      continue;
    }

    // Strip any inline currency amounts like ₹50, ₹1,20,000, etc.
    trim = trim
      .replace(/₹\s*[\d,]+(\s*லட்சம்|\s*கோடி)?/g, '')
      .replace(/Rs\.?\s*[\d,]+/gi, '')
      .replace(/ரூ\.?\s*[\d,]+/g, '');

    // Strip H1:, H2:, H3: headers into neat bullet points
    if (/^H[1-3]:\s*/i.test(trim)) {
      trim = '📌 ' + trim.replace(/^H[1-3]:\s*/i, '');
    }

    cleanedLines.push(trim);
  }

  // Add document requirements if present
  if (Array.isArray(docs) && docs.length > 0) {
    cleanedLines.push('');
    cleanedLines.push('📄 தேவையான ஆவணங்கள்:');
    docs.forEach(d => {
      let cleanDoc = d
        .replace(/₹\s*[\d,]+(\s*லட்சம்|\s*கோடி)?/g, '')
        .replace(/Rs\.?\s*[\d,]+/gi, '')
        .replace(/ரூ\.?\s*[\d,]+/g, '')
        .replace(/\(\s*\)/g, '')
        .trim();
      cleanedLines.push('  • ' + cleanDoc);
    });
  }

  // Add notes if present (cleaning any amounts/links)
  if (notes) {
    let cleanNote = notes
      .replace(/₹\s*[\d,]+(\s*-\s*₹?\s*[\d,]+)?/g, '')
      .replace(/Rs\.?\s*[\d,]+/gi, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanNote) {
      cleanedLines.push('');
      cleanedLines.push('💡 குறிப்பு: ' + cleanNote);
    }
  }

  return cleanedLines.join('\n');
}

// Clean title: remove numbers like 1.1., ₹ amounts, etc.
function cleanTitle(rawName) {
  if (!rawName) return '';
  return rawName.replace(/₹\s*[\d,]+/g, '').trim();
}

function createLeafNode(site, parentId, sortOrder) {
  const cleanName = cleanTitle(site.name);
  const desc = cleanDescription(site.description, site.documentRequirements, site.notes);

  return {
    id: site.id || `site_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    parent_id: parentId,
    title: cleanName,
    description: '',
    button_text: cleanName,
    status: 'published',
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: [],
    response: {
      title: `📄 ${cleanName}`,
      description: desc,
      actions: [
        {
          id: `act_${site.id}_docs`,
          type: 'whatsapp_msg',
          button_text: '📄 தேவையான ஆவணங்கள்',
          url: '',
          message: `${cleanName} விண்ணப்பிக்க என்னென்ன ஆவணங்கள் தேவை?`,
          share_content: ''
        },
        {
          id: `act_${site.id}_apply`,
          type: 'whatsapp_msg',
          button_text: '📲 விண்ணப்பிக்க கிளிக் செய்யவும் 👇',
          url: '',
          message: `${cleanName} விண்ணப்பிக்க விரும்புகிறேன். வழிகாட்டவும்.`,
          share_content: ''
        }
      ]
    }
  };
}

function createSubcategoryNode(id, parentId, title, buttonText, sortOrder, childrenSites) {
  return {
    id: id,
    parent_id: parentId,
    title: title,
    description: 'உங்களுக்கு தேவையான குறிப்பிட்ட சேவையைத் தேர்வு செய்யவும் 👇',
    button_text: buttonText,
    status: 'published',
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: childrenSites.map((s, idx) => createLeafNode(s, id, idx))
  };
}

// Group sites by category
const byCat = {};
sites.forEach(s => {
  if (!byCat[s.category]) byCat[s.category] = [];
  byCat[s.category].push(s);
});

const flows = [];

// 1. E-Sevai
if (byCat['E-Sevai']) {
  flows.push({
    id: 'req-esevai',
    parent_id: null,
    title: '📄 ஆன்லைன் இ-சேவை சான்றிதழ்கள் (E-Sevai Certificates)',
    description: 'வருமானம், சாதி, இருப்பிடம், வாரிசு உள்ளிட்ட அனைத்து அரசு இ-சேவை சான்றிதழ்கள்.',
    button_text: '📄 இ-சேவை சான்றிதழ்கள்',
    status: 'published',
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['E-Sevai'].map((s, idx) => createLeafNode(s, 'req-esevai', idx))
  });
}

// 2. Vehicle & Transport Services (Nested into Driving Licence, Vehicle RC, Insurance & Others)
const vehicleSites = (byCat['Vehicle & Transport Services'] || []);
const dlSites = vehicleSites.filter(s => s.name.startsWith('1.') || s.id.includes('dl') || s.id.includes('llr') || s.id.includes('idp'));
const rcSites = vehicleSites.filter(s => s.name.startsWith('2.') || s.id.includes('rc') || s.id.includes('vahan') || s.id.includes('pucc'));
const otherVehSites = vehicleSites.filter(s => !dlSites.includes(s) && !rcSites.includes(s));

flows.push({
  id: 'req-transport',
  parent_id: null,
  title: '🚗 வாகன & ஓட்டுநர் உரிம சேவைகள் (Vehicle & Transport)',
  description: 'பழகுநர் உரிமம் (LLR), ஓட்டுநர் உரிமம் (DL), RC பெயர் மாற்றம் மற்றும் வாகன சேவைகள்.',
  button_text: '🚗 வாகன & ஓட்டுநர் சேவைகள்',
  status: 'published',
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [
    createSubcategoryNode('sub-transport-dl', 'req-transport', '🪪 ஓட்டுநர் உரிமம் & LLR (Driving Licence & LLR)', '🪪 ஓட்டுநர் உரிமம் & LLR', 0, dlSites),
    createSubcategoryNode('sub-transport-rc', 'req-transport', '🚙 வாகனப் பதிவு & RC சேவைகள் (Vehicle RC Services)', '🚙 வாகனப் பதிவு & RC சேவைகள்', 1, rcSites),
    createSubcategoryNode('sub-transport-other', 'req-transport', '🛡️ வாகனக் காப்பீடு & பிற சேவைகள் (Insurance & Portals)', '🛡️ காப்பீடு & பிற சேவைகள்', 2, otherVehSites)
  ]
});

// 3. Smart Card (ரேஷன் கார்டு)
if (byCat['Smart Card (ரேஷன் கார்டு)']) {
  flows.push({
    id: 'req-smartcard',
    parent_id: null,
    title: '🪪 ரேஷன் கார்டு சேவைகள் (Smart Ration Card)',
    description: 'புதிய குடும்ப அட்டை, பெயர் சேர்த்தல்/நீக்கம், முகவரி மாற்றம் மற்றும் திருத்தங்கள்.',
    button_text: '🪪 ரேஷன் கார்டு சேவைகள்',
    status: 'published',
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Smart Card (ரேஷன் கார்டு)'].map((s, idx) => createLeafNode(s, 'req-smartcard', idx))
  });
}

// 4. Land & Property Services
if (byCat['Land & Property Services']) {
  flows.push({
    id: 'req-land',
    parent_id: null,
    title: '📜 நிலம் & பத்திரப் பதிவு சேவைகள் (Land & Property)',
    description: 'பட்டா, சிட்டா, புல வரைபடம் (FMB), வில்லங்கச் சான்றிதழ் (EC) மற்றும் சொத்து வரி.',
    button_text: '📜 நிலம் & பத்திர சேவைகள்',
    status: 'published',
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Land & Property Services'].map((s, idx) => createLeafNode(s, 'req-land', idx))
  });
}

// 5. Electricity & EB Services
if (byCat['Electricity & EB Services']) {
  flows.push({
    id: 'req-eb',
    parent_id: null,
    title: '⚡ மின்சார வாரிய சேவைகள் (Electricity & TNEB)',
    description: 'புதிய மின் இணைப்பு, பெயர் மாற்றம், ஆதார் இணைப்பு மற்றும் பில் ரசீது.',
    button_text: '⚡ மின்சார சேவைகள் (TNEB)',
    status: 'published',
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Electricity & EB Services'].map((s, idx) => createLeafNode(s, 'req-eb', idx))
  });
}

// 6. Pension Services (TN Social Security + PM Pension Schemes)
const tnPensionSites = byCat['Pension Services'] || [];
const pmPensionSites = byCat['PM Pension Schemes (பிரதமர் ஓய்வூதியத் திட்டங்கள்)'] || [];

flows.push({
  id: 'req-pension',
  parent_id: null,
  title: '👵 சமூகப் பாதுகாப்பு & பென்ஷன் திட்டங்கள் (Pension Schemes)',
  description: 'முதியோர், விதவை, மாற்றுத்திறனாளி மற்றும் மத்திய அரசு அடல் பென்ஷன் திட்டங்கள்.',
  button_text: '👵 பென்ஷன் & ஓய்வூதியத் திட்டங்கள்',
  status: 'published',
  sort_order: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [
    createSubcategoryNode('sub-pension-tn', 'req-pension', '🏛️ தமிழ்நாடு சமூகப் பாதுகாப்பு ஓய்வூதியம் (TN Social Security Schemes)', '🏛️ தமிழ்நாடு பென்ஷன் திட்டங்கள்', 0, tnPensionSites),
    createSubcategoryNode('sub-pension-pm', 'req-pension', '🇮🇳 பிரதமர் ஓய்வூதியத் திட்டங்கள் (PM Pension Schemes - APY/PMSYM)', '🇮🇳 பிரதமர் பென்ஷன் திட்டங்கள்', 1, pmPensionSites)
  ]
});

// 7. Competitive Exams (Nested by Exam Authority)
const examSites = byCat['Competitive Exams'] || [];
const tnExamSites = examSites.filter(s => s.name.startsWith('1.'));
const sscExamSites = examSites.filter(s => s.name.startsWith('2.'));
const rrbExamSites = examSites.filter(s => s.name.startsWith('3.'));
const bankExamSites = examSites.filter(s => s.name.startsWith('4.'));
const upscExamSites = examSites.filter(s => s.name.startsWith('5.'));

flows.push({
  id: 'req-exams',
  parent_id: null,
  title: '📚 போட்டித் தேர்வுகள் & வேலைவாய்ப்பு (Competitive Exams & Jobs)',
  description: 'TNPSC, TNUSRB, SSC, ரயில்வே RRB, வங்கித் தேர்வுகள் மற்றும் விண்ணப்ப விவரங்கள்.',
  button_text: '📚 போட்டித் தேர்வுகள் (Exams)',
  status: 'published',
  sort_order: 6,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [
    createSubcategoryNode('sub-exam-tn', 'req-exams', '🏛️ தமிழ்நாடு அரசு தேர்வுகள் (TNPSC, TNUSRB & TRB)', '🏛️ TN அரசு தேர்வுகள்', 0, tnExamSites),
    createSubcategoryNode('sub-exam-ssc', 'req-exams', '🏢 மத்திய அரசு SSC தேர்வுகள் (Staff Selection Commission)', '🏢 SSC தேர்வுகள்', 1, sscExamSites),
    createSubcategoryNode('sub-exam-rrb', 'req-exams', '🚆 ரயில்வே தேர்வுகள் (Railway Recruitment Board - RRB)', '🚆 ரயில்வே தேர்வுகள் (RRB)', 2, rrbExamSites),
    createSubcategoryNode('sub-exam-bank', 'req-exams', '🏦 வங்கித் தேர்வுகள் (IBPS & SBI Banking Exams)', '🏦 வங்கித் தேர்வுகள்', 3, bankExamSites),
    createSubcategoryNode('sub-exam-upsc', 'req-exams', '🇮🇳 UPSC & பாதுகாப்புப் படை (Civil Services & Agnipath)', '🇮🇳 UPSC & ராணுவம்', 4, upscExamSites)
  ]
});

// 8. Passport Services (Include web-2 if exists)
const passportSites = [...(byCat['Passport Services'] || []), ...(byCat['Travel & Identity'] || [])];
flows.push({
  id: 'req-passport',
  parent_id: null,
  title: '🛂 பாஸ்போர்ட் சேவைகள் (Passport Services)',
  description: 'புதிய பாஸ்போர்ட் விண்ணப்பம், புதுப்பித்தல், PCC சான்றிதழ் மற்றும் அப்பாயிண்ட்மெண்ட்.',
  button_text: '🛂 பாஸ்போர்ட் சேவைகள்',
  status: 'published',
  sort_order: 7,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: passportSites.map((s, idx) => createLeafNode(s, 'req-passport', idx))
});

// 9. Police Services
if (byCat['Police Services']) {
  flows.push({
    id: 'req-police',
    parent_id: null,
    title: '👮 காவல்துறை சேவைகள் (Police Services)',
    description: 'காவல் சரிபார்ப்பு (PVC), தொலைந்த ஆவண அறிக்கை (LDR) மற்றும் ஆன்லைன் புகார்.',
    button_text: '👮 காவல்துறை சேவைகள்',
    status: 'published',
    sort_order: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Police Services'].map((s, idx) => createLeafNode(s, 'req-police', idx))
  });
}

// 10. Welfare Board (நல வாரியம்)
if (byCat['Welfare Board (நல வாரியம்)']) {
  flows.push({
    id: 'req-welfare',
    parent_id: null,
    title: '👷 தொழிலாளர் நல வாரியம் (Labour Welfare Board)',
    description: 'உறுப்பினர் பதிவு, புதுப்பித்தல், கல்வி உதவி, திருமண நிதி மற்றும் மகப்பேறு உதவி.',
    button_text: '👷 நல வாரிய சேவைகள்',
    status: 'published',
    sort_order: 9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Welfare Board (நல வாரியம்)'].map((s, idx) => createLeafNode(s, 'req-welfare', idx))
  });
}

// 11. Marriage Registration
if (byCat['Marriage Registration']) {
  flows.push({
    id: 'req-marriage',
    parent_id: null,
    title: '💍 திருமணப் பதிவு சேவைகள் (Marriage Registration)',
    description: 'தமிழ்நாடு திருமணச் சட்டம், இந்து திருமணச் சட்டம் மற்றும் திருமணச் சான்றிதழ் நகல்.',
    button_text: '💍 திருமணப் பதிவு சேவைகள்',
    status: 'published',
    sort_order: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['Marriage Registration'].map((s, idx) => createLeafNode(s, 'req-marriage', idx))
  });
}

// 12. Farmer Services (Farmer Services + PM Kisan)
const farmerSites = [...(byCat['Farmer Services (விவசாய சேவைகள்)'] || []), ...(byCat['Government Schemes'] || [])];
flows.push({
  id: 'req-farmer',
  parent_id: null,
  title: '🌾 விவசாய சேவைகள் & நலத்திட்டங்கள் (Farmer Services)',
  description: 'உழவன் செயலி, சொட்டுநீர்ப் பாசன மானியம், பி.எம். கிசான் மற்றும் பயிர் காப்பீடு.',
  button_text: '🌾 விவசாய சேவைகள்',
  status: 'published',
  sort_order: 11,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: farmerSites.map((s, idx) => createLeafNode(s, 'req-farmer', idx))
});

// 13. LPG Gas Services
if (byCat['LPG Gas Services (சமையல் எரிவாயு)']) {
  flows.push({
    id: 'req-lpg',
    parent_id: null,
    title: '🔥 சமையல் எரிவாயு சேவைகள் (LPG Gas Services)',
    description: 'புதிய கேஸ் இணைப்பு, உஜ்வாலா இலவச இணைப்பு, மானியம் மற்றும் ஆதார் இ-கேஒய்சி.',
    button_text: '🔥 சமையல் எரிவாயு (LPG)',
    status: 'published',
    sort_order: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: byCat['LPG Gas Services (சமையல் எரிவாயு)'].map((s, idx) => createLeafNode(s, 'req-lpg', idx))
  });
}

// 14. Food & Business (FSSAI Food Safety + Business Services)
const fssaiSites = byCat['FSSAI Food Safety Services'] || [];
const bizSites = byCat['Business Services'] || [];

flows.push({
  id: 'req-business',
  parent_id: null,
  title: '🍲 உணவு & வணிகப் பதிவு (Business & FSSAI Services)',
  description: 'FSSAI உணவுப் பாதுகாப்பு உரிமம், GST பதிவு மற்றும் MSME உத்யம் பதிவு.',
  button_text: '🍲 உணவு & வணிகப் பதிவு',
  status: 'published',
  sort_order: 13,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [
    createSubcategoryNode('sub-fssai', 'req-business', '🥗 FSSAI உணவுப் பாதுகாப்பு உரிமம் (Food Safety Licence)', '🥗 FSSAI உணவு உரிமம்', 0, fssaiSites),
    createSubcategoryNode('sub-biz-gst', 'req-business', '🏢 ஜிஎஸ்டி & குறுந்தொழில் MSME (GST & Udyam)', '🏢 GST & குறுந்தொழில் பதிவு', 1, bizSites)
  ]
});

// 15. Ticket Booking (Train, Bus, Movie)
const ticketSites = byCat['Ticket Booking (பயணச் சீட்டு & சினிமா முன்பதிவு)'] || [];
const trainTickets = ticketSites.filter(s => s.name.includes('ரயில்') || s.name.includes('IRCTC') || s.name.includes('UTS'));
const busTickets = ticketSites.filter(s => s.name.includes('பேருந்து') || s.name.includes('TNSTC') || s.name.includes('Bus') || s.name.includes('RTC'));
const movieTickets = ticketSites.filter(s => s.name.includes('சினிமா') || s.name.includes('BookMyShow') || s.name.includes('திரையரங்கு') || s.name.includes('PVR'));

flows.push({
  id: 'req-tickets',
  parent_id: null,
  title: '🎫 பயணச் சீட்டு & சினிமா முன்பதிவு (Ticket Booking)',
  description: 'ரயில் (IRCTC/தட்கல்), அரசு மற்றும் தனியார் பேருந்து மற்றும் சினிமா டிக்கெட்.',
  button_text: '🎫 பயணச் சீட்டு முன்பதிவு',
  status: 'published',
  sort_order: 14,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [
    createSubcategoryNode('sub-ticket-train', 'req-tickets', '🚆 ரயில் பயண முன்பதிவு (IRCTC & Tatkal Rail Ticket)', '🚆 ரயில் முன்பதிவு', 0, trainTickets),
    createSubcategoryNode('sub-ticket-bus', 'req-tickets', '🚌 பேருந்து முன்பதிவு (TNSTC, SETC & Omni Bus)', '🚌 பேருந்து முன்பதிவு', 1, busTickets),
    createSubcategoryNode('sub-ticket-movie', 'req-tickets', '🎬 திரையரங்கு சினிமா முன்பதிவு (Movie Tickets)', '🎬 சினிமா முன்பதிவு', 2, movieTickets)
  ]
});

// 16. Voter Services (Voter Services + web-6 ECI Portal)
const voterSites = [...(byCat['Voter Services (வாக்காளர் சேவைகள்)'] || [])];
const eciSite = (byCat['Identity & Governance'] || []).find(s => s.id === 'web-6');
if (eciSite) voterSites.push(eciSite);

flows.push({
  id: 'req-voter',
  parent_id: null,
  title: '🗳️ வாக்காளர் அட்டை சேவைகள் (Voter ID Services)',
  description: 'புதிய வாக்காளர் பதிவு (Form 6), முகவரி/விவர திருத்தம் (Form 8) மற்றும் e-EPIC பதிவிறக்கம்.',
  button_text: '🗳️ வாக்காளர் சேவைகள்',
  status: 'published',
  sort_order: 15,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: voterSites.map((s, idx) => createLeafNode(s, 'req-voter', idx))
});

// 17. PAN Card Services (PAN Card Services + web-4 NSDL)
const panSites = [...(byCat['PAN Card Services'] || [])];
const nsdlSite = (byCat['Banking & Tax'] || []).find(s => s.id === 'web-4');
if (nsdlSite) panSites.push(nsdlSite);

flows.push({
  id: 'req-pancard',
  parent_id: null,
  title: '💳 PAN Card சேவைகள் (PAN Card Services)',
  description: 'புதிய பான் கார்டு (Form 49A), பான் திருத்தம் (CSF Form) மற்றும் e-KYC பான்.',
  button_text: '💳 PAN Card சேவைகள்',
  status: 'published',
  sort_order: 16,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: panSites.map((s, idx) => createLeafNode(s, 'req-pancard', idx))
});

// 18. Aadhaar Services (web-1)
const aadhaarSite = (byCat['Identity & Governance'] || []).find(s => s.id === 'web-1');
if (aadhaarSite) {
  flows.push({
    id: 'req-aadhaar',
    parent_id: null,
    title: '🪪 ஆதார் கார்டு சேவைகள் (Aadhaar Card Services)',
    description: 'ஆதார் பதிவிறக்கம், PVC கார்டு ஆர்டர், முகவரி புதுப்பித்தல் மற்றும் பயோமெட்ரிக் லாக்.',
    button_text: '🪪 ஆதார் சேவைகள்',
    status: 'published',
    sort_order: 17,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: [createLeafNode(aadhaarSite, 'req-aadhaar', 0)]
  });
}

// 19. Income Tax & Banking (web-7)
const itSite = (byCat['Banking & Tax'] || []).find(s => s.id === 'web-7');
if (itSite) {
  flows.push({
    id: 'req-incometax',
    parent_id: null,
    title: '🏦 வருமான வரி & வங்கி சேவைகள் (Income Tax & Banking)',
    description: 'வருமான வரித் தாக்கல் (ITR), ஆதார்-பான் இணைப்பு மற்றும் ரீபண்ட் நிலை சரிபார்ப்பு.',
    button_text: '🏦 வருமான வரித் தாக்கல்',
    status: 'published',
    sort_order: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children: [createLeafNode(itSite, 'req-incometax', 0)]
  });
}

// 20. CMCHIS Health Insurance (Medical Insurance Scheme)
flows.push({
  id: 'req-cmchis',
  parent_id: null,
  title: '🏥 முதலமைச்சரின் விரிவான மருத்துவக் காப்பீட்டுத் திட்டம் (CMCHIS)',
  description: 'அரசு மற்றும் தனியார் மருத்துவமனைகளில் இலவச மருத்துவ சிகிச்சைக்கான முதலமைச்சர் காப்பீட்டு அட்டை.',
  button_text: '🏥 முதலமைச்சர் மருத்துவக் காப்பீடு',
  status: 'published',
  sort_order: 19,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [],
  response: {
    title: '🏥 முதலமைச்சரின் விரிவான மருத்துவக் காப்பீட்டுத் திட்டம் (CMCHIS)',
    description: `📌 முதலமைச்சரின் விரிவான மருத்துவக் காப்பீட்டுத் திட்டம் (CMCHIS)
* விளக்கம்: ஏழை எளிய குடும்பங்களுக்கு அரசு மற்றும் தனியார் மருத்துவமனைகளில் தரமான சிகிச்சை இலவசமாக வழங்க தமிழக அரசால் செயல்படுத்தப்படும் திட்டம்.
* தகுதி: அரசு நிர்ணயித்த தகுதி வரம்பிற்குள் உள்ள குடும்பங்கள். குடும்ப அட்டையில் உள்ள அனைத்து உறுப்பினர்களுக்கும் இத்திட்டம் பொருந்தும்.
* பயன்கள்: அரசு மற்றும் தனியார் மருத்துவமனைகளில் தரமான உயர் மருத்துவ சிகிச்சை மற்றும் அறுவை சிகிச்சைகள் பெறலாம்.

📄 தேவையான ஆவணங்கள்:
  • குடும்ப அட்டை (Smart Ration Card)
  • குடும்ப உறுப்பினர்கள் அனைவரின் ஆதார் அட்டை
  • கிராம நிர்வாக அலுவலர் (VAO) வருமானச் சான்றிதழ்
  • குடும்ப புகைப்படம்

💡 குறிப்பு: புதிய காப்பீட்டு அட்டை பெற அல்லது மருத்துவ உதவி கோர எங்கள் இ-சேவை மையத்தை தொடர்பு கொள்ளவும்.`,
    actions: [
      {
        id: 'act_cmchis_docs',
        type: 'whatsapp_msg',
        button_text: '📄 தேவையான ஆவணங்கள்',
        url: '',
        message: 'முதலமைச்சரின் மருத்துவக் காப்பீட்டு அட்டை பெற என்னென்ன ஆவணங்கள் தேவை?',
        share_content: ''
      },
      {
        id: 'act_cmchis_apply',
        type: 'whatsapp_msg',
        button_text: '📲 விண்ணப்பிக்க கிளிக் செய்யவும் 👇',
        url: '',
        message: 'முதலமைச்சரின் மருத்துவக் காப்பீட்டு அட்டைக்கு விண்ணப்பிக்க விரும்புகிறேன். வழிகாட்டவும்.',
        share_content: ''
      }
    ]
  }
});

const finalJson = {
  version: '2.0',
  updated_at: new Date().toISOString(),
  flows: flows
};

fs.writeFileSync(path.join(__dirname, '../src/config/chatbotFlow.json'), JSON.stringify(finalJson, null, 2), 'utf8');
console.log('Successfully wrote chatbotFlow.json! Total top flows:', flows.length);

// Count total nodes
let totalNodes = 0;
function countNodes(node) {
  totalNodes++;
  if (Array.isArray(node.children)) {
    node.children.forEach(countNodes);
  }
}
flows.forEach(countNodes);
console.log('Total nodes across all levels:', totalNodes);
