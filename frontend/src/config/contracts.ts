export const CONTRACT_ADDRESS = '0x6693eCD7432a8f82Ed34e253996d4fa359AcA415';

export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'seriesId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint32', name: 'maxSupply', type: 'uint32' },
    ],
    name: 'SeriesCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'seriesId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'minter', type: 'address' },
      { indexed: false, internalType: 'uint32', name: 'amount', type: 'uint32' },
    ],
    name: 'Minted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'seriesId', type: 'uint256' }],
    name: 'ObscuraOwnerUpdated',
    type: 'event',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'seriesCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'seriesId', type: 'uint256' }],
    name: 'getSeries',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint32', name: 'maxSupply', type: 'uint32' },
      { internalType: 'uint32', name: 'minted', type: 'uint32' },
      { internalType: 'address', name: 'creator', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'seriesId', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'seriesId', type: 'uint256' }],
    name: 'getObscuraOwner',
    outputs: [{ internalType: 'eaddress', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint32', name: 'maxSupply', type: 'uint32' },
    ],
    name: 'createSeries',
    outputs: [{ internalType: 'uint256', name: 'seriesId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'seriesId', type: 'uint256' },
      { internalType: 'uint32', name: 'amount', type: 'uint32' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'seriesId', type: 'uint256' }],
    name: 'mintOne',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'seriesId', type: 'uint256' },
      { internalType: 'externalEaddress', name: 'encryptedObscuraOwner', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'setObscuraOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

