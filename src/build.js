const XLSX = require('xlsx')
const yaml = require('js-yaml')
const fs = require('fs')

// Load the workbook
let workbook = XLSX.readFile('./file.xlsx')

// Get the first sheet
let sheet = workbook.Sheets[workbook.SheetNames[0]]
if (sheet == null) process.exit(1)

// Get numbers of row in this sheet
let range = XLSX.utils.decode_range(sheet['!ref'])
let row_count = range.e.r - range.s.r + 1
console.log(`row_count=${row_count}`)

// Get the first non empty column
let first_col = range.s.c
console.log(`first_col=${first_col}`)

// Get the first non empty row
let first_row = range.s.r + 1
console.log(`first_row=${first_row}`)

// cicle all row until empty cell in first column
let types = {}
for (let i = (first_row+2); i < (row_count-1); i++) {
  let cell = sheet[`${XLSX.utils.encode_col(first_col)}${i}`]
  if (cell == null) break
  let id = cell.v
  
  cell = sheet[`${XLSX.utils.encode_col(first_col + 1)}${i}`]
  if (cell == null) break
  let type = cell.v.toString()
  if (type.includes('-')) {
    type = type.split('-').pop()
  }
  types[id] = type
}
console.log('types', types)

let row_offset = first_row + Object.keys(types).length + 2
let col_offset = first_col
console.log(`row_offset=${row_offset}`)
console.log(`col_offset=${col_offset}`)

// Next cells of the first column are group names
let groups_cells = []
let current_group = null
for (let i = row_offset; i < row_count; i++) {
  let cell = sheet[`${XLSX.utils.encode_col(first_col)}${i}`]
  if (cell == null) continue
  if (current_group != null) {
    current_group.end = i - 1
    groups_cells.push(current_group)
  }
  current_group = {
    name: cell.v.toLowerCase().split(' ').pop(),
    start: i,
    end: row_count,
  }
}
if (current_group != null) {
  groups_cells.push(current_group)
}
console.log('groups_cells', groups_cells)

// Convert the sheet to JSON

let config = {
  commands: {},
}

// Parse the JSON
for (let i = row_offset; i < row_count; i++) {
  const row = []
  const group = groups_cells.find((group) => i >= group.start && i <= group.end)
  console.log('group', group)
  if (group == null) continue
  for (let j = col_offset; j < col_offset + 5; j++) {
    let cell = sheet[`${XLSX.utils.encode_col(j)}${i}`]
    row.push(cell ? cell.v : null)
  }

  if (row[2] == null) continue
  console.log(row)
  
  // Parse the row
  let name = row[1]
  let endpoint = row[2]
  let args = row[3] != null ? row[3].split('').map(c => types[c]) : null;
  let value = row[4]
  if(value == 'x') {
    value = 'any' 
  }

  if(!endpoint.startsWith('/')) continue

  // Store the data in the config object
  if (config.commands[group.name] == null) {
    config.commands[group.name] = []
  }
  config.commands[group.name].push({
    name,
    endpoint,
    args,
    value,
  })
}

// Convert the config object to YAML
let yamlConfig = yaml.dump(config)

// Write the YAML to a file
fs.writeFileSync('config.yaml', yamlConfig)
