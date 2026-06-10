const value = "IMG-20260609-WA0004.jpg";
const isFilename = /^[A-Za-z0-9_\-]+\.[a-z]{2,5}$/i.test(value.trim()) ||
    /^(IMG|DSC|Screenshot|Photo|Scan|Document|File|image|pdf)[_\-\s]?\d/i.test(value.trim());
console.log(isFilename);
const cleanTitle = value
      .replace(/\.[a-z]{2,5}$/i, "")
      .replace(/[_\-]+/g, " ")
      .replace(/^(IMG|DSC|Screenshot|Photo|Scan|Document|File|image)\s*/i, "")
      .trim();
console.log(cleanTitle);
