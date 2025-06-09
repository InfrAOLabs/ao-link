// ====== CONFIGURATION OPTIONS ======
// Set this to false to disable fallback and always use primary randao endpoint
const ENABLE_FALLBACK = true;

// ====== IMPORTS ======
// Import everything we need from the original package so we can re-export it
import { connect as connectNode, createDataItemSigner as createDataItemSignerNode } from "@permaweb/aoconnect";
import { DryRunResult, MessageInput } from "@permaweb/aoconnect/dist/lib/dryrun";
import { MessageResult } from "@permaweb/aoconnect/dist/lib/result";

// Try to use browser-specific createDataItemSigner if available
let createDataItemSigner = createDataItemSignerNode;
if (typeof window !== 'undefined') {
  try {
    // Try to load the browser-specific version
    const aoconnectBrowser = require("@permaweb/aoconnect/browser");
    if (aoconnectBrowser && aoconnectBrowser.createDataItemSigner) {
      createDataItemSigner = aoconnectBrowser.createDataItemSigner;
    }
  } catch (e) {
    // Fallback to standard version if browser-specific not available
    console.warn("Browser-specific createDataItemSigner not available, using standard version");
  }
}

// Re-export the createDataItemSigner function for direct usage
export { createDataItemSigner };

// Re-export the types using 'export type' for compatibility with isolatedModules
export type { DryRunResult, MessageResult, MessageInput };

// Define the return type of connect function
type AOConnection = ReturnType<typeof connectNode>;

// Special type export for exact match with what the code expects
// This allows TS to accept: let json: DryRunResult | MessageResult | undefined
export type ResultTypes = DryRunResult | MessageResult | undefined;

// Extended types for our wrapper
export interface MessageInputWithSigner extends MessageInput {
  signer?: any;
}

// Export nullable result types to help with TypeScript undefined handling
export type NullableResult = DryRunResult | MessageResult | null | undefined;

// Function to ensure result is never undefined (for type safety)
export function ensureResult(result: NullableResult): DryRunResult | MessageResult {
  if (result === undefined || result === null) {
    // Create a default DryRunResult with the proper capitalization and structure
    return { 
      Output: "No result", 
      Messages: [],
      Spawns: [],
      Errors: []
    } as unknown as DryRunResult;
  }
  return result;
}

// Get the base connect function (browser-specific or standard)
const connectRaw = typeof window !== 'undefined' ? 
  // Try to use browser-specific connect if in browser environment
  (() => {
    try {
      // We use dynamic import approach to avoid bundling issues
      return require("@permaweb/aoconnect/browser").connect;
    } catch (e) {
      // Fallback to standard connect if browser-specific not available
      return connectNode;
    }
  })() : 
  // Use standard connect in non-browser environments
  connectNode;

// Create a wrapped connect function that always uses PRIMARY_CONFIG
const connect = (customConfig = {}) => {
  // This will be defined later in the file
  const config = { ...PRIMARY_CONFIG, ...customConfig };
  return connectRaw(config);
};

// Export the raw connect function for advanced users
export { connectRaw };

/**
 * Interface for AO network configuration
 */
// Type definitions for connection configurations
type LegacyConnectOptions = {
  MODE: "legacy";
  GATEWAY_URL?: string;
  GRAPHQL_URL?: string;
  GRAPHQL_MAX_RETRIES?: number;
  GRAPHQL_RETRY_BACKOFF?: number;
  MU_URL?: string;
  CU_URL?: string;
};

type MainnetConnectOptions = {
  MODE: "mainnet";
  GATEWAY_URL?: string;
  GRAPHQL_URL?: string;
  GRAPHQL_MAX_RETRIES?: number;
  GRAPHQL_RETRY_BACKOFF?: number;
  MU_URL?: string;
  CU_URL?: string;
  // additional mainnet-specific properties would go here
};

type ConnectOptions = LegacyConnectOptions | MainnetConnectOptions;

/**
 * Type for log levels
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Primary configuration for the AO network using randao endpoints.
 */
const PRIMARY_CONFIG: LegacyConnectOptions = {
  MODE: "legacy",
  MU_URL: "https://ur-mu.randao.net",
  CU_URL: "https://ur-pcu.randao.net",
  GATEWAY_URL: "https://arweave.net",
};

/**
 * Fallback configuration for the AO network using ao-testnet endpoints.
 */
const FALLBACK_CONFIG: LegacyConnectOptions = {
  MODE: "legacy",
  MU_URL: "https://mu.ao-testnet.xyz",
  CU_URL: "https://cu.ao-testnet.xyz",
  GATEWAY_URL: "https://arweave.net",
};

// Create specific pre-configured connections
export const randaoCu = connectRaw(PRIMARY_CONFIG);
export const aoTestnetCu = connectRaw(FALLBACK_CONFIG);

// Export the wrapped connect function so it's always using our config
export { connect };

/**
 * Primary Compute Unit (CU) endpoint - now included directly in PRIMARY_CONFIG
 */
const PRIMARY_CU = PRIMARY_CONFIG.CU_URL;

/**
 * Timeout in milliseconds before falling back to secondary endpoints
 */
const REQUEST_TIMEOUT = 15000;

/**
 * Logs messages with timestamps.
 */
function logMessage(level: LogLevel, message: string, error: Error | null = null): void {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`);
  if (error) console.error(error);
}

/**
 * Adds a timeout to a promise to avoid hanging requests.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      logMessage("warn", `⏳ Request timed out after ${ms}ms`);
      reject(new Error("Request timed out"));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Attempts a request with primary endpoint first, then falls back to secondary endpoint
 * if the primary fails or times out after 15 seconds.
 */
// Helper to ensure all configs have required fields
function ensureConfig(config: Partial<LegacyConnectOptions>): LegacyConnectOptions {
  return {
    MODE: "legacy",
    GATEWAY_URL: "https://arweave.net",
    ...config
  } as LegacyConnectOptions;
}

async function attemptWithFallback<T>(
  fn: (config: LegacyConnectOptions) => Promise<T>
): Promise<T> {
  // Try with primary randao endpoint first
  try {
    logMessage("info", `🔄 Trying primary randao endpoint: ${PRIMARY_CU}`);
    const primaryConfig = { ...PRIMARY_CONFIG, CU_URL: PRIMARY_CU };
    return await withTimeout(fn(primaryConfig), REQUEST_TIMEOUT);
  } catch (error) {
    // If fallback is disabled, just throw the error
    if (!ENABLE_FALLBACK) {
      logMessage("error", `❌ Primary endpoint failed and fallback is disabled`, error as Error);
      throw error;
    }
    
    logMessage("warn", `❌ Primary endpoint failed, falling back to ao-testnet.xyz`, error as Error);
    
    // Fall back to ao-testnet.xyz endpoints
    try {
      logMessage("info", `🔄 Trying fallback endpoint: ${FALLBACK_CONFIG.CU_URL}`);
      return await fn(FALLBACK_CONFIG);
    } catch (fallbackError) {
      logMessage("error", `🚨 Fallback endpoint also failed`, fallbackError as Error);
      throw new Error("All endpoints failed after retries");
    }
  }
}

/**
 * Type for window.arweaveWallet which might not be in global types
 */
// Type definitions for params and global objects
declare global {
  interface Window {
    arweaveWallet: any;
  }
}

// Type definitions for function arguments based on error messages
// Use our extended MessageInput type that includes signer
type SendMessageArgs = MessageInputWithSigner;

type ReadResultArgs = {
  process: string;
  message: string;
};

type DryRunArgs = {
  process: string;
  module?: string;
  message?: any;
  tags?: Array<{ name: string; value: string }>;
  signer: any;
};

type SpawnArgs = {
  module: string;
  scheduler: string; // Making this required as the API appears to need it
  signer: any;
};

type MonitorArgs = {
  process: string;
};

type OmitSigner<T> = Omit<T, 'signer'>;

/**
 * Creates a connection instance using the primary endpoint.
 */
const getConnection = () => {
  return connect(PRIMARY_CONFIG);
};

/**
 * Gets a fallback connection using the secondary endpoint.
 */
const getFallbackConnection = () => {
  return connect(FALLBACK_CONFIG);
};

/**
 * Wrapped methods with automatic fallback logic.
 */
export const message = async (params: MessageInputWithSigner): Promise<string> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    
    // If signer is already provided, use it; otherwise add default signer
    if (params.signer) {
      return conn.message(params as any);
    } else if (typeof window !== 'undefined' && window.arweaveWallet) {
      return conn.message({
        ...params,
        signer: createDataItemSigner(window.arweaveWallet),
      } as any);
    } else {
      throw new Error("No signer provided and no Arweave wallet detected in window");
    }
  });
};

export const result = async (params: ReadResultArgs): Promise<MessageResult> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    return conn.result(params);
  });
};

export const dryrun = async (params: MessageInputWithSigner): Promise<DryRunResult> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    
    // If signer is already provided, use it; otherwise add default signer
    if (params.signer) {
      return conn.dryrun(params as any);
    } else if (typeof window !== 'undefined' && window.arweaveWallet) {
      return conn.dryrun({
        ...params,
        signer: createDataItemSigner(window.arweaveWallet),
      } as any);
    } else {
      throw new Error("No signer provided and no Arweave wallet detected in window");
    }
  });
};

export const spawn = async (params: SpawnArgs | OmitSigner<SpawnArgs>): Promise<string> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    
    // Check if params already has a signer
    if ('signer' in params) {
      return conn.spawn(params as SpawnArgs);
    } else if (typeof window !== 'undefined' && window.arweaveWallet) {
      return conn.spawn({
        ...params,
        signer: createDataItemSigner(window.arweaveWallet),
      });
    } else {
      throw new Error("No signer provided and no Arweave wallet detected in window");
    }
  });
};

export const monitor = async (params: MonitorArgs): Promise<any> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    return conn.monitor(params);
  });
};

export const unmonitor = async (params: MonitorArgs): Promise<any> => {
  return attemptWithFallback((config) => {
    // Create a connection with the desired config
    const conn = connectRaw(ensureConfig(config));
    return conn.unmonitor(params);
  });
};

// Get the primary connection using our configured CU_URL
const primaryConnection = connectRaw(PRIMARY_CONFIG);

// Note: createDataItemSigner, message, result, dryrun, etc. are already exported earlier in the file

// Create a default export object with all the functions as properties to support
// import myAo from './ao.Connection'; myAo.message(...)
const aoModule = {
  // Connection creation with our config
  connect,
  connectRaw,
  randaoCu,
  aoTestnetCu,
  createDataItemSigner,
  
  // Core functions that have been wrapped with fallback
  message,
  result,
  dryrun,
  spawn,
  monitor,
  unmonitor,
  
  // Helper functions for type safety
  ensureResult,
  ensureConfig,
  
  // Configuration objects for advanced usage
  PRIMARY_CONFIG,
  FALLBACK_CONFIG,
  
  // Connection instance itself with our config
  connection: primaryConnection,
};

// Export for: import myAo from './ao.Connection'
export default aoModule;

// Create non-fallback versions of key functions that will only use PRIMARY_CONFIG
// These can be imported directly when fallback is not desired
export const noFallback = {
  message: async (params: MessageInputWithSigner): Promise<string> => {
    // Create a connection with primary config
    const conn = connect(PRIMARY_CONFIG);
    
    if (params.signer) {
      return conn.message(params as any);
    } else if (typeof window !== 'undefined' && window.arweaveWallet) {
      return conn.message({
        ...params,
        signer: createDataItemSigner(window.arweaveWallet),
      } as any);
    } else {
      throw new Error("No signer provided and no Arweave wallet detected in window");
    }
  },
  
  result: async (params: ReadResultArgs): Promise<MessageResult> => {
    // Create a connection with primary config
    const conn = connect(PRIMARY_CONFIG);
    return conn.result(params);
  },
  
  dryrun: async (params: MessageInputWithSigner): Promise<DryRunResult> => {
    // Create a connection with primary config
    const conn = connect(PRIMARY_CONFIG);
    
    if (params.signer) {
      return conn.dryrun(params as any);
    } else if (typeof window !== 'undefined' && window.arweaveWallet) {
      return conn.dryrun({
        ...params,
        signer: createDataItemSigner(window.arweaveWallet),
      } as any);
    } else {
      throw new Error("No signer provided and no Arweave wallet detected in window");
    }
  },
  
  // Direct connect with PRIMARY_CONFIG
  connect,
  createDataItemSigner,
  
  // Return the connection directly
  connection: randaoCu,
};

// Add example custom connection for ardrive.io as shown in the user's example
export const arIoCu = connectRaw({
  CU_URL: "https://cu.ardrive.io",
  MODE: 'legacy'
});
