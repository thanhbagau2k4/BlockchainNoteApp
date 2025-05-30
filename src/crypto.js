import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

export async function encryptContent(content, publicKey) {
  try {
    const encrypted = CryptoJS.AES.encrypt(content, publicKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

export async function decryptContent(encryptedContent, publicKey) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, publicKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}