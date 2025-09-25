import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment_check: {},
    connection_test: {},
    database_structure: {},
    sample_operations: {},
    recommendations: []
  };

  try {
    // 1. Check environment variables
    console.log('🔍 Checking Supabase environment variables...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    diagnostics.environment_check = {
      supabase_url: supabaseUrl ? 'SET' : 'MISSING',
      anon_key: supabaseAnonKey ? 'SET' : 'MISSING',
      service_key: supabaseServiceKey ? 'SET' : 'MISSING',
      url_format: supabaseUrl?.includes('.supabase.co') ? 'VALID' : 'INVALID'
    };

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      diagnostics.recommendations.push('Missing required Supabase environment variables in .env.local');
      return NextResponse.json({ success: false, diagnostics });
    }

    // 2. Test basic connection
    console.log('🔗 Testing Supabase connection...');
    
    try {
      const { data, error } = await supabaseAdmin.from('trips').select('count').limit(1);
      
      if (error) {
        diagnostics.connection_test = {
          status: 'FAILED',
          error: error.message,
          code: error.code
        };
      } else {
        diagnostics.connection_test = {
          status: 'SUCCESS',
          message: 'Connected to Supabase successfully'
        };
      }
    } catch (connectionError) {
      diagnostics.connection_test = {
        status: 'ERROR',
        error: connectionError instanceof Error ? connectionError.message : 'Unknown connection error'
      };
    }

    // 3. Check database tables
    console.log('🗄️ Checking database structure...');
    
    const requiredTables = ['trips', 'trip_screenshots', 'reanalysis_sessions'];
    const tableChecks: Record<string, any> = {};

    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          tableChecks[tableName] = {
            exists: false,
            error: error.message,
            code: error.code
          };
        } else {
          tableChecks[tableName] = {
            exists: true,
            row_count: data?.length || 0
          };
        }
      } catch (tableError) {
        tableChecks[tableName] = {
          exists: false,
          error: tableError instanceof Error ? tableError.message : 'Unknown table error'
        };
      }
    }

    diagnostics.database_structure = tableChecks;

    // 4. Test sample operations
    console.log('⚡ Testing sample database operations...');
    
    try {
      // Test insert
      const testTrip = {
        trip_date: new Date().toISOString().split('T')[0],
        trip_time: '12:00',
        pickup_location: 'Test Location',
        dropoff_location: 'Test Destination',
        distance: 5.0,
        duration: '15 minutes',
        platform: 'Test Platform',
        fare_amount: 15.00,
        driver_earnings: 12.00,
        gas_cost: 1.50,
        gas_used_gallons: 0.26,
        profit: 10.50,
        vehicle_model: '2003 Honda Odyssey',
        vehicle_mpg: 19.2
      };

      const { data: insertedTrip, error: insertError } = await supabaseAdmin
        .from('trips')
        .insert(testTrip)
        .select()
        .single();

      if (insertError) {
        diagnostics.sample_operations.insert = {
          success: false,
          error: insertError.message
        };
      } else {
        diagnostics.sample_operations.insert = {
          success: true,
          trip_id: insertedTrip.id
        };

        // Test select
        const { data: selectedTrip, error: selectError } = await supabaseAdmin
          .from('trips')
          .select('*')
          .eq('id', insertedTrip.id)
          .single();

        if (selectError) {
          diagnostics.sample_operations.select = {
            success: false,
            error: selectError.message
          };
        } else {
          diagnostics.sample_operations.select = {
            success: true,
            data: selectedTrip
          };
        }

        // Clean up test data
        await supabaseAdmin
          .from('trips')
          .delete()
          .eq('id', insertedTrip.id);

        diagnostics.sample_operations.cleanup = { success: true };
      }
    } catch (operationError) {
      diagnostics.sample_operations.error = operationError instanceof Error ? operationError.message : 'Unknown operation error';
    }

    // 5. Check existing data
    try {
      const { data: existingTrips, error: countError } = await supabaseAdmin
        .from('trips')
        .select('id, trip_date, platform, profit')
        .order('created_at', { ascending: false })
        .limit(5);

      if (countError) {
        diagnostics.database_structure.data_check = {
          error: countError.message
        };
      } else {
        diagnostics.database_structure.data_check = {
          total_trips: existingTrips?.length || 0,
          recent_trips: existingTrips || []
        };
      }
    } catch (dataError) {
      diagnostics.database_structure.data_check = {
        error: dataError instanceof Error ? dataError.message : 'Unknown data error'
      };
    }

    // 6. Generate recommendations
    if (diagnostics.connection_test.status === 'FAILED') {
      diagnostics.recommendations.push('Supabase connection failed - check credentials and network');
    }

    const missingTables = Object.entries(tableChecks)
      .filter(([, check]: [string, any]) => !(check as any).exists)
      .map(([table]) => table);

    if (missingTables.length > 0) {
      diagnostics.recommendations.push(`Missing database tables: ${missingTables.join(', ')}. Run database setup SQL.`);
    }

    if (diagnostics.sample_operations.insert?.success === false) {
      diagnostics.recommendations.push('Cannot insert data - check table permissions and structure');
    }

    if (diagnostics.database_structure.data_check?.total_trips === 0) {
      diagnostics.recommendations.push('No trip data found - upload some screenshots to populate database');
    }

    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('Supabase setup looks good! 🎉');
    }

    const allGood = diagnostics.connection_test.status === 'SUCCESS' && 
                   diagnostics.sample_operations.insert?.success === true &&
                   Object.values(tableChecks).every((check: any) => check.exists);

    return NextResponse.json({
      success: allGood,
      message: allGood ? 'Supabase is properly configured!' : 'Issues found with Supabase setup',
      diagnostics
    });

  } catch (error) {
    console.error('Supabase diagnostics error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Diagnostics failed',
      diagnostics
    }, { status: 500 });
  }
}