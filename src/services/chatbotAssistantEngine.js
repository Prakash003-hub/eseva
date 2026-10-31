import initialSeedData from '../config/chatbotFlow.json';

/**
 * Intelligent Multilingual NLP & Customer Support Engine for Subi E-Sevai
 * Understands Tamil, English, and Romanized Tamil (Tanglish)
 */

// Normalized dictionary mapping common queries/synonyms to services & intents
const INTENT_PATTERNS = {
  GREETING: [
    'hi', 'hello', 'hey', 'வணக்கம்', 'vanakkam', 'வணக்கங்க', 'good morning',
    'good afternoon', 'good evening', 'namaste', 'hai', 'hola', 'start', 'help'
  ],
  BUSINESS: [
    'business', 'வணிகம்', 'தொழில்', 'வியாபாரம்', 'thozhil', 'kadai', 'shop', 'store',
    'startup', 'msme', 'udyam', 'உத்யம்', 'gst', 'ஜிஎஸ்டி', 'fssai', 'food licence',
    'food license', 'உணவு உரிமம்', 'trade licence', 'trade license', 'current account',
    'mudra loan', 'start business', 'business registration', 'கடை பதிவு', 'வணிக பதிவு'
  ],
  CONTACT_LOCATION: [
    'timing', 'timings', 'time', 'hours', 'opening', 'closing', 'when open',
    'address', 'location', 'where', 'engu irukku', 'enga iruku', 'shop address',
    'centre', 'center', 'office', 'எங்கே', 'முகவரி', 'நேரம்', 'கடை எங்குள்ளது',
    'phone', 'mobile', 'contact', 'call', 'number', 'எண்', 'தொடர்பு', 'pesanum'
  ],
  FEES: [
    'fee', 'fees', 'cost', 'price', 'charge', 'charges', 'evvalavu', 'rate',
    'amount', 'how much', 'கட்டணம்', 'விலை', 'எவ்வளவு கட்டணம்'
  ]
};

// Flatten all leaves (actionable services) from chatbotFlow.json
let cachedServices = null;

export function getAllServices() {
  if (cachedServices) return cachedServices;

  const services = [];
  function traverse(nodes, parentCategory = null) {
    for (const node of nodes) {
      if (node.status === 'disabled') continue;

      if (node.response && node.response.description) {
        services.push({
          id: node.id,
          title: node.title,
          button_text: node.button_text || node.title,
          category: parentCategory ? parentCategory.title : '',
          categoryId: parentCategory ? parentCategory.id : '',
          description: node.response.description,
          responseTitle: node.response.title || node.title,
          response: node.response,
          rawNode: node,
          actions: node.response.actions || [],
          keywords: generateServiceKeywords(node)
        });
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children, parentCategory || node);
      }
    }
  }

  traverse(initialSeedData.flows || []);
  cachedServices = services;
  return services;
}

/**
 * Generates searchable keywords including English, Tamil, and Tanglish synonyms
 */
function generateServiceKeywords(node) {
  const text = `${node.title || ''} ${node.button_text || ''} ${node.description || ''}`.toLowerCase();
  const kw = new Set();

  const words = text.replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  words.forEach(w => kw.add(w));

  // Domain-specific synonym injections
  if (/income|வருமான/i.test(text)) {
    kw.add('income'); kw.add('வருமானம்'); kw.add('வருமானச்'); kw.add('varumanam'); kw.add('varumaana'); kw.add('saandridhazh');
  }
  if (/community|caste|சாதி/i.test(text)) {
    kw.add('community'); kw.add('caste'); kw.add('சாதி'); kw.add('சாதிச்'); kw.add('jaathi'); kw.add('saathi'); kw.add('obc'); kw.add('sc'); kw.add('bc'); kw.add('mbc');
  }
  if (/nativity|residence|இருப்பிட/i.test(text)) {
    kw.add('nativity'); kw.add('residence'); kw.add('இருப்பிடம்'); kw.add('இருப்பிடச்'); kw.add('iruppidam'); kw.add('address proof');
  }
  if (/legal heir|வாரிசு/i.test(text)) {
    kw.add('legal heir'); kw.add('வாரிசு'); kw.add('வாரிசுச்'); kw.add('varisu'); kw.add('vaarisurimai'); kw.add('death heir');
  }
  if (/first graduate|பட்டதாரி|முதல் தலைமுறை/i.test(text)) {
    kw.add('first graduate'); kw.add('முதல் தலைமுறை'); kw.add('mudhal thalaimurai'); kw.add('graduate');
  }
  if (/smart|ration|குடும்ப|ரேஷன்/i.test(text)) {
    kw.add('ration'); kw.add('smart card'); kw.add('smartcard'); kw.add('குடும்ப அட்டை'); kw.add('ரேஷன்'); kw.add('kudumba card');
  }
  if (/voter|வாக்காளர்/i.test(text)) {
    kw.add('voter'); kw.add('voter id'); kw.add('epic'); kw.add('வாக்காளர்'); kw.add('election card');
  }
  if (/aadhaar|ஆதார்/i.test(text)) {
    kw.add('aadhaar'); kw.add('aadhar'); kw.add('athar'); kw.add('ஆதார்'); kw.add('uidai');
  }
  if (/pan|பான்/i.test(text)) {
    kw.add('pan'); kw.add('pan card'); kw.add('pancard'); kw.add('பான்'); kw.add('nsdl'); kw.add('uti');
  }
  if (/udyam|msme|குறுந்தொழில்/i.test(text)) {
    kw.add('udyam'); kw.add('msme'); kw.add('உத்யம்'); kw.add('குறுந்தொழில்'); kw.add('business'); kw.add('தொழில்');
  }
  if (/gst|ஜிஎஸ்டி/i.test(text)) {
    kw.add('gst'); kw.add('ஜிஎஸ்டி'); kw.add('tax'); kw.add('வரி'); kw.add('business'); kw.add('gstr');
  }
  if (/fssai|உணவு/i.test(text)) {
    kw.add('fssai'); kw.add('food license'); kw.add('food licence'); kw.add('உணவு'); kw.add('உணவு உரிமம்'); kw.add('restaurant'); kw.add('hotel');
  }
  if (/patta|chitta|பட்டா|சிட்டா/i.test(text)) {
    kw.add('patta'); kw.add('chitta'); kw.add('பட்டா'); kw.add('சிட்டா'); kw.add('land'); kw.add('ec'); kw.add('villangam');
  }
  if (/eb|tneb|மின்சாரம்/i.test(text)) {
    kw.add('eb'); kw.add('tneb'); kw.add('மின்சாரம்'); kw.add('current bill'); kw.add('electricity');
  }
  if (/driving|licence|license|ஓட்டுநர்/i.test(text)) {
    kw.add('license'); kw.add('licence'); kw.add('driving'); kw.add('llr'); kw.add('rc'); kw.add('ஓட்டுநர்');
  }
  if (/passport|பாஸ்போர்ட்/i.test(text)) {
    kw.add('passport'); kw.add('பாஸ்போர்ட்');
  }

  return Array.from(kw);
}

/**
 * Cleans user query for matching
 */
function normalizeQuery(query) {
  return (query || '')
    .toLowerCase()
    .replace(/[?,.!@#$%^&*()_+=\-[\]{};':"\\|<>~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main Assistant Intent & Natural Language Processor
 */
export function processUserQuery(rawQuery) {
  const query = normalizeQuery(rawQuery);
  if (!query) {
    return {
      type: 'EMPTY',
      replyText: 'தயவுசெய்து உங்கள் கேள்வியை உள்ளிடவும் (Please type your query).'
    };
  }

  // 1. Check for GREETING intent
  for (const greet of INTENT_PATTERNS.GREETING) {
    if (query === greet || query.startsWith(greet + ' ') || query.endsWith(' ' + greet)) {
      return {
        type: 'GREETING',
        replyTitle: 'வணக்கம்! Welcome to Subi E-Sevai Assistant 🙏',
        replyText: 'நான் உங்கள் 24/7 ஆன்லைன் சேவை உதவியாளர். அரசு இ-சேவை சான்றிதழ்கள், வணிகப் பதிவுகள் (Business / GST / MSME / FSSAI), ஆதார், ரேஷன் கார்டு மற்றும் பான் சேவைகளைப் பற்றி நீங்கள் எதை வேண்டுமானாலும் கேட்கலாம்.',
        quickChips: [
          { label: '🏢 வணிக சேவைகள் (Business)', query: 'business services' },
          { label: '📄 வருமானச் சான்றிதழ்', query: 'income certificate' },
          { label: '🪪 ஸ்மார்ட் ரேஷன் கார்டு', query: 'ration card' },
          { label: '💳 PAN Card சேவைகள்', query: 'pan card' },
          { label: '📍 கடை முகவரி & நேரம்', query: 'shop timing address' }
        ]
      };
    }
  }

  // 2. Check for BUSINESS intent
  const isBusinessQuery = INTENT_PATTERNS.BUSINESS.some(b => {
    return query === b || query.includes(b);
  });

  if (isBusinessQuery && (
    query === 'business' ||
    query === 'வணிகம்' ||
    query === 'தொழில்' ||
    query.includes('start business') ||
    query.includes('business services') ||
    query.includes('shop') ||
    query.includes('store') ||
    query.includes('வணிக பதிவு') ||
    query.includes('with business')
  )) {
    const services = getAllServices();
    // Prioritize primary business/commercial services
    const priorityKeywords = ['udyam', 'gst registration', 'fssai food licence', 'உணவு உரிமம்'];
    let bizServices = [];
    
    for (const kw of priorityKeywords) {
      const match = services.find(s => s.title.toLowerCase().includes(kw) || (s.responseTitle && s.responseTitle.toLowerCase().includes(kw)));
      if (match && !bizServices.some(b => b.id === match.id)) {
        bizServices.push(match);
      }
    }

    if (bizServices.length < 4) {
      const more = services.filter(s =>
        /udyam|msme|gst|fssai/i.test(s.title) && !bizServices.some(b => b.id === s.id)
      );
      bizServices = [...bizServices, ...more].slice(0, 4);
    }

    return {
      type: 'BUSINESS_HUB',
      replyTitle: 'சுபி இ-சேவை: தொழில் & வணிக சேவைகள் (Business & Commercial Support)',
      replyText: 'உங்கள் புதிய வணிகம், கடைகள் மற்றும் உற்பத்தி நிறுவனங்களை அரசு விதிமுறைகளின்படி பதிவு செய்து, அரசு மானியங்கள், குறைந்த வட்டி வங்கிக் கடன்களைப் பெற சுபி இ-சேவை மையம் முழுமையான வழிகாட்டுதல் வழங்குகிறது:',
      highlights: [
        {
          title: '1. Udyam (MSME) குறுந்தொழில் பதிவு',
          desc: 'பிணையில்லா MUDRA கடன்கள், குறைந்த வட்டி மற்றும் மின்சாரக் கட்டணச் சலுகைகள் பெற உடனடி மத்திய அரசு சான்றிதழ்.'
        },
        {
          title: '2. GST Registration & Monthly Filing',
          desc: 'மாநிலங்களுக்கு இடையே தடையின்றி வணிகம் செய்ய மற்றும் இன்புட் டேக்ஸ் கிரெடிட் (ITC) பெற புதிய ஜிஎஸ்டி பதிவு.'
        },
        {
          title: '3. FSSAI உணவுப் பாதுகாப்பு உரிமம் (Food License)',
          desc: 'உணவகம், பேக்கரி, மளிகைக் கடைகள் மற்றும் Swiggy/Zomato இணைக்க கட்டாயமான உணவுப் பாதுகாப்பு சான்றிதழ்.'
        },
        {
          title: '4. வணிக வங்கி கணக்கு & உள்ளாட்சி கடை உரிமம்',
          desc: 'Current Account திறக்க தேவையான ஆவணங்கள் மற்றும் உள்ளாட்சி வர்த்தக உரிம வழிகாட்டல்.'
        }
      ],
      quickServices: bizServices,
      whatsappAction: {
        text: 'தொழில் பதிவு குறித்து WhatsApp-ல் விரிவாக பேசவும்',
        prefill: `வணக்கம் சுபி இ-சேவை, எனது தொழில்/வணிகம் (${rawQuery}) பதிவு செய்ய வழிகாட்டவும்.`
      }
    };
  }

  // 3. Check for CONTACT & TIMINGS intent
  const isContactQuery = INTENT_PATTERNS.CONTACT_LOCATION.some(c => query.includes(c));
  if (isContactQuery) {
    return {
      type: 'CONTACT_INFO',
      replyTitle: '📍 சுபி இ-சேவை மையம் - அலுவலக விபரம் & தொடர்பு',
      replyText: 'எங்கள் மையம் அனைத்து நாட்களிலும் வாடிக்கையாளர் சேவைக்காக செயல்படுகிறது:',
      details: [
        { label: '⏰ வேலை நேரம் (Working Hours)', value: 'காலை 9:00 AM முதல் இரவு 9:00 PM வரை (திங்கள் - ஞாயிறு)' },
        { label: '📍 முகவரி (Location)', value: 'Subi E-Sevai & CSC Digital Seva Kendra, Tamil Nadu' },
        { label: '📞 நேரடி தொடர்பு (Phone / WhatsApp)', value: '+91 94889 02824 / +91 88258 74824' },
        { label: '🌐 ஆன்லைன் போர்டல்', value: '24/7 விண்ணப்பங்கள் மற்றும் ஆவணப் பதிவு சேவை' }
      ],
      whatsappAction: {
        text: 'நேரடியாக வாட்ஸ்அப் மூலம் தொடர்புகொள்ளவும்',
        prefill: `வணக்கம் சுபி இ-சேவை, உங்கள் சேவை மையம் தொடர்பான நேரடி தகவல் தேவைப்படுகிறது.`
      }
    };
  }

  // 4. Check for FEES intent
  const isFeeQuery = INTENT_PATTERNS.FEES.some(f => query.includes(f));
  if (isFeeQuery) {
    return {
      type: 'FEES_INFO',
      replyTitle: '💰 சேவைக் கட்டண விவரங்கள் (Fee Structure)',
      replyText: 'சுபி இ-சேவை மையத்தில் அரசு நிர்ணயித்த கட்டணங்கள் மற்றும் நியாயமான சேவைக்கட்டணத்தில் வெளிப்படையான சேவை வழங்கப்படுகிறது:',
      details: [
        { label: '📄 இ-சேவை அரசு சான்றிதழ்கள்', value: 'அரசு நிர்ணயித்த விண்ணப்பக் கட்டணம் + மிகக் குறைந்த கணினி/பிரவுசிங் கட்டணம்.' },
        { label: '🏢 Udyam (MSME) பதிவு', value: 'மத்திய அரசு இணையதளம் மூலம் குறைந்த ஆவணக் கட்டணத்தில் உடனடி சான்றிதழ்.' },
        { label: '🥗 FSSAI & GST வணிகப் பதிவு', value: 'அரசு உரிமக் கட்டணம் மற்றும் விரைவுப் பதிவு சேவை.' },
        { label: '🪪 ஆதார் / ரேஷன் / வாக்காளர்', value: 'அரசு விதிகளுக்குட்பட்ட பெயரளவிலான திருத்தக் கட்டணம்.' }
      ],
      whatsappAction: {
        text: 'குறிப்பிட்ட சேவைக்கான கட்டணம் அறிய WhatsApp-ல் கேட்கவும்',
        prefill: `வணக்கம் சுபி இ-சேவை, குறிப்பிட்ட சேவைக்கான அதிகாரப்பூர்வ கட்டணம் எவ்வளவு என்று தெரிந்து கொள்ள விரும்புகிறேன்.`
      }
    };
  }

  // 5. Intelligent Multi-Word Semantic Service Matching
  const services = getAllServices();
  const queryTokens = query.split(/\s+/).filter(t => t.length > 1);

  let bestMatch = null;
  let highestScore = 0;
  const scoredServices = [];

  for (const s of services) {
    let score = 0;
    const titleNorm = s.title.toLowerCase();
    const kwSet = s.keywords;

    // Exact title match or substring
    if (titleNorm.includes(query) || query.includes(titleNorm)) {
      score += 50;
    }

    // Token-level scoring
    for (const token of queryTokens) {
      if (titleNorm.includes(token)) score += 15;
      if (kwSet.includes(token)) score += 10;
      for (const kw of kwSet) {
        if (kw.includes(token) || token.includes(kw)) {
          score += 5;
        }
      }
    }

    if (score > 10) {
      scoredServices.push({ service: s, score });
      if (score > highestScore) {
        highestScore = score;
        bestMatch = s;
      }
    }
  }

  // Sort matched services by relevance
  scoredServices.sort((a, b) => b.score - a.score);

  if (bestMatch && highestScore >= 20) {
    const alternatives = scoredServices
      .filter(m => m.service.id !== bestMatch.id)
      .slice(0, 3)
      .map(m => m.service);

    return {
      type: 'SERVICE_FOUND',
      matchedService: bestMatch,
      confidence: highestScore,
      alternatives,
      replyTitle: `📄 ${bestMatch.responseTitle || bestMatch.title}`,
      replyIntro: `உங்கள் கேள்விக்குரிய சேவை விவரங்கள் மற்றும் ஆவணப் பட்டியல் கீழே கொடுக்கப்பட்டுள்ளது 👇`
    };
  }

  // 6. Fallback with Smart Suggestions
  const popularServices = services.filter(s =>
    /வருமான|சாதி|இருப்பிட|ரேஷன்|aadhaar|pan|udyam|fssai/i.test(s.title)
  ).slice(0, 4);

  return {
    type: 'UNKNOWN_FALLBACK',
    replyTitle: 'உங்களுக்கு உதவ விரும்புகிறோம்! (We are here to help)',
    replyText: `மன்னிக்கவும், "${rawQuery}" குறித்த நேரடி சேவை கண்டறியப்படவில்லை. கீழே உள்ள பரிந்துரைக்கப்பட்ட சேவைகளைத் தேர்ந்தெடுக்கலாம் அல்லது வாட்ஸ்அப் மூலம் உடனடியாக எங்களைத் தொடர்புகொள்ளலாம்:`,
    suggestedServices: popularServices,
    whatsappAction: {
      text: 'நேரடியாக வாட்ஸ்அப் உதவி பெற கிளிக் செய்யவும்',
      prefill: `வணக்கம் சுபி இ-சேவை, எனக்கு "${rawQuery}" தொடர்பான சேவை தகவல் தேவைப்படுகிறது.`
    }
  };
}
