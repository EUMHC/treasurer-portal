interface ParsedDescription {
  name: string;
  reference: string;
  type: string;
}

interface Transaction {
  description: string;
  type: string;
}

const cleanString = (s: string): string => {
  return s.split(/\s+/).filter(Boolean).join(' ');
};

const parseDirectDebit = (description: string): ParsedDescription => {
  if (description.startsWith('PLYRDATA')) {
    return {
      name: 'PLYRDATA',
      reference: description.replace('PLYRDATA', '').trim(),
      type: 'DD'
    };
  } else if (description.startsWith('IONOS CLOUD LTD.') || description.startsWith('1&1 INTERNET LTD.')) {
    const parts = description.split(' ');
    const name = parts.slice(0, 3).join(' ');
    const reference = parts.slice(3).join(' ');
    return { name, reference, type: 'DD' };
  }
  return { name: description, reference: '', type: 'DD' };
};

const parseBankPayment = (description: string): ParsedDescription => {
  if (description.startsWith('EDIN UNIVERSITY SU')) {
    const parts = description.split(' ');
    const name = 'EDIN UNIVERSITY SU';
    const reference = parts.slice(3).join(' ');
    return { name, reference, type: 'BP' };
  } else if (description.includes('EDIN UNIVERSITY EUSU MSL INCOME')) {
    return {
      name: 'EDIN UNIVERSITY EUSU',
      reference: 'MSL INCOME',
      type: 'BP'
    };
  }
  return { name: description, reference: '', type: 'BP' };
};

const parseFasterPayment = (description: string, type: string): ParsedDescription => {
  // Handle EDINBURGH UNIVERSI special case first
  if (description.startsWith('EDINBURGH UNIVERSI')) {
    // Find the first number sequence (either 15 digits or 6 digits)
    const numberMatch = description.match(/\d{15}|\d{6}/);
    const reference = numberMatch 
      ? description
          .substring(17, numberMatch.index)
          .trim()
      : description.substring(17).trim();
    
    return {
      name: 'EUWHC',
      reference,
      type
    };
  }

  // Handle XMAS MEALS / CHRISTMASMEALS cases
  if (description.includes('XMAS MEALS') || description.includes('CHRISTMASMEALS')) {
    const pattern = /^(.*?)(?:XMAS MEALS|CHRISTMASMEALS\w*)\s*(?:\d{15}|\w{16,}|\d{6}).*$/;
    const match = description.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      let mealRef = '';
      if (description.includes('M1')) {
        mealRef = 'M1';
      } else if (description.includes('M6S')) {
        mealRef = 'M6S';
      } else if (description.includes('7S')) {
        mealRef = '7S';
      } else if (description.includes('4S')) {
        mealRef = '4S';
      }
      return {
        name,
        reference: mealRef ? `XMAS MEALS ${mealRef}` : 'XMAS MEALS',
        type
      };
    }
  }

  // Try to find the pattern: [3 digits][15 digits] followed by reference and [6 digits]
  const pattern = /^(.*?)\s+(\d{3})(\d{15})\s+(.*?)(?:\s+(\d{6})\s+.*)?$/;
  const match = description.match(pattern);
  
  if (match && match[1] && match[4]) {
    return {
      name: match[1].trim(),
      reference: match[4].trim(),
      type
    };
  }

  return { name: description, reference: '', type };
};

export const parseDescription = ({ description, type }: Transaction): ParsedDescription => {
  if (!description) {
    return { name: '', reference: '', type: '' };
  }

  const cleanDesc = cleanString(description);

  switch (type) {
    case 'DD':
      return parseDirectDebit(cleanDesc);
    case 'BP':
      return parseBankPayment(cleanDesc);
    case 'FPO':
    case 'FPI':
      return parseFasterPayment(cleanDesc, type);
    default:
      return { name: cleanDesc, reference: '', type };
  }
}; 