import * as crypto from 'crypto';
import bcrypt from 'bcrypt';

export function createHashFromData({ token, uri }: { token: string, uri: string }) {
    // Concatenate the two strings
    const concatenatedString = token + uri;

    // Create a hash object, using SHA256 as the hashing algorithm
    const hash = crypto.createHash('sha256');

    // Update the hash object with the concatenated string
    hash.update(concatenatedString);

    // Generate the hash in hexadecimal format
    const hashedValue = hash.digest('hex');

    return hashedValue;

}

/**
 * Derives a key from a secret using scrypt
 * @param secret - The secret to derive the key from
 * @param length - The length of the derived key (default is 16)
 * @returns - A promise that resolves to the derived key
 */
export function deriveKeyFromSecret(secret: string, length: number = 16): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.scrypt(secret, 'salt', length, (err, derivedKey) => {
            if (err) reject(err);
            resolve(derivedKey);
        });
    });
}

/**
 * Hashes a string using SHA256
 * @param data - The string to hash
 * @returns - The hashed string
 */
export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hashes a string using bcrypt
 * @param data - The string to hash
 * @param rounds - The number of rounds to use (default is 10)
 * @returns - The hashed string
 */
export async function hashString(data: string, rounds: number = 10): Promise<string> {
    const hash = await bcrypt.hash(data, rounds);
    return hash;
}

/**
 * Compares a string with a hash
 * @param data - The string to compare
 * @param encrypted - The hash to compare against
 * @returns - A boolean indicating if the data matches the hash
 */
export async function compareHash(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
}

/**
 * Encrypts a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @param secret - The secret key (must be 32 bytes)
 * @returns {string} - The encrypted string (Base64 encoded IV + Ciphertext + Auth Tag)
 */
export function encryptString(plaintext: string, secret: string): string {
    // Derive a 32-byte key from the secret
    const key = crypto.createHash("sha256").update(secret).digest();

    // Generate a random IV (Initialization Vector)
    const iv = crypto.randomBytes(12);

    // Create cipher instance
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag (used for integrity check)
    const authTag = cipher.getAuthTag();

    // Return Base64 encoded (IV + Ciphertext + AuthTag)
    return Buffer.concat([iv, Buffer.from(encrypted, "base64"), authTag]).toString("base64");
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param encryptedData - The encrypted Base64 string
 * @param secret - The secret key (must be the same key used for encryption)
 * @returns {string} - The decrypted string
 */
export function decryptString(encryptedData: string, secret: string): string {
    // Derive the same 32-byte key from the secret
    const key = crypto.createHash("sha256").update(secret).digest();

    // Decode the Base64 input
    const data = Buffer.from(encryptedData, "base64");

    // Extract IV, Ciphertext, and AuthTag
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(data.length - 16);
    const encrypted = data.subarray(12, data.length - 16);

    // Create decipher instance
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
