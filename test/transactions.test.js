/**
 * Tests for transaction builder
 */

const {
  TransactionInput,
  TransactionOutput,
  Transaction,
  createP2PKHTransaction,
  estimateConsolidation,
  selectUTXOs
} = require('../src/transactions/builder');

describe('Transaction Builder', () => {
  describe('TransactionInput', () => {
    test('should create transaction input', () => {
      const input = new TransactionInput(
        '0'.repeat(64),
        0,
        Buffer.from('scriptSig'),
        0xffffffff
      );

      expect(input.txid).toBe('0'.repeat(64));
      expect(input.vout).toBe(0);
      expect(input.scriptSig).toBeInstanceOf(Buffer);
      expect(input.sequence).toBe(0xffffffff);
    });

    test('should serialize to buffer', () => {
      const input = new TransactionInput('0'.repeat(64), 0, Buffer.alloc(0));
      const buffer = input.toBuffer();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(32 + 4 + 1 + 4); // txid + vout + scriptSig length + sequence
    });
  });

  describe('TransactionOutput', () => {
    test('should create transaction output', () => {
      const output = new TransactionOutput(10000, Buffer.from('scriptPubKey'));

      expect(output.amount).toBe(10000);
      expect(output.scriptPubKey).toBeInstanceOf(Buffer);
    });

    test('should serialize to buffer', () => {
      const scriptPubKey = Buffer.from('scriptPubKey');
      const output = new TransactionOutput(10000, scriptPubKey);
      const buffer = output.toBuffer();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(8 + 1 + scriptPubKey.length);
    });
  });

  describe('Transaction', () => {
    test('should create transaction', () => {
      const tx = new Transaction();

      expect(tx.version).toBe(1);
      expect(tx.inputs).toEqual([]);
      expect(tx.outputs).toEqual([]);
      expect(tx.locktime).toBe(0);
    });

    test('should add inputs and outputs', () => {
      const tx = new Transaction();
      
      tx.addInput('0'.repeat(64), 0, Buffer.alloc(0));
      tx.addOutput(10000, Buffer.from('scriptPubKey'));

      expect(tx.inputs).toHaveLength(1);
      expect(tx.outputs).toHaveLength(1);
    });

    test('should calculate total input', () => {
      const tx = new Transaction();
      
      tx.addInput('0'.repeat(64), 0, Buffer.alloc(0), 0xffffffff, 10000);
      tx.addInput('0'.repeat(64), 1, Buffer.alloc(0), 0xffffffff, 20000);

      expect(tx.getTotalInput()).toBe(30000);
    });

    test('should calculate total output', () => {
      const tx = new Transaction();
      
      tx.addOutput(10000, Buffer.from('scriptPubKey'));
      tx.addOutput(5000, Buffer.from('scriptPubKey'));

      expect(tx.getTotalOutput()).toBe(15000);
    });

    test('should serialize transaction', () => {
      const tx = new Transaction();
      tx.addInput('0'.repeat(64), 0, Buffer.alloc(0));
      tx.addOutput(10000, Buffer.from('scriptPubKey'));

      const buffer = tx.toBuffer();
      expect(buffer).toBeInstanceOf(Buffer);
    });

    test('should calculate txid', () => {
      const tx = new Transaction();
      tx.addInput('0'.repeat(64), 0, Buffer.alloc(0));
      tx.addOutput(10000, Buffer.from('scriptPubKey'));

      const txid = tx.getTxid();
      expect(typeof txid).toBe('string');
      expect(txid.length).toBe(64);
    });
  });

  describe('createP2PKHTransaction', () => {
    test('should create P2PKH transaction', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 50000, scriptPubKey: Buffer.alloc(25) }
      ];

      const recipients = [
        { address: '1'.repeat(34), amount: 40000 }
      ];

      const tx = createP2PKHTransaction(utxos, recipients, '1'.repeat(34));

      expect(tx.inputs).toHaveLength(1);
      expect(tx.outputs.length).toBeGreaterThanOrEqual(1);
      expect(tx.getTotalInput()).toBe(50000);
    });

    test('should throw on insufficient funds', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 1000, scriptPubKey: Buffer.alloc(25) }
      ];

      const recipients = [
        { address: '1'.repeat(34), amount: 50000 }
      ];

      expect(() => createP2PKHTransaction(utxos, recipients, '1'.repeat(34)))
        .toThrow('Insufficient funds');
    });
  });

  describe('estimateConsolidation', () => {
    test('should estimate consolidation', () => {
      const utxos = Array.from({ length: 150 }, () => ({
        txid: '0'.repeat(64),
        vout: 0,
        amount: 10000
      }));

      const estimate = estimateConsolidation(utxos);

      expect(estimate.inputCount).toBe(150);
      expect(estimate.batches).toBeGreaterThan(1);
      expect(estimate.totalFees).toBeGreaterThan(0);
      expect(estimate.finalAmount).toBeLessThan(1500000);
    });

    test('should use custom batch size', () => {
      const utxos = Array.from({ length: 30 }, () => ({
        txid: '0'.repeat(64),
        vout: 0,
        amount: 10000
      }));

      const estimate = estimateConsolidation(utxos, { maxInputsPerTx: 15 });

      expect(estimate.batches).toBe(2);
    });
  });

  describe('selectUTXOs', () => {
    test('should select UTXOs for target amount', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 10000 },
        { txid: '0'.repeat(64), vout: 1, amount: 20000 },
        { txid: '0'.repeat(64), vout: 2, amount: 30000 }
      ];

      const selected = selectUTXOs(utxos, 25000);

      expect(selected.utxos.length).toBeGreaterThan(0);
      expect(selected.total).toBeGreaterThanOrEqual(25000);
      expect(selected.change).toBeGreaterThanOrEqual(0);
    });

    test('should throw on insufficient balance', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 10000 }
      ];

      expect(() => selectUTXOs(utxos, 50000))
        .toThrow('Insufficient balance');
    });

    test('should use largest-first strategy', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 10000 },
        { txid: '0'.repeat(64), vout: 1, amount: 50000 },
        { txid: '0'.repeat(64), vout: 2, amount: 20000 }
      ];

      const selected = selectUTXOs(utxos, 25000, { strategy: 'largest-first' });

      expect(selected.utxos[0].amount).toBe(50000);
    });
  });
});
