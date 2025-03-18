// Parse the CSV data
function parseCSV(csvData) {
  // Split the CSV into rows
  const rows = csvData.trim().split('\n');

  // Extract headers (first row)
  const headers = rows[0].split(',');

  // Process each data row
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',');
    const obj = {};

    // Handle values that might contain commas within quotes
    let j = 0;
    let currentValue = "";
    let insideQuotes = false;

    for (let k = 0; k < values.length; k++) {
      if (insideQuotes) {
        currentValue += "," + values[k];
        if (values[k].endsWith('"')) {
          insideQuotes = false;
          obj[headers[j].trim()] = currentValue.replace(/^"|"$/g, '');
          j++;
          currentValue = "";
        }
      } else {
        if (values[k].startsWith('"') && !values[k].endsWith('"')) {
          insideQuotes = true;
          currentValue = values[k];
        } else {
          obj[headers[j].trim()] = values[k];
          j++;
        }
      }
    }

    data.push(obj);
  }

  //console.log(data)
  return data;
}