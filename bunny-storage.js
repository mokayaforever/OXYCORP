/**
 * Bunny.net CDN & Storage Integration
 * Handles uploads, downloads, and media management via Bunny.net
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class BunnyStorage {
  constructor() {
    this.apiKey = process.env.BUNNY_STORAGE_API_KEY;
    this.storageZone = process.env.BUNNY_STORAGE_ZONE;
    this.hostname = process.env.BUNNY_STORAGE_HOSTNAME;
    this.region = process.env.BUNNY_STORAGE_REGION || 'us';
    this.cdnUrl = process.env.BUNNY_CDN_URL;
    
    if (!this.apiKey || !this.storageZone) {
      throw new Error('Missing Bunny.net configuration in .env file');
    }

    this.baseUrl = `https://${this.region}.${this.hostname}/${this.storageZone}`;
  }

  /**
   * Upload file to Bunny storage
   * @param {string} localPath - Local file path
   * @param {string} remotePath - Remote path in storage zone
   * @returns {Promise<Object>} Upload result with CDN URL
   */
  async uploadFile(localPath, remotePath) {
    try {
      const fileBuffer = fs.readFileSync(localPath);
      const fileName = path.basename(localPath);
      const uploadPath = `${this.baseUrl}/${remotePath}/${fileName}`;

      const response = await fetch(uploadPath, {
        method: 'PUT',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': this.getContentType(fileName),
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const cdnPath = `${this.cdnUrl}${remotePath}/${fileName}`;
      console.log(`✓ Uploaded: ${cdnPath}`);

      return {
        success: true,
        localPath,
        remotePath: `${remotePath}/${fileName}`,
        cdnUrl: cdnPath,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`✗ Upload failed:`, error.message);
      return { success: false, error: error.message, localPath };
    }
  }

  /**
   * Download file from Bunny storage
   * @param {string} remotePath - Remote path in storage zone
   * @param {string} localPath - Local path to save
   * @returns {Promise<Object>} Download result
   */
  async downloadFile(remotePath, localPath) {
    try {
      const fileUrl = `${this.baseUrl}/${remotePath}`;
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: { 'AccessKey': this.apiKey },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const buffer = await response.buffer();
      fs.writeFileSync(localPath, buffer);

      console.log(`✓ Downloaded: ${remotePath} → ${localPath}`);
      return { success: true, remotePath, localPath };
    } catch (error) {
      console.error(`✗ Download failed:`, error.message);
      return { success: false, error: error.message, remotePath };
    }
  }

  /**
   * List files in Bunny storage
   * @param {string} path - Path to list
   * @returns {Promise<Array>} List of files
   */
  async listFiles(path = '') {
    try {
      const listUrl = `${this.baseUrl}/${path}`;
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: { 'AccessKey': this.apiKey },
      });

      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error(`✗ List failed:`, error.message);
      return [];
    }
  }

  /**
   * Delete file from Bunny storage
   * @param {string} remotePath - Remote path to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(remotePath) {
    try {
      const deleteUrl = `${this.baseUrl}/${remotePath}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'AccessKey': this.apiKey },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      console.log(`✓ Deleted: ${remotePath}`);
      return { success: true, remotePath };
    } catch (error) {
      console.error(`✗ Delete failed:`, error.message);
      return { success: false, error: error.message, remotePath };
    }
  }

  /**
   * Get CDN URL for a file
   * @param {string} remotePath - Remote path
   * @returns {string} Full CDN URL
   */
  getCdnUrl(remotePath) {
    return `${this.cdnUrl}${remotePath}`;
  }

  /**
   * Determine MIME type based on file extension
   * @param {string} fileName
   * @returns {string} MIME type
   */
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.m4a': 'audio/mp4',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = BunnyStorage;
