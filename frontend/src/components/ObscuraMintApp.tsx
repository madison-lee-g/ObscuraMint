import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { Contract, ethers } from 'ethers';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { publicClient } from '../lib/publicClient';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import '../styles/ObscuraMintApp.css';

type Series = {
  id: bigint;
  name: string;
  maxSupply: number;
  minted: number;
  creator: `0x${string}`;
};

function formatAddress(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function useReadOwner(isContractConfigured: boolean) {
  return useQuery({
    queryKey: ['owner', CONTRACT_ADDRESS],
    queryFn: async () => {
      return (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'owner',
      })) as `0x${string}`;
    },
    enabled: isContractConfigured,
  });
}

function useReadSeries(isContractConfigured: boolean) {
  const countQuery = useQuery({
    queryKey: ['seriesCount', CONTRACT_ADDRESS],
    queryFn: async () => {
      return (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'seriesCount',
      })) as bigint;
    },
    enabled: isContractConfigured,
  });

  const seriesQuery = useQuery({
    queryKey: ['seriesList', CONTRACT_ADDRESS, countQuery.data?.toString()],
    queryFn: async () => {
      const count = countQuery.data ?? 0n;
      const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
      const results: Series[] = [];
      for (const id of ids) {
        const [name, maxSupply, minted, creator] = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getSeries',
          args: [id],
        })) as unknown as [string, number, number, `0x${string}`];
        results.push({ id, name, maxSupply, minted, creator });
      }
      return results;
    },
    enabled: isContractConfigured && (countQuery.data ?? 0n) > 0n,
  });

  return { countQuery, seriesQuery };
}

export function ObscuraMintApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const isContractConfigured = true
  const ownerQuery = useReadOwner(isContractConfigured);
  const { countQuery, seriesQuery } = useReadSeries(isContractConfigured);

  const [newName, setNewName] = useState('');
  const [newMaxSupply, setNewMaxSupply] = useState('10');
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [adminSeriesId, setAdminSeriesId] = useState('0');
  const [adminClearAddress, setAdminClearAddress] = useState('');
  const [decryptSeriesId, setDecryptSeriesId] = useState('0');
  const [decryptedOwner, setDecryptedOwner] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!address || !ownerQuery.data) return false;
    return ownerQuery.data.toLowerCase() === address.toLowerCase();
  }, [address, ownerQuery.data]);

  const contractWrite = useMemo(() => {
    return async () => {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');
      return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as any[], signer);
    };
  }, [signerPromise]);

  async function createSeries() {
    if (!isContractConfigured) return;
    setTxStatus(null);
    try {
      const maxSupply = Number(newMaxSupply);
      if (!Number.isInteger(maxSupply) || maxSupply <= 0 || maxSupply > 0xffffffff) {
        throw new Error('Max supply must be a positive uint32');
      }
      if (!newName.trim()) throw new Error('Name is required');
      const c = await contractWrite();
      const tx = await c.createSeries(newName.trim(), maxSupply);
      setTxStatus(`Pending: ${tx.hash}`);
      await tx.wait();
      setTxStatus(`Confirmed: ${tx.hash}`);
      setNewName('');
      await countQuery.refetch();
      await seriesQuery.refetch();
    } catch (e) {
      setTxStatus((e as Error).message);
    }
  }

  async function mintOne(seriesId: bigint) {
    if (!isContractConfigured) return;
    setTxStatus(null);
    try {
      const c = await contractWrite();
      const tx = await c.mintOne(seriesId);
      setTxStatus(`Pending: ${tx.hash}`);
      await tx.wait();
      setTxStatus(`Confirmed: ${tx.hash}`);
      await seriesQuery.refetch();
    } catch (e) {
      setTxStatus((e as Error).message);
    }
  }

  async function setEncryptedObscuraOwner() {
    if (!isContractConfigured) return;
    setTxStatus(null);
    try {
      if (!isOwner) throw new Error('Only the contract owner can set obscuraOwner');
      if (!address) throw new Error('Wallet not connected');
      if (zamaLoading) throw new Error('Encryption service is initializing');
      if (zamaError) throw new Error(zamaError);
      if (!instance) throw new Error('Encryption service unavailable');

      const seriesId = BigInt(adminSeriesId);
      const clearAddr = ethers.getAddress(adminClearAddress);
      const encrypted = await instance.createEncryptedInput(CONTRACT_ADDRESS, address).addAddress(clearAddr).encrypt();

      const c = await contractWrite();
      const tx = await c.setObscuraOwner(seriesId, encrypted.handles[0], encrypted.inputProof);
      setTxStatus(`Pending: ${tx.hash}`);
      await tx.wait();
      setTxStatus(`Confirmed: ${tx.hash}`);
    } catch (e) {
      setTxStatus((e as Error).message);
    }
  }

  async function decryptObscuraOwner() {
    if (!isContractConfigured) return;
    setTxStatus(null);
    setDecryptedOwner(null);
    try {
      if (!isOwner) throw new Error('Only the contract owner can decrypt obscuraOwner');
      if (!address) throw new Error('Wallet not connected');
      if (zamaLoading) throw new Error('Encryption service is initializing');
      if (zamaError) throw new Error(zamaError);
      if (!instance) throw new Error('Encryption service unavailable');

      const seriesId = BigInt(decryptSeriesId);
      const handle = (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getObscuraOwner',
        args: [seriesId],
      })) as `0x${string}`;

      if (handle === ethers.ZeroHash) throw new Error('obscuraOwner is not set');

      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle, contractAddress: CONTRACT_ADDRESS }];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.startsWith('0x') ? signature.slice(2) : signature,
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      setDecryptedOwner(String(result[handle]));
    } catch (e) {
      setTxStatus((e as Error).message);
    }
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        {!isContractConfigured && (
          <div className="panel warning">
            <h2>Contract not configured</h2>
            <p>Update the contract address and ABI in the frontend config.</p>
          </div>
        )}

        <div className="grid">
          <section className="panel">
            <h2>Create Series</h2>
            <p className="muted">
              Anyone can create a series with a name and max supply. The encrypted <code>obscuraOwner</code> can be set later by
              the contract owner.
            </p>

            <div className="form-row">
              <label>
                <span>Name</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Genesis" />
              </label>
              <label>
                <span>Max supply</span>
                <input value={newMaxSupply} onChange={(e) => setNewMaxSupply(e.target.value)} inputMode="numeric" />
              </label>
              <button disabled={!isConnected || !isContractConfigured} onClick={createSeries}>
                Create
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>All Series</h2>
            <div className="status-row">
              <div className="muted">
                Contract owner: <code>{ownerQuery.data ? formatAddress(ownerQuery.data) : '—'}</code>
              </div>
              <div className="muted">
                Total series: <code>{countQuery.data?.toString() ?? '0'}</code>
              </div>
            </div>

            {seriesQuery.isLoading && <div className="muted">Loading…</div>}
            {seriesQuery.data?.length === 0 && <div className="muted">No series yet.</div>}

            <div className="series-list">
              {seriesQuery.data?.map((s) => (
                <div className="series-card" key={s.id.toString()}>
                  <div className="series-title">
                    <div className="series-name">{s.name}</div>
                    <div className="series-id">#{s.id.toString()}</div>
                  </div>
                  <div className="series-meta">
                    <div>
                      Supply: <code>{String(s.minted)}</code>/<code>{String(s.maxSupply)}</code>
                    </div>
                    <div>
                      Creator: <code>{formatAddress(s.creator)}</code>
                    </div>
                  </div>
                  <button disabled={!isConnected || !isContractConfigured} onClick={() => mintOne(s.id)}>
                    Mint
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel">
          <h2>Owner Tools</h2>
          <p className="muted">
            Only the contract owner can set and decrypt <code>obscuraOwner</code>.
          </p>

          {!isOwner && <div className="muted">Connect with the contract owner wallet to unlock these tools.</div>}

          <div className="owner-tools">
            <div className="tool">
              <h3>Set obscuraOwner (encrypted)</h3>
              <div className="form-row">
                <label>
                  <span>Series id</span>
                  <input value={adminSeriesId} onChange={(e) => setAdminSeriesId(e.target.value)} inputMode="numeric" />
                </label>
                <label>
                  <span>Cleartext address</span>
                  <input
                    value={adminClearAddress}
                    onChange={(e) => setAdminClearAddress(e.target.value)}
                    placeholder="0x…"
                  />
                </label>
                <button disabled={!isOwner || !isContractConfigured} onClick={setEncryptedObscuraOwner}>
                  Encrypt + Set
                </button>
              </div>
              {zamaLoading && <div className="muted">Encryption service initializing…</div>}
              {zamaError && <div className="muted">Encryption service error: {zamaError}</div>}
            </div>

            <div className="tool">
              <h3>Decrypt obscuraOwner</h3>
              <div className="form-row">
                <label>
                  <span>Series id</span>
                  <input value={decryptSeriesId} onChange={(e) => setDecryptSeriesId(e.target.value)} inputMode="numeric" />
                </label>
                <button disabled={!isOwner || !isContractConfigured} onClick={decryptObscuraOwner}>
                  Decrypt
                </button>
              </div>
              {decryptedOwner && (
                <div className="result">
                  Decrypted obscuraOwner: <code>{decryptedOwner}</code>
                </div>
              )}
            </div>
          </div>
        </section>

        {txStatus && (
          <section className="panel">
            <h2>Status</h2>
            <div className="muted">{txStatus}</div>
          </section>
        )}
      </main>
    </div>
  );
}
