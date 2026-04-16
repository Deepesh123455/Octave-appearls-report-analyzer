fetch('http://localhost:5000/api/inventory/skus')
  .then(r => r.json())
  .then(res => {
    const sku = res.data[0];
    console.log("SKU:", sku);
    return fetch('http://localhost:5000/api/inventory/sku/' + encodeURIComponent(sku));
  })
  .then(r => r.json())
  .then(res => {
    console.log("Detail breakdown:", res.data.storeBreakdown.slice(0, 3));
  })
  .catch(console.log);
