const fs = require('fs');
const path = require('path');
const { STORAGE_TYPES, REPORT_FORMATS } = require('../constants/enums');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Local storage base path: backend/storage/reports
const LOCAL_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'reports');

/**
 * Storage Service Abstraction Layer
 * Encapsulates physical file operations, providing pluggable drivers for LOCAL, S3, GCS, and Azure.
 */
class StorageService {
  constructor() {
    this.ensureLocalStorageDir();
  }

  ensureLocalStorageDir() {
    try {
      if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
        fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
      }
    } catch (err) {
      logger.error(`Failed to initialize storage directory: ${err.message}`);
    }
  }

  /**
   * Save report file to configured storage driver
   * @param {object} params
   * @param {string} params.filename - Unique filename
   * @param {string|Buffer} params.content - File payload
   * @param {string} [params.storageType='LOCAL'] - Provider
   * @returns {Promise<{ fileLocation: string, fileSizeBytes: number, storageType: string }>}
   */
  async saveReportFile({ filename, content, storageType = STORAGE_TYPES.LOCAL }) {
    if (storageType === STORAGE_TYPES.LOCAL) {
      this.ensureLocalStorageDir();
      const filePath = path.join(LOCAL_STORAGE_DIR, filename);

      if (Buffer.isBuffer(content)) {
        await fs.promises.writeFile(filePath, content);
      } else {
        await fs.promises.writeFile(filePath, content, 'utf8');
      }
      const stats = await fs.promises.stat(filePath);

      const relativeLocation = path.relative(path.join(__dirname, '..', '..'), filePath).replace(/\\/g, '/');

      return {
        fileLocation: relativeLocation,
        fileSizeBytes: stats.size,
        storageType: STORAGE_TYPES.LOCAL,
      };
    }

    // Cloud Driver Stubs (S3, GCS, Azure Blob)
    logger.info(`[StorageService] Dispatching file ${filename} to ${storageType} storage driver.`);
    return {
      fileLocation: `${storageType.toLowerCase()}://payguard-reports/${filename}`,
      fileSizeBytes: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'),
      storageType,
    };
  }

  /**
   * Read stored report file content as Buffer
   * @param {string} fileLocation - Relative path or URI
   * @param {string} [storageType='LOCAL']
   * @returns {Promise<Buffer>}
   */
  async readReportFile(fileLocation, storageType = STORAGE_TYPES.LOCAL) {
    if (storageType === STORAGE_TYPES.LOCAL) {
      const fullPath = path.isAbsolute(fileLocation)
        ? fileLocation
        : path.join(__dirname, '..', '..', fileLocation);

      if (!fs.existsSync(fullPath)) {
        throw new AppError(`Report file not found at location: '${fileLocation}'`, 404, 'FILE_NOT_FOUND');
      }

      return await fs.promises.readFile(fullPath);
    }

    throw new AppError(`Storage provider '${storageType}' download driver not yet configured`, 501, 'NOT_IMPLEMENTED');
  }

  /**
   * Delete report file from storage
   * @param {string} fileLocation
   * @param {string} [storageType='LOCAL']
   */
  async deleteReportFile(fileLocation, storageType = STORAGE_TYPES.LOCAL) {
    if (storageType === STORAGE_TYPES.LOCAL && fileLocation) {
      const fullPath = path.isAbsolute(fileLocation)
        ? fileLocation
        : path.join(__dirname, '..', '..', fileLocation);

      try {
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      } catch (err) {
        logger.warn(`Failed to delete local report file ${fileLocation}: ${err.message}`);
      }
    }
  }

  /**
   * Resolve HTTP Content-Type for a given report format
   */
  getContentType(format) {
    switch (format) {
      case REPORT_FORMATS.CSV:
        return 'text/csv; charset=utf-8';
      case REPORT_FORMATS.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }
}

module.exports = new StorageService();
