import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, ArrowLeft, RefreshCw, MessageCircle, ChevronRight, Globe, Maximize2, Minimize2 } from 'lucide-react';

export default function WhatsAppChatbot({ systemSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hiddenByPage, setHiddenByPage] = useState(false);
  const [lang, setLang] = useState('tam'); // Default to Tamil ('tam', 'eng', 'tanglish')
  const containerRef = useRef(null);
  const chatBodyRef = useRef(null);
  const chatEndRef = useRef(null);

  // Full Service Categories Data in Tamil, English, and Tanglish
  const serviceCategories = [
    {
      id: 'esevai',
      titleTam: '📄 இ-சேவை சான்றிதழ்கள்',
      titleEng: '📄 E-Sevai Certificates',
      titleTanglish: '📄 E-Sevai Saandrithazhgal',
      color: '#10b981',
      bg: '#ecfdf5',
      items: [
        {
          id: 'income',
          nameTam: 'வருமானச் சான்றிதழ்',
          nameEng: 'Income Certificate',
          nameTanglish: 'Varumaana Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, வருமானச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required to apply for Income Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Income certificate apply panna enenna veanum?'
        },
        {
          id: 'caste',
          nameTam: 'வகுப்புச் சான்றிதழ் (ஜாதி)',
          nameEng: 'Community / Caste Certificate',
          nameTanglish: 'Vaguppu Saandrithazh (Jathi)',
          waTam: 'வணக்கம் Subi E-Sevai, வகுப்புச் சான்றிதழ் (ஜாதி) விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required to apply for Community / Caste Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Vaguppu Saandrithazh (Jathi) apply panna enenna veanum?'
        },
        {
          id: 'residence',
          nameTam: 'இருப்பிடச் சான்றிதழ்',
          nameEng: 'Residence Certificate',
          nameTanglish: 'Iruppidam Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, இருப்பிடச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required to apply for Residence Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Iruppidam Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'nativity',
          nameTam: 'பிறப்பிடச் சான்றிதழ்',
          nameEng: 'Nativity Certificate',
          nameTanglish: 'Pirappidam Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, பிறப்பிடச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for Nativity Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Pirappidam Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'obc',
          nameTam: 'OBC சான்றிதழ்',
          nameEng: 'OBC Certificate',
          nameTanglish: 'OBC Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, OBC சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for OBC Certificate?',
          waTanglish: 'Hi Subi E-Sevai, OBC Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'pstm',
          nameTam: 'PSTM (தமிழ் வழி கல்வி) சான்றிதழ்',
          nameEng: 'PSTM (Tamil Medium) Certificate',
          nameTanglish: 'PSTM (Tamil Vazhi Kalvi) Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, PSTM (தமிழ் வழி கல்வி) சான்றிதழ் பெற என்னென்ன விவரங்கள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for PSTM Certificate?',
          waTanglish: 'Hi Subi E-Sevai, PSTM Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'unemployed',
          nameTam: 'வேலைஇன்மைச் சான்றிதழ்',
          nameEng: 'Unemployment Certificate',
          nameTanglish: 'Velai Inmai Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, வேலைஇன்மைச் சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Unemployment Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Velai Inmai Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'legalheir',
          nameTam: 'வாரிசு சான்றிதழ்',
          nameEng: 'Legal Heir Certificate',
          nameTanglish: 'Vaarisu Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, வாரிசு சான்றிதழ் விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Legal Heir Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Vaarisu Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'farmer',
          nameTam: 'சிறு / குறு விவசாயி சான்றிதழ்',
          nameEng: 'Small / Marginal Farmer Certificate',
          nameTanglish: 'Siru / Kuru Vivasayi Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, சிறு / குறு விவசாயி சான்றிதழ் பெற என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Small / Marginal Farmer Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Siru / Kuru Vivasayi Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'firstgrad',
          nameTam: 'முதல் பட்டதாரி சான்றிதழ்',
          nameEng: 'First Graduate Certificate',
          nameTanglish: 'Muthal Pattadhari Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, முதல் பட்டதாரி சான்றிதழ் பெற என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for First Graduate Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Muthal Pattadhari Saandrithazh apply panna enenna veanum?'
        },
        {
          id: 'unmarried',
          nameTam: 'திருமணமாகாதவர் சான்றிதழ்',
          nameEng: 'Unmarried Certificate',
          nameTanglish: 'Thirumanamagathavar Saandrithazh',
          waTam: 'வணக்கம் Subi E-Sevai, திருமணமாகாதவர் சான்றிதழ் பெற என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Unmarried Certificate?',
          waTanglish: 'Hi Subi E-Sevai, Thirumanamagathavar Saandrithazh apply panna enenna veanum?'
        }
      ]
    },
    {
      id: 'voter',
      titleTam: '🗳️ வாக்காளர் அட்டை சேவைகள்',
      titleEng: '🗳️ Voter ID Services',
      titleTanglish: '🗳️ Vaakalar Card Sevaigal',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      items: [
        {
          id: 'voter_new',
          nameTam: 'புதிய வாக்காளர் அட்டை விண்ணப்பம்',
          nameEng: 'New Voter ID Application',
          nameTanglish: 'Pudiya Vaakalar Card Vinnappam',
          waTam: 'வணக்கம் Subi E-Sevai, புதிய வாக்காளர் அட்டை விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed to apply for New Voter ID?',
          waTanglish: 'Hi Subi E-Sevai, Pudiya Vaakalar Card apply panna enenna veanum?'
        },
        {
          id: 'voter_corr',
          nameTam: 'வாக்காளர் அட்டை திருத்தம்',
          nameEng: 'Voter ID Correction',
          nameTanglish: 'Vaakalar Card Thirutham',
          waTam: 'வணக்கம் Subi E-Sevai, வாக்காளர் அட்டை திருத்தம் செய்ய என்னென்ன விவரங்கள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What details are needed for Voter ID correction?',
          waTanglish: 'Hi Subi E-Sevai, Vaakalar Card Thirutham panna enenna veanum?'
        },
        {
          id: 'voter_dl',
          nameTam: 'வாக்காளர் அட்டை பதிவிறக்கம்',
          nameEng: 'Voter ID Download',
          nameTanglish: 'Vaakalar Card Download',
          waTam: 'வணக்கம் Subi E-Sevai, வாக்காளர் அட்டை பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading my Voter ID.',
          waTanglish: 'Hi Subi E-Sevai, Vaakalar Card download panna udhavi veanum.'
        },
        {
          id: 'voter_sir',
          nameTam: 'SIR பட்டியல் சரிபார்ப்பு',
          nameEng: 'SIR List Verification',
          nameTanglish: 'SIR Pattiyal Saripaarthal',
          waTam: 'வணக்கம் Subi E-Sevai, SIR பட்டியல் சரிபார்ப்பு செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help checking the SIR list.',
          waTanglish: 'Hi Subi E-Sevai, SIR Pattiyal Saripaarthal panna details veanum.'
        },
        {
          id: 'voter_id_dl',
          nameTam: 'வாக்காளர் ID பதிவிறக்கம்',
          nameEng: 'Voter ID Download (EPIC)',
          nameTanglish: 'Vaakalar ID Download',
          waTam: 'வணக்கம் Subi E-Sevai, வாக்காளர் ID (EPIC) பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading Voter ID.',
          waTanglish: 'Hi Subi E-Sevai, Vaakalar ID download panna udhavi veanum.'
        }
      ]
    },
    {
      id: 'pan',
      titleTam: '💳 PAN Card சேவைகள்',
      titleEng: '💳 PAN Card Services',
      titleTanglish: '💳 PAN Card Sevaigal',
      color: '#3b82f6',
      bg: '#eff6ff',
      items: [
        {
          id: 'pan_new',
          nameTam: 'புதிய PAN Card விண்ணப்பம்',
          nameEng: 'New PAN Card Application',
          nameTanglish: 'Pudiya PAN Card Vinnappam',
          waTam: 'வணக்கம் Subi E-Sevai, புதிய PAN Card விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for New PAN Card?',
          waTanglish: 'Hi Subi E-Sevai, Pudiya PAN Card apply panna enenna veanum?'
        },
        {
          id: 'pan_corr',
          nameTam: 'PAN Card திருத்தம்',
          nameEng: 'PAN Card Correction',
          nameTanglish: 'PAN Card Thirutham',
          waTam: 'வணக்கம் Subi E-Sevai, PAN Card திருத்தம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for PAN Card Correction?',
          waTanglish: 'Hi Subi E-Sevai, PAN Card Thirutham panna enenna documents veanum?'
        }
      ]
    },
    {
      id: 'ration',
      titleTam: '📄 ரேஷன் கார்டு சேவைகள்',
      titleEng: '📄 Ration Card Services',
      titleTanglish: '📄 Ration Card Sevaigal',
      color: '#f59e0b',
      bg: '#fffbeb',
      items: [
        {
          id: 'ration_new',
          nameTam: 'புதிய குடும்ப அட்டை விண்ணப்பம்',
          nameEng: 'New Ration Card Application',
          nameTanglish: 'Pudiya Kudumba Card Vinnappam',
          waTam: 'வணக்கம் Subi E-Sevai, புதிய குடும்ப அட்டை விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for New Smart Ration Card?',
          waTanglish: 'Hi Subi E-Sevai, Pudiya Kudumba Card apply panna enenna veanum?'
        },
        {
          id: 'ration_addr',
          nameTam: 'முகவரி திருத்தம்',
          nameEng: 'Address Change in Ration Card',
          nameTanglish: 'Mugavari Thirutham',
          waTam: 'வணக்கம் Subi E-Sevai, ரேஷன் கார்டில் முகவரி திருத்தம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed to change Ration Card address?',
          waTanglish: 'Hi Subi E-Sevai, Ration Card Mugavari Thirutham panna enenna veanum?'
        },
        {
          id: 'ration_add_mem',
          nameTam: 'குடும்ப உறுப்பினர் பெயர் சேர்த்தல்',
          nameEng: 'Add Family Member Name',
          nameTanglish: 'Kudumba Uruppinar Peyar Serthal',
          waTam: 'வணக்கம் Subi E-Sevai, ரேஷன் கார்டில் குடும்ப உறுப்பினர் பெயர் சேர்க்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed to add family member to Ration Card?',
          waTanglish: 'Hi Subi E-Sevai, Ration Card-il Kudumba Uruppinar Peyar Serthal panna enenna veanum?'
        },
        {
          id: 'ration_rem_mem',
          nameTam: 'குடும்ப உறுப்பினர் பெயர் நீக்குதல்',
          nameEng: 'Remove Family Member Name',
          nameTanglish: 'Kudumba Uruppinar Peyar Neekkuthal',
          waTam: 'வணக்கம் Subi E-Sevai, ரேஷன் கார்டில் பெயர் நீக்குதல் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed to remove name from Ration Card?',
          waTanglish: 'Hi Subi E-Sevai, Ration Card-il Kudumba Uruppinar Peyar Neekkuthal panna enenna veanum?'
        },
        {
          id: 'ration_mobile',
          nameTam: 'மொபைல் எண் மாற்றம்',
          nameEng: 'Mobile Number Update',
          nameTanglish: 'Mobile Number Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, ரேஷன் கார்டில் மொபைல் எண் மாற்றம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help updating mobile number in Ration Card.',
          waTanglish: 'Hi Subi E-Sevai, Ration Card Mobile Number Maatram panna enenna veanum?'
        },
        {
          id: 'ration_dl',
          nameTam: 'ரேஷன் கார்டு பதிவிறக்கம்',
          nameEng: 'Ration Card Download',
          nameTanglish: 'Ration Card Download',
          waTam: 'வணக்கம் Subi E-Sevai, ரேஷன் கார்டு பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading my Smart Ration Card.',
          waTanglish: 'Hi Subi E-Sevai, Smart Ration Card download panna udhavi veanum.'
        }
      ]
    },
    {
      id: 'download',
      titleTam: '📥 சான்றிதழ் பதிவிறக்க சேவைகள்',
      titleEng: '📥 Certificate Download Services',
      titleTanglish: '📥 Saandrithazh Download Sevaigal',
      color: '#14b8a6',
      bg: '#f0fdfa',
      items: [
        {
          id: 'dl_esevai',
          nameTam: 'இ-சேவை சான்றிதழ் பதிவிறக்கம்',
          nameEng: 'E-Sevai Certificate Download',
          nameTanglish: 'E-Sevai Saandrithazh Download',
          waTam: 'வணக்கம் Subi E-Sevai, இ-சேவை சான்றிதழ் பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading E-Sevai Certificate.',
          waTanglish: 'Hi Subi E-Sevai, E-Sevai Saandrithazh download panna udhavi veanum.'
        },
        {
          id: 'dl_birth',
          nameTam: 'பிறப்புச் சான்றிதழ் பதிவிறக்கம்',
          nameEng: 'Birth Certificate Download',
          nameTanglish: 'Pirappu Saandrithazh Download',
          waTam: 'வணக்கம் Subi E-Sevai, பிறப்புச் சான்றிதழ் பதிவிறக்கம் செய்ய என்னென்ன விவரங்கள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What details are needed for Birth Certificate download?',
          waTanglish: 'Hi Subi E-Sevai, Pirappu Saandrithazh download panna enenna details veanum?'
        },
        {
          id: 'dl_death',
          nameTam: 'இறப்புச் சான்றிதழ் பதிவிறக்கம்',
          nameEng: 'Death Certificate Download',
          nameTanglish: 'Irappu Saandrithazh Download',
          waTam: 'வணக்கம் Subi E-Sevai, இறப்புச் சான்றிதழ் பதிவிறக்கம் செய்ய என்னென்ன விவரங்கள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What details are needed for Death Certificate download?',
          waTanglish: 'Hi Subi E-Sevai, Irappu Saandrithazh download panna enenna details veanum?'
        }
      ]
    },
    {
      id: 'aadhaar',
      titleTam: '🪪 ஆதார் கார்டு சேவைகள்',
      titleEng: '🪪 Aadhaar Card Services',
      titleTanglish: '🪪 Aadhaar Card Sevaigal',
      color: '#06b6d4',
      bg: '#ecfeff',
      items: [
        {
          id: 'aadhaar_name',
          nameTam: 'ஆதார் பெயர் மாற்றம்',
          nameEng: 'Aadhaar Name Correction',
          nameTanglish: 'Aadhaar Peyar Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, ஆதார் கார்டில் பெயர் மாற்றம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Aadhaar name correction?',
          waTanglish: 'Hi Subi E-Sevai, Aadhaar Card-il Peyar Maatram panna enenna veanum?'
        },
        {
          id: 'aadhaar_addr',
          nameTam: 'ஆதார் முகவரி மாற்றம்',
          nameEng: 'Aadhaar Address Change',
          nameTanglish: 'Aadhaar Mugavari Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, ஆதார் கார்டில் முகவரி மாற்றம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Aadhaar address change?',
          waTanglish: 'Hi Subi E-Sevai, Aadhaar Card-il Mugavari Maatram panna enenna veanum?'
        },
        {
          id: 'aadhaar_dob',
          nameTam: 'ஆதார் பிறந்த தேதி மாற்றம்',
          nameEng: 'Aadhaar Date of Birth Change',
          nameTanglish: 'Aadhaar Pirandha Thedhi Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, ஆதார் கார்டில் பிறந்த தேதி மாற்றம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for Aadhaar DOB change?',
          waTanglish: 'Hi Subi E-Sevai, Aadhaar Card-il Pirandha Thedhi Maatram panna enenna veanum?'
        },
        {
          id: 'aadhaar_mobile',
          nameTam: 'ஆதார் மொபைல் எண் மாற்றம்',
          nameEng: 'Aadhaar Mobile Number Update',
          nameTanglish: 'Aadhaar Mobile Number Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, ஆதார் கார்டில் மொபைல் எண் இணைப்பு/மாற்றம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help updating mobile number in Aadhaar.',
          waTanglish: 'Hi Subi E-Sevai, Aadhaar Mobile Number Maatram panna enenna veanum?'
        },
        {
          id: 'aadhaar_dl',
          nameTam: 'ஆதார் அட்டை பதிவிறக்கம்',
          nameEng: 'Aadhaar Card Download',
          nameTanglish: 'Aadhaar Card Download',
          waTam: 'வணக்கம் Subi E-Sevai, ஆதார் கார்டு பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading my Aadhaar Card.',
          waTanglish: 'Hi Subi E-Sevai, Aadhaar Card download panna udhavi veanum.'
        }
      ]
    },
    {
      id: 'eb',
      titleTam: '⚡ EB Bill & மின்சார சேவைகள்',
      titleEng: '⚡ EB Bill & Electricity Services',
      titleTanglish: '⚡ EB Bill & Electricity Sevaigal',
      color: '#eab308',
      bg: '#fefce8',
      items: [
        {
          id: 'eb_pay',
          nameTam: 'மின்சாரக் கட்டணம் செலுத்துதல் (EB Bill Payment)',
          nameEng: 'TNEB Electricity Bill Payment',
          nameTanglish: 'EB Bill Payment',
          waTam: 'வணக்கம் Subi E-Sevai, மின்சாரக் கட்டணம் (EB Bill) ஆன்லைனில் செலுத்த உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help paying TNEB Electricity Bill online.',
          waTanglish: 'Hi Subi E-Sevai, EB Bill online-la pay panna udhavi veanum.'
        },
        {
          id: 'eb_new',
          nameTam: 'புதிய மின் இணைப்பு விண்ணப்பம்',
          nameEng: 'New Electricity Connection Application',
          nameTanglish: 'Pudiya EB Connection Vinnappam',
          waTam: 'வணக்கம் Subi E-Sevai, புதிய மின் இணைப்பு (New EB Connection) விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for New EB Electricity Connection?',
          waTanglish: 'Hi Subi E-Sevai, New EB connection apply panna enenna veanum?'
        },
        {
          id: 'eb_transfer',
          nameTam: 'மின் இணைப்பு பெயர் மாற்றம்',
          nameEng: 'EB Connection Name Transfer',
          nameTanglish: 'EB Connection Peyar Maatram',
          waTam: 'வணக்கம் Subi E-Sevai, மின் இணைப்பு பெயர் மாற்றம் (EB Name Transfer) செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for EB Connection Name Transfer?',
          waTanglish: 'Hi Subi E-Sevai, EB connection peyar maatram panna enenna veanum?'
        },
        {
          id: 'eb_mobile',
          nameTam: 'மின்சார கணக்கு மொபைல் எண் இணைப்பு',
          nameEng: 'EB Service Number Mobile Linking',
          nameTanglish: 'EB Account Mobile Number Link',
          waTam: 'வணக்கம் Subi E-Sevai, மின்சாரக் கணக்கில் மொபைல் எண் இணைக்க உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help linking mobile number to EB Service Number.',
          waTanglish: 'Hi Subi E-Sevai, EB service-la mobile number link panna udhavi veanum.'
        }
      ]
    },
    {
      id: 'eshram',
      titleTam: '👷 e-Shram Card சேவைகள்',
      titleEng: '👷 e-Shram Card Services',
      titleTanglish: '👷 e-Shram Card Sevaigal',
      color: '#ec4899',
      bg: '#fdf2f8',
      items: [
        {
          id: 'eshram_new',
          nameTam: 'e-Shram Card புதிய விண்ணப்பம்',
          nameEng: 'e-Shram Card New Application',
          nameTanglish: 'e-Shram Card Pudiya Vinnappam',
          waTam: 'வணக்கம் Subi E-Sevai, புதிய e-Shram Card விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for New e-Shram Card?',
          waTanglish: 'Hi Subi E-Sevai, Pudiya e-Shram Card apply panna enenna veanum?'
        },
        {
          id: 'eshram_corr',
          nameTam: 'e-Shram Card திருத்தம்',
          nameEng: 'e-Shram Card Correction',
          nameTanglish: 'e-Shram Card Thirutham',
          waTam: 'வணக்கம் Subi E-Sevai, e-Shram Card-இல் திருத்தம் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are needed for e-Shram Card correction?',
          waTanglish: 'Hi Subi E-Sevai, e-Shram Card Thirutham panna enenna veanum?'
        },
        {
          id: 'eshram_dl',
          nameTam: 'e-Shram Card பதிவிறக்கம்',
          nameEng: 'e-Shram Card Download',
          nameTanglish: 'e-Shram Card Download',
          waTam: 'வணக்கம் Subi E-Sevai, e-Shram Card பதிவிறக்கம் செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help downloading my e-Shram Card.',
          waTanglish: 'Hi Subi E-Sevai, e-Shram Card download panna udhavi veanum.'
        }
      ]
    },
    {
      id: 'others',
      titleTam: '🌐 மற்ற ஆன்லைன் சேவைகள் (Other Services)',
      titleEng: '🌐 Other Online Services',
      titleTanglish: '🌐 Matra Online Sevaigal (Other Services)',
      color: '#6366f1',
      bg: '#eef2ff',
      items: [
        {
          id: 'pf_withdrawal',
          nameTam: 'PF பணம் எடுத்தல் (PF Claim & Withdrawal)',
          nameEng: 'EPFO PF Claim & Withdrawal Services',
          nameTanglish: 'PF Claim & Withdrawal Services',
          waTam: 'வணக்கம் Subi E-Sevai, PF பணம் (PF Claim / Withdrawal) பெற உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help claiming / withdrawing EPFO PF online.',
          waTanglish: 'Hi Subi E-Sevai, PF Claim / Withdrawal panna udhavi veanum.'
        },
        {
          id: 'passport',
          nameTam: 'பாஸ்போர்ட் விண்ணப்பம் (Passport New / Renewal)',
          nameEng: 'Passport Application & Renewal',
          nameTanglish: 'Passport Application & Renewal',
          waTam: 'வணக்கம் Subi E-Sevai, பாஸ்போர்ட் புதிய விண்ணப்பம் / புதுப்பித்தல் செய்ய என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for Passport Application / Renewal?',
          waTanglish: 'Hi Subi E-Sevai, Passport new / renewal apply panna enenna veanum?'
        },
        {
          id: 'dl_services',
          nameTam: 'ஓட்டுநர் உரிமம் (LLR & Driving License)',
          nameEng: 'Driving License (LLR & DL Services)',
          nameTanglish: 'Driving License (LLR & DL Services)',
          waTam: 'வணக்கம் Subi E-Sevai, ஓட்டுநர் உரிமம் (LLR / DL) விண்ணப்பிக்க என்னென்ன சான்றுகள் வேண்டும்?',
          waEng: 'Hi Subi E-Sevai, What documents are required for LLR & Driving License services?',
          waTanglish: 'Hi Subi E-Sevai, LLR & Driving License apply panna enenna veanum?'
        },
        {
          id: 'police_verif',
          nameTam: 'காவல்துறை சரிபார்ப்பு சான்றிதழ் (Police Verification)',
          nameEng: 'Police Verification Certificate (PCC)',
          nameTanglish: 'Police Verification Certificate (PCC)',
          waTam: 'வணக்கம் Subi E-Sevai, காவல்துறை சரிபார்ப்பு சான்றிதழ் (Police Verification) பெற உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help applying for Police Verification Certificate (PCC).',
          waTanglish: 'Hi Subi E-Sevai, Police Verification Certificate edukka udhavi veanum.'
        },
        {
          id: 'tickets',
          nameTam: 'பேருந்து & ரயில் டிக்கெட் முன்பதிவு',
          nameEng: 'Bus & Train Ticket Booking',
          nameTanglish: 'Bus & Train Ticket Booking',
          waTam: 'வணக்கம் Subi E-Sevai, பேருந்து / ரயில் டிக்கெட் முன்பதிவு செய்ய உதவி வேண்டும்.',
          waEng: 'Hi Subi E-Sevai, I need help booking Bus / Train tickets.',
          waTanglish: 'Hi Subi E-Sevai, Bus / Train ticket booking panna udhavi veanum.'
        }
      ]
    }
  ];

  // Helper to format Category Title according to language
  const getCategoryTitle = (cat) => {
    if (lang === 'tam') return cat.titleTam;
    if (lang === 'eng') return cat.titleEng;
    return cat.titleTanglish;
  };

  // Helper to format Sub Item Name according to language
  const getItemName = (item) => {
    if (lang === 'tam') return item.nameTam;
    if (lang === 'eng') return item.nameEng;
    return item.nameTanglish;
  };

  // Helper to get WhatsApp prefilled text according to language
  const getItemWaText = (item) => {
    if (lang === 'tam') return item.waTam;
    if (lang === 'eng') return item.waEng;
    return item.waTanglish;
  };

  const initialMessages = [
    {
      id: 1,
      sender: 'bot',
      text: '👋 **வணக்கம்! சுபி இ-சேவை 24/7 WhatsApp உதவி மையம்.**\n\nதயவுசெய்து உங்களுக்குத் தேவையான சேவையைத் தேர்ந்தெடுக்கவும்:',
      type: 'main_menu',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    const handleHideEvent = (e) => {
      setHiddenByPage(!!e.detail);
    };
    window.addEventListener('hide-whatsapp-chatbot', handleHideEvent);
    return () => window.removeEventListener('hide-whatsapp-chatbot', handleHideEvent);
  }, []);

  // Auto-close chatbot popup when user clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Smart scroll: when chatbot opens or main menu is displayed, scroll to top so top categories show first
  useEffect(() => {
    if (isOpen) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.type === 'main_menu') {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = 0;
        }
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isOpen]);

  if (hiddenByPage) return null;

  // Helper to ensure phone number always has proper country code (e.g. 91 for India)
  const formatWhatsAppNumber = (num) => {
    let clean = String(num || '').replace(/\D/g, '');
    if (!clean) return '919787973615';
    if (clean.length === 11 && clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    if (clean.length === 10) {
      return `91${clean}`;
    }
    return clean;
  };

  // Extract phone number from settings or default to official support number
  const rawNumber = systemSettings?.admin_whatsapp_number || '919787973615';
  const cleanNumber = formatWhatsAppNumber(rawNumber);

  const sendToWhatsApp = (messageText) => {
    if (!messageText || !messageText.trim()) return;
    const encoded = encodeURIComponent(messageText.trim());
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCategoryClick = (category) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const selectedTitle = getCategoryTitle(category);

    // User chat bubble
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: selectedTitle,
      timestamp: nowTime
    };

    // Bot chat bubble showing single-line sub items
    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: `📄 **${selectedTitle}**\n\nகீழே உள்ள பட்டியலில் தேவையான சேவையைக் கிளிக் செய்யவும்:`,
      type: 'sub_menu',
      categoryId: category.id,
      subItems: category.items,
      timestamp: nowTime
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleSubItemClick = (subItem) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const itemName = getItemName(subItem);
    const waText = getItemWaText(subItem);

    // DIRECTLY launch WhatsApp on user click! No permission / secondary step required!
    sendToWhatsApp(waText);

    // User chat bubble
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: itemName,
      timestamp: nowTime
    };

    // Bot response confirming WhatsApp chat launched
    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: `💬 **WhatsApp Chat திறக்கப்பட்டது:** "${itemName}"\n\nDirect-ஆ WhatsApp Message அனுப்பப்பட்டது. வேறு சேவைக்கு கீழே உள்ள **Main Menu** கிளிக் செய்யவும்.`,
      type: 'whatsapp_link',
      waText: waText,
      timestamp: nowTime
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleBackToMainMenu = () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: '🔙 Main Menu',
      timestamp: nowTime
    };

    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: 'உங்களுக்கு என்ன சேவை வேண்டும்? கீழே உள்ள வகையைத் தேர்ந்தெடுக்கவும்:',
      type: 'main_menu',
      timestamp: nowTime
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userQuery = customText.trim();
    setCustomText('');

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userQuery,
      timestamp: nowTime
    };

    const defaultWaText = `Hi Subi E-Sevai, ${userQuery} - apply panna enenna details veanum?`;

    // Open WhatsApp directly for custom query
    sendToWhatsApp(defaultWaText);

    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: `உங்கள் கேள்வி: "${userQuery}"\n\nDirect-ஆ WhatsApp Message அனுப்பப்பட்டது.`,
      type: 'whatsapp_link',
      waText: defaultWaText,
      timestamp: nowTime
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const resetChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: '👋 **வணக்கம்! சுபி இ-சேவை 24/7 WhatsApp உதவி மையம்.**\n\nதயவுசெய்து உங்களுக்குத் தேவையான சேவையைத் தேர்ந்தெடுக்கவும்:',
        type: 'main_menu',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div
      ref={containerRef}
      style={isFullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      } : {
        position: 'fixed',
        bottom: '85px',
        right: '18px',
        zIndex: 9998,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      
      {/* 1. FLOATING CHAT TRIGGER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '30px',
            padding: '10px 16px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '0.85rem',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 211, 102, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.4)';
          }}
        >
          {/* Online Indicator Dot */}
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            backgroundColor: '#22c55e',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            boxShadow: '0 0 8px #22c55e'
          }} />

          {/* WhatsApp SVG Icon */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.188-1.36a9.924 9.924 0 0 0 4.822 1.254h.005c5.507 0 9.99-4.478 9.99-9.984 0-2.67-1.037-5.18-2.92-7.062C17.195 3.03 14.686 2 12.012 2zm0 1.664c2.227 0 4.321.868 5.898 2.445 1.577 1.578 2.446 3.673 2.446 5.89a8.31 8.31 0 0 1-8.344 8.32h-.004a8.272 8.272 0 0 1-4.218-1.155l-.303-.18-3.138.823.837-3.06-.197-.314a8.278 8.278 0 0 1-1.267-4.32c0-4.587 3.737-8.32 8.34-8.32h.05zm-3.666 4.757c-.202 0-.398.077-.547.228-.27.272-.733.722-.733 1.761 0 1.04.753 2.04.858 2.18.106.14 1.482 2.264 3.59 3.175.502.217.893.347 1.198.444.505.161.965.138 1.328.084.406-.06 1.24-.507 1.414-.997.174-.49.174-.91.122-.997-.052-.088-.192-.14-.403-.245s-1.24-.613-1.432-.683c-.193-.07-.333-.105-.473.105-.14.21-.543.684-.666.824-.122.14-.245.158-.456.053-.21-.105-.888-.327-1.692-1.045-.625-.558-1.047-1.247-1.17-1.458-.122-.21-.013-.324.092-.43.095-.095.21-.245.315-.368.105-.123.14-.21.21-.35.07-.14.035-.263-.017-.369-.053-.105-.473-1.14-.648-1.562-.17-.41-.356-.35-.49-.356h-.233z" />
          </svg>
          
          <span>24/7 WhatsApp Chatbot</span>
        </button>
      )}

      {/* 2. CHATBOT POPUP WINDOW */}
      {isOpen && (
        <div style={isFullScreen ? {
          width: '100vw',
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          backgroundColor: '#efeae2', // Official WhatsApp Wallpaper beige
          borderRadius: '0px',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: 'none',
          animation: 'chatSlideUp 0.25s ease-out forwards'
        } : {
          width: '360px',
          maxWidth: 'calc(100vw - 28px)',
          height: '540px',
          maxHeight: 'calc(100vh - 100px)',
          backgroundColor: '#efeae2', // Official WhatsApp Wallpaper beige
          borderRadius: '18px',
          boxShadow: '0 20px 35px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          animation: 'chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <style>{`
            @keyframes chatSlideUp {
              0% { opacity: 0; transform: translateY(20px) scale(0.95); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* HEADER */}
          <div style={{
            backgroundColor: '#075e54',
            color: '#ffffff',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #054c44'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src="/whatsbro_avatar.png"
                  alt="Assistant Avatar"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px', border: '1px solid #25d366' }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '9px',
                  height: '9px',
                  backgroundColor: '#22c55e',
                  border: '1.5px solid #075e54',
                  borderRadius: '50%'
                }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#ffffff' }}>
                  24/7 WhatsApp Chatbot
                </h4>
                <div style={{ fontSize: '0.65rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>● Online 24/7</span> • <span>Tamil & English</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* FullScreen Toggle Button */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <button
                onClick={resetChat}
                title="Restart Chat"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <RefreshCw size={14} />
              </button>

              <button
                onClick={() => {
                  setIsFullScreen(false);
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* LANGUAGE SELECTOR BAR */}
          <div style={{
            backgroundColor: '#054c44',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderBottom: '1px solid #033630'
          }}>
            <span style={{ color: '#99f6e4', fontSize: '0.68rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Globe size={12} /> Language:
            </span>
            <button
              onClick={() => setLang('tam')}
              style={{
                background: lang === 'tam' ? '#25d366' : 'rgba(255,255,255,0.12)',
                color: lang === 'tam' ? '#ffffff' : '#cbd5e1',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              தமிழ் (Tam)
            </button>
            <button
              onClick={() => setLang('tanglish')}
              style={{
                background: lang === 'tanglish' ? '#25d366' : 'rgba(255,255,255,0.12)',
                color: lang === 'tanglish' ? '#ffffff' : '#cbd5e1',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Tanglish
            </button>
            <button
              onClick={() => setLang('eng')}
              style={{
                background: lang === 'eng' ? '#25d366' : 'rgba(255,255,255,0.12)',
                color: lang === 'eng' ? '#ffffff' : '#cbd5e1',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              English (Eng)
            </button>
          </div>

          {/* CHAT BODY AREA */}
          <div
            ref={chatBodyRef}
            style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Timestamp Badge */}
            <div style={{ textAlign: 'center', margin: '2px 0' }}>
              <span style={{ background: 'rgba(255,255,255,0.85)', color: '#64748b', fontSize: '0.62rem', padding: '3px 9px', borderRadius: '10px', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Today • Subi E-Sevai 24 h chatservice
              </span>
            </div>

            {/* MESSAGES LIST */}
            {messages.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isBot ? 'flex-start' : 'flex-end',
                    maxWidth: '88%',
                  }}
                >
                  {/* MESSAGE BUBBLE */}
                  <div
                    style={{
                      backgroundColor: isBot ? '#ffffff' : '#dcf8c6',
                      borderRadius: isBot ? '0px 14px 14px 14px' : '14px 0px 14px 14px',
                      padding: '10px 12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      position: 'relative'
                    }}
                  >
                    {isBot && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Bot size={15} style={{ color: '#075e54' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#075e54' }}>Subi E-Sevai Bot</span>
                      </div>
                    )}

                    {/* TEXT CONTENT */}
                    <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: '1.45', whitespace: 'pre-line' }}>
                      {msg.text.split('\n').map((line, i) => (
                        <p key={i} style={{ margin: '0 0 4px 0' }}>
                          {line.startsWith('**') || line.includes('**') ? (
                            <span dangerouslySetInnerHTML={{
                              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>

                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* INTERACTIVE CONTROLS BASED ON MESSAGE TYPE */}
                  
                  {/* TYPE 1: MAIN MENU CATEGORIES */}
                  {isBot && msg.type === 'main_menu' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {serviceCategories.map((cat) => {
                        const catTitle = getCategoryTitle(cat);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat)}
                            style={{
                              background: '#ffffff',
                              border: `1.5px solid ${cat.color}`,
                              borderRadius: '10px',
                              padding: '9px 12px',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                              color: '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.2s ease',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = cat.bg;
                              e.currentTarget.style.transform = 'translateX(3px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: cat.color,
                              fontWeight: '800'
                            }}>
                              {catTitle}
                            </span>
                            <ChevronRight size={15} style={{ color: cat.color, flexShrink: 0, marginLeft: '6px' }} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TYPE 2: SUB MENU ITEMS */}
                  {isBot && msg.type === 'sub_menu' && msg.subItems && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                      {msg.subItems.map((item) => {
                        const itemName = getItemName(item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSubItemClick(item)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #10b981',
                              borderRadius: '9px',
                              padding: '8px 11px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              color: '#065f46',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.2s',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ecfdf5';
                              e.currentTarget.style.transform = 'translateX(3px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              👉 {itemName}
                            </span>
                            <ChevronRight size={14} style={{ color: '#10b981', flexShrink: 0, marginLeft: '4px' }} />
                          </button>
                        );
                      })}

                      {/* BACK TO MAIN MENU BUTTON */}
                      <button
                        onClick={handleBackToMainMenu}
                        style={{
                          background: '#f1f5f9',
                          border: '1px dashed #94a3b8',
                          borderRadius: '9px',
                          padding: '7px 11px',
                          fontSize: '0.73rem',
                          fontWeight: '700',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          marginTop: '4px',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      >
                        <ArrowLeft size={14} />
                        <span>⬅️ Main Menu</span>
                      </button>
                    </div>
                  )}

                  {/* TYPE 3: WHATSAPP DIRECT ACTION BUTTON */}
                  {isBot && msg.type === 'whatsapp_link' && msg.waText && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => sendToWhatsApp(msg.waText)}
                        style={{
                          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.45)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.35)';
                        }}
                      >
                        <MessageCircle size={17} />
                        <span>💬 WhatsApp Chat</span>
                      </button>

                      {/* BACK TO MAIN MENU BUTTON */}
                      <button
                        onClick={handleBackToMainMenu}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <ArrowLeft size={13} />
                        <span>Other Services / Categories</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

            <div ref={chatEndRef} />
          </div>

          {/* INPUT FORM FOOTER */}
          <form
            onSubmit={handleCustomSend}
            style={{
              padding: '9px 12px',
              backgroundColor: '#f0f2f5',
              borderTop: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Type message (தமிழ் / Eng)..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              style={{
                backgroundColor: customText.trim() ? '#128C7E' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: customText.trim() ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
