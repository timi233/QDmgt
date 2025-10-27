"""
Database indexing script for optimizing search performance
This script creates indexes on commonly queried columns to improve search performance
"""

from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.schema import CreateTable
import os

# Get database URL from environment variable or use default
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/channel_management')

def create_indexes():
    """Create database indexes for improved search performance"""
    
    engine = create_engine(DATABASE_URL)
    metadata = MetaData()
    
    try:
        # Reflect existing tables
        metadata.reflect(bind=engine)
        
        # Create indexes for channels table
        if 'channels' in metadata.tables:
            channels_table = metadata.tables['channels']
            
            # Create indexes for commonly searched columns
            indexes_to_create = [
                ("idx_channels_name", channels_table.c.name),
                ("idx_channels_status", channels_table.c.status),
                ("idx_channels_business_type", channels_table.c.business_type),
                ("idx_channels_created_at", channels_table.c.created_at),
                ("idx_channels_updated_at", channels_table.c.updated_at)
            ]
            
            # Create indexes for text search
            text_search_indexes = [
                ("idx_channels_name_text", "CREATE INDEX idx_channels_name_text ON channels USING gin(to_tsvector('simple', name))"),
                ("idx_channels_description_text", "CREATE INDEX idx_channels_description_text ON channels USING gin(to_tsvector('simple', description))")
            ]
            
            with engine.connect() as conn:
                # Create regular indexes
                for idx_name, column in indexes_to_create:
                    if not index_exists(conn, 'channels', idx_name):
                        create_index_sql = f"CREATE INDEX {idx_name} ON channels ({column.name})"
                        conn.execute(create_index_sql)
                        print(f"Created index: {idx_name}")
                
                # Create text search indexes (PostgreSQL specific)
                try:
                    for idx_name, sql in text_search_indexes:
                        if not index_exists(conn, 'channels', idx_name):
                            conn.execute(sql)
                            print(f"Created text search index: {idx_name}")
                except Exception as e:
                    print(f"Warning: Could not create text search indexes: {e}")
                    print("Text search indexes require PostgreSQL with pg_trgm extension")
                
                conn.commit()
        
        # Create indexes for channel_assignments table
        if 'channel_assignments' in metadata.tables:
            assignments_table = metadata.tables['channel_assignments']
            
            assignment_indexes = [
                ("idx_assignments_user_id", assignments_table.c.user_id),
                ("idx_assignments_channel_id", assignments_table.c.channel_id),
                ("idx_assignments_permission_level", assignments_table.c.permission_level)
            ]
            
            with engine.connect() as conn:
                for idx_name, column in assignment_indexes:
                    if not index_exists(conn, 'channel_assignments', idx_name):
                        create_index_sql = f"CREATE INDEX {idx_name} ON channel_assignments ({column.name})"
                        conn.execute(create_index_sql)
                        print(f"Created index: {idx_name}")
                
                conn.commit()
        
        # Create indexes for channel_targets table
        if 'channel_targets' in metadata.tables:
            targets_table = metadata.tables['channel_targets']
            
            target_indexes = [
                ("idx_targets_channel_id", targets_table.c.channel_id),
                ("idx_targets_year", targets_table.c.year),
                ("idx_targets_quarter", targets_table.c.quarter),
                ("idx_targets_month", targets_table.c.month),
                ("idx_targets_created_at", targets_table.c.created_at)
            ]
            
            with engine.connect() as conn:
                for idx_name, column in target_indexes:
                    if not index_exists(conn, 'channel_targets', idx_name):
                        create_index_sql = f"CREATE INDEX {idx_name} ON channel_targets ({column.name})"
                        conn.execute(create_index_sql)
                        print(f"Created index: {idx_name}")
                
                conn.commit()
        
        # Create indexes for execution_plans table
        if 'execution_plans' in metadata.tables:
            execution_table = metadata.tables['execution_plans']
            
            execution_indexes = [
                ("idx_execution_channel_id", execution_table.c.channel_id),
                ("idx_execution_user_id", execution_table.c.user_id),
                ("idx_execution_plan_type", execution_table.c.plan_type),
                ("idx_execution_plan_period", execution_table.c.plan_period),
                ("idx_execution_status", execution_table.c.status),
                ("idx_execution_created_at", execution_table.c.created_at)
            ]
            
            with engine.connect() as conn:
                for idx_name, column in execution_indexes:
                    if not index_exists(conn, 'execution_plans', idx_name):
                        create_index_sql = f"CREATE INDEX {idx_name} ON execution_plans ({column.name})"
                        conn.execute(create_index_sql)
                        print(f"Created index: {idx_name}")
                
                conn.commit()
        
        print("Database indexing completed successfully!")
        
    except Exception as e:
        print(f"Error creating indexes: {e}")
        raise
    finally:
        engine.dispose()


def index_exists(connection, table_name, index_name):
    """Check if an index already exists"""
    try:
        result = connection.execute(
            "SELECT COUNT(*) FROM pg_indexes WHERE tablename = %s AND indexname = %s",
            (table_name, index_name)
        )
        return result.fetchone()[0] > 0
    except:
        # If the check fails, assume index doesn't exist
        return False


def optimize_queries():
    """Additional query optimization techniques"""
    
    optimization_tips = """
    Query Optimization Tips:
    
    1. Use EXPLAIN ANALYZE to identify slow queries:
       EXPLAIN ANALYZE SELECT * FROM channels WHERE name ILIKE '%search_term%';
    
    2. Consider partial indexes for common filters:
       CREATE INDEX idx_active_channels ON channels (name) WHERE status = 'active';
    
    3. Use covering indexes for frequently accessed columns:
       CREATE INDEX idx_channels_covering ON channels (name, status, business_type, created_at);
    
    4. Regularly update table statistics:
       ANALYZE channels;
    
    5. Monitor slow queries:
       SET log_min_duration_statement = 1000;  -- Log queries taking more than 1 second
    """
    
    print(optimization_tips)


if __name__ == "__main__":
    print("Starting database indexing for improved search performance...")
    create_indexes()
    optimize_queries()
    print("Optimization complete!")