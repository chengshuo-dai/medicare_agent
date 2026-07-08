export const uploadTokens = {
  parsing:    { gradient: 'linear-gradient(135deg, #FEF9F2, #FDF6EE)', border: '#D9D6CE' },
  completed:  { gradient: 'linear-gradient(135deg, #F0F7F0, #EDF5EC)', border: '#A3B899' },
  failed:     { gradient: 'linear-gradient(135deg, #FEF2F2, #FDF0EE)', border: '#FCA5A5' },
  persistent: { gradient: 'linear-gradient(135deg, #FEF2F2, #FDF0EE)', border: '#F87171' },
  idle:       { bg: '#F0F4F0', border: '#D9D6CE' },
  radius: 0,
} as const;
