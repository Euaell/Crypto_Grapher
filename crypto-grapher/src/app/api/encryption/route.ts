import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

// Server-side implementation for algorithms not available in browser
export async function POST(request: NextRequest) {
  try {
    const { text, key, algorithm, mode, action } = await request.json();
    
    if (!text || !key || !algorithm || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    let result = '';
    const startTime = performance.now();
    
    // Implement the server-side encryption algorithms
    switch (algorithm) {
      case 'ChaCha20':
        // ChaCha20 implementation would go here
        // This is a placeholder - in production, you'd use a proper ChaCha20 implementation
        result = 'ChaCha20 encryption is not yet implemented';
        break;
        
      case 'BLOWFISH':
        // Blowfish implementation
        if (action === 'encrypt') {
          // This is using CryptoJS which doesn't have native Blowfish
          // In production, you'd use a proper Blowfish implementation
          result = CryptoJS.AES.encrypt(text, key).toString(); // Placeholder using AES
        } else {
          result = CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8); // Placeholder
        }
        break;
        
      case 'RSA':
        // RSA would require a more complex implementation with public/private keys
        result = 'RSA requires separate key generation and is not implemented in this demo';
        break;
        
      case 'ECC':
        // ECC would require elliptic curve implementations
        result = 'ECC requires separate key generation and is not implemented in this demo';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported algorithm for server-side encryption' }, 
          { status: 400 }
        );
    }
    
    const endTime = performance.now();
    
    return NextResponse.json({
      result,
      timeTaken: endTime - startTime,
      algorithm,
      mode
    });
    
  } catch (error) {
    console.error('Encryption API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 