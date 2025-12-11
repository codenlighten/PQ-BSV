/**
 * Transaction Building Utilities
 * 
 * Helper functions for constructing PQ-compatible BSV transactions
 */

const { estimateTransactionSize } = require('../scripts/templates');

/**
 * Represent a transaction input
 */
class TransactionInput {
  constructor(txid, vout, scriptSig, sequence = 0xffffffff, amount = 0) {
    this.txid = txid; // Buffer or hex string
    this.vout = vout; // Output index
    this.scriptSig = scriptSig; // Unlocking script
    this.sequence = sequence;
    this.amount = amount; // Amount in satoshis (for tracking, not serialized)
  }

  /**
   * Serialize input to buffer
   */
  toBuffer() {
    const txidBuf = Buffer.isBuffer(this.txid) 
      ? this.txid 
      : Buffer.from(this.txid, 'hex');
    
    const voutBuf = Buffer.allocUnsafe(4);
    voutBuf.writeUInt32LE(this.vout);
    
    const seqBuf = Buffer.allocUnsafe(4);
    seqBuf.writeUInt32LE(this.sequence);
    
    const scriptLen = Buffer.allocUnsafe(1);
    scriptLen.writeUInt8(this.scriptSig.length);
    
    return Buffer.concat([
      txidBuf,
      voutBuf,
      scriptLen,
      this.scriptSig,
      seqBuf
    ]);
  }

  getSize() {
    return 40 + this.scriptSig.length + 1; // txid + vout + script + seq
  }
}

/**
 * Represent a transaction output
 */
class TransactionOutput {
  constructor(amount, scriptPubKey) {
    this.amount = amount; // Amount in satoshis (number)
    this.scriptPubKey = scriptPubKey; // Locking script (Buffer)
  }

  /**
   * Serialize output to buffer
   */
  toBuffer() {
    const amountBuf = Buffer.allocUnsafe(8);
    amountBuf.writeBigUInt64LE(BigInt(this.amount));
    
    const scriptLen = Buffer.allocUnsafe(1);
    scriptLen.writeUInt8(this.scriptPubKey.length);
    
    return Buffer.concat([
      amountBuf,
      scriptLen,
      this.scriptPubKey
    ]);
  }

  getSize() {
    return 8 + 1 + this.scriptPubKey.length;
  }
}

/**
 * Transaction builder
 */
class Transaction {
  constructor(version = 1, locktime = 0) {
    this.version = version;
    this.inputs = [];
    this.outputs = [];
    this.locktime = locktime;
  }

  /**
   * Add an input to the transaction
   */
  addInput(txid, vout, scriptSig, sequence = 0xffffffff, amount = 0) {
    this.inputs.push(new TransactionInput(txid, vout, scriptSig, sequence, amount));
    return this;
  }

  /**
   * Add an output to the transaction
   */
  addOutput(amount, scriptPubKey) {
    this.outputs.push(new TransactionOutput(amount, scriptPubKey));
    return this;
  }

  /**
   * Serialize transaction to buffer
   */
  toBuffer() {
    const versionBuf = Buffer.allocUnsafe(4);
    versionBuf.writeUInt32LE(this.version);
    
    const inputCountBuf = Buffer.allocUnsafe(1);
    inputCountBuf.writeUInt8(this.inputs.length);
    
    const outputCountBuf = Buffer.allocUnsafe(1);
    outputCountBuf.writeUInt8(this.outputs.length);
    
    const locktimeBuf = Buffer.allocUnsafe(4);
    locktimeBuf.writeUInt32LE(this.locktime);
    
    const inputBuffers = this.inputs.map(input => input.toBuffer());
    const outputBuffers = this.outputs.map(output => output.toBuffer());
    
    return Buffer.concat([
      versionBuf,
      inputCountBuf,
      ...inputBuffers,
      outputCountBuf,
      ...outputBuffers,
      locktimeBuf
    ]);
  }

  /**
   * Get transaction hex
   */
  toHex() {
    return this.toBuffer().toString('hex');
  }

  /**
   * Get transaction ID (double SHA-256)
   */
  getTxid() {
    const crypto = require('crypto');
    const hash1 = crypto.createHash('sha256').update(this.toBuffer()).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    return hash2.reverse().toString('hex');
  }

  /**
   * Get total input amount
   */
  getTotalInput() {
    return this.inputs.reduce((sum, input) => sum + (input.amount || 0), 0);
  }

  /**
   * Get total output amount
   */
  getTotalOutput() {
    return this.outputs.reduce((sum, output) => sum + output.amount, 0);
  }

  /**
   * Get transaction size
   */
  getSize() {
    const baseSize = 10; // version + locktime + input/output counts
    const inputsSize = this.inputs.reduce((sum, input) => sum + input.getSize(), 0);
    const outputsSize = this.outputs.reduce((sum, output) => sum + output.getSize(), 0);
    return baseSize + inputsSize + outputsSize;
  }

  /**
   * Calculate fee for transaction
   */
  calculateFee(feeRate = 0.5) {
    return Math.ceil(this.getSize() * feeRate);
  }

  /**
   * Get summary
   */
  getSummary() {
    const totalInput = this.inputs.length; // Can't calculate without amounts
    const totalOutput = this.outputs.reduce((sum, out) => sum + out.amount, 0);
    
    return {
      version: this.version,
      inputs: this.inputs.length,
      outputs: this.outputs.length,
      size: this.getSize(),
      totalOutput,
      locktime: this.locktime,
      txid: this.getTxid()
    };
  }
}

/**
 * Create a simple P2PKH transaction
 */
function createP2PKHTransaction(utxos, recipients, changeAddress, feeRate = 0.5) {
  const tx = new Transaction();
  
  let totalInput = 0;
  for (const utxo of utxos) {
    // In production, would need proper scriptSig with signature
    const scriptSig = Buffer.from('placeholder-signature');
    tx.addInput(utxo.txid, utxo.vout, scriptSig, 0xffffffff, utxo.amount);
    totalInput += utxo.amount;
  }
  
  let totalOutput = 0;
  for (const recipient of recipients) {
    // Use provided scriptPubKey or create placeholder
    const scriptPubKey = recipient.scriptPubKey || Buffer.from('recipient-script');
    tx.addOutput(recipient.amount, scriptPubKey);
    totalOutput += recipient.amount;
  }
  
  // Calculate fee
  const fee = tx.calculateFee(feeRate);
  
  // Check if we have enough
  if (totalInput < totalOutput + fee) {
    throw new Error('Insufficient funds');
  }
  
  // Add change output if needed
  const change = totalInput - totalOutput - fee;
  
  if (change > 546) { // Dust limit
    // In production, would create proper P2PKH scriptPubKey from changeAddress
    const changeScript = Buffer.from('change-script-placeholder');
    tx.addOutput(change, changeScript);
  }
  
  return tx;
}

/**
 * Estimate UTXO consolidation benefit
 */
function estimateConsolidation(utxos, options = {}) {
  const { maxInputsPerTx = 100, feeRate = 0.5 } = options;
  
  const totalUtxos = utxos.length;
  const batches = Math.ceil(totalUtxos / maxInputsPerTx);
  
  let totalFees = 0;
  let totalValue = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
  
  for (let i = 0; i < batches; i++) {
    const inputCount = Math.min(maxInputsPerTx, totalUtxos - i * maxInputsPerTx);
    const estimate = estimateTransactionSize(inputCount, 1, 'ecdsa');
    totalFees += Math.ceil(estimate.totalBytes * feeRate);
  }
  
  return {
    inputCount: totalUtxos,
    batches,
    totalValue,
    totalFees,
    finalAmount: totalValue - totalFees,
    costPercent: ((totalFees / totalValue) * 100).toFixed(2) + '%'
  };
}

/**
 * Calculate optimal UTXO selection for amount
 */
function selectUTXOs(utxos, targetAmount, options = {}) {
  const { feeRate = 0.5, strategy = 'largest-first' } = options;
  
  // Sort based on strategy
  let sorted;
  if (strategy === 'largest-first') {
    sorted = [...utxos].sort((a, b) => b.amount - a.amount);
  } else {
    sorted = [...utxos].sort((a, b) => a.amount - b.amount);
  }
  
  const selected = [];
  let total = 0;
  let estimatedFee = 0;
  
  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.amount;
    
    // Recalculate fee with new input count
    const estimate = estimateTransactionSize(selected.length, 2, 'ecdsa');
    estimatedFee = Math.ceil(estimate.totalBytes * feeRate);
    
    if (total >= targetAmount + estimatedFee) {
      break;
    }
  }
  
  // Check if we have enough
  if (total < targetAmount + estimatedFee) {
    throw new Error('Insufficient balance');
  }
  
  const change = total - targetAmount - estimatedFee;
  
  return {
    utxos: selected,
    count: selected.length,
    total,
    targetAmount,
    fee: estimatedFee,
    change
  };
}

module.exports = {
  TransactionInput,
  TransactionOutput,
  Transaction,
  createP2PKHTransaction,
  estimateConsolidation,
  selectUTXOs
};
