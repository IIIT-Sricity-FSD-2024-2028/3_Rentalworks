const schema = require('./current_neon_schema.json');

console.log('=== VERIFYING NEON DATABASE DATA & SCHEMA ===');
for (const [table, info] of Object.entries(schema.schemaInfo)) {
  console.log(`\nTable: ${table} (Row Count: ${info.rowCount})`);
  console.log('Columns: ' + info.columns.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  console.log('Foreign Keys: ' + (info.foreignKeys.length ? info.foreignKeys.map(fk => `${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name})`).join(', ') : 'None'));
  console.log('Indexes: ' + info.indexes.map(idx => idx.indexname).join(', '));
}
