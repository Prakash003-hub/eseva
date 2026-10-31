const fs = require('fs');
const path = require('path');

const flowPath = path.join(__dirname, '../src/config/chatbotFlow.json');
const flowData = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

// Helper to convert existing description to new H1/H2/table format
function convertToNewFormat(title, existingDesc) {
  if (!existingDesc) return '';
  
  // If it already uses H2: and table:, return as is
  if (existingDesc.includes('H2:') && existingDesc.includes('table:')) {
    return existingDesc;
  }

  // Clean title for H1
  const cleanTitle = title.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim();

  let descText = '';
  let eligText = '';
  let benefits = [];
  let docs = [];
  let noteText = '';

  const lines = existingDesc.split('\n').map(l => l.trim()).filter(Boolean);

  let currentSection = null;

  for (let line of lines) {
    // Filter URLs
    if (/https?:\/\/[^\s]+|\*LINK|www\./i.test(line)) continue;
    
    // Filter redundant titles
    const linePlain = line.replace(/^##\s*/, '').replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').replace(/\*\*/g, '').trim().toLowerCase();
    if (linePlain === cleanTitle.toLowerCase() || line.startsWith('## ')) continue;
    if (/^📌\s*(TNeGA|Civil Registration|TANGEDCO|CRS|Anytime|தமிழ்நாடு|CRSTN)/i.test(line)) continue;

    const clean = line.replace(/\*\*/g, '').replace(/^\*\s*/, '').trim();
    const withoutEmoji = clean.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim();

    if (/^விளக்கம்(\s|$|\(|\:)/.test(withoutEmoji)) {
      currentSection = 'desc';
      const cIdx = clean.indexOf(':');
      if (cIdx !== -1 && cIdx < 30) {
        const t = clean.substring(cIdx + 1).trim();
        if (t) descText += (descText ? ' ' : '') + t;
      }
      continue;
    }
    if (/^தகுதி(\s|$|\(|\:)/.test(withoutEmoji)) {
      currentSection = 'elig';
      const cIdx = clean.indexOf(':');
      if (cIdx !== -1 && cIdx < 30) {
        const t = clean.substring(cIdx + 1).trim();
        if (t) eligText += (eligText ? ' ' : '') + t;
      }
      continue;
    }
    if (/^பயன்கள்(\s|$|\(|\:)/.test(withoutEmoji)) {
      currentSection = 'benefits';
      const cIdx = clean.indexOf(':');
      if (cIdx !== -1 && cIdx < 30) {
        const t = clean.substring(cIdx + 1).trim();
        if (t) benefits.push(t);
      }
      continue;
    }
    if (/^தேவையான ஆவணங்கள்/.test(withoutEmoji)) {
      currentSection = 'docs';
      continue;
    }
    if (/^குறிப்பு(\s|$|\(|\:)/.test(withoutEmoji)) {
      currentSection = 'note';
      const cIdx = clean.indexOf(':');
      if (cIdx !== -1) {
        const t = clean.substring(cIdx + 1).trim();
        if (t) noteText += (noteText ? ' ' : '') + t;
      }
      continue;
    }

    // List items
    const listMatch = line.match(/^(\d+\.|\-|•|\*)\s+(.*)/);
    if (listMatch) {
      const item = listMatch[2].replace(/\*\*/g, '').trim();
      if (currentSection === 'docs') {
        docs.push(item);
      } else if (currentSection === 'benefits') {
        benefits.push(item);
      } else if (currentSection === 'desc') {
        descText += (descText ? ' ' : '') + item;
      } else if (currentSection === 'elig') {
        eligText += (eligText ? ' ' : '') + item;
      } else {
        docs.push(item);
      }
      continue;
    }

    // Regular line
    if (currentSection === 'desc') {
      descText += (descText ? '\n' : '') + clean;
    } else if (currentSection === 'elig') {
      eligText += (eligText ? '\n' : '') + clean;
    } else if (currentSection === 'note') {
      noteText += (noteText ? '\n' : '') + clean;
    } else if (currentSection === 'docs') {
      docs.push(clean);
    } else {
      if (!descText) descText = clean;
      else descText += '\n' + clean;
    }
  }

  // Build the standardized syntax
  let output = `H1: ${cleanTitle}\n\n`;

  output += `H2: விளக்கம் (Description)\n${descText || 'அரசு மற்றும் சேவை தொடர்பான அதிகாரப்பூர்வ தகவல் விவரங்கள்.'}\n\n`;

  if (eligText) {
    output += `H2: தகுதி (Eligibility)\n${eligText}\n\n`;
  } else {
    output += `H2: தகுதி (Eligibility)\nதமிழ்நாட்டில் வசிக்கும் தகுதியுடைய அனைத்து குடிமக்களும் விண்ணப்பிக்கலாம்.\n\n`;
  }

  if (benefits.length > 0) {
    output += `H2: பயன்கள் (Benefits)\n`;
    benefits.forEach(b => {
      output += `- ${b}\n`;
    });
    output += `\n`;
  } else {
    output += `H2: பயன்கள் (Benefits)\n- அரசின் அதிகாரப்பூர்வ சான்றிதழ் மற்றும் சேவையைப் பெறலாம்.\n- பல்வேறு அரசு நலத்திட்டங்கள் மற்றும் கல்வி வேலைவாய்ப்புகளுக்குப் பயன்படுத்தலாம்.\n\n`;
  }

  output += `H2: தேவையான ஆவணங்கள் (Required Documents)\n\ntable:\nS.No$Document Name$Description\n`;
  if (docs.length > 0) {
    docs.forEach((doc, idx) => {
      let name = doc;
      let dDesc = 'அசல் அல்லது நகல் சமர்ப்பிக்க வேண்டும்';
      
      const parenMatch = doc.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (parenMatch) {
        name = parenMatch[1].trim();
        dDesc = parenMatch[2].trim();
      } else if (doc.includes('-')) {
        const parts = doc.split('-');
        name = parts[0].trim();
        dDesc = parts.slice(1).join('-').trim();
      }
      output += `${idx + 1}$${name}$${dDesc}\n`;
    });
  } else {
    output += `1$ஆதார் அட்டை (Aadhaar Card)$விண்ணப்பதாரரின் ஆதார் அட்டை நகல்\n2$குடும்ப அட்டை (Ration Card)$முகவரிச் சான்றிற்கான ஸ்மார்ட் கார்டு நகல்\n3$புகைப்படம் (Photo)$சமீபத்திய பாஸ்போர்ட் அளவு புகைப்படம்\n`;
  }
  output += `\n`;

  output += `H2: குறிப்பு (Note)\n${noteText || 'அனைத்து ஆவணங்களின் விவரங்களையும் சரிபார்த்து சரியான தகவல்களுடன் விண்ணப்பிக்கவும்.'}`;

  return output;
}

// Test on first 2 nodes
let count = 0;
function testScan(nodes) {
  for (const n of nodes) {
    if (n.response && n.response.description && count < 2) {
      console.log(`=== NODE: ${n.id} (${n.title}) ===`);
      console.log(convertToNewFormat(n.title, n.response.description));
      console.log('\n-----------------------------------------\n');
      count++;
    }
    if (n.children) testScan(n.children);
  }
}
testScan(flowData.flows);
