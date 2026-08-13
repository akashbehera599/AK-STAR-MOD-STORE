import { supabase, isSupabaseConfigured, BUCKETS } from '../lib/supabase';

export interface BucketStatus {
  name: string;
  status: 'OK' | 'MISSING' | 'PERMISSION_DENIED' | 'ERROR';
  message?: string;
}

export interface TableStatus {
  name: string;
  status: 'OK' | 'MISSING' | 'ERROR';
  message?: string;
  count?: number;
}

export interface HealthCheckResult {
  supabaseConfigured: boolean;
  databaseConnected: boolean;
  tables: Record<string, TableStatus>;
  buckets: Record<string, BucketStatus>;
  allHealthy: boolean;
  timestamp: string;
}

export async function runSupabaseHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    supabaseConfigured: isSupabaseConfigured(),
    databaseConnected: false,
    tables: {},
    buckets: {},
    allHealthy: true,
    timestamp: new Date().toISOString()
  };

  if (!result.supabaseConfigured) {
    result.allHealthy = false;
    return result;
  }

  // 1. Check Tables (apks, app_plans/plans, categories, store_settings)
  const tablesToCheck = ['apks', 'plans', 'categories', 'coupons', 'store_settings', 'orders'];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (!error) {
        result.tables[table] = {
          name: table,
          status: 'OK',
          count: count ?? data?.length ?? 0
        };
        result.databaseConnected = true;
      } else {
        result.allHealthy = false;
        const msg = error.message || String(error);
        if (error.code === 'PGRST205' || msg.includes('schema cache') || msg.includes('not found')) {
          result.tables[table] = {
            name: table,
            status: 'MISSING',
            message: `Table 'public.${table}' missing. Please run /supabase/schema.sql in your Supabase SQL Editor.`
          };
        } else {
          result.tables[table] = {
            name: table,
            status: 'ERROR',
            message: msg
          };
        }
      }
    } catch (err: any) {
      result.allHealthy = false;
      result.tables[table] = {
        name: table,
        status: 'ERROR',
        message: err?.message || String(err)
      };
    }
  }

  // 2. Check Storage Buckets (apk-files, app-images, screenshots)
  const requiredBuckets = [
    { key: 'apk-files', bucketName: BUCKETS.APK_FILES },
    { key: 'app-images', bucketName: BUCKETS.APP_IMAGES },
    { key: 'screenshots', bucketName: BUCKETS.SCREENSHOTS }
  ];

  for (const { key, bucketName } of requiredBuckets) {
    try {
      const { data, error } = await supabase.storage.from(bucketName).list('', { limit: 1 });

      if (!error && data !== null) {
        result.buckets[key] = {
          name: bucketName,
          status: 'OK'
        };
      } else if (error) {
        const msg = error.message || String(error);
        if (
          msg.includes('Bucket not found') || 
          msg.includes('bucket_not_found') || 
          msg.includes('not found') ||
          (error as any).statusCode === '404'
        ) {
          result.allHealthy = false;
          result.buckets[key] = {
            name: bucketName,
            status: 'MISSING',
            message: `Storage bucket '${bucketName}' is missing. Create it in Supabase Storage.`
          };
        } else if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('403') || msg.includes('Unauthorized')) {
          result.buckets[key] = {
            name: bucketName,
            status: 'PERMISSION_DENIED',
            message: `Storage permission denied for bucket '${bucketName}'. Check RLS policies.`
          };
        } else {
          result.buckets[key] = {
            name: bucketName,
            status: 'ERROR',
            message: msg
          };
        }
      } else {
        result.buckets[key] = {
          name: bucketName,
          status: 'OK'
        };
      }
    } catch (err: any) {
      result.allHealthy = false;
      result.buckets[key] = {
        name: bucketName,
        status: 'ERROR',
        message: err?.message || String(err)
      };
    }
  }

  return result;
}
