import React from 'react';

/**
 * Splits title into Tamil (primary) and English (secondary) for category/subcategory buttons
 * Example: "வருமானச் சான்றிதழ் (Income Certificate)" -> { primary: "வருமானச் சான்றிதழ்", secondary: "Income Certificate" }
 */
export function splitBilingualTitle(text) {
  if (!text) return { primary: '', secondary: '' };
  // Remove leading emojis/symbols cleanly
  const clean = text.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim();
  const match = clean.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (match) {
    return {
      primary: match[1].trim(),
      secondary: match[2].trim()
    };
  }
  return { primary: clean || text.trim(), secondary: '' };
}

/**
 * Strips raw markdown bold/italic asterisks or renders styled spans
 * Strictly prevents URLs from rendering
 */
function renderCleanText(text) {
  if (!text) return null;

  // Filter out any raw URLs if present
  if (/https?:\/\/[^\s]+|\*LINK|www\./i.test(text)) {
    return null;
  }

  // Parse markdown bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ fontWeight: '700', color: '#0f172a' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Parse *italic*
    const subParts = part.split(/(\*[^*]+\*)/g);
    return subParts.map((sp, sIdx) => {
      if (sp.startsWith('*') && sp.endsWith('*') && sp.length > 2) {
        return <em key={`${idx}-${sIdx}`}>{sp.slice(1, -1)}</em>;
      }
      return sp;
    });
  });
}

/**
 * Parses the Custom Markdown-like syntax:
 * - H1: for the main title
 * - H2: for section headings (விளக்கம், தகுதி, பயன்கள், தேவையான ஆவணங்கள், குறிப்பு)
 * - H3: for paragraph headings
 * - --- for horizontal separator
 * - - for bullet lists
 * - 1. for numbered lists
 * - table: with $ as column delimiter
 */
function parseCustomMarkdown(content, serviceTitle = '') {
  if (!content || typeof content !== 'string') return [];

  const rawLines = content.split('\n');
  const blocks = [];

  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  const closeTable = () => {
    if (inTable) {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        blocks.push({
          type: 'table',
          headers: tableHeaders,
          rows: tableRows
        });
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  const cleanTitleNorm = (serviceTitle || '')
    .replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '')
    .replace(/\*\*/g, '')
    .trim()
    .toLowerCase();

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const line = rawLine.trim();

    // Inside table mode
    if (inTable) {
      if (
        line === '' ||
        line.startsWith('H1:') ||
        line.startsWith('H2:') ||
        line.startsWith('H3:') ||
        line === '---' ||
        line.startsWith('line') ||
        line.startsWith('##')
      ) {
        closeTable();
      } else {
        const parts = rawLine.includes('$')
          ? rawLine.split('$').map(c => c.trim())
          : rawLine.split(',').map(c => c.trim());

        // Filter out URLs in table cells
        const cleanParts = parts.map(p => (/https?:\/\/[^\s]+|\*LINK|www\./i.test(p) ? '' : p));

        if (tableHeaders.length === 0) {
          tableHeaders = cleanParts;
        } else {
          tableRows.push(cleanParts);
        }
        continue;
      }
    }

    if (!line) continue;

    // Filter out raw URLs / web links
    if (
      line.includes('http://') ||
      line.includes('https://') ||
      line.includes('www.') ||
      line.includes('*LINK') ||
      line.toLowerCase().includes('portal link') ||
      line.includes('இணைப்பு முகவரி')
    ) {
      continue;
    }

    // Start table
    if (line === 'table:' || line.toLowerCase() === 'table:') {
      closeTable();
      inTable = true;
      tableHeaders = [];
      tableRows = [];
      continue;
    }

    // Horizontal separator
    if (line === '---' || line.startsWith('line')) {
      closeTable();
      blocks.push({ type: 'hr' });
      continue;
    }

    // H1: Main Title
    if (line.startsWith('H1:')) {
      closeTable();
      const h1Text = line.substring(3).trim();
      const normH1 = h1Text.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').toLowerCase();

      // Avoid repeating identical title if already shown in card header
      if (cleanTitleNorm && (normH1 === cleanTitleNorm || (cleanTitleNorm.includes(normH1) && normH1.length > 8))) {
        continue;
      }
      blocks.push({ type: 'h1', text: h1Text });
      continue;
    }

    // H2: Section Headings
    if (line.startsWith('H2:')) {
      closeTable();
      const h2Raw = line.substring(3).trim();
      const cleanH2 = h2Raw.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim();

      if (/^விளக்கம்/i.test(cleanH2)) {
        blocks.push({
          type: 'h2',
          section: 'desc',
          title: h2Raw.includes('📌') ? h2Raw : `📌 ${h2Raw}`
        });
      } else if (/^தகுதி/i.test(cleanH2)) {
        blocks.push({
          type: 'h2',
          section: 'eligibility',
          title: h2Raw.includes('✅') ? h2Raw : `✅ ${h2Raw}`
        });
      } else if (/^பயன்கள்/i.test(cleanH2)) {
        blocks.push({
          type: 'h2',
          section: 'benefits',
          title: h2Raw.includes('🎯') ? h2Raw : `🎯 ${h2Raw}`
        });
      } else if (/^தேவையான ஆவணங்கள்/i.test(cleanH2)) {
        blocks.push({
          type: 'h2',
          section: 'docs',
          title: h2Raw.includes('📄') ? h2Raw : `📄 ${h2Raw}`
        });
      } else if (/^குறிப்பு/i.test(cleanH2)) {
        blocks.push({
          type: 'h2',
          section: 'note',
          title: h2Raw.includes('💡') ? h2Raw : `💡 ${h2Raw}`
        });
      } else {
        blocks.push({
          type: 'h2',
          section: 'general',
          title: h2Raw
        });
      }
      continue;
    }

    // H3: Sub-Headings
    if (line.startsWith('H3:')) {
      closeTable();
      blocks.push({ type: 'h3', text: line.substring(3).trim() });
      continue;
    }

    // Backward compatibility for legacy section headings without H2: prefix
    const cleanNoStars = line.replace(/\*\*/g, '').replace(/^\*\s*/, '').trim();
    const cleanWithoutEmoji = cleanNoStars.replace(/^[^\w\s\u0B80-\u0BFF]+/gu, '').trim();

    if (/^குறிப்பு(\s|$|\(|\:)/.test(cleanWithoutEmoji)) {
      closeTable();
      const colonIdx = cleanNoStars.indexOf(':');
      const text = colonIdx !== -1 ? cleanNoStars.substring(colonIdx + 1).trim() : '';
      blocks.push({ type: 'h2', section: 'note', title: '💡 குறிப்பு (Note):' });
      if (text) blocks.push({ type: 'note_content', text });
      continue;
    }

    if (/^தேவையான ஆவணங்கள்/.test(cleanWithoutEmoji)) {
      closeTable();
      blocks.push({ type: 'h2', section: 'docs', title: '📄 தேவையான ஆவணங்கள் (Required Documents):' });
      continue;
    }

    if (/^பயன்கள்(\s|$|\(|\:)/.test(cleanWithoutEmoji)) {
      closeTable();
      const colonIdx = cleanNoStars.indexOf(':');
      const isShort = colonIdx !== -1 && colonIdx < 30;
      const text = isShort ? cleanNoStars.substring(colonIdx + 1).trim() : '';
      blocks.push({ type: 'h2', section: 'benefits', title: '🎯 பயன்கள் (Benefits):' });
      if (text) blocks.push({ type: 'bullet', text });
      continue;
    }

    if (/^தகுதி(\s|$|\(|\:)/.test(cleanWithoutEmoji)) {
      closeTable();
      const colonIdx = cleanNoStars.indexOf(':');
      const isShort = colonIdx !== -1 && colonIdx < 30;
      const text = isShort ? cleanNoStars.substring(colonIdx + 1).trim() : '';
      blocks.push({ type: 'h2', section: 'eligibility', title: '✅ தகுதி (Eligibility):' });
      if (text) blocks.push({ type: 'p', text });
      continue;
    }

    if (/^விளக்கம்(\s|$|\(|\:)/.test(cleanWithoutEmoji)) {
      closeTable();
      const colonIdx = cleanNoStars.indexOf(':');
      const isShort = colonIdx !== -1 && colonIdx < 30;
      const text = isShort ? cleanNoStars.substring(colonIdx + 1).trim() : '';
      blocks.push({ type: 'h2', section: 'desc', title: '📌 விளக்கம் (Description):' });
      if (text) blocks.push({ type: 'p', text });
      continue;
    }

    // Bullet points: - item or * item (excluding markdown bold **)
    if (line.startsWith('- ') || (line.startsWith('* ') && !line.startsWith('**'))) {
      closeTable();
      const bText = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim();
      blocks.push({ type: 'bullet', text: bText });
      continue;
    }

    // Numbered lists: 1. item
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch && !line.startsWith('**')) {
      closeTable();
      blocks.push({
        type: 'numbered',
        num: numMatch[1],
        text: numMatch[2].replace(/\*\*/g, '').trim()
      });
      continue;
    }

    // Paragraph or Note text
    closeTable();
    const cleanP = line.replace(/\*\*/g, '').trim();
    const lastBlock = blocks[blocks.length - 1];

    if (
      lastBlock &&
      (lastBlock.type === 'note_content' ||
        (lastBlock.type === 'h2' && lastBlock.section === 'note'))
    ) {
      blocks.push({ type: 'note_content', text: cleanP });
    } else {
      blocks.push({ type: 'p', text: cleanP });
    }
  }

  closeTable();
  return blocks;
}

/**
 * ChatbotContentRenderer
 * Renders custom Markdown-like service syntax with rich tables,
 * high-contrast typography, and screenshot-aligned section cards.
 */
export default function ChatbotContentRenderer({ content, currentTitle = '', compact = false }) {
  if (!content) return null;

  const blocks = parseCustomMarkdown(content, currentTitle);

  const titleSize = compact ? '0.92rem' : '0.96rem';
  const bodySize = compact ? '0.88rem' : '0.92rem';
  const tableFontSize = compact ? '0.80rem' : '0.84rem';

  if (!blocks || blocks.length === 0) {
    return (
      <div style={{ fontSize: bodySize, color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
        {renderCleanText(content)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
      {blocks.map((block, idx) => {
        // --- 1. H1 MAIN TITLE ---
        if (block.type === 'h1') {
          return (
            <div
              key={idx}
              style={{
                fontSize: '1.05rem',
                fontWeight: '800',
                color: '#0f172a',
                borderBottom: '2.5px solid #10b981',
                paddingBottom: '4px',
                marginTop: '4px',
                marginBottom: '4px'
              }}
            >
              {renderCleanText(block.text)}
            </div>
          );
        }

        // --- 2. H2 SECTION HEADINGS ---
        if (block.type === 'h2') {
          return (
            <div
              key={idx}
              style={{
                fontSize: titleSize,
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.4',
                marginTop: idx === 0 ? '0' : '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {block.title}
            </div>
          );
        }

        // --- 3. H3 SUB-HEADINGS ---
        if (block.type === 'h3') {
          return (
            <div
              key={idx}
              style={{
                fontSize: '0.88rem',
                fontWeight: '700',
                color: '#334155',
                marginTop: '4px'
              }}
            >
              {renderCleanText(block.text)}
            </div>
          );
        }

        // --- 4. HORIZONTAL SEPARATOR ---
        if (block.type === 'hr') {
          return (
            <hr
              key={idx}
              style={{
                border: 'none',
                borderTop: '1px solid #e2e8f0',
                margin: '8px 0'
              }}
            />
          );
        }

        // --- 5. RICH TABLE ---
        if (block.type === 'table') {
          return (
            <div
              key={idx}
              style={{
                margin: '6px 0 10px 0',
                overflowX: 'auto',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                background: '#ffffff'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tableFontSize, textAlign: 'left' }}>
                {block.headers.length > 0 && (
                  <thead>
                    <tr style={{ background: '#ecfdf5', borderBottom: '2px solid #10b981' }}>
                      {block.headers.map((th, thIdx) => (
                        <th
                          key={thIdx}
                          style={{
                            padding: '8px 10px',
                            color: '#065f46',
                            fontWeight: '800',
                            whiteSpace: thIdx === 0 ? 'nowrap' : 'normal',
                            borderRight: thIdx < block.headers.length - 1 ? '1px solid #d1fae5' : 'none'
                          }}
                        >
                          {renderCleanText(th)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: rIdx < block.rows.length - 1 ? '1px solid #e2e8f0' : 'none'
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            padding: '7px 10px',
                            color: cIdx === 0 ? '#0f172a' : cIdx === 1 ? '#1e293b' : '#475569',
                            fontWeight: cIdx === 0 ? '700' : cIdx === 1 ? '600' : '400',
                            borderRight: cIdx < row.length - 1 ? '1px solid #f1f5f9' : 'none',
                            lineHeight: '1.45'
                          }}
                        >
                          {renderCleanText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // --- 6. BULLET LIST ITEMS ---
        if (block.type === 'bullet') {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                paddingLeft: '4px',
                margin: '2px 0'
              }}
            >
              <span style={{ color: '#059669', fontWeight: 'bold', fontSize: bodySize, lineHeight: '1.4' }}>
                -
              </span>
              <span style={{ color: '#334155', fontSize: bodySize, lineHeight: '1.55', flex: 1 }}>
                {renderCleanText(block.text)}
              </span>
            </div>
          );
        }

        // --- 7. NUMBERED LIST ITEMS ---
        if (block.type === 'numbered') {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                paddingLeft: '4px',
                margin: '2px 0'
              }}
            >
              <span
                style={{
                  color: '#0284c7',
                  fontWeight: '800',
                  fontSize: bodySize,
                  minWidth: '18px',
                  lineHeight: '1.4'
                }}
              >
                {block.num}.
              </span>
              <span style={{ color: '#1e293b', fontSize: bodySize, lineHeight: '1.55', flex: 1 }}>
                {renderCleanText(block.text)}
              </span>
            </div>
          );
        }

        // --- 8. NOTE CONTENT (💡 குறிப்பு) ---
        if (block.type === 'note_content') {
          return (
            <div
              key={idx}
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '8px',
                padding: '9px 12px',
                margin: '4px 0 6px 0',
                color: '#78350f',
                fontSize: bodySize,
                lineHeight: '1.55'
              }}
            >
              {renderCleanText(block.text)}
            </div>
          );
        }

        // --- 9. REGULAR PARAGRAPH ---
        if (block.type === 'p') {
          return (
            <p
              key={idx}
              style={{
                margin: '2px 0 4px 0',
                color: '#334155',
                fontSize: bodySize,
                lineHeight: '1.6',
                paddingLeft: '2px'
              }}
            >
              {renderCleanText(block.text)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}
