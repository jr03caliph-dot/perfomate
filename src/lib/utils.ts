// Utility functions for preventing duplicates and handling retries

// Track pending operations to prevent duplicates
const pendingOperations = new Map<string, Promise<any>>();

export async function preventDuplicateOperation<T>(
  operationId: string,
  operation: () => Promise<T>,
  timeout = 2000
): Promise<T> {
  // Check if operation is already pending
  const existing = pendingOperations.get(operationId);
  if (existing) {
    return existing;
  }

  // Create new operation promise
  const promise = operation()
    .finally(() => {
      // Remove from pending after completion
      setTimeout(() => {
        pendingOperations.delete(operationId);
      }, 100);
    });

  // Set timeout to prevent hanging
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      pendingOperations.delete(operationId);
      reject(new Error('Operation timeout'));
    }, timeout);
  });

  pendingOperations.set(operationId, promise);
  
  return Promise.race([promise, timeoutPromise]);
}

// Retry function with faster exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        // Faster exponential backoff: 100ms, 200ms
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

// Generate unique operation ID
export function generateOperationId(
  studentId: string,
  type: 'class' | 'star' | 'performance',
  reasonId?: string
): string {
  return `${studentId}-${type}-${reasonId || Date.now()}`;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Queue for offline operations
class OfflineQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    await this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || !isOnline()) return;
    
    this.processing = true;
    
    while (this.queue.length > 0 && isOnline()) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await retryOperation(operation);
        } catch (error) {
          console.error('Failed to process queued operation:', error);
          // Re-add to queue if it fails
          this.queue.unshift(operation);
          break;
        }
      }
    }
    
    this.processing = false;
  }

  get length(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineQueue.process();
  });
}

