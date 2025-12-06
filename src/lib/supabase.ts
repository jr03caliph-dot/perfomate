import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development and show helpful error
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
    ⚠️ Missing Supabase Environment Variables!
    
    Please create a .env file in the project root with:
    
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    
    Get these from: Supabase Dashboard → Settings → API
    
    After adding the .env file, restart the dev server.
  `;
  
  console.error(errorMessage);
  
  // Show user-friendly error in browser
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f9fafb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 600px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h1 style="color: #dc2626; margin-bottom: 20px; font-size: 24px;">
            ⚠️ Configuration Required
          </h1>
          <p style="color: #374151; margin-bottom: 20px; line-height: 1.6;">
            Your Supabase environment variables are missing. Please set them up to continue.
          </p>
          <div style="
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          ">
            <p style="color: #1f2937; font-weight: 600; margin-bottom: 10px;">
              Step 1: Create a .env file in your project root
            </p>
            <pre style="
              background: #1f2937;
              color: #10b981;
              padding: 15px;
              border-radius: 6px;
              overflow-x: auto;
              font-size: 13px;
              margin: 10px 0;
            ">VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here</pre>
          </div>
          <div style="
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          ">
            <p style="color: #1f2937; font-weight: 600; margin-bottom: 10px;">
              Step 2: Get your credentials from Supabase
            </p>
            <ol style="color: #374151; margin-left: 20px; line-height: 1.8;">
              <li>Go to <a href="https://app.supabase.com" target="_blank" style="color: #2563eb;">app.supabase.com</a></li>
              <li>Open your project</li>
              <li>Click Settings → API</li>
              <li>Copy the Project URL and anon public key</li>
            </ol>
          </div>
          <div style="
            background: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          ">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              💡 <strong>After creating the .env file, restart the dev server</strong> (stop with Ctrl+C and run 'npm run dev' again)
            </p>
          </div>
        </div>
      </div>
    `;
  }
  
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export async function createStorageBuckets() {
  // Note: Bucket creation requires service role key
  // Buckets should be created manually in Supabase Dashboard or via service role
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (buckets) {
      const bucketNames = ['student-photos', 'morning-bliss-photos'];
      const existingBuckets = buckets.map(b => b.name);
      
      console.log('Existing buckets:', existingBuckets);
      
      for (const bucketName of bucketNames) {
        const exists = existingBuckets.includes(bucketName);
        
        if (!exists) {
          console.warn(`Bucket '${bucketName}' does not exist. Please create it manually in Supabase Storage.`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking storage buckets:', error);
  }
}
